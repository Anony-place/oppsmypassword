param(
  [string]$BaseUrl = "https://oopsmypassword.web.app",
  [string]$AuthorName = "OopsMyPassword Editorial Team",
  [string]$AuthorPerson = "Suraj Baishya"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$renderer = Join-Path $PSScriptRoot "render-guides.js"

if (-not (Test-Path $renderer)) {
  throw "Missing renderer script: $renderer"
}

Push-Location $repoRoot
try {
  & node $renderer --base-url $BaseUrl --author-name $AuthorName --author-editor $AuthorPerson
} finally {
  Pop-Location
}
