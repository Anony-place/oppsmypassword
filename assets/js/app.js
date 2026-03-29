import { analyzePassword, generatePassphrase, generateStrongPassword } from "./password-core.js?v=20260220v3";

const elements = {
  input: document.getElementById("password-input"),
  toggle: document.getElementById("toggle-visibility"),
  meter: document.getElementById("strength-meter"),
  strengthLabel: document.getElementById("strength-label"),
  entropyText: document.getElementById("entropy-text"),
  crackTimeText: document.getElementById("crack-time-text"),
  explanationText: document.getElementById("explanation-text"),
  suggestionsList: document.getElementById("suggestions-list"),
  generateBtn: document.getElementById("generate-btn"),
  copyBtn: document.getElementById("copy-btn"),
  copyStatus: document.getElementById("copy-status"),
  resultPanel: document.getElementById("result-panel"),
  generatorMode: document.getElementById("generator-mode"),
  passphraseControls: document.getElementById("passphrase-controls"),
  passphraseWordCount: document.getElementById("passphrase-word-count"),
  passphraseSeparator: document.getElementById("passphrase-separator"),
  passphraseAddNumber: document.getElementById("passphrase-add-number"),
  passphraseAddSymbol: document.getElementById("passphrase-add-symbol"),
  accountTarget: document.getElementById("account-target"),
  targetStatusText: document.getElementById("target-status-text"),
  targetHint: document.getElementById("target-hint")
};

let copyStatusTimer = null;
const ACCOUNT_TARGETS = {
  email: {
    label: "Email",
    minimumScore: 80,
    hint: "Email is your recovery hub. Aim for Extremely Strong and enable MFA."
  },
  banking: {
    label: "Banking",
    minimumScore: 90,
    hint: "Use maximum strength for financial accounts and keep credentials unique."
  },
  social: {
    label: "Social",
    minimumScore: 70,
    hint: "Social accounts are high-value phishing targets. Use strong unique credentials."
  },
  work: {
    label: "Work",
    minimumScore: 75,
    hint: "Work logins should be unique and managed in a secure password manager."
  }
};

function meterClassFromLabel(label) {
  if (label === "Extremely Strong") {
    return "xstrong";
  }
  if (label === "Strong") {
    return "strong";
  }
  if (label === "Medium") {
    return "medium";
  }
  return "weak";
}

function setCopyStatus(message) {
  if (!elements.copyStatus) {
    return;
  }

  elements.copyStatus.textContent = message;
  if (copyStatusTimer) {
    window.clearTimeout(copyStatusTimer);
  }
  copyStatusTimer = window.setTimeout(function () {
    elements.copyStatus.textContent = "";
  }, 1600);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-9999px";
  document.body.appendChild(area);
  area.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(area);

  if (!ok) {
    throw new Error("copy failed");
  }
}

function currentTargetConfig() {
  const key = elements.accountTarget ? elements.accountTarget.value : "email";
  return ACCOUNT_TARGETS[key] || ACCOUNT_TARGETS.email;
}

function updateGeneratorModeUI() {
  if (!elements.generatorMode || !elements.generateBtn || !elements.passphraseControls) {
    return;
  }

  const passphraseMode = elements.generatorMode.value === "passphrase";
  elements.passphraseControls.hidden = !passphraseMode;
  elements.passphraseControls.classList.toggle("is-hidden", !passphraseMode);
  elements.generateBtn.textContent = passphraseMode ? "Generate secure passphrase" : "Generate stronger password";
}

