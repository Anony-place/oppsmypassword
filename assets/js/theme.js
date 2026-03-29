(function () {
  var STORAGE_KEY = "omp-theme";
  var MODES = ["system", "dark", "light"];
  var root = document.documentElement;
  var mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function safeGetMode() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      if (value === "system" || value === "dark" || value === "light") {
        return value;
      }
    } catch (error) {
      // Ignore blocked storage.
    }
    return "system";
  }

  function safeSetMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      // Ignore blocked storage.
    }
  }

  function systemTheme() {
    return mediaQuery && mediaQuery.matches ? "dark" : "light";
  }

  function resolveTheme(mode) {
    return mode === "system" ? systemTheme() : mode;
  }

  function modeLabel(mode, resolved) {
    if (mode === "system") {
      return "Theme: System (" + resolved.charAt(0).toUpperCase() + resolved.slice(1) + ")";
    }
    return "Theme: " + mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function renderToggle(mode, resolved) {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    var label = modeLabel(mode, resolved);
    toggle.textContent = label;
    toggle.setAttribute("aria-label", label + ". Activate to change theme mode.");
    toggle.setAttribute("title", label);
    toggle.setAttribute("aria-pressed", mode === "system" ? "false" : "true");
  }

  function applyMode(mode, persist) {
    var resolved = resolveTheme(mode);
    root.dataset.themeMode = mode;
    root.dataset.theme = resolved;
    root.setAttribute("data-theme-ready", "true");
    renderToggle(mode, resolved);

    if (persist) {
      safeSetMode(mode);
    }
  }

  function nextMode(current) {
    var index = MODES.indexOf(current);
    if (index === -1) return "system";
    return MODES[(index + 1) % MODES.length];
  }

  function bindToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var current = root.dataset.themeMode || safeGetMode();
      applyMode(nextMode(current), true);
    });
  }

  function bindSystemListener() {
    if (!mediaQuery) return;

    var onChange = function () {
      if ((root.dataset.themeMode || safeGetMode()) === "system") {
        applyMode("system", false);
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(onChange);
    }
  }

  var initialMode = root.dataset.themeMode || safeGetMode();
  applyMode(initialMode, false);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindToggle();
      bindSystemListener();
    });
  } else {
    bindToggle();
    bindSystemListener();
  }
})();