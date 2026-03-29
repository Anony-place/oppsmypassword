const ADSENSE_CLIENT = "ca-pub-5826652112388036";
const AD_SCRIPT_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT;

let adScriptLoaded = false;
const triggerEvents = ["pointerdown", "keydown", "touchstart", "scroll"];

function shouldLoadAds() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.saveData) {
    return false;
  }
  return true;
}

function clearTriggers() {
  for (const eventName of triggerEvents) {
    window.removeEventListener(eventName, onTrigger, true);
  }
}

function loadAdsScript() {
  if (adScriptLoaded || !shouldLoadAds()) {
    clearTriggers();
    return;
  }

  adScriptLoaded = true;
  clearTriggers();

  const script = document.createElement("script");
  script.async = true;
  script.src = AD_SCRIPT_SRC;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

function onTrigger() {
  loadAdsScript();
}

for (const eventName of triggerEvents) {
  window.addEventListener(eventName, onTrigger, { once: true, passive: true, capture: true });
}

window.setTimeout(loadAdsScript, 6500);