function updateUI(analysisResult) {
  if (!elements.meter || !elements.strengthLabel || !elements.entropyText || !elements.crackTimeText || !elements.explanationText || !elements.suggestionsList || !elements.resultPanel) {
    return;
  }

  const meterClass = meterClassFromLabel(analysisResult.label);
  elements.meter.style.width = analysisResult.score + "%";
  elements.meter.className = "meter-fill " + meterClass;

  elements.strengthLabel.textContent = analysisResult.label;
  elements.strengthLabel.className = "strength-text " + meterClass;
  elements.entropyText.textContent = analysisResult.effectiveEntropy.toFixed(1) + " bits";
  elements.crackTimeText.textContent = analysisResult.crackTimeText;

  const targetConfig = currentTargetConfig();
  const meetsTarget = analysisResult.score >= targetConfig.minimumScore;
  const targetMessage = meetsTarget
    ? "Meets " + targetConfig.label + " target (" + targetConfig.minimumScore + "+)."
    : "Below " + targetConfig.label + " target (" + targetConfig.minimumScore + "+).";

  elements.explanationText.textContent = analysisResult.explanation + (meetsTarget
    ? " This aligns with the selected account target."
    : " Improve this password before using it for " + targetConfig.label.toLowerCase() + " accounts.");

  const suggestionItems = analysisResult.suggestions.slice();
  if (!meetsTarget) {
    suggestionItems.unshift("Raise score to at least " + targetConfig.minimumScore + " for " + targetConfig.label + " accounts.");
  }

  elements.suggestionsList.innerHTML = "";
  for (const suggestion of suggestionItems) {
    const li = document.createElement("li");
    li.textContent = suggestion;
    elements.suggestionsList.appendChild(li);
  }

  if (elements.targetStatusText) {
    elements.targetStatusText.textContent = targetMessage;
    elements.targetStatusText.className = meetsTarget ? "target-status good" : "target-status warning";
  }
  if (elements.targetHint) {
    elements.targetHint.textContent = targetConfig.hint;
  }

  elements.resultPanel.classList.add("is-visible");
}

function onPasswordInput() {
  if (!elements.input) {
    return;
  }
  updateUI(analyzePassword(elements.input.value));
}

if (elements.input) {
  elements.input.addEventListener("input", onPasswordInput);
}

if (elements.toggle && elements.input) {
  elements.toggle.addEventListener("click", function () {
    const isHidden = elements.input.type === "password";
    elements.input.type = isHidden ? "text" : "password";
    elements.toggle.textContent = isHidden ? "Hide" : "Show";
    elements.toggle.setAttribute("aria-pressed", isHidden ? "true" : "false");
  });
}

if (elements.generateBtn && elements.input) {
  elements.generateBtn.addEventListener("click", function () {
    const usePassphraseMode = elements.generatorMode && elements.generatorMode.value === "passphrase";

    if (usePassphraseMode) {
      elements.input.value = generatePassphrase({
        wordCount: Number(elements.passphraseWordCount ? elements.passphraseWordCount.value : 4),
        separator: elements.passphraseSeparator ? elements.passphraseSeparator.value : "hyphen",
        includeNumber: elements.passphraseAddNumber ? elements.passphraseAddNumber.checked : true,
        includeSymbol: elements.passphraseAddSymbol ? elements.passphraseAddSymbol.checked : true
      });
    } else {
      elements.input.value = generateStrongPassword(18);
    }

    elements.input.type = "password";
    if (elements.toggle) {
      elements.toggle.textContent = "Show";
      elements.toggle.setAttribute("aria-pressed", "false");
    }

    onPasswordInput();
  });
}

if (elements.copyBtn && elements.input) {
  elements.copyBtn.addEventListener("click", async function () {
    const currentPassword = elements.input.value;
    if (!currentPassword) {
      setCopyStatus("Nothing to copy");
      return;
    }

    try {
      await copyText(currentPassword);
      setCopyStatus("Copied");
    } catch (error) {
      setCopyStatus("Copy failed");
    }
  });
}

if (elements.generatorMode) {
  elements.generatorMode.addEventListener("change", function () {
    updateGeneratorModeUI();
  });
}

if (elements.accountTarget) {
  elements.accountTarget.addEventListener("change", function () {
    onPasswordInput();
  });
}

updateGeneratorModeUI();
updateUI(analyzePassword(elements.input ? elements.input.value : ""));

