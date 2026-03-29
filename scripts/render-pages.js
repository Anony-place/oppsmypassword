const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "content", "site-config.json");
const navPath = path.join(repoRoot, "content", "nav.json");
const assetVersion = "20260228v4";

if (!fs.existsSync(configPath) || !fs.existsSync(navPath)) {
  throw new Error("Missing content/site-config.json or content/nav.json");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const nav = JSON.parse(fs.readFileSync(navPath, "utf8"));

for (const page of config.pages || []) {
  const html = renderPage(config, nav, page);
  const outPath = path.join(repoRoot, page.slug, "index.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`Rendered ${page.slug}/index.html`);
}

function renderPage(site, navConfig, page) {
  const canonical = `${site.baseUrl}/${page.slug}/`;
  const ogTitle = page.title;
  const activeHref = `/${page.slug}/`;

  const navLinks = (navConfig.primary || [])
    .map((item) => {
      const active = item.href === activeHref ? ' class="is-active"' : "";
      return `<li><a${active} href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`;
    })
    .join("\n            ");

  const footerLinks = (navConfig.footer || [])
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("");

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${site.baseUrl}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: titleCase(page.slug.replace(/-/g, " ")),
        item: canonical
      }
    ]
  };

  const pageLd = {
    "@context": "https://schema.org",
    "@type": page.schemaType || "WebPage",
    name: page.heading,
    url: canonical,
    inLanguage: "en"
  };

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand,
    url: `${site.baseUrl}/`,
    logo: `${site.baseUrl}/assets/img/icons/icon-512.png`
  };

  const sections = (page.sections || [])
    .map((section) => {
      const sectionId = `${page.slug}-${slugify(section.heading)}-heading`;
      const paragraphs = (section.paragraphs || [])
        .map((p) => `<p>${p}</p>`)
        .join("\n        ");
      return `<section class="card content-card" aria-labelledby="${sectionId}">
        <h2 id="${sectionId}">${escapeHtml(section.heading)}</h2>
        ${paragraphs}
      </section>`;
    })
    .join("\n\n      ");

  const adsenseScript = page.includeAdsense
    ? `\n  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(site.adsenseClient)}" crossorigin="anonymous"></script>`
    : "";

  return `<!doctype html>
<html lang="en" data-theme="dark" data-theme-mode="system" data-theme-ready="false">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>(function(){var root=document.documentElement;var mode="system";try{var stored=localStorage.getItem("omp-theme");if(stored==="dark"||stored==="light"||stored==="system"){mode=stored;}}catch(e){}var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=mode==="system"?(dark?"dark":"light"):mode;root.dataset.themeMode=mode;root.dataset.theme=resolved;root.setAttribute("data-theme-ready","true");})();</script>
  <noscript><style>html[data-theme-ready="false"]{visibility:visible;}</style></noscript>${adsenseScript}
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="${escapeHtml(site.themeColor)}">
  <link rel="canonical" href="${canonical}">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.brand)}">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${site.baseUrl}/assets/img/og-cover.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${site.baseUrl}/assets/img/og-cover.svg">
  <link rel="stylesheet" href="../assets/css/tokens.css?v=${assetVersion}">
  <link rel="stylesheet" href="../assets/css/app.css?v=${assetVersion}">
  <link rel="stylesheet" href="../assets/css/content.css?v=${assetVersion}">
  <script type="application/ld+json">${JSON.stringify(pageLd)}</script>
  <script type="application/ld+json">${JSON.stringify(orgLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="page">
    <header class="site-header">
      <div class="topbar">
        <a class="brand" href="/">${escapeHtml(site.brand)}</a>
        <nav class="site-nav" aria-label="Primary">
          <ul class="nav-list">
            ${navLinks}
          </ul>
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Theme: System" aria-pressed="false" title="Theme: System">Theme: System</button>
      </div>

      <div class="card content-header">
        <h1>${escapeHtml(page.heading)}</h1>
        <p>${page.intro}</p>
      </div>
    </header>

    <main id="main-content" class="content-main">
      ${sections}
    </main>

    <footer class="footer">
      <div class="footer-links">${footerLinks}</div>
      <p>${escapeHtml(site.footerDisclaimer)}</p>
    </footer>
  </div>
  <script src="../assets/js/theme.js?v=${assetVersion}" defer></script>
  <script type="module" src="../assets/js/firebase-init.js?v=20260220v3" defer></script>
  <script type="module" src="../assets/js/pwa-install.js?v=20260220v3" defer></script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
