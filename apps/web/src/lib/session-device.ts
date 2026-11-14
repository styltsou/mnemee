const BROWSERS = [
  { name: "Edge", pattern: /Edg(?:A|iOS)?\/(\d+)/ },
  { name: "Opera", pattern: /(?:OPR|Opera)\/(\d+)/ },
  { name: "Samsung Internet", pattern: /SamsungBrowser\/(\d+)/ },
  { name: "Firefox", pattern: /(?:Firefox|FxiOS)\/(\d+)/ },
  { name: "Chrome", pattern: /(?:Chrome|CriOS)\/(\d+)/ },
  { name: "Safari", pattern: /Version\/(\d+).*Safari\// },
] as const;

function describeBrowser(ua: string) {
  for (const browser of BROWSERS) {
    const match = browser.pattern.exec(ua);
    if (match) return `${browser.name} ${match[1]}`;
  }
  return /Safari\//.test(ua) ? "Safari" : null;
}

function androidModel(ua: string) {
  const model =
    /Android [^;()]+;\s*(?:[a-z]{2}(?:[-_][A-Z]{2})?;\s*)?([^;()]+?)(?: Build\/[^;()]+)?[;)]/
      .exec(ua)?.[1]
      ?.trim();
  // Modern browsers often replace the actual model with the generic "K".
  if (
    !model ||
    /^(?:K|wv|Mobile|Tablet)$/i.test(model) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9 ._+-]{1,60}$/.test(model)
  )
    return null;
  return model.startsWith("SM-") ? `Samsung ${model}` : model;
}

/** Best-effort labels only. Browsers cannot reveal a user's device nickname. */
export function describeSessionDevice(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const browser = describeBrowser(ua);
  let name = "Unknown device";
  let platform: string | null = null;
  let type: "desktop" | "phone" | "tablet" | "unknown" = "unknown";

  if (/iPad/.test(ua)) {
    name = "iPad";
    platform = "iPadOS";
    type = "tablet";
  } else if (/iPhone|iPod/.test(ua)) {
    name = /iPod/.test(ua) ? "iPod" : "iPhone";
    platform = "iOS";
    type = "phone";
  } else if (/Android/.test(ua)) {
    type = /Mobile/.test(ua) ? "phone" : "tablet";
    name = androidModel(ua) ?? `Android ${type}`;
    platform = "Android";
  } else if (/Windows/.test(ua)) {
    name = "Windows PC";
    platform = "Windows";
    type = "desktop";
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    name = "Mac";
    platform = "macOS";
    type = "desktop";
  } else if (/CrOS/.test(ua)) {
    name = "ChromeOS device";
    platform = "ChromeOS";
    type = "desktop";
  } else if (/Linux/.test(ua)) {
    name = "Linux PC";
    platform = "Linux";
    type = "desktop";
  }

  return {
    name,
    label:
      browser && platform
        ? `${browser} on ${platform}`
        : (browser ?? platform ?? "Unknown browser or device"),
    type,
    mobile: type === "phone" || type === "tablet",
  };
}
