import { assessPassword, generatePhrase } from "./core/password-adapter.js";
import { buildMeter, formatPercent, setList } from "./core/util.js";
import { downloadPayload } from "./core/export.js";

const form = document.getElementById("passphrase-generator-form");
if (form) {
  const modeEl = document.getElementById("phrase-mode");
  const wordCountEl = document.getElementById("phrase-word-count");
  const separatorEl = document.getElementById("phrase-separator");
  const numberEl = document.getElementById("phrase-number");
  const symbolEl = document.getElementById("phrase-symbol");
  const outputEl = document.getElementById("phrase-output");
  const meter = document.getElementById("phrase-meter-fill");
  const scoreEl = document.getElementById("phrase-score");
  const crackEl = document.getElementById("phrase-crack");
  const recList = document.getElementById("phrase-recommendations");
  const copyBtn = document.getElementById("phrase-copy");
  const exportBtn = document.getElementById("phrase-export");

  let latest = null;

  function readBoolean(node, strict) {
    if (!node) return true;
    if (node.type === "checkbox") {
      return node.checked || strict;
    }
    return node.value === "true" || strict;
  }

  function buildPhrase() {
    const mode = modeEl ? modeEl.value : "memorability";
    const strict = mode === "max-security";
    const options = {
      wordCount: Number(wordCountEl ? wordCountEl.value : 4) + (strict ? 1 : 0),
      separator: separatorEl ? separatorEl.value : "hyphen",
      includeNumber: readBoolean(numberEl, strict),
      includeSymbol: readBoolean(symbolEl, strict)
    };

    const phrase = generatePhrase(options);
    if (outputEl) {
      outputEl.value = phrase;
    }

    const assessed = assessPassword(phrase);
    const recommendations = assessed.suggestions.slice(0, 4);
    if (strict) {
      recommendations.unshift("Use this phrase only for high-value accounts and keep it unique.");
    }

    latest = {
      phrase,
      mode,
      options,
      score: assessed.score,
      level: assessed.score >= 80 ? "Ready" : assessed.score >= 60 ? "Medium" : "High",
      headline: strict ? "Maximum-security phrase generated" : "Memorable phrase generated",
      recommendations,
      next24hPlan: [
        "Assign this phrase to one account only.",
        "Store it in your password manager immediately.",
        "Enable MFA on the same account before next login."
      ],
      crackTimeText: assessed.crackTimeText
    };

    buildMeter(meter, assessed.score);
    if (scoreEl) scoreEl.textContent = formatPercent(assessed.score);
    if (crackEl) crackEl.textContent = assessed.crackTimeText;
    setList(recList, recommendations);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    buildPhrase();
  });

  if (modeEl) {
    modeEl.addEventListener("change", function () {
      const strict = modeEl.value === "max-security";
      if (strict) {
        if (numberEl) {
          if (numberEl.type === "checkbox") {
            numberEl.checked = true;
          } else {
            numberEl.value = "true";
          }
        }
        if (symbolEl) {
          if (symbolEl.type === "checkbox") {
            symbolEl.checked = true;
          } else {
            symbolEl.value = "true";
          }
        }
      }
      buildPhrase();
    });
  }

  [wordCountEl, separatorEl, numberEl, symbolEl].forEach(function (node) {
    if (node) {
      node.addEventListener("change", buildPhrase);
    }
  });

  if (copyBtn && outputEl) {
    copyBtn.addEventListener("click", async function () {
      if (!outputEl.value) return;
      try {
        await navigator.clipboard.writeText(outputEl.value);
        copyBtn.textContent = "Copied";
        setTimeout(function () {
          copyBtn.textContent = "Copy";
        }, 1400);
      } catch (error) {
        copyBtn.textContent = "Copy Failed";
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!latest) buildPhrase();
      if (!latest) return;
      downloadPayload({
        toolId: "passphrase-generator",
        generatedAt: new Date().toISOString(),
        inputs: {
          mode: latest.mode,
          wordCount: latest.options.wordCount,
          separator: latest.options.separator,
          includeNumber: Boolean(latest.options.includeNumber),
          includeSymbol: Boolean(latest.options.includeSymbol)
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

  buildPhrase();
}

