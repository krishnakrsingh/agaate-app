import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Design guard: filled surfaces must have border == fill.
 * Borders are allowed for: inputs/controls (outline), hairline dividers
 * (borderTop/Bottom), image frames, and the neutral white default tone.
 * Anything below is a regression — fix the source, not this test.
 */
const SRC = path.join(process.cwd(), "src");

function collect(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      collect(p, out);
    } else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// [rule, pattern, allowedFiles]
const BANNED: Array<{ rule: string; pattern: RegExp; allow?: RegExp }> = [
  { rule: "off-palette hex", pattern: /#(34d399|25d366|fbbf24|3b82f6|60a5fa|ef4444|10b981)\b/i },
  {
    rule: "neon rgba",
    pattern: /rgba\(\s*(16,\s*185,\s*129|52,\s*211,\s*153|59,\s*130,\s*246|239,\s*68,\s*68|207,\s*160,\s*78|166,\s*59,\s*50|154,\s*104,\s*24)/,
  },
  { rule: "contrast ring (static)", pattern: /1\.5px solid var\(--(green|red)\)/ },
  { rule: "contrast ring (dynamic color into border)", pattern: /solid \$\{(s|g)\.color\}/ },
  { rule: "undefined token --brand", pattern: /var\(--brand\)/ },
  { rule: "undefined token --surface-muted", pattern: /var\(--surface-muted\)/ },
  { rule: "undefined token --muted-fg", pattern: /var\(--muted-fg\)/ },
  { rule: "undefined token --fg", pattern: /var\(--fg\)/ },
  { rule: "tinted fill with grey border (stone)", pattern: /var\(--stone\).*border:\s*["']1px solid var\(--line/ },
  { rule: "tinted fill with grey border (green)", pattern: /var\(--green-light\).*border:\s*["']1px solid var\(--line/ },
  { rule: "tinted fill with grey border (red)", pattern: /var\(--red-light\).*border:\s*["']1px solid var\(--line/ },
  { rule: "tinted fill with grey border (amber)", pattern: /var\(--amber-light\).*border:\s*["']1px solid var\(--line/ },
  { rule: "tinted fill with grey border (blue)", pattern: /var\(--blue-light\).*border:\s*["']1px solid var\(--line/ },
  { rule: "status-color full border on white", pattern: /border:\s*["']1px solid var\(--(red|green|amber|blue|danger)\)["']/ },
];

describe("design guard: tonal surfaces", () => {
  const files = collect(SRC);
  for (const { rule, pattern } of BANNED) {
    it(`no ${rule}`, () => {
      const hits: string[] = [];
      for (const f of files) {
        const lines = fs.readFileSync(f, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (pattern.test(line)) hits.push(`${path.relative(process.cwd(), f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
      expect(hits, `violations of "${rule}"`).toEqual([]);
    });
  }
});
