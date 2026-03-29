# Passive Ops Runbook (1 Guide/Month)

## Objective
Keep the site in low-maintenance mode while preserving indexing quality and monetization hygiene.

## Fixed Monthly Cycle
1. Week 1: Publish one new long-tail guide.
2. Week 3: Refresh one existing high-intent guide.
3. Week 4: Run QA, verify affiliate offer status, and check Search Console health.

## Week 1 Publishing Checklist
1. Pick one cluster:
- Password manager decisions
- Recovery hardening
- Breach response
- Passkey fallback
2. Add guide source in `guides/source/` with full metadata contract.
3. Link new guide from:
- `guides/index.html` (auto via render)
- At least 2 related guides (auto related section + manual if needed)
- One relevant tool page where useful
4. Run:
- `npm run build:site`
- `powershell -ExecutionPolicy Bypass -File scripts/update-sitemap.ps1`
- `npm run audit:all`

## Week 3 Refresh Checklist
1. Pick one existing high-intent guide.
2. Update `date_modified`, examples, FAQ, and sources if needed.
3. Refresh `last_offer_reviewed_on` if affiliate slot is active.
4. Re-run:
- `npm run build:guides`
- `npm run audit:all`

## Week 4 Monitoring Checklist
1. Submit latest sitemap in Search Console.
2. Request indexing for:
- New guide URL
- Refreshed guide URL
3. Verify KPIs:
- Indexed page count
- Impressions
- CTR
- Top 20 queries
- 404 / crawl issues
4. Verify affiliate offer link still valid and disclosure text still accurate.

## Low-Maintenance KPI Log Template
| Month | New Guide | Refreshed Guide | Indexed Pages | Impressions | CTR | 404 Errors | Notes |
|---|---|---|---|---|---|---|---|
