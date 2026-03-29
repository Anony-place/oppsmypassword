const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const toolsRoot = path.join(repoRoot, "tools");

const requiredSections = [
  "Run Tool",
  "Actionable Checklist",
  "Real-World Scenario",
  "Common Mistakes",
  "FAQ",
  "Sources"
];

const entries = fs
  .readdirSync(toolsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(toolsRoot, entry.name, "index.html"))
  .filter((filePath) => fs.existsSync(filePath));

if (entries.length === 0) {
  console.error("No tool pages found under tools/*/index.html");
  process.exit(1);
}

const errors = [];
const paragraphMap = new Map();

for (const filePath of entries) {
  const html = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(repoRoot, filePath);

  const textOnly = stripTags(html);
  const wordCount = countWords(textOnly);
  if (wordCount < 900) {
    errors.push(`${rel}: word count ${wordCount} < 900`);
  }

  for (const section of requiredSections) {
    if (!html.includes(`>${section}<`)) {
      errors.push(`${rel}: missing section heading "${section}"`);
    }
  }

  const faqMatches = [...html.matchAll(/<section class="card faq"[\s\S]*?<\/section>/g)];
  if (faqMatches.length === 0) {
    errors.push(`${rel}: FAQ section not found`);
  } else {
    const faqCount = (faqMatches[0][0].match(/<article>/g) || []).length;
    if (faqCount < 5) {
      errors.push(`${rel}: FAQ count ${faqCount} < 5`);
    }
  }

  const sourcesSectionMatch = html.match(/<section class="card" aria-labelledby="sources-heading">[\s\S]*?<\/section>/);
  if (!sourcesSectionMatch) {
    errors.push(`${rel}: Sources section not found`);
  } else {
    const sourceLinks = (sourcesSectionMatch[0].match(/<li><a /g) || []).length;
    if (sourceLinks < 3) {
      errors.push(`${rel}: source links ${sourceLinks} < 3`);
    }
  }

  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((match) => stripTags(match[1]).replace(/\s+/g, " ").trim().toLowerCase())
    .filter((text) => text.length >= 180);

  for (const para of paragraphs) {
    if (paragraphMap.has(para)) {
      errors.push(`${rel}: duplicate long paragraph also in ${paragraphMap.get(para)}`);
    } else {
      paragraphMap.set(para, rel);
    }
  }
}

if (errors.length > 0) {
  console.error("Tools content audit failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Tools content audit passed for ${entries.length} pages.`);

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  const matches = text.match(/\b[\p{L}\p{N}']+\b/gu);
  return matches ? matches.length : 0;
}

