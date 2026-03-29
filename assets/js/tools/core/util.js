export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function levelFromRiskScore(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

export function readinessFromScore(score) {
  if (score >= 82) return "Ready";
  if (score >= 60) return "Medium";
  if (score >= 35) return "High";
  return "Critical";
}

export function setList(listEl, items) {
  if (!listEl) return;
  listEl.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    listEl.appendChild(li);
  }
}

export function setSteps(container, steps) {
  if (!container) return;
  container.innerHTML = "";
  for (const step of steps) {
    const div = document.createElement("div");
    div.className = "step";
    div.innerHTML = `<strong>${escapeHtml(step.label)}:</strong> ${escapeHtml(step.text)}`;
    container.appendChild(div);
  }
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMeter(fillEl, score) {
  if (!fillEl) return;
  fillEl.style.width = `${score}%`;
  let className = "meter-fill";
  if (score >= 70) {
    className += " good";
  } else if (score >= 40) {
    className += " medium";
  }
  fillEl.className = className;
}

export function formatPercent(score) {
  return `${Math.round(score)} / 100`;
}

export function serializeForm(formEl) {
  const data = new FormData(formEl);
  const output = {};
  for (const [key, value] of data.entries()) {
    if (output[key] !== undefined) {
      if (!Array.isArray(output[key])) {
        output[key] = [output[key]];
      }
      output[key].push(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

