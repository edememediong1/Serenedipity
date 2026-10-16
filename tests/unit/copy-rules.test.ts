import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Design system voice rule: these words never appear in the interface or marketing.
const BANNED = /\b(therapist|therapy|therapies|counsell?ing|counsell?or|treatment|clinically proven)\b/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("copy rules", () => {
  it("never uses banned words in user-facing source", () => {
    const files = ["app", "components", "lib"].flatMap((d) => walk(join(process.cwd(), d)));
    const offenders = files.filter((f) => BANNED.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
