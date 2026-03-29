const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const metadataPath = path.join(repoRoot, "guides", "content-metadata.json");
const rssOutputPath = path.join(repoRoot, "rss.xml");

if (!fs.existsSync(metadataPath)) {
  console.error("No metadata found. Run npm run build:guides first.");
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
const BaseUrl = "https://oopsmypassword.web.app";

let rssCount = 0;
const lastBuildDate = new Date().toUTCString();

let rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>OopsMyPassword Cybersecurity Guides</title>
  <link>${BaseUrl}/guides/</link>
  <description>Actionable cybersecurity workflows, tools, and implementation checklists.</description>
  <language>en-us</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <atom:link href="${BaseUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

const sortedArticles = (metadata.articles || []).sort((a, b) => {
  return new Date(b.datePublished || b.dateModified) - new Date(a.datePublished || a.dateModified);
});

for (const article of sortedArticles) {
  if (rssCount >= 50) break; // Keep RSS feed to latest 50 for performance
  
  const pubDate = new Date(article.datePublished || article.dateModified || new Date()).toUTCString();
  const url = `${BaseUrl}/guides/${article.slug}.html`;
  
  rssXml += `
  <item>
    <title><![CDATA[${article.title}]]></title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description><![CDATA[${article.description}]]></description>
    <pubDate>${pubDate}</pubDate>
    <category><![CDATA[${article.cluster || "Cybersecurity"}]]></category>
  </item>`;
  
  rssCount++;
}

rssXml += `
</channel>
</rss>`;

fs.writeFileSync(rssOutputPath, rssXml.trim() + "\n", "utf8");
console.log(`Generated RSS Feed at ${rssOutputPath} with ${rssCount} items.`);
