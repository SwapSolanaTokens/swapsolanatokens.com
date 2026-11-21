// ---- Light / dark theme ----
// Loaded in the <head> of every page WITHOUT defer, so the saved theme is
// applied before the first paint (no flash). The choice is kept only in this
// browser (localStorage "swap-theme-v1"). Dark is the default.
//
// The Jupiter swap, the Mayan bridge and the Birdeye chart are third-party
// widgets and stay dark in both themes. Everything else follows the theme
// through theme.css (rules under html[data-theme="light"]).
//
// Any button with the class "theme-toggle" works as a switch. Its icon is
// handled by CSS; its label is set here (English / Spanish).
(function () {
  "use strict";

  var KEY = "swap-theme-v1";
  var root = document.documentElement;
  var theme = "dark";

  function readSaved() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (err) {
      return null;
    }
  }

  function apply(next) {
    theme = next === "light" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f3f5fb" : "#0d0b1e");
  }

  function label() {
    var es = (root.lang || "").slice(0, 2).toLowerCase() === "es";
    if (theme === "dark") return es ? "Cambiar a modo claro" : "Switch to light mode";
    return es ? "Cambiar a modo oscuro" : "Switch to dark mode";
  }

  function syncButtons() {
    var text = label();
    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-label", text);
      buttons[i].setAttribute("title", text);
      buttons[i].setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
  }

  function toggle() {
    apply(theme === "light" ? "dark" : "light");
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (err) {}
    syncButtons();
  }

  apply(readSaved() || "dark");

  document.addEventListener("DOMContentLoaded", function () {
    apply(theme);
    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener("click", toggle);
    syncButtons();
  });

  // Keep several open tabs in step.
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    apply(e.newValue === "light" ? "light" : "dark");
    syncButtons();
  });
})();
