// Puts the token search box (and the EN / ES language switch next to it) in
// the right place for the current screen:
//  - desktop (641px and up): inside the top navigation bar, top right
//  - phones (640px and below): in the page, under the logo and title,
//    because the navigation bar is at the bottom of the screen there.
// The same elements are moved (not copied), so the listeners that app.js and
// i18n.js attach to them keep working. Runs before app.js (both are deferred,
// in document order).
(function () {
  var wrap = document.getElementById("search-wrap");
  var lang = document.getElementById("lang-switch");
  var navSlot = document.getElementById("nav-search-slot");
  var pageSlot = document.getElementById("page-search-slot");
  if (!wrap || !navSlot || !pageSlot || !window.matchMedia) return;

  var phone = window.matchMedia("(max-width: 640px)");

  function place() {
    var target = phone.matches ? pageSlot : navSlot;
    if (wrap.parentNode !== target) target.appendChild(wrap);
    if (lang && lang.parentNode !== target) target.appendChild(lang);
  }

  place();
  if (phone.addEventListener) phone.addEventListener("change", place);
  else if (phone.addListener) phone.addListener(place);
})();
