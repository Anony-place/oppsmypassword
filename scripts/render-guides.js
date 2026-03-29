const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(repoRoot, "guides", "source");
const outputDir = path.join(repoRoot, "guides");
const affiliateOffersPath = path.join(repoRoot, "content", "affiliate-offers.json");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});

const args = parseArgs(process.argv);
const baseUrl = args["base-url"] || "https://oopsmypassword.web.app";
const defaultAuthorName = args["author-name"] || "OopsMyPassword Editorial Team";
const defaultAuthorEditor = args["author-editor"] || "Suraj Baishya";
const sharedAssetVersion = "20260228v4";

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

const affiliateOffers = loadAffiliateOffers(affiliateOffersPath);
const activeAffiliateOffersByCategory = buildActiveOfferMap(affiliateOffers);

const guides = files.map((file) => {
  const filePath = path.join(sourceDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};
  const body = (parsed.content || "").trim();
  const slug = data.slug || path.basename(file, ".md");

  if (!body) {
    throw new Error(`Guide ${file} is missing content.`);
  }

  const requiredFields = [
    "title",
    "description",
    "cluster",
    "primary_keyword",
    "secondary_keywords",
    "date_published",
    "date_modified",
    "word_count_target"
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Guide ${file} missing required field: ${field}`);
    }
  }

  if (!Array.isArray(data.secondary_keywords)) {
    throw new Error(`Guide ${file} secondary_keywords must be an array.`);
  }
  if (!Array.isArray(data.faq) || data.faq.length === 0) {
    throw new Error(`Guide ${file} faq must be a non-empty array.`);
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    throw new Error(`Guide ${file} sources must be a non-empty array.`);
  }

  const commercialIntent = String(data.commercial_intent || "").toLowerCase();
  const affiliateSlot = String(data.affiliate_slot || "").toLowerCase();
  const affiliateDisclosure = data.affiliate_disclosure;
  const lastOfferReviewedOn = String(data.last_offer_reviewed_on || "");

  if (!["low", "medium", "high"].includes(commercialIntent)) {
    throw new Error(
      `Guide ${file} commercial_intent must be one of: low, medium, high.`
    );
  }
  if (!["none", "password_manager"].includes(affiliateSlot)) {
    throw new Error(
      `Guide ${file} affiliate_slot must be one of: none, password_manager.`
    );
  }
  if (typeof affiliateDisclosure !== "boolean") {
    throw new Error(`Guide ${file} affiliate_disclosure must be boolean.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastOfferReviewedOn)) {
    throw new Error(
      `Guide ${file} last_offer_reviewed_on must be in YYYY-MM-DD format.`
    );
  }
  if (affiliateSlot !== "none" && !affiliateDisclosure) {
    throw new Error(
      `Guide ${file} must set affiliate_disclosure=true when affiliate_slot is active.`
    );
  }

  let affiliateOffer = null;
  if (affiliateSlot !== "none" && (commercialIntent === "medium" || commercialIntent === "high")) {
    affiliateOffer = activeAffiliateOffersByCategory.get(affiliateSlot) || null;
    if (!affiliateOffer) {
      throw new Error(
        `Guide ${file} references affiliate slot "${affiliateSlot}" but no active offer is configured.`
      );
    }
  }

  const authorName = data.author_name || defaultAuthorName;
  const authorEditor = data.author_editor || defaultAuthorEditor;
  const whoIsFor =
    data.who_is_for ||
    "Individuals, families, and small teams improving cybersecurity controls.";
  const authorUrl = data.author_url || `${baseUrl}/about/`;
  const reviewedBy = data.reviewed_by || authorEditor;
  const reviewedOn = data.reviewed_on || data.date_modified;
  const intentStage = data.intent_stage || "standard";
  const changeLog = Array.isArray(data.change_log) && data.change_log.length > 0
    ? data.change_log.map((entry) => normalizeChangeLogEntry(entry))
    : [
      {
        date: data.date_modified,
        summary: "Initial publication and editorial review."
      }
    ];

  const wordCount = countWords(body);
  const readingTimeMinutes =
    data.reading_time_minutes || Math.max(1, Math.ceil(wordCount / 200));

  const clusterSlug = slugify(data.cluster);

  return {
    file,
    slug,
    title: data.title,
    description: data.description,
    cluster: data.cluster,
    primaryKeyword: data.primary_keyword,
    secondaryKeywords: data.secondary_keywords,
    datePublished: data.date_published,
    dateModified: data.date_modified,
    authorName,
    authorEditor,
    whoIsFor,
    authorUrl,
    reviewedBy,
    reviewedOn,
    intentStage,
    commercialIntent,
    affiliateSlot,
    affiliateDisclosure,
    lastOfferReviewedOn,
    affiliateOffer,
    changeLog,
    clusterSlug,
    wordCountTarget: data.word_count_target,
    readingTimeMinutes,
    faq: data.faq,
    sources: data.sources,
    body,
    bodyHtml: md.render(body),
    wordCount
  };
});

