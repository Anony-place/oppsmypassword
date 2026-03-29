import { buildMeter, formatPercent, levelFromRiskScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("recovery-hardening-form");
if (form) {
  const emailEl = document.getElementById("recovery-email-quality");
  const simEl = document.getElementById("sim-risk");
  const codesEl = document.getElementById("backup-codes");
  const mfaBackupEl = document.getElementById("mfa-backup");
  const devicesEl = document.getElementById("trusted-devices");

  const meter = document.getElementById("recovery-meter-fill");
  const scoreEl = document.getElementById("recovery-score");
  const levelEl = document.getElementById("recovery-level");
  const headlineEl = document.getElementById("recovery-headline");
  const recEl = document.getElementById("recovery-recommendations");
  const stepsEl = document.getElementById("recovery-next24");
  const exportBtn = document.getElementById("recovery-export");

  let latest = null;

  function compute() {
    const input = {
      recoveryEmailQuality: emailEl ? emailEl.value : "strong",
      simRisk: simEl ? simEl.value : "low",
      backupCodes: codesEl ? codesEl.value : "stored-offline",
      mfaBackup: mfaBackupEl ? mfaBackupEl.value : "enabled",
      trustedDevices: devicesEl ? devicesEl.value : "clean"
    };

    let score = 10;
    if (input.recoveryEmailQuality === "shared") score += 30;
    if (input.recoveryEmailQuality === "unknown") score += 20;
    if (input.recoveryEmailQuality === "medium") score += 12;

    if (input.simRisk === "high") score += 22;
    if (input.simRisk === "medium") score += 12;

    if (input.backupCodes === "missing") score += 20;
    if (input.backupCodes === "stored-online") score += 12;

    if (input.mfaBackup === "disabled") score += 18;
    if (input.mfaBackup === "unknown") score += 12;

    if (input.trustedDevices === "unknown") score += 16;
    if (input.trustedDevices === "stale") score += 12;

    score = Math.min(100, score);
    const level = levelFromRiskScore(score);
    const headline =
      level === "Critical"
        ? "Recovery path can be bypassed"
        : level === "High"
          ? "Recovery controls need hardening"
          : level === "Medium"
            ? "Recovery posture is mixed"
            : "Recovery posture is healthy";

    const recommendations = [
      "Use a dedicated, high-protection recovery email with MFA.",
      "Store backup codes offline and validate access quarterly.",
      "Prune trusted devices and remove stale sessions."
    ];

    if (input.simRisk !== "low") {
      recommendations.push("Add carrier-level SIM lock/PIN and account takeover protection.");
    }

    const plan = [
      { label: "0-1h", text: "Review recovery email, phone, and unknown devices; remove weak channels." },
      { label: "1-6h", text: "Regenerate backup codes and move them to secure offline storage." },
      { label: "6-24h", text: "Test end-to-end recovery flow with one controlled drill." }
    ];

    latest = {
      score,
      level,
      headline,
      recommendations,
      next24hPlan: plan.map((item) => `${item.label}: ${item.text}`),
      input
    };

    buildMeter(meter, score);
    if (scoreEl) scoreEl.textContent = formatPercent(score);
    if (levelEl) levelEl.textContent = level;
    if (headlineEl) headlineEl.textContent = headline;
    setList(recEl, recommendations);
    setSteps(stepsEl, plan);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    compute();
  });

  [emailEl, simEl, codesEl, mfaBackupEl, devicesEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;
      downloadPayload({
        toolId: "recovery-hardening",
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

