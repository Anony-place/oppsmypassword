const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const htmlFiles = [];
const skipDirs = new Set(["node_modules", ".firebase", ".git"]);

walk(repoRoot);

if (htmlFiles.length === 0) {
  fail("No HTML files found.");
}

const titleMap = new Map();
const canonicalMap = new Map();
const errors = [];

for (const file of htmlFiles) {
  const rel = normalize(path.relative(repoRoot, file));
  const html = fs.readFileSync(file, "utf8");

  const title = capture(html, /<title>([\s\S]*?)<\/title>/i);
  if (!title || !title.trim()) {
    errors.push(`${rel}: missing <title>`);
  } else {
    const key = title.trim();
    if (titleMap.has(key)) {
      errors.push(`${rel}: duplicate title also in ${titleMap.get(key)}`);
    } else {
      titleMap.set(key, rel);
    }
  }

  const description = capture(html, /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?\s*>/i);
  if (!description || description.trim().length < 70) {
    errors.push(`${rel}: missing or thin meta description (need >= 70 chars)`);
  }

  const robots = capture(html, /<meta\s+name=["']robots["']\s+content=["']([\s\S]*?)["']\s*\/?\s*>/i) || "";
  const noindex = robots.toLowerCase().includes("noindex");

  const canonical = capture(html, /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']\s*\/?\s*>/i);
  if (!noindex) {
    if (!canonical) {
      errors.push(`${rel}: indexable page missing canonical`);
    } else {
      if (!/^https:\/\//i.test(canonical)) {
        errors.push(`${rel}: canonical must be absolute https URL`);
      }
      if (canonicalMap.has(canonical)) {
        errors.push(`${rel}: duplicate canonical also in ${canonicalMap.get(canonical)}`);
      } else {
        canonicalMap.set(canonical, rel);
      }
    }
  }

  const isContentRoute =
    rel === "index.html" ||
    rel === "faq/index.html" ||
    rel === "best-practices/index.html" ||
    rel === "about/index.html" ||
    rel === "editorial-policy/index.html" ||
    rel.startsWith("guides/") ||
    rel.startsWith("tools/");

  if (isContentRoute && !html.includes("application/ld+json")) {
    errors.push(`${rel}: content page missing JSON-LD`);
  }
}

if (errors.length > 0) {
  console.error("SEO audit failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log(`SEO audit passed for ${htmlFiles.length} pages.`);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
}

function capture(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : "";
}

function normalize(value) {
  return value.replace(/\\/g, "/");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
