import { describe, expect, it } from "vitest";
import { describeSessionDevice } from "./session-device";

describe("session device labels", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0",
      "Edge 131 on Windows",
      false,
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 OPR/116.0",
      "Opera 116 on Windows",
      false,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/131.0 Mobile/15E148 Safari/604.1",
      "Chrome 131 on iOS",
      true,
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari 18 on iPadOS",
      true,
    ],
    [
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36",
      "Chrome 131 on Android",
      true,
    ],
    [
      "Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      "Chrome 131 on ChromeOS",
      false,
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
      "Firefox 133 on Linux",
      false,
    ],
    [null, "Unknown browser or device", false],
    ["Some unknown client", "Unknown browser or device", false],
  ])(
    "labels %s without confusing overlapping browser tokens",
    (ua, label, mobile) => {
      expect(describeSessionDevice(ua)).toMatchObject({ label, mobile });
    },
  );

  it("shows an Android model only when it is actually present", () => {
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Linux; Android 16; Pixel 9 Build/BP2A) AppleWebKit/537.36 Chrome/143.0 Mobile Safari/537.36",
      ),
    ).toMatchObject({
      name: "Pixel 9",
      type: "phone",
      label: "Chrome 143 on Android",
    });
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/143.0 Mobile Safari/537.36",
      ),
    ).toMatchObject({ name: "Android phone", type: "phone" });
  });

  it("recognizes Samsung's browser before Chrome's compatibility token", () => {
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Linux; Android 14; SM-G991B Build/UP1A) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 SamsungBrowser/27.0",
      ),
    ).toMatchObject({
      name: "Samsung SM-G991B",
      label: "Samsung Internet 27 on Android",
    });
  });

  it("does not infer a laptop model or Windows version from reduced user agents", () => {
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/143.0 Safari/537.36",
      ),
    ).toMatchObject({
      name: "Windows PC",
      label: "Chrome 143 on Windows",
      type: "desktop",
    });
  });
});
