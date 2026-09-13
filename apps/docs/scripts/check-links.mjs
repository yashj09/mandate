// Walks content/docs/**/*.mdx and asserts every internal link (/docs/... or relative) resolves to a page or anchor-less folder.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";

const root = resolve("content/docs");
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith(".mdx") && files.push(p); } })(root);

const slugs = new Set(files.map((f) => { let s = relative(root, f).replace(/\.mdx$/, "").split(sep).join("/"); if (s.endsWith("/index")) s = s.slice(0, -6); if (s === "index") s = ""; return "/docs" + (s ? "/" + s : ""); }));

let bad = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const dir = "/docs" + (dirname(relative(root, f)) === "." ? "" : "/" + dirname(relative(root, f)).split(sep).join("/"));
  for (const m of src.matchAll(/(?:href=\"|\]\()([^\")\s#]+)(#[^\")\s]*)?[\")]/g)) {
    const href = m[1];
    if (/^(https?:|mailto:)/.test(href)) continue;
    let target = href.startsWith("/") ? href : resolve(dir, href).replace(/\\/g, "/");
    target = target.replace(/\/$/, "");
    if (!slugs.has(target)) { bad++; console.log(`${relative(process.cwd(), f)}: ${href} -> ${target} (missing)`); }
  }
}
console.log(bad ? `${bad} broken link(s)` : `all internal links resolve (${files.length} pages)`);
process.exit(bad ? 1 : 0);
