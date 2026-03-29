import { buildMeter, formatPercent, levelFromRiskScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("breach-response-form");
if (form) {
  const breachTypeEl = document.getElementById("breach-type");
  const accountClassEl = document.getElementById("account-class");
  const mfaEl = document.getElementById("mfa-status");
  const paymentEl = document.getElementById("payment-exposure");

  const meter = document.getElementById("breach-meter-fill");
  const scoreEl = document.getElementById("breach-score");
  const levelEl = document.getElementById("breach-level");
  const headlineEl = document.getElementById("breach-headline");
  const recEl = document.getElementById("breach-recommendations");
  const stepsEl = document.getElementById("breach-steps");
  const exportBtn = document.getElementById("breach-export");

  let latest = null;

  function compute() {
    const breachType = breachTypeEl ? breachTypeEl.value : "password-leak";
    const accountClass = accountClassEl ? accountClassEl.value : "email";
    const mfa = mfaEl ? mfaEl.value : "enabled";
    const payment = paymentEl ? paymentEl.value : "none";

    let score = 20;
    if (breachType === "active-takeover") score += 40;
    if (breachType === "phishing-click") score += 30;
    if (breachType === "password-leak") score += 24;

    if (accountClass === "email") score += 18;
    if (accountClass === "banking") score += 25;
    if (accountClass === "work") score += 20;

    if (mfa === "disabled") score += 18;
    if (mfa === "unknown") score += 10;

    if (payment === "cards-linked") score += 15;
    if (payment === "transactions-seen") score += 28;

    score = Math.min(100, score);
    const level = levelFromRiskScore(score);

    const headline =
      level === "Critical"
        ? "Containment required now"
        : level === "High"
          ? "High urgency response"
          : level === "Medium"
            ? "Structured response needed"
            : "Monitor and harden";

    const recommendations = [
      "Secure the primary email and reset linked account credentials in priority order.",
      "Revoke active sessions and remove unknown devices before normal activity resumes.",
      "Verify recovery channels and backup factors to prevent attacker re-entry."
    ];

    if (payment !== "none") {
      recommendations.push("Notify payment provider and set fraud alerts immediately.");
    }

    const steps = [
      {
        label: "0-1h",
        text: "Reset primary identity account, force sign-out everywhere, and block unknown devices."
      },
      {
        label: "1-6h",
        text: "Rotate passwords for banking/work accounts, verify MFA factors, and review security logs."
      },
      {
        label: "6-24h",
        text: "Audit recovery channels, update incident notes, and monitor for repeated takeover attempts."
      }
    ];

    latest = {
      score,
      level,
      headline,
      recommendations,
      next24hPlan: steps.map((step) => `${step.label}: ${step.text}`),
      inputs: {
        breachType,
        accountClass,
        mfaStatus: mfa,
        paymentExposure: payment
      }
    };

    buildMeter(meter, score);
    if (scoreEl) scoreEl.textContent = formatPercent(score);
    if (levelEl) levelEl.textContent = level;
    if (headlineEl) headlineEl.textContent = headline;
    setList(recEl, recommendations);
    setSteps(stepsEl, steps);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    compute();
  });

  [breachTypeEl, accountClassEl, mfaEl, paymentEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;
      downloadPayload({
        toolId: "breach-response-planner",
        generatedAt: new Date().toISOString(),
        inputs: latest.inputs,
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

