import { buildMeter, formatPercent, levelFromRiskScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("phishing-reset-form");
if (form) {
  const triggerEl = document.getElementById("reset-trigger");
  const domainEl = document.getElementById("url-verification");
  const urgencyEl = document.getElementById("urgency-language");
  const attachmentEl = document.getElementById("attachment-or-link");

  const meter = document.getElementById("phishing-meter-fill");
  const scoreEl = document.getElementById("phishing-score");
  const levelEl = document.getElementById("phishing-level");
  const headlineEl = document.getElementById("phishing-headline");
  const recEl = document.getElementById("phishing-recommendations");
  const planEl = document.getElementById("phishing-next24");
  const exportBtn = document.getElementById("phishing-export");

  let latest = null;

  function compute() {
    const input = {
      resetTrigger: triggerEl ? triggerEl.value : "user-initiated",
      urlVerification: domainEl ? domainEl.value : "verified",
      urgencyLanguage: urgencyEl ? urgencyEl.value : "none",
      attachmentOrLink: attachmentEl ? attachmentEl.value : "trusted"
    };

    let score = 5;
    if (input.resetTrigger === "unsolicited") score += 28;
    if (input.resetTrigger === "unexpected-security") score += 18;

    if (input.urlVerification === "unknown") score += 32;
    if (input.urlVerification === "partial") score += 18;

    if (input.urgencyLanguage === "high") score += 18;
    if (input.urgencyLanguage === "medium") score += 10;

    if (input.attachmentOrLink === "suspicious") score += 24;
    if (input.attachmentOrLink === "unknown") score += 12;

    score = Math.min(100, score);
    const level = levelFromRiskScore(score);

    const headline =
      level === "Critical"
        ? "Likely phishing reset flow"
        : level === "High"
          ? "High-risk reset request"
          : level === "Medium"
            ? "Proceed with strict verification"
            : "Reset flow appears low risk";

    const recommendations = [
      "Open the service directly from a trusted bookmark; avoid email links.",
      "Verify exact domain, HTTPS, and account ownership before entering credentials.",
      "Enable MFA immediately after any completed reset."
    ];

    if (level === "Critical" || level === "High") {
      recommendations.unshift("Do not continue this flow until domain and sender identity are verified.");
    }

    const steps = [
      { label: "0-1h", text: "Stop link interaction and independently open official site." },
      { label: "1-6h", text: "Reset from verified domain, revoke sessions, and rotate exposed credentials." },
      { label: "6-24h", text: "Monitor inbox, login alerts, and account recovery changes for replay attempts." }
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

  [triggerEl, domainEl, urgencyEl, attachmentEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;
      downloadPayload({
        toolId: "phishing-reset-safety",
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

