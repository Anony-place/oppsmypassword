import { buildMeter, formatPercent, readinessFromScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("mfa-selector-form");
if (form) {
  const accountTierEl = document.getElementById("mfa-account-tier");
  const threatModelEl = document.getElementById("mfa-threat-model");
  const usabilityEl = document.getElementById("mfa-usability-priority");
  const recoveryEl = document.getElementById("mfa-recovery-readiness");

  const meter = document.getElementById("mfa-meter-fill");
  const scoreEl = document.getElementById("mfa-score");
  const levelEl = document.getElementById("mfa-level");
  const methodEl = document.getElementById("mfa-method");
  const recEl = document.getElementById("mfa-recommendations");
  const stepsEl = document.getElementById("mfa-steps");
  const exportBtn = document.getElementById("mfa-export");

  let latest = null;

  function compute() {
    const accountTier = accountTierEl ? accountTierEl.value : "critical";
    const threatModel = threatModelEl ? threatModelEl.value : "phishing";
    const usabilityPriority = usabilityEl ? usabilityEl.value : "balanced";
    const recoveryReadiness = recoveryEl ? recoveryEl.value : "medium";

    let score = 45;
    if (accountTier === "critical") score += 30;
    if (accountTier === "high") score += 18;

    if (threatModel === "phishing") score += 24;
    if (threatModel === "sim-swap") score += 16;
    if (threatModel === "device-loss") score += 12;

    if (usabilityPriority === "low-friction") score -= 10;
    if (usabilityPriority === "max-security") score += 10;

    if (recoveryReadiness === "strong") score += 10;
    if (recoveryReadiness === "weak") score -= 14;

    score = Math.max(5, Math.min(100, score));

    let method = "Authenticator App + Recovery Codes";
    if (score >= 82) method = "Hardware Security Key + App Fallback";
    else if (score <= 40) method = "Authenticator App (start) + Recovery Upgrade Plan";

    const level = readinessFromScore(score);

    const recommendations = [
      `Default method: ${method}.`,
      "Enable at least two recovery paths before enforcement.",
      "Separate primary factor and backup factor across devices when possible.",
      "Test sign-in and recovery on a secondary device before rollout completion."
    ];

    if (threatModel === "sim-swap") {
      recommendations.push("Avoid SMS OTP for high-impact accounts and enable carrier transfer lock.");
    }

    const steps = [
      {
        label: "0-2h",
        text: "Select MFA method by account tier and verify backups for critical accounts first."
      },
      {
        label: "2-8h",
        text: "Roll out to high-impact accounts and validate recovery codes plus trusted-device list."
      },
      {
        label: "8-24h",
        text: "Audit exceptions, remove weak factors, and schedule monthly factor health review."
      }
    ];

    latest = {
      score,
      level,
      method,
      recommendations,
      steps,
      inputs: {
        accountTier,
        threatModel,
        usabilityPriority,
        recoveryReadiness
      }
    };

    buildMeter(meter, score);
    if (scoreEl) scoreEl.textContent = formatPercent(score);
    if (levelEl) levelEl.textContent = level;
    if (methodEl) methodEl.textContent = method;
    setList(recEl, recommendations);
    setSteps(stepsEl, steps);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    compute();
  });

  [accountTierEl, threatModelEl, usabilityEl, recoveryEl].forEach(function (node) {
    if (node) {
      node.addEventListener("change", compute);
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;

      downloadPayload({
        toolId: "mfa-method-selector",
        generatedAt: new Date().toISOString(),
        inputs: latest.inputs,
        output: {
          score: latest.score,
          level: latest.level,
          headline: `Recommended MFA baseline: ${latest.method}`,
          recommendations: latest.recommendations,
          next24hPlan: latest.steps.map((step) => `${step.label}: ${step.text}`)
        }
      });
    });
  }

  compute();
}