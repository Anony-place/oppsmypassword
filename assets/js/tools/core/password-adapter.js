import {
  analyzePassword,
  generatePassphrase,
  generateStrongPassword
} from "../../password-core.js?v=20260220v3";

export function assessPassword(password) {
  return analyzePassword(password || "");
}

export function generatePhrase(options) {
  return generatePassphrase(options || {});
}

export function generatePassword(length = 18) {
  return generateStrongPassword(length);
}

