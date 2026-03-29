import { assessPassword, generatePassword } from "./core/password-adapter.js";
import { buildMeter, formatPercent, levelFromRiskScore, setList } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const targetConfig = {
  critical: { min: 88, title: "Critical Accounts" },
  high: { min: 78, title: "High-Value Accounts" },
  standard: { min: 68, title: "Standard Accounts" }
};

const form = document.getElementById("password-checker-form");
if (form) {
  const passwordInput = document.getElementById("password-value");
  const targetInput = document.getElementById("account-criticality");
  const meter = document.getElementById("checker-meter-fill");
  const scoreEl = document.getElementById("checker-score");
  const levelEl = document.getElementById("checker-level");
  const crackEl = document.getElementById("checker-crack");
  const headlineEl = document.getElementById("checker-headline");
  const recList = document.getElementById("checker-recommendations");
  const exportBtn = document.getElementById("checker-export");
  const generateBtn = document.getElementById("checker-generate");

  let latest = null;

  function runAssessment() {
    const value = passwordInput ? passwordInput.value.trim() : "";
    const targetKey = targetInput ? targetInput.value : "standard";
    const config = targetConfig[targetKey] || targetConfig.standard;
    const result = assessPassword(value);
    const meetsTarget = result.score >= config.min;
    const level = meetsTarget ? "Ready" : levelFromRiskScore(100 - result.score);

    const recommendations = result.suggestions.slice(0, 3);
    if (!meetsTarget) {
      recommendations.unshift(`Raise score to at least ${config.min} for ${config.title}.`);
    }

    latest = {
      score: result.score,
      level,
      headline: meetsTarget
        ? `Aligned for ${config.title}`
        : `Below target for ${config.title}`,
      recommendations: recommendations.slice(0, 5),
      next24hPlan: [
        "Rotate this credential if currently reused.",
        "Enable MFA on the account before next sign-in.",
        "Store the final password in a trusted manager."
      ],
      crackTimeText: result.crackTimeText,
      target: targetKey,
      inputLength: value.length
    };

    buildMeter(meter, result.score);
    if (scoreEl) scoreEl.textContent = formatPercent(result.score);
    if (levelEl) levelEl.textContent = level;
    if (crackEl) crackEl.textContent = result.crackTimeText;
    if (headlineEl) headlineEl.textContent = latest.headline;
    setList(recList, latest.recommendations);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    runAssessment();
  });

  if (passwordInput) {
    passwordInput.addEventListener("input", runAssessment);
  }

  if (targetInput) {
    targetInput.addEventListener("change", runAssessment);
  }

  if (generateBtn && passwordInput) {
    generateBtn.addEventListener("click", function () {
      passwordInput.value = generatePassword(18);
      runAssessment();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) {
        runAssessment();
      }
      if (!latest) return;
      downloadPayload({
        toolId: "password-checker",
        generatedAt: new Date().toISOString(),
        inputs: {
          accountCriticality: latest.target,
          inputLength: latest.inputLength
        },
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

  runAssessment();
}

