const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(repoRoot, "guides", "source");
const minWordCountStandard = 900;
const minWordCountPillar = 1400;

if (!fs.existsSync(sourceDir)) {
  console.error(`Missing source directory: ${sourceDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith(".md"))
  .sort();

if (files.length === 0) {
  console.error("No guide markdown files found in guides/source.");
  process.exit(1);
}

const requiredHeadings = new Set([
  "Problem Context",
  "Actionable Steps",
  "Common Mistakes",
  "Real-World Scenario",
  "Maintenance Checklist",
  "Failure Signals",
  "Implementation Notes",
  "Key Takeaways"
]);

const reservedHeadings = new Set(["FAQ", "Sources"]);
const sharedTemplateSections = new Set([
  "Operational Rollout Plan",
  "Advanced Practical Notes"
]);
const errors = [];
const paragraphIndex = new Map();

for (const file of files) {
  const filePath = path.join(sourceDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};
  const body = (parsed.content || "").trim();

  if (!body) {
    errors.push(`${file}: missing content body`);
    continue;
  }

  const wordCount = countWords(body);
  const targetMin =
    String(data.intent_stage || "").toLowerCase() === "pillar"
      ? minWordCountPillar
      : minWordCountStandard;

  if (wordCount < targetMin) {
    errors.push(`${file}: word count ${wordCount} below minimum ${targetMin}`);
  }

  const requiredMetadataFields = [
    "intent_stage",
    "who_is_for",
    "author_url",
    "reviewed_by",
    "reviewed_on",
    "change_log",
    "commercial_intent",
    "affiliate_slot",
    "affiliate_disclosure",
    "last_offer_reviewed_on"
  ];

  for (const field of requiredMetadataFields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`${file}: missing metadata field ${field}`);
    }
  }

  const commercialIntent = String(data.commercial_intent || "").toLowerCase();
  if (!["low", "medium", "high"].includes(commercialIntent)) {
    errors.push(`${file}: commercial_intent must be one of low, medium, high`);
  }

  const affiliateSlot = String(data.affiliate_slot || "").toLowerCase();
  if (!["none", "password_manager"].includes(affiliateSlot)) {
    errors.push(`${file}: affiliate_slot must be one of none, password_manager`);
  }

  if (typeof data.affiliate_disclosure !== "boolean") {
    errors.push(`${file}: affiliate_disclosure must be boolean`);
  }

  const lastOfferReviewedOn = String(data.last_offer_reviewed_on || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastOfferReviewedOn)) {
    errors.push(`${file}: last_offer_reviewed_on must be YYYY-MM-DD`);
  }

  if (affiliateSlot !== "none" && data.affiliate_disclosure !== true) {
    errors.push(`${file}: affiliate_disclosure must be true when affiliate_slot is active`);
  }

  if (!Array.isArray(data.faq) || data.faq.length === 0) {
    errors.push(`${file}: faq must be a non-empty array`);
  }
  if (!Array.isArray(data.sources) || data.sources.length < 3) {
    errors.push(`${file}: sources must include at least 3 entries`);
  }

  if (!Array.isArray(data.change_log) || data.change_log.length === 0) {
    errors.push(`${file}: change_log must be a non-empty array`);
  }

  const headings = getH2Headings(body);
  const missing = [...requiredHeadings].filter(
    (heading) => !headings.includes(heading)
  );
  if (missing.length > 0) {
    errors.push(`${file}: missing sections -> ${missing.join(", ")}`);
  }

  const extra = headings.filter(
    (heading) =>
      !requiredHeadings.has(heading) && !reservedHeadings.has(heading)
  );
  if (extra.length === 0) {
    errors.push(`${file}: missing unique extra section heading`);
  }

  const paragraphs = extractParagraphsBySection(body);
  for (const paragraph of paragraphs) {
    const normalized = normalizeParagraph(paragraph.text);
    if (normalized.length < 200) continue;

    const seen = paragraphIndex.get(normalized) || [];
    let hasError = false;

    for (const prior of seen) {
      if (prior.file === file) {
        errors.push(`${file}: duplicate paragraph detected (also in ${prior.file})`);
        hasError = true;
        break;
      }

      const allowedCrossFile =
        isSharedTemplateSection(prior.section) &&
        isSharedTemplateSection(paragraph.section);

      if (!allowedCrossFile) {
        errors.push(`${file}: duplicate paragraph detected (also in ${prior.file})`);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      seen.push({ file, section: paragraph.section });
      paragraphIndex.set(normalized, seen);
    }
  }
}

if (errors.length > 0) {
  console.error("Content audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Content audit passed for ${files.length} guides.`);

function countWords(text) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#+\s.*$/gm, " ")
    .replace(/[*_>~=-]/g, " ");
  const matches = cleaned.match(/\b[\p{L}\p{N}']+\b/gu);
  return matches ? matches.length : 0;
}

function getH2Headings(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim());
}

function normalizeParagraph(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isSharedTemplateSection(sectionHeading) {
  return sharedTemplateSections.has(sectionHeading || "");
}

function extractParagraphsBySection(markdown) {
  const sections = splitSections(markdown);
  const result = [];

  for (const section of sections) {
    const blocks = extractParagraphBlocks(section.body);
    for (const block of blocks) {
      result.push({ section: section.heading, text: block });
    }
  }

  return result;
}

function splitSections(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(/^##\s+(.+)$/gm)];

  if (matches.length === 0) {
    return [{ heading: "", body: normalized }];
  }

  const sections = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const heading = (current[1] || "").trim();
    const bodyStart = current.index + current[0].length;
    const bodyEnd = next ? next.index : normalized.length;
    const body = normalized.slice(bodyStart, bodyEnd).trim();
    sections.push({ heading, body });
  }

  return sections;
}

function extractParagraphBlocks(markdown) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const blocks = withoutCode.split(/\n{2,}/);
  return blocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .filter((block) => !/^#{1,6}\s/.test(block))
    .filter((block) => !/^(\*|-|\d+\.)\s/.test(block))
    .filter((block) => !/^>/.test(block));
}
