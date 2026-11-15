import { describe, expect, it } from "vitest";

import {
  parseUrlResolutionJob,
  urlResolutionJob,
} from "@mnemee/url-unfurl-shared/resolution-job";

describe("URL resolution queue contract", () => {
  it("round-trips a versioned command", () => {
    const job = urlResolutionJob("00000000-0000-4000-8000-00000000000c", 4);
    expect(parseUrlResolutionJob(job)).toEqual(job);
  });

  it("rejects unknown or malformed commands", () => {
    expect(() =>
      parseUrlResolutionJob({
        version: 1,
        kind: "other-task",
        attemptId: "00000000-0000-4000-8000-00000000000c",
        generation: 4,
      }),
    ).toThrow("Invalid URL resolution job");
  });
});
