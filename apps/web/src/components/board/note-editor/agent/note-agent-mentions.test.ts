import { describe, expect, it } from "vitest";

import type { NoteMentionTarget } from "@/api/note-mentions";

import { mentionQueryBefore, mentionsForRequest } from "./note-agent-mentions";

describe("mentionQueryBefore", () => {
  it("finds the @query being typed before the caret", () => {
    const text = "summarize @road";
    expect(mentionQueryBefore(text, text.length)).toEqual({
      text: "road",
      start: 10,
      end: 15,
    });
  });

  it("opens on a bare @ at the start or after a space", () => {
    expect(mentionQueryBefore("@", 1)?.text).toBe("");
    expect(mentionQueryBefore("use @", 5)?.text).toBe("");
  });

  it("ignores emails and finished mentions", () => {
    expect(mentionQueryBefore("mail me@home", 12)).toBeNull();
    expect(mentionQueryBefore("@road map", 9)).toBeNull();
  });
});

describe("mentionsForRequest", () => {
  it("sends each mention's ID and type only", () => {
    const target = (assetId: string, assetType: "note" | "link" | "color") =>
      ({
        assetId,
        assetType,
        label: "x",
        title: "x",
        hex: null,
        gradient: null,
        snippet: null,
        locationLabel: "Inbox",
        collectionSlug: null,
        folderPath: null,
      }) satisfies NoteMentionTarget;

    expect(
      mentionsForRequest([
        target("00000000-0000-4000-8000-000000000001", "note"),
        target("00000000-0000-4000-8000-000000000002", "link"),
        target("00000000-0000-4000-8000-000000000003", "color"),
      ]),
    ).toEqual([
      { assetId: "00000000-0000-4000-8000-000000000001", type: "note" },
      { assetId: "00000000-0000-4000-8000-000000000002", type: "link" },
      { assetId: "00000000-0000-4000-8000-000000000003", type: "color" },
    ]);
  });
});