const clusters = buildClusterIndex(guides);
for (const guide of guides) {
  const html = renderGuidePage(guide, guides, baseUrl);
  const outPath = path.join(outputDir, `${guide.slug}.html`);
  fs.writeFileSync(outPath, html);
}

const indexHtml = renderGuideIndex(guides, clusters, baseUrl);
fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml);

const metadata = buildMetadata(guides, baseUrl);
fs.writeFileSync(
  path.join(outputDir, "content-metadata.json"),
  JSON.stringify(metadata, null, 2)
);

console.log(
  `Rendered ${guides.length} guides, guides/index.html, and guides/content-metadata.json`
);

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function buildClusterIndex(guidesList) {
  const clustersIndex = new Map();
  for (const guide of guidesList) {
    if (!clustersIndex.has(guide.cluster)) {
      clustersIndex.set(guide.cluster, []);
    }
    clustersIndex.get(guide.cluster).push(guide);
  }
  return clustersIndex;
}

function relatedGuides(guidesList, current) {
  const sameCluster = guidesList.filter(
    (guide) => guide.cluster === current.cluster && guide.slug !== current.slug
  );
  const picks = sameCluster.slice(0, 3);
  if (picks.length < 3) {
    const rest = guidesList.filter(
      (guide) =>
        guide.slug !== current.slug && !picks.some((item) => item.slug === guide.slug)
    );
    picks.push(...rest.slice(0, 3 - picks.length));
  }
  return picks;
}

