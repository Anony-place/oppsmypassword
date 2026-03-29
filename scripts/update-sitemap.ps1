param(
  [string]$BaseUrl = "https://oopsmypassword.web.app",
  [string]$CoreSitemapPath = "sitemap.xml",
  [string]$ToolsSitemapPath = "sitemap-tools.xml",
  [string]$GuidesSitemapPath = "sitemap-guides.xml",
  [string]$SitemapIndexPath = "sitemap-index.xml",
  [string]$GuidesMetadataPath = "guides/content-metadata.json"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Get-LastModDate([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Missing source file for sitemap entry: $Path"
  }
  return (Get-Item $Path).LastWriteTimeUtc.ToString("yyyy-MM-dd")
}

function Write-Sitemap(
  [System.Collections.Generic.List[object]]$Entries,
  [string]$OutputPath,
  [string]$RootPath
) {
  $lines = @()
  $lines += '<?xml version="1.0" encoding="UTF-8"?>'
  $lines += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

  foreach ($entry in $Entries) {
    $sourcePath = Join-Path $RootPath $entry.Source
    $lastMod = Get-LastModDate $sourcePath

    $lines += "  <url>"
    $lines += "    <loc>$BaseUrl$($entry.Url)</loc>"
    $lines += "    <lastmod>$lastMod</lastmod>"
    $lines += "    <changefreq>$($entry.ChangeFreq)</changefreq>"
    $lines += "    <priority>$($entry.Priority)</priority>"
    $lines += "  </url>"
  }

  $lines += "</urlset>"
  $outputFullPath = Join-Path $RootPath $OutputPath
  $lines -join "`n" | Set-Content -Path $outputFullPath -NoNewline
  return $outputFullPath
}

$coreEntries = [System.Collections.Generic.List[object]]::new()
$coreEntries.AddRange(@(
  @{ Url = "/"; Source = "index.html"; ChangeFreq = "weekly"; Priority = "1.0" },
  @{ Url = "/guides/"; Source = "guides/index.html"; ChangeFreq = "weekly"; Priority = "0.95" },
  @{ Url = "/tools/"; Source = "tools/index.html"; ChangeFreq = "weekly"; Priority = "0.95" },
  @{ Url = "/faq/"; Source = "faq/index.html"; ChangeFreq = "weekly"; Priority = "0.8" },
  @{ Url = "/best-practices/"; Source = "best-practices/index.html"; ChangeFreq = "weekly"; Priority = "0.8" },
  @{ Url = "/about/"; Source = "about/index.html"; ChangeFreq = "monthly"; Priority = "0.7" },
  @{ Url = "/contact/"; Source = "contact/index.html"; ChangeFreq = "monthly"; Priority = "0.6" },
  @{ Url = "/privacy/"; Source = "privacy/index.html"; ChangeFreq = "monthly"; Priority = "0.6" },
  @{ Url = "/terms/"; Source = "terms/index.html"; ChangeFreq = "monthly"; Priority = "0.6" },
  @{ Url = "/editorial-policy/"; Source = "editorial-policy/index.html"; ChangeFreq = "monthly"; Priority = "0.7" }
))

$toolEntries = [System.Collections.Generic.List[object]]::new()
$toolEntries.AddRange(@(
  @{ Url = "/tools/password-checker/"; Source = "tools/password-checker/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/passphrase-generator/"; Source = "tools/passphrase-generator/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/breach-response-planner/"; Source = "tools/breach-response-planner/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/recovery-hardening/"; Source = "tools/recovery-hardening/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/passkey-readiness/"; Source = "tools/passkey-readiness/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/phishing-reset-safety/"; Source = "tools/phishing-reset-safety/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/account-priority-matrix/"; Source = "tools/account-priority-matrix/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/mfa-method-selector/"; Source = "tools/mfa-method-selector/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/phishing-message-triage/"; Source = "tools/phishing-message-triage/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/public-wifi-safety-planner/"; Source = "tools/public-wifi-safety-planner/index.html"; ChangeFreq = "weekly"; Priority = "0.9" },
  @{ Url = "/tools/phishing-link-analyzer/"; Source = "tools/phishing-link-analyzer/index.html"; ChangeFreq = "weekly"; Priority = "0.9" }
))

$metadataFullPath = Join-Path $repoRoot $GuidesMetadataPath
if (-not (Test-Path $metadataFullPath)) {
  throw "Guides metadata file not found: $GuidesMetadataPath. Run npm run build:guides first."
}

$metadata = Get-Content $metadataFullPath -Raw | ConvertFrom-Json
$guideEntries = [System.Collections.Generic.List[object]]::new()
foreach ($article in $metadata.articles) {
  $guideEntries.Add(@{
    Url = "/guides/$($article.slug).html"
    Source = "guides/$($article.slug).html"
    ChangeFreq = "monthly"
    Priority = "0.8"
  })
}

$coreOut = Write-Sitemap -Entries $coreEntries -OutputPath $CoreSitemapPath -RootPath $repoRoot
$toolsOut = Write-Sitemap -Entries $toolEntries -OutputPath $ToolsSitemapPath -RootPath $repoRoot
$guidesOut = Write-Sitemap -Entries $guideEntries -OutputPath $GuidesSitemapPath -RootPath $repoRoot

$sitemapFiles = @(
  @{ Path = $CoreSitemapPath; FullPath = $coreOut },
  @{ Path = $ToolsSitemapPath; FullPath = $toolsOut },
  @{ Path = $GuidesSitemapPath; FullPath = $guidesOut }
)

$indexLines = @()
$indexLines += '<?xml version="1.0" encoding="UTF-8"?>'
$indexLines += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
foreach ($map in $sitemapFiles) {
  $lastMod = (Get-Item $map.FullPath).LastWriteTimeUtc.ToString("yyyy-MM-dd")
  $indexLines += "  <sitemap>"
  $indexLines += "    <loc>$BaseUrl/$($map.Path)</loc>"
  $indexLines += "    <lastmod>$lastMod</lastmod>"
  $indexLines += "  </sitemap>"
}
$indexLines += "</sitemapindex>"

$indexFullPath = Join-Path $repoRoot $SitemapIndexPath
$indexLines -join "`n" | Set-Content -Path $indexFullPath -NoNewline

Write-Output ("Core sitemap generated at {0} ({1} URLs)" -f $coreOut, $coreEntries.Count)
Write-Output ("Tools sitemap generated at {0} ({1} URLs)" -f $toolsOut, $toolEntries.Count)
Write-Output ("Guides sitemap generated at {0} ({1} URLs)" -f $guidesOut, $guideEntries.Count)
Write-Output ("Sitemap index generated at {0}" -f $indexFullPath)
