# AdSense and SEO Readiness Checklist

## Weekly tracking
- Published deep guides count (target: 30+ live).
- Indexed pages count in Google Search Console.
- Search impressions and clicks trend by guide cluster.
- Coverage issues and crawl errors.
- Sitemap status and last successful fetch date.
- Route-level AdSense policy compliance (`npm run audit:adsense`).

## Pre-application quality gates
- `guides/content-metadata.json` contains complete metadata contract for each article.
- All guide pages include Article JSON-LD fields: `headline`, `description`, `author`, `contributor`, `publisher`, `datePublished`, `dateModified`, `mainEntityOfPage`.
- All tool pages include WebApplication + FAQ structured data and pass `scripts/tools-content-audit.js`.
- Non-guide trust pages are generated through shared templates with consistent canonical, nav, and footer links.
- All sitemap URLs return `200 OK`.
- Non-legal pages in ranking path are not thin content.
- Footer links to Privacy, About, FAQ, Contact, Terms, and Editorial Policy are visible sitewide.
- No placeholder or empty ad-like components on content pages.
- AdSense script appears only on monetized content routes (home, guides, faq, best-practices), not legal or utility tool pages.
- Encoding audit passes (no mojibake or replacement characters).

## AdSense submit gate
Submit only when all of the following are true:
1. At least 30 guide pages are live and internally linked.
2. Sitemap index and child sitemaps have been successfully fetched in Search Console.
3. No critical structured-data errors on guide pages.
4. Content updates are timestamped and editorial process is visible.
5. Manual QA run completed on mobile and desktop.

## Rejection response workflow
1. Record rejection date and exact policy reason.
2. Map policy reason to specific URLs and page elements.
3. Apply fixes within 7 days.
4. Re-run technical QA (`robots.txt`, sitemap, schema, internal links).
5. Reapply only after updated pages are crawled and indexed.
