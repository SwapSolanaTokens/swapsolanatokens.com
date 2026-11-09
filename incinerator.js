// Text of the (i) popup for the Sol Incinerator card.
// app.js defines INFO and builds the popup when a button is pressed, so this
// file only adds one entry. It must load after app.js (both are deferred, in
// document order). The popup text is rendered with textContent.
(function () {
  "use strict";
  if (typeof INFO !== "object" || INFO === null) return;
  INFO.incinerator = {
    title: "Sol Incinerator",
    text: "Two links to Sol Incinerator, an independent service you use with your own wallet. Burn / Claim lets you burn unwanted tokens and close empty accounts to get their SOL deposit back. Revoke removes token approvals you no longer want. Burning is permanent. This site is not affiliated with Sol Incinerator and sees nothing you do there: review every transaction before you sign.",
    faq: "faq-incinerator",
  };
})();
