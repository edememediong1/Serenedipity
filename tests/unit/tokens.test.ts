import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tokens from "@/design/tokens.json";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8").toLowerCase();

/** Normalise "rgba(255,255,255,0.06)" and "rgba(255, 255, 255, 0.06)" etc. for comparison. */
const norm = (v: string) =>
  v
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/0\.(\d)0\)/, "0.$1)");

function declaredValues(block: string, name: string) {
  const re = new RegExp(`--color-${name}:\\s*([^;]+);`, "g");
  return [...block.matchAll(re)].map((m) => norm(m[1]));
}

const themeBlock = css.slice(css.indexOf("@theme static"), css.indexOf("@keyframes fade-in"));
const lightBlock = css.slice(css.indexOf('[data-theme="light"] {'), css.indexOf("/* typography styles"));

describe("design tokens", () => {
  for (const token of tokens.color.tokens) {
    const value = token.value;
    if (typeof value === "string") continue; // aliases such as focus-ring
    it(`exposes ${token.name} for Night and Day`, () => {
      expect(declaredValues(themeBlock, token.name)).toContain(norm(value.dark));
      expect(declaredValues(lightBlock, token.name)).toContain(norm(value.light));
    });
  }

  it("exposes every radius and spacing token", () => {
    for (const t of tokens.radius.tokens) expect(css).toContain(`--${t.name}: ${t.value};`);
    for (const t of tokens.spacing.tokens) expect(css).toContain(`--spacing-${t.name}: ${t.value};`);
  });

  it("defines every type style", () => {
    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        const util =
          style.name === "heading-1"
            ? "h1"
            : style.name.replace("heading-", "h").replace("body-small", "body-sm");
        const block = css.slice(css.indexOf(`@utility type-${util} {`));
        expect(block).toContain(`font-size: ${style.fontSize};`);
        expect(block).toContain(`line-height: ${style.lineHeight};`);
      }
    }
  });
});
