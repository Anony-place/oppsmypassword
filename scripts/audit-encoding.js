const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const textExtensions = new Set([
  ".html",
  ".md",
  ".js",
  ".json",
  ".xml",
  ".txt",
  ".css",
  ".ps1"
]);

const offenders = [];
scan(repoRoot);

if (offenders.length > 0) {
  console.error("Encoding audit failed:");
  for (const item of offenders) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Encoding audit passed: no mojibake or replacement characters detected.");

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".firebase") continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(full);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) continue;

    const content = fs.readFileSync(full, "utf8");
    if (hasMojibake(content)) {
      offenders.push(path.relative(repoRoot, full).replace(/\\/g, "/"));
    }
  }
}

function hasMojibake(content) {
  // U+FFFD indicates broken decoding that already lost information.
  if (content.includes("\uFFFD")) return true;

  // Common UTF-8 interpreted as Windows-1252/Latin-1 artifacts.
  // Use escaped codepoints only so this file remains valid UTF-8.
  const mojibakePatterns = [
    /\u00e2\u20ac[\u0098\u0099\u009c\u009d\u0153\u0165\u201c\u201d\u2122]/u, // â€* family
    /\u00c2[\u0080-\u00bf]/u, // Â*
    /\u00c3[\u0080-\u00bf]/u // Ã*
  ];

  return mojibakePatterns.some((pattern) => pattern.test(content));
}
