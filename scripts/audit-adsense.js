const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const htmlFiles = [];
const issues = [];

collectHtml(repoRoot);

for (const file of htmlFiles) {
  const rel = norm(path.relative(repoRoot, file));
  const html = fs.readFileSync(file, "utf8");
  const hasAdsenseScript = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html);
  const hasAdsenseMeta = /google-adsense-account/i.test(html);

  const allowed =
    rel === "index.html" ||
    rel === "faq/index.html" ||
    rel === "best-practices/index.html" ||
    rel === "about/index.html" ||
    rel === "editorial-policy/index.html" ||
    rel === "guides/index.html" ||
    (rel.startsWith("guides/") && rel.endsWith(".html"));

  if (hasAdsenseScript && !allowed) {
    issues.push(`${rel}: AdSense script found on disallowed route`);
  }

  if (allowed && rel !== "index.html" && hasAdsenseMeta) {
    issues.push(`${rel}: google-adsense-account meta should exist on homepage only`);
  }

  if (rel === "index.html") {
    if (!hasAdsenseScript) {
      issues.push("index.html: AdSense script missing");
    }
    if (!hasAdsenseMeta) {
      issues.push("index.html: google-adsense-account meta missing");
    }
  }
}

if (issues.length > 0) {
  console.error("AdSense route audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`AdSense route audit passed for ${htmlFiles.length} HTML files.`);

function collectHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".firebase") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(full);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
}

function norm(value) {
  return value.replace(/\\/g, "/");
}