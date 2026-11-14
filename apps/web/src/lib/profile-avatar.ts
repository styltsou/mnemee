import { apiPostFile } from "@/lib/api";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function uploadProfilePhoto(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image.");
  }
  if (!file.size || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image smaller than 20 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read this image.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      512,
      512,
    );
  } finally {
    bitmap.close();
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob || blob.type !== "image/webp") {
    throw new Error("Could not prepare this image.");
  }
  signal?.throwIfAborted();
  const prepared = new File([blob], "avatar.webp", { type: "image/webp" });
  const { avatar } = await apiPostFile<{ avatar: string }>(
    "/api/v1/profile/avatar",
    prepared,
    signal,
  );
  return avatar;
}
