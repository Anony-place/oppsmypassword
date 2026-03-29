import { buildMeter, formatPercent, levelFromRiskScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("phishing-triage-form");
if (form) {
  const senderEl = document.getElementById("triage-sender-confidence");
  const urgencyEl = document.getElementById("triage-urgency-level");
  const linkEl = document.getElementById("triage-link-pattern");
  const requestEl = document.getElementById("triage-request-type");

  const meter = document.getElementById("triage-meter-fill");
  const scoreEl = document.getElementById("triage-score");
  const levelEl = document.getElementById("triage-level");
  const verdictEl = document.getElementById("triage-verdict");
  const recEl = document.getElementById("triage-recommendations");
  const stepsEl = document.getElementById("triage-steps");
  const exportBtn = document.getElementById("triage-export");

  let latest = null;

  function compute() {
    const senderConfidence = senderEl ? senderEl.value : "unknown";
    const urgencyLevel = urgencyEl ? urgencyEl.value : "high";
    const linkPattern = linkEl ? linkEl.value : "obfuscated";
    const requestType = requestEl ? requestEl.value : "credential";

    let score = 18;
    if (senderConfidence === "spoof-signals") score += 36;
    if (senderConfidence === "unknown") score += 20;

    if (urgencyLevel === "extreme") score += 24;
    if (urgencyLevel === "medium") score += 10;

    if (linkPattern === "obfuscated") score += 22;
    if (linkPattern === "mismatch") score += 28;

    if (requestType === "credential") score += 30;
    if (requestType === "payment") score += 26;
    if (requestType === "attachment") score += 20;

    score = Math.min(100, score);
    const level = levelFromRiskScore(score);

    const verdict =
      level === "Critical"
        ? "Likely phishing: isolate and report immediately"
        : level === "High"
          ? "High-risk message: verify through independent channel"
          : level === "Medium"
            ? "Suspicious indicators found: do not interact until verified"
            : "Low visible risk, but continue verification protocol";

    const recommendations = [
      "Do not click links, download files, or reply directly from the suspicious thread.",
      "Verify the request using a known-good contact channel or official portal bookmark.",
      "Capture message metadata and report through your security process."
    ];

    if (requestType === "credential") {
      recommendations.push("If any credential was entered, rotate it immediately and revoke active sessions.");
    }

    const steps = [
      {
        label: "0-15m",
        text: "Pause interaction, preserve message evidence, and classify sender authenticity signals."
      },
      {
        label: "15-60m",
        text: "Verify request independently and escalate if account, payment, or admin access is involved."
      },
      {
        label: "1-24h",
        text: "Document outcome, update filters/training notes, and harden affected recovery channels."
      }
    ];

    latest = {
      score,
      level,
      verdict,
      recommendations,
      steps,
      inputs: {
        senderConfidence,
        urgencyLevel,
        linkPattern,
        requestType
      }
    };

    buildMeter(meter, score);
    if (scoreEl) scoreEl.textContent = formatPercent(score);
    if (levelEl) levelEl.textContent = level;
    if (verdictEl) verdictEl.textContent = verdict;
    setList(recEl, recommendations);
    setSteps(stepsEl, steps);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    compute();
  });

  [senderEl, urgencyEl, linkEl, requestEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;

      downloadPayload({
        toolId: "phishing-message-triage",
        generatedAt: new Date().toISOString(),
        inputs: latest.inputs,
        output: {
          score: latest.score,
          level: latest.level,
          headline: latest.verdict,
          recommendations: latest.recommendations,
          next24hPlan: latest.steps.map((step) => `${step.label}: ${step.text}`)
        }
      });
    });
  }

  compute();
}