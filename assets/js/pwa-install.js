let deferredInstallPrompt = null;

const installButton = document.getElementById("install-app-btn");
const offlineStatus = document.getElementById("offline-status");

function updateNetworkStatus() {
  if (!offlineStatus) {
    return;
  }

  if (navigator.onLine) {
    offlineStatus.textContent = "Online: checker is ready for install and offline access.";
    offlineStatus.classList.remove("is-offline");
  } else {
    offlineStatus.textContent = "Offline: password checker still works after first load.";
    offlineStatus.classList.add("is-offline");
  }
}

function hideInstallButton() {
  if (installButton) {
    installButton.hidden = true;
  }
}

function showInstallButton() {
  if (installButton) {
    installButton.hidden = false;
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js").catch(function () {
      // Service worker registration failure should not affect checker usage.
    });
  });
}

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", function () {
  deferredInstallPrompt = null;
  hideInstallButton();
  if (offlineStatus) {
    offlineStatus.textContent = "App installed. You can launch OopsMyPassword from your device.";
    offlineStatus.classList.remove("is-offline");
  }
});

if (installButton) {
  installButton.addEventListener("click", async function () {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      // Ignore prompt resolution failures.
    }

    deferredInstallPrompt = null;
    hideInstallButton();
  });

  hideInstallButton();
}

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
updateNetworkStatus();

