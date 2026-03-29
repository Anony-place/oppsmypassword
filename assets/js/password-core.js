/**
 * @typedef {Object} PenaltyResult
 * @property {number} repeatPenalty
 * @property {number} patternPenalty
 * @property {number} dictionaryPenalty
 * @property {boolean} hasCommonPattern
 * @property {boolean} hasKeyboardWalk
 * @property {boolean} hasSequentialRun
 * @property {string[]} findings
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {number} score
 * @property {"Weak"|"Medium"|"Strong"|"Extremely Strong"} label
 * @property {number} effectiveEntropy
 * @property {string} crackTimeText
 * @property {string} explanation
 * @property {string[]} suggestions
 */

const COMMON_PATTERNS = ["123", "abc", "qwerty", "password"];
const KEYBOARD_WALKS = [
  "qwe", "wer", "ert", "rty", "tyu", "yui", "uio", "iop",
  "asd", "sdf", "dfg", "fgh", "ghj", "hjk", "jkl",
  "zxc", "xcv", "cvb", "vbn", "bnm", "1q2w", "qaz", "wsx", "edc", "rfv", "tgb", "yhn", "ujm"
];
const DICTIONARY_WORDS = [
  "password", "admin", "welcome", "qwerty", "letmein", "monkey", "dragon", "baseball", "football",
  "master", "shadow", "sunshine", "princess", "login", "abc123", "iloveyou", "trustno1", "secret",
  "default", "user", "test", "guest", "root", "pass", "god", "love", "star", "summer", "winter",
  "spring", "autumn", "hello", "freedom", "whatever", "jordan", "michael", "superman", "batman",
  "qazwsx", "asdf", "computer", "internet", "security", "service", "support", "company", "personal",
  "family", "school", "mobile", "phone"
];