function normalizeChangeLogEntry(entry) {
  if (typeof entry === "string") {
    return {
      date: "",
      summary: entry
    };
  }

  if (!entry || typeof entry !== "object") {
    return {
      date: "",
      summary: "Content update logged."
    };
  }

  return {
    date: entry.date || "",
    summary: entry.summary || "Content update logged."
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderGuidePage(guide, allGuides, urlBase) {
  const canonical = `${urlBase}/guides/${guide.slug}.html`;
  const faqItems = guide.faq
    .map(
      (item) => `
        <article>
          <h3>${escapeHtml(item.q)}</h3>
          <p>${escapeHtml(item.a)}</p>
        </article>`
    )
    .join("");

  const sourcesItems = guide.sources
    .map(
      (source) => `
          <li><a href="${escapeHtml(
            source.url
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            source.name
          )}</a></li>`
    )
    .join("");

  const relatedItems = relatedGuides(allGuides, guide)
    .map(
      (item) =>
        `<li><a href="/guides/${item.slug}.html">Read: ${escapeHtml(
          item.title
        )}</a></li>`
    )
    .join("");

  const changeLogItems = guide.changeLog
    .map((entry) => {
      const prefix = entry.date ? `<strong>${escapeHtml(entry.date)}:</strong> ` : "";
      return `<li>${prefix}${escapeHtml(entry.summary)}</li>`;
    })
    .join("");

  const affiliateSection = guide.affiliateOffer
    ? `
      <section class="card content-card" aria-labelledby="${escapeHtml(
        guide.slug
      )}-affiliate-heading">
        <h2 id="${escapeHtml(guide.slug)}-affiliate-heading">${escapeHtml(
          guide.affiliateOffer.title
        )}</h2>
        <p>${escapeHtml(guide.affiliateOffer.disclosure)}</p>
        <p><a class="cta-link" href="${escapeHtml(
          guide.affiliateOffer.url
        )}" target="_blank" rel="sponsored nofollow noopener">${escapeHtml(
          guide.affiliateOffer.cta
        )}</a></p>
      </section>`
    : "";

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Person", name: guide.authorName },
    contributor: [{ "@type": "Person", name: guide.reviewedBy }],
    publisher: {
      "@type": "Organization",
      name: "OopsMyPassword",
      logo: {
        "@type": "ImageObject",
        url: `${urlBase}/assets/img/icons/icon-512.png`
      }
    },
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    mainEntityOfPage: canonical,
    inLanguage: "en",
    about: guide.cluster
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OopsMyPassword",
    url: `${urlBase}/`,
    logo: `${urlBase}/assets/img/icons/icon-512.png`
  };

  return `<!doctype html>
<html lang="en" data-theme="dark" data-theme-mode="system" data-theme-ready="false">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>(function(){var root=document.documentElement;var mode=\"system\";try{var stored=localStorage.getItem(\"omp-theme\");if(stored===\"dark\"||stored===\"light\"||stored===\"system\"){mode=stored;}}catch(e){}var dark=window.matchMedia&&window.matchMedia(\"(prefers-color-scheme: dark)\").matches;var resolved=mode===\"system\"?(dark?\"dark\":\"light\"):mode;root.dataset.themeMode=mode;root.dataset.theme=resolved;root.setAttribute(\"data-theme-ready\",\"true\");})();</script>
  <noscript><style>html[data-theme-ready="false"]{visibility:visible;}</style></noscript>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5826652112388036" crossorigin="anonymous"></script>
  <title>${escapeHtml(guide.title)} | OopsMyPassword</title>
  <meta name="description" content="${escapeHtml(guide.description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#0a0f14">
  <link rel="canonical" href="${canonical}">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="OopsMyPassword">
  <meta property="og:title" content="${escapeHtml(guide.title)} | OopsMyPassword">
  <meta property="og:description" content="${escapeHtml(guide.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${urlBase}/assets/img/og-cover.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(guide.title)} | OopsMyPassword">
  <meta name="twitter:description" content="${escapeHtml(guide.description)}">
  <meta name="twitter:image" content="${urlBase}/assets/img/og-cover.svg">
  <link rel="stylesheet" href="../assets/css/tokens.css?v=${sharedAssetVersion}">
  <link rel="stylesheet" href="../assets/css/app.css?v=${sharedAssetVersion}">
  <link rel="stylesheet" href="../assets/css/content.css?v=${sharedAssetVersion}">
  <script type="application/ld+json">${JSON.stringify(articleLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  <script type="application/ld+json">${JSON.stringify(orgLd)}</script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="page">
    <header class="site-header">
      <div class="topbar">
        <a class="brand" href="/">OopsMyPassword</a>
        <nav class="site-nav" aria-label="Primary">
          <ul class="nav-list">
            <li><a href="/">Home</a></li>
            <li><a class="is-active" href="/guides/">Guides</a></li>
            <li><a href="/faq/">FAQ</a></li>
            <li><a href="/best-practices/">Best Practices</a></li>
            <li><a href="/about/">About</a></li>
            <li><a href="/contact/">Contact</a></li>
            <li><a href="/terms/">Terms</a></li>
          </ul>
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Theme: System" aria-pressed="false" title="Theme: System">Theme: System</button>
      </div>
    </header>
    <main id="main-content" class="content-main">
      <article class="card content-card">
        <h1>${escapeHtml(guide.title)}</h1>
        <p>${escapeHtml(guide.description)}</p>
        <p><strong>Cluster:</strong> ${escapeHtml(
          guide.cluster
        )} | <strong>Intent stage:</strong> ${escapeHtml(
          guide.intentStage
        )} | <strong>Primary keyword:</strong> ${escapeHtml(
          guide.primaryKeyword
        )}</p>
        <p><strong>Published:</strong> ${escapeHtml(
          guide.datePublished
        )} | <strong>Updated:</strong> ${escapeHtml(
          guide.dateModified
        )} | <strong>Reviewed:</strong> ${escapeHtml(
          guide.reviewedOn
        )} | <strong>Reading time:</strong> ${escapeHtml(
          guide.readingTimeMinutes
        )} minutes</p>
        <p><strong>Who this is for:</strong> ${escapeHtml(guide.whoIsFor)}</p>
${guide.bodyHtml}
      </article>
      <section class="card content-card faq-list" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently Asked Questions</h2>
        ${faqItems}
      </section>
      <section class="card content-card" aria-labelledby="author-heading">
        <h2 id="author-heading">Author and Editorial Process</h2>
        <p>This guide is authored by <a href="${escapeHtml(guide.authorUrl)}">${escapeHtml(
          guide.authorName
        )}</a> and edited by ${escapeHtml(
          guide.authorEditor
        )}. We focus on practical, testable steps and update content when platform behavior changes.</p>
        <p>Reviewed by ${escapeHtml(
          guide.reviewedBy
        )} on ${escapeHtml(
          guide.reviewedOn
        )}. Recommendations are reviewed for real-world execution effort, recovery impact, and measurable security outcomes.</p>
      </section>
      <section class="card content-card" aria-labelledby="change-log-heading">
        <h2 id="change-log-heading">Substantive Change Log</h2>
        <ul>
          ${changeLogItems}
        </ul>
      </section>
      ${affiliateSection}
      <section class="card content-card" aria-labelledby="related-heading">
        <h2 id="related-heading">Related Guides</h2>
        <ul>
          ${relatedItems}
        </ul>
      </section>
      <section class="card content-card" aria-labelledby="sources-heading">
        <h2 id="sources-heading">Sources and Further Reading</h2>
        <ul>
${sourcesItems}
        </ul>
      </section>
      <section class="card cta-card" aria-label="Try checker">
        <p>Apply this guide and test your password strength immediately.</p>
        <a class="cta-link" href="/?from=${escapeHtml(
          guide.slug
        )}#checker">Try Password Checker</a>
      </section>
    </main>
    <footer class="footer">
      <div class="footer-links">
        <a href="/privacy/">Privacy</a><a href="/about/">About</a><a href="/faq/">FAQ</a><a href="/contact/">Contact</a><a href="/terms/">Terms</a><a href="/editorial-policy/">Editorial Policy</a>
      </div>
      <p>Disclaimer: Content is educational and does not replace formal security audits.</p>
    </footer>
  </div>
  <script src="../assets/js/theme.js?v=${sharedAssetVersion}" defer></script>
  <script type="module" src="../assets/js/firebase-init.js?v=20260220v3" defer></script>
  <script type="module" src="../assets/js/pwa-install.js?v=20260220v3" defer></script>
</body>
</html>`;
}

function renderGuideIndex(guidesList, clustersIndex, urlBase) {
  const clusterOrder = [
    "Identity Security",
    "Phishing Defense",
    "Device Security",
    "Network Security",
    "Incident Response"
  ];
  const clusterDescriptions = {
    "Identity Security":
      "Account authentication, password hygiene, passkeys, and MFA controls.",
    "Phishing Defense":
      "Verification workflows, message triage, and safe reset procedures.",
    "Device Security":
      "Endpoint hardening, app hygiene, and secure mobile/desktop operations.",
    "Network Security":
      "Public Wi-Fi safety, home-network controls, and session protection.",
    "Incident Response":
      "Breach containment, recovery hardening, and evidence-preserving playbooks."
  };
  const guidesHubLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Cybersecurity Guides Hub",
    description: `Explore ${guidesList.length} practical cybersecurity guides for identity, phishing, device, network, and incident response controls.`,
    url: `${urlBase}/guides/`,
    isPartOf: {
      "@type": "WebSite",
      name: "OopsMyPassword",
      url: `${urlBase}/`
    },
    mainEntity: guidesList.map((guide) => ({
      "@type": "Article",
      headline: guide.title,
      url: `${urlBase}/guides/${guide.slug}.html`,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      about: guide.cluster
    }))
  };

  const sections = clusterOrder
    .filter((cluster) => clustersIndex.has(cluster))
    .map((cluster) => {
      const cards = clustersIndex
        .get(cluster)
        .map(
          (guide) => `
          <article class="guide-card">
            <h3>${escapeHtml(guide.title)}</h3>
            <p>${escapeHtml(guide.description)}</p>
            <p><strong>Primary keyword:</strong> ${escapeHtml(
              guide.primaryKeyword
            )} | <strong>Reading:</strong> ${escapeHtml(
              guide.readingTimeMinutes
            )} min</p>
            <a href="/guides/${guide.slug}.html">Read guide</a>
          </article>`
        )
        .join("");

      const id = cluster.toLowerCase().replace(/\s+/g, "-");
      return `
      <section class="card content-card" aria-labelledby="${id}-heading">
        <h2 id="${id}-heading">${escapeHtml(cluster)}</h2>
        <p>${escapeHtml(clusterDescriptions[cluster] || "")}</p>
        <div class="guide-grid">
${cards}
        </div>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en" data-theme="dark" data-theme-mode="system" data-theme-ready="false">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>(function(){var root=document.documentElement;var mode=\"system\";try{var stored=localStorage.getItem(\"omp-theme\");if(stored===\"dark\"||stored===\"light\"||stored===\"system\"){mode=stored;}}catch(e){}var dark=window.matchMedia&&window.matchMedia(\"(prefers-color-scheme: dark)\").matches;var resolved=mode===\"system\"?(dark?\"dark\":\"light\"):mode;root.dataset.themeMode=mode;root.dataset.theme=resolved;root.setAttribute(\"data-theme-ready\",\"true\");})();</script>
  <noscript><style>html[data-theme-ready="false"]{visibility:visible;}</style></noscript>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5826652112388036" crossorigin="anonymous"></script>
  <title>Cybersecurity Guides Hub | OopsMyPassword</title>
  <meta name="description" content="Explore ${guidesList.length} structured cybersecurity guides across identity security, phishing defense, device security, network safety, and incident response.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#0a0f14">
  <link rel="canonical" href="${urlBase}/guides/">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="OopsMyPassword">
  <meta property="og:title" content="Cybersecurity Guides Hub | OopsMyPassword">
  <meta property="og:description" content="Explore ${guidesList.length} structured cybersecurity guides across identity security, phishing defense, device security, network safety, and incident response.">
  <meta property="og:url" content="${urlBase}/guides/">
  <meta property="og:image" content="${urlBase}/assets/img/og-cover.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Cybersecurity Guides Hub | OopsMyPassword">
  <meta name="twitter:description" content="Explore ${guidesList.length} structured cybersecurity guides across identity security, phishing defense, device security, network safety, and incident response.">
  <meta name="twitter:image" content="${urlBase}/assets/img/og-cover.svg">
  <link rel="stylesheet" href="../assets/css/tokens.css?v=${sharedAssetVersion}">
  <link rel="stylesheet" href="../assets/css/app.css?v=${sharedAssetVersion}">
  <link rel="stylesheet" href="../assets/css/content.css?v=${sharedAssetVersion}">
  <script type="application/ld+json">${JSON.stringify(guidesHubLd)}</script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="page">
    <header class="site-header">
      <div class="topbar">
        <a class="brand" href="/">OopsMyPassword</a>
        <nav class="site-nav" aria-label="Primary">
          <ul class="nav-list">
            <li><a href="/">Home</a></li><li><a class="is-active" href="/guides/">Guides</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/best-practices/">Best Practices</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/terms/">Terms</a></li>
          </ul>
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Theme: System" aria-pressed="false" title="Theme: System">Theme: System</button>
      </div>
      <div class="card content-header">
        <h1>Cybersecurity Guides for Practical Defense</h1>
        <p>This hub includes ${guidesList.length} actionable guides with structured sections, measurable controls, review metadata, and standards-aligned references.</p>
      </div>
    </header>
    <main id="main-content" class="content-main">
${sections}
      <section class="card cta-card" aria-label="Try checker">
        <p>Use the checker while applying these recommendations.</p>
        <a class="cta-link" href="/?from=guide-hub#checker">Try Password Checker</a>
      </section>
    </main>
    <footer class="footer">
      <div class="footer-links">
        <a href="/privacy/">Privacy</a><a href="/about/">About</a><a href="/faq/">FAQ</a><a href="/contact/">Contact</a><a href="/terms/">Terms</a><a href="/editorial-policy/">Editorial Policy</a>
      </div>
      <p>Disclaimer: Content is educational and does not replace formal security audits.</p>
    </footer>
  </div>
  <script src="../assets/js/theme.js?v=${sharedAssetVersion}" defer></script>
  <script type="module" src="../assets/js/firebase-init.js?v=20260220v3" defer></script>
  <script type="module" src="../assets/js/pwa-install.js?v=20260220v3" defer></script>
</body>
</html>`;
}

function buildMetadata(guidesList, urlBase) {
  return {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    base_url: urlBase,
    article_count: guidesList.length,
    articles: guidesList.map((guide) => ({
      slug: guide.slug,
      title: guide.title,
      meta_description: guide.description,
      primary_keyword: guide.primaryKeyword,
      secondary_keywords: guide.secondaryKeywords,
      date_published: guide.datePublished,
      date_modified: guide.dateModified,
      author_name: guide.authorName,
      author_url: guide.authorUrl,
      reviewed_by: guide.reviewedBy,
      reviewed_on: guide.reviewedOn,
      reading_time_minutes: guide.readingTimeMinutes,
      word_count_target: guide.wordCountTarget,
      cluster: guide.cluster,
      cluster_slug: guide.clusterSlug,
      intent_stage: guide.intentStage,
      commercial_intent: guide.commercialIntent,
      affiliate_slot: guide.affiliateSlot,
      affiliate_disclosure: guide.affiliateDisclosure,
      last_offer_reviewed_on: guide.lastOfferReviewedOn,
      affiliate_offer_id: guide.affiliateOffer ? guide.affiliateOffer.id : null,
      last_substantive_update: guide.reviewedOn,
      source_count: guide.sources.length
    }))
  };
}

function loadAffiliateOffers(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing affiliate offers file: ${filePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in affiliate offers file: ${error.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("content/affiliate-offers.json must be a non-empty array.");
  }

  const categories = new Set();
  for (const [index, offer] of parsed.entries()) {
    validateAffiliateOffer(offer, index);
    categories.add(offer.category);
  }

  if (categories.size !== 1 || !categories.has("password_manager")) {
    throw new Error(
      "Affiliate offers must currently use exactly one category: password_manager."
    );
  }

  return parsed;
}

function validateAffiliateOffer(offer, index) {
  if (!offer || typeof offer !== "object") {
    throw new Error(`Affiliate offer at index ${index} must be an object.`);
  }

  const required = [
    "id",
    "category",
    "title",
    "url",
    "cta",
    "disclosure",
    "active",
    "last_verified_on"
  ];

  for (const field of required) {
    if (offer[field] === undefined || offer[field] === null || offer[field] === "") {
      throw new Error(`Affiliate offer at index ${index} missing field: ${field}`);
    }
  }

  if (offer.category !== "password_manager") {
    throw new Error(
      `Affiliate offer at index ${index} has unsupported category "${offer.category}".`
    );
  }
  if (!/^https:\/\//i.test(String(offer.url))) {
    throw new Error(`Affiliate offer at index ${index} url must be absolute HTTPS.`);
  }
  if (typeof offer.active !== "boolean") {
    throw new Error(`Affiliate offer at index ${index} active must be boolean.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(offer.last_verified_on))) {
    throw new Error(
      `Affiliate offer at index ${index} last_verified_on must be YYYY-MM-DD.`
    );
  }
}

function buildActiveOfferMap(offers) {
  const map = new Map();
  for (const offer of offers) {
    if (!offer.active) continue;
    if (map.has(offer.category)) {
      throw new Error(
        `Multiple active affiliate offers found for category "${offer.category}".`
      );
    }
    map.set(offer.category, offer);
  }

  if (!map.has("password_manager")) {
    throw new Error(
      "At least one active password_manager affiliate offer is required."
    );
  }

  return map;
}
