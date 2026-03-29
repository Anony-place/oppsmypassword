const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const htmlFiles = [];
const missing = [];

collectHtml(repoRoot);

for (const file of htmlFiles) {
  const rel = norm(path.relative(repoRoot, file));
  const html = fs.readFileSync(file, "utf8");
  const hrefMatches = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)];

  for (const match of hrefMatches) {
    const href = match[1].trim();
    if (!href || href.startsWith("#")) continue;
    if (/^(https?:|mailto:|tel:|data:)/i.test(href)) continue;

    if (href.startsWith("/")) {
      const target = toAbsolutePath(href);
      if (!target || !existsLocal(target)) {
        missing.push(`${rel} -> ${href}`);
      }
      continue;
    }

    const fromDir = path.dirname(file);
    const joined = path.resolve(fromDir, href.split("#")[0].split("?")[0]);
    if (!existsLocal(joined)) {
      missing.push(`${rel} -> ${href}`);
    }
  }
}

const sitemapIndexPath = path.join(repoRoot, "sitemap-index.xml");
if (!fs.existsSync(sitemapIndexPath)) {
  missing.push("sitemap-index.xml missing");
} else {
  const indexXml = fs.readFileSync(sitemapIndexPath, "utf8");
  const sitemapLocs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const loc of sitemapLocs) {
    const pathname = parseUrlPath(loc);
    if (!pathname) {
      missing.push(`Invalid sitemap loc URL: ${loc}`);
      continue;
    }
    const sitemapFile = path.join(repoRoot, pathname.replace(/^\//, ""));
    if (!fs.existsSync(sitemapFile)) {
      missing.push(`Sitemap file missing for index loc: ${loc}`);
      continue;
    }

    const sitemapXml = fs.readFileSync(sitemapFile, "utf8");
    const urlLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const urlLoc of urlLocs) {
      const p = parseUrlPath(urlLoc);
      if (!p) {
        missing.push(`Invalid URL loc in ${pathname}: ${urlLoc}`);
        continue;
      }
      const filePath = toAbsolutePath(p);
      if (!filePath || !existsLocal(filePath)) {
        missing.push(`${pathname} references missing path ${p}`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error("Links audit failed:");
  for (const line of missing) console.error(`- ${line}`);
  process.exit(1);
}

console.log(`Links audit passed for ${htmlFiles.length} HTML pages and sitemap references.`);

function collectHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".firebase") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(full);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
}

function toAbsolutePath(webPath) {
  const clean = webPath.split("#")[0].split("?")[0];
  if (!clean.startsWith("/")) return null;

  if (clean.endsWith("/")) {
    return path.join(repoRoot, clean.replace(/^\//, ""), "index.html");
  }

  return path.join(repoRoot, clean.replace(/^\//, ""));
}

function existsLocal(candidate) {
  if (fs.existsSync(candidate)) return true;
  if (candidate.endsWith(".html") && fs.existsSync(candidate.slice(0, -5))) return true;
  return false;
}

function parseUrlPath(value) {
  try {
    const url = new URL(value);
    return url.pathname;
  } catch (error) {
    return "";
  }
}

function norm(value) {
  return value.replace(/\\/g, "/");
}