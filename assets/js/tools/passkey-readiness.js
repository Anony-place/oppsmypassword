import { buildMeter, formatPercent, readinessFromScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("passkey-readiness-form");
if (form) {
  const ecosystemEl = document.getElementById("device-ecosystem");
  const backupEl = document.getElementById("backup-device");
  const supportEl = document.getElementById("account-support");
  const shareEl = document.getElementById("shared-usage");

  const meter = document.getElementById("passkey-meter-fill");
  const scoreEl = document.getElementById("passkey-score");
  const levelEl = document.getElementById("passkey-level");
  const headlineEl = document.getElementById("passkey-headline");
  const recEl = document.getElementById("passkey-recommendations");
  const planEl = document.getElementById("passkey-next24");
  const exportBtn = document.getElementById("passkey-export");

  let latest = null;

  function compute() {
    const input = {
      deviceEcosystem: ecosystemEl ? ecosystemEl.value : "single",
      backupDevice: backupEl ? backupEl.value : "yes",
      accountSupport: supportEl ? supportEl.value : "mixed",
      sharedUsage: shareEl ? shareEl.value : "no"
    };

    let score = 25;
    if (input.deviceEcosystem === "cross-platform") score += 25;
    if (input.deviceEcosystem === "single") score += 12;

    if (input.backupDevice === "yes") score += 20;
    if (input.backupDevice === "planned") score += 10;

    if (input.accountSupport === "high") score += 22;
    if (input.accountSupport === "mixed") score += 12;

    if (input.sharedUsage === "no") score += 10;
    if (input.sharedUsage === "documented") score += 6;

    score = Math.min(100, score);
    const level = readinessFromScore(score);

    const headline =
      level === "Ready"
        ? "Ready for phased passkey rollout"
        : level === "Medium"
          ? "Partially ready; fill key recovery gaps"
          : level === "High"
            ? "Readiness weak for high-impact accounts"
            : "High lockout risk without preparation";

    const recommendations = [
      "Enable passkeys on identity hub accounts first (email and financial).",
      "Validate recovery with a backup device before removing password fallback.",
      "Document account support level and update rollout status monthly."
    ];

    if (input.sharedUsage !== "no") {
      recommendations.push("Define ownership and recovery responsibility for shared accounts.");
    }

    const steps = [
      { label: "0-1h", text: "Select five priority accounts and verify passkey support." },
      { label: "1-6h", text: "Enroll backup device and test sign-in continuity." },
      { label: "6-24h", text: "Deploy staged rollout and keep secure password fallback for legacy services." }
    ];

    latest = {
      score,
      level,
      headline,
      recommendations,
      next24hPlan: steps.map((step) => `${step.label}: ${step.text}`),
      input
    };

    buildMeter(meter, score);
    if (scoreEl) scoreEl.textContent = formatPercent(score);
    if (levelEl) levelEl.textContent = level;
    if (headlineEl) headlineEl.textContent = headline;
    setList(recEl, recommendations);
    setSteps(planEl, steps);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    compute();
  });

  [ecosystemEl, backupEl, supportEl, shareEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;
      downloadPayload({
        toolId: "passkey-readiness",
        generatedAt: new Date().toISOString(),
        inputs: latest.input,
        output: {
          score: latest.score,
          level: latest.level,
          headline: latest.headline,
          recommendations: latest.recommendations,
          next24hPlan: latest.next24hPlan
        }
      });
    });
  }

  compute();
}