const DICTIONARY_UNIQUE = [...new Set(DICTIONARY_WORDS.map((word) => word.toLowerCase()))];
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`";
const PASSPHRASE_WORDS = [
  "anchor", "artist", "azure", "beacon", "breeze", "cactus", "canvas", "cobalt", "comet", "copper",
  "coral", "crystal", "desert", "drift", "ember", "falcon", "fern", "forest", "frost", "galaxy",
  "garden", "glacier", "harbor", "hazel", "honey", "island", "jungle", "lantern", "lavender", "meadow",
  "meteor", "midnight", "mist", "nebula", "oasis", "olive", "orchid", "pebble", "pine", "planet",
  "quartz", "raven", "river", "saffron", "sapphire", "shadow", "silver", "snow", "solstice", "sparrow",
  "storm", "sunset", "thunder", "timber", "violet", "willow", "winter", "zenith", "amber", "apricot",
  "atlas", "aurora", "bay", "berry", "blossom", "boulder", "brook", "canyon", "cedar", "cherry",
  "cliff", "cloud", "coast", "dawn", "delta", "dune", "echo", "elm", "field", "firefly",
  "flame", "flora", "flute", "glow", "grove", "harvest", "horizon", "iris", "ivory", "jade",
  "lagoon", "leaf", "lily", "lotus", "maple", "marble", "mint", "moon", "moss", "north",
  "opal", "orbit", "petal", "phoenix", "plume", "prairie", "rain", "reef", "ridge", "rose",
  "ruby", "sage", "sand", "shore", "sky", "slate", "spring", "star", "stone", "summer",
  "sun", "swift", "tidal", "tulip", "valley", "velvet", "wave", "wild", "wind", "woodland"
];
const PASSPHRASE_SEPARATORS = {
  hyphen: "-",
  underscore: "_",
  dot: ".",
  space: " "
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function characterProfile(password) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const classCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  let poolSize = 0;
  if (hasLower) {
    poolSize += 26;
  }
  if (hasUpper) {
    poolSize += 26;
  }
  if (hasNumber) {
    poolSize += 10;
  }
  if (hasSymbol) {
    poolSize += 32;
  }

  return { hasLower, hasUpper, hasNumber, hasSymbol, classCount, poolSize };
}

function isLetterCode(code) {
  return code >= 97 && code <= 122;
}

function isDigitCode(code) {
  return code >= 48 && code <= 57;
}

function sameAlphaNumGroup(a, b) {
  const bothLetters = isLetterCode(a) && isLetterCode(b);
  const bothDigits = isDigitCode(a) && isDigitCode(b);
  return bothLetters || bothDigits;
}

function hasKeyboardWalk(passwordLower) {
  for (const pattern of KEYBOARD_WALKS) {
    const reversePattern = pattern.split("").reverse().join("");
    if (passwordLower.includes(pattern) || passwordLower.includes(reversePattern)) {
      return true;
    }
  }
  return false;
}

function hasSequentialRun(passwordLower) {
  let ascRun = 1;
  let descRun = 1;

  for (let i = 1; i < passwordLower.length; i += 1) {
    const prev = passwordLower.charCodeAt(i - 1);
    const curr = passwordLower.charCodeAt(i);

    if (!sameAlphaNumGroup(prev, curr)) {
      ascRun = 1;
      descRun = 1;
      continue;
    }

    const diff = curr - prev;
    ascRun = diff === 1 ? ascRun + 1 : 1;
    descRun = diff === -1 ? descRun + 1 : 1;

    if (ascRun >= 3 || descRun >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Computes repeat, pattern, and dictionary penalties.
 *
 * @param {string} passwordLower
 * @param {string} originalPassword
 * @returns {PenaltyResult}
 */
export function computePenalties(passwordLower, originalPassword) {
  let repeatPenalty = 0;
  let patternPenalty = 0;
  let dictionaryPenalty = 0;
  let hasCommonPattern = false;
  let hasKeyboardPattern = false;
  let hasSequentialPattern = false;
  const findings = [];

  let runLength = 1;
  for (let i = 1; i <= originalPassword.length; i += 1) {
    if (originalPassword[i] === originalPassword[i - 1]) {
      runLength += 1;
    } else {
      if (runLength >= 3) {
        repeatPenalty += 2 * (runLength - 2);
      }
      runLength = 1;
    }
  }

  if (repeatPenalty > 0) {
    findings.push("repeated character runs");
  }

  if (originalPassword.length > 0) {
    const uniqueRatio = new Set(originalPassword).size / originalPassword.length;
    if (uniqueRatio < 0.5) {
      repeatPenalty += 8;
      findings.push("low character uniqueness");
    }
  }

  for (const pattern of COMMON_PATTERNS) {
    if (passwordLower.includes(pattern)) {
      patternPenalty += 15;
      hasCommonPattern = true;
    }
  }

  if (hasKeyboardWalk(passwordLower)) {
    patternPenalty += 10;
    hasKeyboardPattern = true;
  }

  if (hasSequentialRun(passwordLower)) {
    patternPenalty += 10;
    hasSequentialPattern = true;
  }

  if (hasCommonPattern) {
    findings.push("common patterns found");
  }
  if (hasKeyboardPattern) {
    findings.push("keyboard walk patterns found");
  }
  if (hasSequentialPattern) {
    findings.push("sequential character runs found");
  }

  const matchedWords = [];
  for (const word of DICTIONARY_UNIQUE) {
    if (word.length >= 4 && passwordLower.includes(word)) {
      matchedWords.push(word);
    }
  }

  if (matchedWords.length > 0) {
    dictionaryPenalty = Math.min(24, new Set(matchedWords).size * 12);
    findings.push("dictionary words detected");
  }

  return {
    repeatPenalty,
    patternPenalty,
    dictionaryPenalty,
    hasCommonPattern,
    hasKeyboardWalk: hasKeyboardPattern,
    hasSequentialRun: hasSequentialPattern,
    findings
  };
}

function formatValue(value) {
  if (value >= 100) {
    return Math.round(value).toLocaleString();
  }
  if (value >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function pluralize(unit, value) {
  return value === 1 ? unit : unit + "s";
}

function formatYears(years) {
  if (years >= 1e9) {
    return formatValue(years / 1e9) + " billion years";
  }
  if (years >= 1e6) {
    return formatValue(years / 1e6) + " million years";
  }
  if (years >= 1e3) {
    return formatValue(years / 1e3) + " thousand years";
  }
  return formatValue(years) + " " + pluralize("year", Math.round(years));
}

/**
 * Formats entropy into human-readable brute-force crack-time text.
 *
 * @param {number} entropyBits
 * @returns {string}
 */
export function formatCrackTimeFromEntropy(entropyBits) {
  const guessesPerSecond = 1e10;
  const log10Two = Math.log10(2);
  const secondsPerMinute = 60;
  const secondsPerHour = 3600;
  const secondsPerDay = 86400;
  const secondsPerMonth = 2629800;
  const secondsPerYear = 31557600;

  const log10Seconds = (entropyBits - 1) * log10Two - Math.log10(guessesPerSecond);

  if (!Number.isFinite(log10Seconds) || log10Seconds < 0) {
    return "<1 second";
  }

  if (log10Seconds <= 12) {
    const seconds = 10 ** log10Seconds;

    if (seconds < 1) {
      return "<1 second";
    }
    if (seconds < secondsPerMinute) {
      return formatValue(seconds) + " " + pluralize("second", Math.round(seconds));
    }
    if (seconds < secondsPerHour) {
      const minutes = seconds / secondsPerMinute;
      return formatValue(minutes) + " " + pluralize("minute", Math.round(minutes));
    }
    if (seconds < secondsPerDay) {
      const hours = seconds / secondsPerHour;
      return formatValue(hours) + " " + pluralize("hour", Math.round(hours));
    }
    if (seconds < secondsPerMonth) {
      const days = seconds / secondsPerDay;
      return formatValue(days) + " " + pluralize("day", Math.round(days));
    }
    if (seconds < secondsPerYear) {
      const months = seconds / secondsPerMonth;
      return formatValue(months) + " " + pluralize("month", Math.round(months));
    }

    return formatYears(seconds / secondsPerYear);
  }

  const log10Years = log10Seconds - Math.log10(secondsPerYear);
  if (log10Years >= 9) {
    if (log10Years - 9 > 6) {
      return "billions of years";
    }
    return formatValue(10 ** (log10Years - 9)) + " billion years";
  }
  if (log10Years >= 6) {
    return formatValue(10 ** (log10Years - 6)) + " million years";
  }
  if (log10Years >= 3) {
    return formatValue(10 ** (log10Years - 3)) + " thousand years";
  }
  return formatValue(10 ** log10Years) + " years";
}

function labelFromScore(score) {
  if (score >= 80) {
    return "Extremely Strong";
  }
  if (score >= 60) {
    return "Strong";
  }
  if (score >= 35) {
    return "Medium";
  }
  return "Weak";
}

function buildExplanation(length, classCount, penalties, crackTimeText, score) {
  let lengthQuality = "short length";
  if (length >= 16) {
    lengthQuality = "excellent length";
  } else if (length >= 12) {
    lengthQuality = "good length";
  } else if (length >= 8) {
    lengthQuality = "moderate length";
  }

  const weaknessParts = [];
  if (penalties.repeatPenalty > 0) {
    weaknessParts.push("repetition reduces resistance");
  }
  if (penalties.hasCommonPattern || penalties.hasSequentialRun || penalties.hasKeyboardWalk) {
    weaknessParts.push("predictable sequences were detected");
  }
  if (penalties.dictionaryPenalty > 0) {
    weaknessParts.push("dictionary words were detected");
  }

  const weaknessSummary = weaknessParts.length > 0 ? weaknessParts.join(" and ") : "no major pattern weaknesses detected";

  let difficulty = "easy to brute-force";
  if (score >= 80) {
    difficulty = "very hard to brute-force";
  } else if (score >= 60) {
    difficulty = "harder to brute-force";
  } else if (score >= 35) {
    difficulty = "moderately resistant to brute-force attacks";
  }

  return "This password has " + lengthQuality + ", uses " + classCount + " of 4 character types, " + weaknessSummary + ", and is " + difficulty + " with an estimated crack time of " + crackTimeText + ".";
}

function buildSuggestions(profile, penalties, length) {
  const suggestions = [];

  if (length < 12) {
    suggestions.push("Increase length to at least 12 characters.");
  }
  if (!profile.hasUpper) {
    suggestions.push("Add uppercase letters.");
  }
  if (!profile.hasLower) {
    suggestions.push("Add lowercase letters.");
  }
  if (!profile.hasNumber) {
    suggestions.push("Add numbers.");
  }
  if (!profile.hasSymbol) {
    suggestions.push("Add symbols for extra complexity.");
  }
  if (penalties.repeatPenalty > 0) {
    suggestions.push("Avoid repeated characters and predictable runs.");
  }
  if (penalties.hasCommonPattern) {
    suggestions.push("Remove common patterns like 123, abc, qwerty, or password.");
  }
  if (penalties.hasSequentialRun) {
    suggestions.push("Avoid ascending or descending sequences like abc, cba, 123, or 321.");
  }
  if (penalties.hasKeyboardWalk) {
    suggestions.push("Avoid keyboard walk patterns such as qwe, asd, zxc, or 1q2w.");
  }
  if (penalties.dictionaryPenalty > 0) {
    suggestions.push("Avoid dictionary words or obvious terms.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Excellent password composition. Keep it unique for each account.");
  }

  return suggestions;
}

function randomIndex(maxExclusive) {
  const bucket = new Uint32Array(1);
  window.crypto.getRandomValues(bucket);
  return bucket[0] % maxExclusive;
}

function shuffleArray(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Generates a random passphrase with configurable options.
 *
 * @param {{
 *   wordCount?: number,
 *   separator?: "hyphen"|"underscore"|"dot"|"space"|string,
 *   includeNumber?: boolean,
 *   includeSymbol?: boolean
 * }} [options]
 * @returns {string}
 */
export function generatePassphrase(options = {}) {
  const safeWordCount = clamp(Number(options.wordCount) || 4, 4, 8);
  const includeNumber = options.includeNumber !== false;
  const includeSymbol = options.includeSymbol !== false;
  const separatorKey = typeof options.separator === "string" ? options.separator : "hyphen";
  const separator = PASSPHRASE_SEPARATORS[separatorKey] || separatorKey || "-";

  const words = [];
  for (let i = 0; i < safeWordCount; i += 1) {
    words.push(PASSPHRASE_WORDS[randomIndex(PASSPHRASE_WORDS.length)]);
  }

  let passphrase = words.join(separator);

  if (includeNumber) {
    passphrase += String(randomIndex(900) + 100);
  }
  if (includeSymbol) {
    passphrase += SYMBOLS[randomIndex(SYMBOLS.length)];
  }

  return passphrase;
}

/**
 * Generates a strong random password with all major character classes.
 *
 * @param {number} [length=18]
 * @returns {string}
 */
export function generateStrongPassword(length = 18) {
  const safeLength = Math.max(4, length);
  const lowerChars = "abcdefghijklmnopqrstuvwxyz";
  const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numberChars = "0123456789";
  const allChars = lowerChars + upperChars + numberChars + SYMBOLS;

  const result = [
    lowerChars[randomIndex(lowerChars.length)],
    upperChars[randomIndex(upperChars.length)],
    numberChars[randomIndex(numberChars.length)],
    SYMBOLS[randomIndex(SYMBOLS.length)]
  ];

  for (let i = result.length; i < safeLength; i += 1) {
    result.push(allChars[randomIndex(allChars.length)]);
  }

  return shuffleArray(result).join("");
}

/**
 * Analyzes password strength and returns score, entropy, crack-time, and suggestions.
 *
 * @param {string} password
 * @returns {AnalysisResult}
 */
export function analyzePassword(password) {
  if (!password) {
    return {
      score: 0,
      label: "Weak",
      effectiveEntropy: 0,
      crackTimeText: "<1 second",
      explanation: "Use at least 12 characters with mixed character types for stronger protection.",
      suggestions: [
        "Use 12 or more characters.",
        "Mix uppercase, lowercase, numbers, and symbols."
      ]
    };
  }

  const length = password.length;
  const passwordLower = password.toLowerCase();
  const profile = characterProfile(password);
  const penalties = computePenalties(passwordLower, password);

  const lengthScore = Math.min(60, length * 4);
  const varietyScore = 10 * profile.classCount;
  const baseScore = lengthScore + varietyScore;
  const score = clamp(baseScore - penalties.repeatPenalty - penalties.patternPenalty - penalties.dictionaryPenalty, 0, 100);
  const label = labelFromScore(score);

  const rawEntropy = profile.poolSize > 0 ? length * Math.log2(profile.poolSize) : 0;
  const entropyPenaltyBits =
    penalties.repeatPenalty * 0.8 +
    penalties.patternPenalty * 0.6 +
    penalties.dictionaryPenalty * 0.6;
  const effectiveEntropy = Math.max(0, rawEntropy - entropyPenaltyBits);

  const crackTimeText = formatCrackTimeFromEntropy(effectiveEntropy);
  const explanation = buildExplanation(length, profile.classCount, penalties, crackTimeText, score);
  const suggestions = buildSuggestions(profile, penalties, length);

  return {
    score,
    label,
    effectiveEntropy,
    crackTimeText,
    explanation,
    suggestions
  };
}

