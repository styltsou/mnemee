import { SUPPORTED_IMAGE_MIME_TYPE_SET } from "@/constants";
import { extensionFromMimeType, parseHttpUrl } from "@/lib/utils";

export type ClipboardAssetPayload =
  | {
      kind: "image-file";
      file: File;
    }
  | {
      kind: "link-url";
      url: string;
    }
  | {
      kind: "color-hex";
      hex: string;
    }
  | {
      kind: "text-note";
      content: string;
    }
  | {
      kind: "empty";
    };

export function getPreferredClipboardText(
  clipboard: Pick<DataTransfer, "getData">,
): string {
  return clipboard.getData("text/markdown") || clipboard.getData("text/plain");
}

export async function copyImageToClipboard(
  loadImageBlob: () => Promise<Blob>,
): Promise<void> {
  if (
    typeof ClipboardItem === "undefined" ||
    typeof navigator.clipboard?.write !== "function"
  ) {
    throw new Error("Your browser does not support copying images.");
  }

  // Start the clipboard write during the user gesture. Safari can reject writes
  // if the image is fetched before navigator.clipboard.write is called.
  const imageBlob = loadImageBlob().then(toClipboardPng);
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": imageBlob }),
  ]);
}

async function toClipboardPng(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith("image/")) {
    throw new Error("The original asset is not a valid image.");
  }

  if (blob.type === "image/png") {
    return blob;
  }

  const image = await createImageBitmap(blob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to prepare the image for copying.");
    }

    context.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error("Unable to prepare the image for copying."));
        }
      }, "image/png");
    });
  } finally {
    image.close();
  }
}

export async function readClipboardAssetPayload(): Promise<ClipboardAssetPayload> {
  const clipboardItem = await readFirstClipboardItem();

  if (clipboardItem) {
    const imageType = clipboardItem.types.find((type) =>
      SUPPORTED_IMAGE_MIME_TYPE_SET.has(type),
    );
    if (imageType) {
      const blob = await clipboardItem.getType(imageType);
      return {
        kind: "image-file",
        file: new File(
          [blob],
          `clipboard-image.${extensionFromMimeType(blob.type)}`,
          { type: blob.type },
        ),
      };
    }
  }

  const text = await readPreferredClipboardText(clipboardItem);
  return classifyClipboardText(text);
}

export function classifyClipboardText(text: string): ClipboardAssetPayload {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { kind: "empty" };
  }

  const linkUrl = parseHttpUrl(trimmedText);
  if (linkUrl) {
    return {
      kind: "link-url",
      url: linkUrl,
    };
  }

  const hex = parsePastedColor(trimmedText);
  if (hex) return { kind: "color-hex", hex };

  return {
    kind: "text-note",
    content: text,
  };
}

/** Parse explicit CSS colors without interpreting ordinary words as colors. */
export function parsePastedColor(value: string): string | undefined {
  const text = value.trim().toLowerCase();
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(text)) {
    const raw = text.slice(1);
    return `#${raw.length <= 4 ? [...raw].map((digit) => digit + digit).join("") : raw}`;
  }

  if (!/^(?:rgba?|hsla?)\([^()]+\)$/.test(text)) return undefined;
  // The browser validates CSS syntax and converts RGB/HSL to sRGB. A canvas
  // serializes opaque colors as hex and translucent colors as rgba().
  if (typeof document === "undefined") return undefined;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return undefined;
  context.fillStyle = "#010203";
  context.fillStyle = text;
  const first = context.fillStyle;
  context.fillStyle = "#040506";
  context.fillStyle = text;
  if (first !== context.fillStyle) return undefined;
  if (/^#[0-9a-f]{6}$/.test(first)) return first;
  const rgba =
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(first);
  if (!rgba) return undefined;
  const byte = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${rgba
    .slice(1, 4)
    .map((channel) => byte(Number(channel)))
    .join("")}${byte(Number(rgba[4]) * 255)}`;
}

/** Reads a browser-dragged hyperlink without treating arbitrary dropped text as a URL. */
export function getDroppedHttpUrl(
  dataTransfer: Pick<DataTransfer, "getData">,
): string | undefined {
  const uriList = dataTransfer
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return (
    parseHttpUrl(uriList ?? dataTransfer.getData("text/plain")) ?? undefined
  );
}

async function readFirstClipboardItem(): Promise<ClipboardItem | undefined> {
  if (typeof navigator.clipboard.read !== "function") {
    return undefined;
  }

  const items = await navigator.clipboard.read().catch(() => []);
  return items[0];
}

async function readPreferredClipboardText(
  clipboardItem: ClipboardItem | undefined,
): Promise<string> {
  const markdownType = clipboardItem?.types.find(
    (type) => type.toLowerCase().split(";", 1)[0] === "text/markdown",
  );
  if (markdownType) {
    const markdown = await clipboardItem!.getType(markdownType);
    const text = await markdown.text();
    if (text) return text;
  }

  return navigator.clipboard.readText();
}
