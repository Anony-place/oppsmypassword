import { buildMeter, formatPercent, levelFromRiskScore, setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("wifi-safety-form");
if (form) {
  const networkEl = document.getElementById("wifi-network-type");
  const vpnEl = document.getElementById("wifi-vpn-status");
  const activityEl = document.getElementById("wifi-activity-type");
  const patchEl = document.getElementById("wifi-device-patch");

  const meter = document.getElementById("wifi-meter-fill");
  const scoreEl = document.getElementById("wifi-score");
  const levelEl = document.getElementById("wifi-level");
  const headlineEl = document.getElementById("wifi-headline");
  const recEl = document.getElementById("wifi-recommendations");
  const stepsEl = document.getElementById("wifi-steps");
  const exportBtn = document.getElementById("wifi-export");

  let latest = null;

  function compute() {
    const networkType = networkEl ? networkEl.value : "open";
    const vpnStatus = vpnEl ? vpnEl.value : "off";
    const activityType = activityEl ? activityEl.value : "sensitive";
    const devicePatch = patchEl ? patchEl.value : "outdated";

    let score = 14;
    if (networkType === "open") score += 28;
    if (networkType === "captive") score += 20;
    if (networkType === "shared-password") score += 12;

    if (vpnStatus === "off") score += 26;
    if (vpnStatus === "inconsistent") score += 14;

    if (activityType === "admin") score += 28;
    if (activityType === "sensitive") score += 22;
    if (activityType === "normal") score += 10;

    if (devicePatch === "outdated") score += 18;
    if (devicePatch === "unknown") score += 10;

    score = Math.min(100, score);
    const level = levelFromRiskScore(score);

    const headline =
      level === "Critical"
        ? "Do not proceed with sensitive tasks on this network profile"
        : level === "High"
          ? "Proceed only with strict safeguards and reduced activity"
          : level === "Medium"
            ? "Moderate risk: apply session controls before continuing"
            : "Lower risk profile, maintain baseline safeguards";

    const recommendations = [
      "Avoid password resets, financial actions, and admin operations on untrusted networks.",
      "Use trusted VPN with kill-switch and DNS leak protection when available.",
      "Disable auto-join and file sharing before joining public or transient networks.",
      "Log out of high-impact sessions after completion and clear temporary tokens where possible."
    ];

    if (networkType === "open") {
      recommendations.push("Treat open Wi-Fi as hostile infrastructure and reduce activity to non-sensitive browsing only.");
    }

    const steps = [
      {
        label: "Before Connect",
        text: "Verify network name with venue staff, disable auto-connect, and enable VPN before traffic starts."
      },
      {
        label: "During Session",
        text: "Limit activity scope, avoid credential changes, and monitor for portal or certificate anomalies."
      },
      {
        label: "After Session",
        text: "Forget network, rotate exposed credentials if needed, and review sign-in activity for anomalies."
      }
    ];

    latest = {
      score,
      level,
      headline,
      recommendations,
      steps,
      inputs: {
        networkType,
        vpnStatus,
        activityType,
        devicePatch
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

  [networkEl, vpnEl, activityEl, patchEl].forEach(function (node) {
    if (node) node.addEventListener("change", compute);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) compute();
      if (!latest) return;

      downloadPayload({
        toolId: "public-wifi-safety-planner",
        generatedAt: new Date().toISOString(),
        inputs: latest.inputs,
        output: {
          score: latest.score,
          level: latest.level,
          headline: latest.headline,
          recommendations: latest.recommendations,
          next24hPlan: latest.steps.map((step) => `${step.label}: ${step.text}`)
        }
      });
    });
  }

  compute();
}