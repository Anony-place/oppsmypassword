/**
 * @typedef {Object} ToolDescriptor
 * @property {string} id
 * @property {string} title
 * @property {string} route
 * @property {"Identity Security"|"Phishing Defense"|"Device Security"|"Network Security"|"Incident Response"} category
 * @property {string} summary
 * @property {string} primaryCta
 * @property {string} intent
 * @property {"Low"|"Medium"|"High"} difficulty
 * @property {string} estimatedTime
 * @property {"Standards-Based"|"Operational Best Practice"|"Behavioral Guidance"} evidenceLevel
 * @property {string} lastReviewed
 * @property {boolean=} featuredOnHome
 * @property {number=} homeOrder
 */

/**
 * @typedef {Object} AssessmentOutput
 * @property {number} score
 * @property {"Low"|"Medium"|"High"|"Critical"|"Ready"} level
 * @property {string} headline
 * @property {string[]} recommendations
 * @property {string[]=} next24hPlan
 */

/**
 * @typedef {Object} ExportPayload
 * @property {string} toolId
 * @property {string} generatedAt
 * @property {Record<string, string|number|boolean>} inputs
 * @property {AssessmentOutput} output
 */

/** @type {ToolDescriptor[]} */
export const TOOL_DESCRIPTORS = [
  {
    id: "password-checker",
    title: "Password Checker",
    route: "/tools/password-checker/",
    category: "Identity Security",
    summary: "Assess password strength with entropy, crack-time estimates, and target-aware framing.",
    primaryCta: "Assess Password",
    intent: "Validate credential quality before deployment across account tiers.",
    difficulty: "Low",
    estimatedTime: "2-3 min",
    evidenceLevel: "Standards-Based",
    lastReviewed: "2026-02-28",
    featuredOnHome: true,
    homeOrder: 1
  },
  {
    id: "passphrase-generator",
    title: "Passphrase Generator",
    route: "/tools/passphrase-generator/",
    category: "Identity Security",
    summary: "Generate memorable or maximum-security passphrases and estimate practical strength.",
    primaryCta: "Generate Passphrase",
    intent: "Generate unique credential candidates matched to account criticality.",
    difficulty: "Low",
    estimatedTime: "1-2 min",
    evidenceLevel: "Standards-Based",
    lastReviewed: "2026-02-28"
  },
  {
    id: "breach-response-planner",
    title: "Breach Response Planner",
    route: "/tools/breach-response-planner/",
    category: "Incident Response",
    summary: "Get a timed 24-hour incident response plan based on account exposure and attack context.",
    primaryCta: "Build Response Plan",
    intent: "Prioritize containment and credential reset sequence after suspected compromise.",
    difficulty: "Medium",
    estimatedTime: "4-5 min",
    evidenceLevel: "Operational Best Practice",
    lastReviewed: "2026-02-28",
    featuredOnHome: true,
    homeOrder: 2
  },
  {
    id: "recovery-hardening",
    title: "Recovery Hardening",
    route: "/tools/recovery-hardening/",
    category: "Incident Response",
    summary: "Score recovery-channel risk and prioritize controls for email, phone, devices, and backup factors.",
    primaryCta: "Evaluate Recovery",
    intent: "Reduce account takeover via weak recovery pathways and stale fallback options.",
    difficulty: "Medium",
    estimatedTime: "5-7 min",
    evidenceLevel: "Operational Best Practice",
    lastReviewed: "2026-02-28"
  },
  {
    id: "passkey-readiness",
    title: "Passkey Readiness",
    route: "/tools/passkey-readiness/",
    category: "Identity Security",
    summary: "Measure whether your device and account ecosystem is ready for passkey rollout.",
    primaryCta: "Check Readiness",
    intent: "Evaluate readiness and fallback safety before passkey adoption.",
    difficulty: "Medium",
    estimatedTime: "4-6 min",
    evidenceLevel: "Standards-Based",
    lastReviewed: "2026-02-28"
  },
  {
    id: "phishing-reset-safety",
    title: "Phishing Reset Safety",
    route: "/tools/phishing-reset-safety/",
    category: "Phishing Defense",
    summary: "Evaluate reset request risk and generate a safe, verified password-reset workflow.",
    primaryCta: "Check Reset Safety",
    intent: "Block social-engineering reset traps during high-pressure incidents.",
    difficulty: "Low",
    estimatedTime: "3-4 min",
    evidenceLevel: "Behavioral Guidance",
    lastReviewed: "2026-02-28"
  },
  {
    id: "account-priority-matrix",
    title: "Account Priority Matrix",
    route: "/tools/account-priority-matrix/",
    category: "Incident Response",
    summary: "Tier your accounts by blast radius and generate a migration sequence that reduces takeover risk.",
    primaryCta: "Build Matrix",
    intent: "Sequence account hardening by business and identity impact.",
    difficulty: "Medium",
    estimatedTime: "6-8 min",
    evidenceLevel: "Operational Best Practice",
    lastReviewed: "2026-02-28",
    featuredOnHome: true,
    homeOrder: 3
  },
  {
    id: "mfa-method-selector",
    title: "MFA Method Selector",
    route: "/tools/mfa-method-selector/",
    category: "Identity Security",
    summary: "Select the right MFA method for each account based on risk, usability, and recovery readiness.",
    primaryCta: "Select MFA Method",
    intent: "Match MFA strength to account class while avoiding lockout-prone setups.",
    difficulty: "Low",
    estimatedTime: "3-5 min",
    evidenceLevel: "Standards-Based",
    lastReviewed: "2026-02-28",
    featuredOnHome: true,
    homeOrder: 4
  },
  {
    id: "phishing-message-triage",
    title: "Phishing Message Triage",
    route: "/tools/phishing-message-triage/",
    category: "Phishing Defense",
    summary: "Triage suspicious emails or messages with verification steps before clicking links or sharing data.",
    primaryCta: "Triage Message",
    intent: "Reduce phishing click-through by enforcing verification checkpoints.",
    difficulty: "Low",
    estimatedTime: "3-5 min",
    evidenceLevel: "Behavioral Guidance",
    lastReviewed: "2026-02-28",
    featuredOnHome: true,
    homeOrder: 5
  },
  {
    id: "public-wifi-safety-planner",
    title: "Public Wi-Fi Safety Planner",
    route: "/tools/public-wifi-safety-planner/",
    category: "Network Security",
    summary: "Create a safe-session plan for public networks with account, device, and traffic-protection controls.",
    primaryCta: "Plan Safe Session",
    intent: "Lower interception and session-hijack risk on untrusted networks.",
    difficulty: "Medium",
    estimatedTime: "4-6 min",
    evidenceLevel: "Operational Best Practice",
    lastReviewed: "2026-02-28"
  }
];
