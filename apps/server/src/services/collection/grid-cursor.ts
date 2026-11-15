import { UUID_PATTERN } from "@mnemee/id-shared";

const cursorPattern = new RegExp(
  String.raw`^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\|(${UUID_PATTERN})$`,
);

export function encodeGridCursor(timestamp: string, nodeId: string): string {
  return Buffer.from(`${timestamp}|${nodeId}`).toString("base64url");
}

export function decodeGridCursor(
  cursor: string,
): { timestamp: string; nodeId: string } | null {
  const value = Buffer.from(cursor, "base64url").toString("utf8");
  const match = cursorPattern.exec(value);
  if (!match) return null;
  const nodeId = match[2]!;
  if (!Number.isFinite(Date.parse(match[1]!.replace(" ", "T") + "Z")))
    return null;
  return { timestamp: match[1]!, nodeId };
}
