// Firebase initialization for anonymous usage analytics only.
// Important: Never log password input values or derived plaintext.
// Performance: load analytics SDK only after real user interaction.

const firebaseConfig = {
  apiKey: "AIzaSyA6JtwlYtoVW-pw5dSeV9HWF5aslVEmId0",
  authDomain: "password-e9a30.firebaseapp.com",
  projectId: "password-e9a30",
  storageBucket: "password-e9a30.firebasestorage.app",
  messagingSenderId: "319939285143",
  appId: "1:319939285143:web:e09d2568d37cd678a599d2",
  measurementId: "G-MDDWLJ30J9"
};

let analyticsBootstrapped = false;
const interactionEvents = ["pointerdown", "keydown", "touchstart"];

function canLoadAnalytics() {
  if (!(window.location.protocol === "https:" || window.location.hostname === "localhost")) {
    return false;
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && (connection.saveData || /(?:^|[^a-z])2g(?:[^a-z]|$)/i.test(connection.effectiveType || ""))) {
    return false;
  }

  return true;
}

function clearInteractionTriggers() {
  for (const eventName of interactionEvents) {
    window.removeEventListener(eventName, onFirstInteraction, true);
  }
}

async function bootstrapAnalytics() {
  if (analyticsBootstrapped || !canLoadAnalytics()) {
    return;
  }
  analyticsBootstrapped = true;
  clearInteractionTriggers();

  try {
    const [firebaseAppModule, analyticsModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js")
    ]);
    const app = firebaseAppModule.initializeApp(firebaseConfig);
    const supported = await analyticsModule.isSupported();
    if (supported) {
      analyticsModule.getAnalytics(app);
    }
  } catch (error) {
    // Fail quietly: analytics should never block page functionality.
  }
}

function onFirstInteraction() {
  void bootstrapAnalytics();
}

if (canLoadAnalytics()) {
  for (const eventName of interactionEvents) {
    window.addEventListener(eventName, onFirstInteraction, { once: true, passive: true, capture: true });
  }
}

