import { setList, setSteps } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("priority-matrix-form");
if (form) {
  const rowsRoot = document.getElementById("matrix-rows");
  const addBtn = document.getElementById("matrix-add-row");
  const exportBtn = document.getElementById("matrix-export");
  const recList = document.getElementById("matrix-recommendations");
  const stepsEl = document.getElementById("matrix-next24");
  const tier1El = document.getElementById("matrix-tier1");
  const tier2El = document.getElementById("matrix-tier2");
  const tier3El = document.getElementById("matrix-tier3");

  let latest = null;

  function rowTemplate(index) {
    return `<div class="form-row three matrix-row" data-index="${index}">
      <label>Account name
        <input type="text" name="name-${index}" placeholder="Primary Email" required>
      </label>
      <label>Sensitivity
        <select name="sensitivity-${index}">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label>Reset-hub dependency
        <select name="dependency-${index}">
          <option value="yes">Yes</option>
          <option value="partial">Partial</option>
          <option value="no">No</option>
        </select>
      </label>
    </div>`;
  }

  function addRow() {
    if (!rowsRoot) return;
    const index = rowsRoot.querySelectorAll(".matrix-row").length;
    rowsRoot.insertAdjacentHTML("beforeend", rowTemplate(index));
  }

  function buildResult() {
    if (!rowsRoot) return;
    const rows = Array.from(rowsRoot.querySelectorAll(".matrix-row"));
    const accounts = rows.map((row) => {
      const nameInput = row.querySelector('input[type="text"]');
      const sensitivity = row.querySelector('select[name^="sensitivity-"]');
      const dependency = row.querySelector('select[name^="dependency-"]');
      return {
        name: nameInput ? nameInput.value.trim() : "",
        sensitivity: sensitivity ? sensitivity.value : "medium",
        dependency: dependency ? dependency.value : "no"
      };
    }).filter((item) => item.name.length > 0);

    let tier1 = 0;
    let tier2 = 0;
    let tier3 = 0;

    const recommendations = [];

    for (const account of accounts) {
      const isTier1 = account.sensitivity === "high" || account.dependency === "yes";
      const isTier2 = !isTier1 && (account.sensitivity === "medium" || account.dependency === "partial");
      if (isTier1) {
        tier1 += 1;
        recommendations.push(`${account.name}: move to Tier 1 migration queue.`);
      } else if (isTier2) {
        tier2 += 1;
        recommendations.push(`${account.name}: schedule Tier 2 hardening this sprint.`);
      } else {
        tier3 += 1;
      }
    }

    if (tier1 === 0 && accounts.length > 0) {
      recommendations.unshift("No Tier 1 accounts detected; verify if primary email and banking are included.");
    }

    const next24 = [
      { label: "0-1h", text: "Lock Tier 1 list and assign owners for each critical account." },
      { label: "1-6h", text: "Rotate credentials and MFA for Tier 1 accounts in migration order." },
      { label: "6-24h", text: "Prepare Tier 2 queue and close dormant Tier 3 accounts." }
    ];

    latest = {
      score: Math.min(100, tier1 * 30 + tier2 * 12),
      level: tier1 > 2 ? "Critical" : tier1 > 0 ? "High" : "Medium",
      headline: `Tier 1: ${tier1}, Tier 2: ${tier2}, Tier 3: ${tier3}`,
      recommendations,
      next24hPlan: next24.map((item) => `${item.label}: ${item.text}`),
      accounts
    };

    if (tier1El) tier1El.textContent = String(tier1);
    if (tier2El) tier2El.textContent = String(tier2);
    if (tier3El) tier3El.textContent = String(tier3);
    setList(recList, recommendations.length > 0 ? recommendations : ["Add account rows to generate migration recommendations."]);
    setSteps(stepsEl, next24);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    buildResult();
  });

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      addRow();
    });
  }

  rowsRoot.addEventListener("change", buildResult);
  rowsRoot.addEventListener("input", buildResult);

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) buildResult();
      if (!latest) return;
      downloadPayload({
        toolId: "account-priority-matrix",
        generatedAt: new Date().toISOString(),
        inputs: {
          accountCount: latest.accounts.length,
          tier1Count: Number(tier1El ? tier1El.textContent : 0),
          tier2Count: Number(tier2El ? tier2El.textContent : 0),
          tier3Count: Number(tier3El ? tier3El.textContent : 0)
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

  if (rowsRoot && rowsRoot.querySelectorAll(".matrix-row").length === 0) {
    addRow();
    addRow();
  }

  buildResult();
}

