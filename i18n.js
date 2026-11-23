// ---- Spanish (es) / English (en) language switch for the home page ----
// Only index.html uses this file. The widgets (Jupiter swap, Mayan bridge)
// are never touched, and the sub-pages stay in English.
//
// How it works:
//  - The language is chosen in this order: ?lang=es|en in the URL, the
//    visitor's saved choice (localStorage "swap-lang-v1"), the browser's
//    first preferred language (Spanish -> es), otherwise English.
//  - English is the page as written in the HTML. When the language is Spanish,
//    this file translates the visible text, placeholders, titles and
//    aria-labels by exact match or by a few patterns, and keeps translating
//    whatever app.js, momentum.js and lst.js add later (MutationObserver).
//  - Changing the language saves the choice and reloads the page, so no
//    "undo" logic is needed.
//  - Text is only ever read and written with nodeValue / setAttribute, never
//    as HTML. Token names, symbols and mints (third-party data) are skipped.
//
// To change a Spanish text: edit EXACT or RULES below. To stop choosing
// Spanish automatically from the browser language, set AUTO_FROM_BROWSER to
// false. Loaded last (after app.js, momentum.js, lst.js and incinerator.js).
(function () {
  "use strict";

  var STORE_KEY = "swap-lang-v1";
  var SUPPORTED = ["en", "es"];
  var AUTO_FROM_BROWSER = true;

  // ---- Exact texts (the key is the English text, trimmed) ----
  var EXACT = {
    // Navigation
    "Chart": "Gráfico",
    "Portfolio": "Portafolio",
    "How it works": "Cómo funciona",
    "Contact": "Contacto",
    "Site navigation": "Navegación del sitio",
    "Language": "Idioma",

    // Search
    "Search token or mint": "Buscar token o mint",
    "Search a Solana token by name, symbol or mint address": "Buscar un token de Solana por nombre, símbolo o dirección mint",
    "Token search results": "Resultados de búsqueda de tokens",
    "Searching…": "Buscando…",
    "Checking token…": "Verificando token…",
    "No tokens found. Try the exact symbol, or paste the mint address.": "No se encontraron tokens. Prueba el símbolo exacto o pega la dirección mint.",
    "This mint is not in Jupiter's token index. It was loaded anyway: verify the address before trading.": "Este mint no está en el índice de tokens de Jupiter. Se cargó igualmente: verifica la dirección antes de operar.",
    "Could not check this token's details. Verify the mint address before trading.": "No se pudieron verificar los datos de este token. Verifica la dirección mint antes de operar.",
    "Search is temporarily unavailable. You can still paste a mint address, or use the token selector inside the swap.": "La búsqueda no está disponible temporalmente. Aún puedes pegar una dirección mint o usar el selector de tokens dentro del swap.",
    "Copy the full mint address": "Copiar la dirección mint completa",
    "✓ Verified by Jupiter": "✓ Verificado por Jupiter",
    "⚠ Unverified": "⚠ No verificado",
    "Verified by Jupiter": "Verificado por Jupiter",
    "Unverified": "No verificado",
    "Copy failed": "Error al copiar",
    "Copied ✓": "Copiado ✓",
    "Failed": "Falló",
    "Copy CA": "Copiar CA",

    // Welcome
    "Everything you need in Solana": "Todo lo que necesitas en Solana",
    "Swap, bridge, track and check tokens. Non-custodial, no sign-up.": "Haz swaps, usa el bridge, sigue y verifica tokens. Sin custodia, sin registro.",
    "Connect your wallet by opening the swap in:": "Conecta tu wallet abriendo el swap en:",

    // RugCheck
    "RugCheck Quick Audit": "Auditoría rápida con RugCheck",
    "Paste Solana token mint address...": "Pega la dirección mint del token de Solana...",
    "Audit ↗": "Auditar ↗",
    "Please enter a valid Solana mint address (base58).": "Ingresa una dirección mint de Solana válida (base58).",

    // Airdrop Checker
    "Airdrop Checker": "Verificador de airdrops",
    "Paste your wallet address (not a token mint)...": "Pega la dirección de tu wallet (no un mint de token)...",
    "Solana wallet address to check for airdrops": "Dirección de wallet de Solana para buscar airdrops",
    "Open on Jupiter ↗": "Abrir en Jupiter ↗",
    "That looks like a token address, not a wallet. Paste the address of your own wallet.": "Parece una dirección de token, no de una wallet. Pega la dirección de tu propia wallet.",
    "Valid address. The link opens Jupiter's Airdrops page for this wallet in a new tab.": "Dirección válida. El enlace abre la página de Airdrops de Jupiter para esta wallet en una pestaña nueva.",
    ".sol names are not supported here. Paste the wallet address itself.": "Los nombres .sol no son compatibles aquí. Pega la dirección de la wallet.",
    "That is not a valid Solana wallet address. Check that you copied all of it.": "No es una dirección de wallet de Solana válida. Comprueba que la copiaste completa.",

    // Sol Incinerator
    "Burn / Claim ↗": "Quemar / Reclamar ↗",
    "Revoke ↗": "Revocar ↗",

    // Info buttons and popup
    "About RugCheck Quick Audit": "Acerca de la auditoría rápida con RugCheck",
    "About Airdrop Checker": "Acerca del verificador de airdrops",
    "About Sol Incinerator": "Acerca de Sol Incinerator",
    "About this chart": "Acerca de este gráfico",
    "About Liquid staking APY": "Acerca del APY de staking líquido",
    "About Trending": "Acerca de Tendencias",
    "About Top volume": "Acerca de Mayor volumen",
    "About Top Momentum": "Acerca de Top Momentum",
    "About the Top 100": "Acerca del Top 100",
    "About Solana Protocols": "Acerca de Protocolos de Solana",
    "Full explanation ↗": "Explicación completa ↗",
    "Close": "Cerrar",

    // Chart and inspector
    "Price chart": "Gráfico de precios",
    "Chart timeframe": "Plazo del gráfico",
    "Loading chart…": "Cargando gráfico…",
    "Add to Portfolio": "Añadir al Portafolio",
    "In Portfolio": "En Portafolio",
    "Add to my Portfolio": "Añadir a mi Portafolio",
    "Remove from my Portfolio": "Quitar de mi Portafolio",
    "Copy token contract address": "Copiar la dirección del contrato del token",

    // Liquid staking
    "Liquid staking": "Staking líquido",
    "Loading APY…": "Cargando APY…",
    "Get": "Obtener",
    "TVL n/a": "TVL n/d",
    "n/a": "n/d",
    "APY data is temporarily unavailable.": "Los datos de APY no están disponibles temporalmente.",
    "No liquid staking token passes the filters right now.": "Ningún token de staking líquido cumple los filtros ahora.",
    "Retry": "Reintentar",

    // Trending / Top volume
    "Trending": "Tendencias",
    "Top volume": "Mayor volumen",
    "▲ Top gainers": "▲ Mayores subidas",
    "▼ Top losers": "▼ Mayores bajadas",
    "● Most traded · 24h volume": "● Más operados · volumen 24h",
    "Loading rankings…": "Cargando rankings…",
    "No tokens match the filters right now.": "Ningún token cumple los filtros ahora.",
    "Rankings are temporarily unavailable.": "Los rankings no están disponibles temporalmente.",

    // Top Momentum
    "Loading ranking…": "Cargando ranking…",
    "/ 100 momentum": "/ 100 de momentum",
    "Low risk": "Riesgo bajo",
    "Medium risk": "Riesgo medio",
    "24h price": "Precio 24h",
    "Holders 24h": "Holders 24h",
    "24h volume": "Volumen 24h",
    "Age": "Antigüedad",
    "Mint authority active": "Autoridad de mint activa",
    "Volume: no red flags": "Volumen: sin alertas",
    "Suspicious volume": "Volumen sospechoso",
    "LP lock n/a": "Bloqueo de LP n/d",
    "Score breakdown": "Desglose del puntaje",
    "Holder growth": "Crecimiento de holders",
    "Volume growth": "Crecimiento del volumen",
    "Organic activity": "Actividad orgánica",
    "Buy pressure": "Presión de compra",
    "Liquidity depth": "Profundidad de liquidez",
    "Liquidity growth": "Crecimiento de liquidez",
    "Price change": "Cambio de precio",
    "No token passes the filters right now.": "Ningún token cumple los filtros ahora.",
    "The momentum ranking is temporarily unavailable.": "El ranking de momentum no está disponible temporalmente.",

    // Token Analysis
    "Token Analysis": "Análisis de token",
    "Analyze": "Analizar",
    "Analyzing…": "Analizando…",
    "Ticker or mint address...": "Ticker o dirección mint...",
    "Token to analyze: ticker, name or mint address": "Token a analizar: ticker, nombre o dirección mint",
    "Matching tokens": "Tokens que coinciden",
    "Type a ticker or paste a mint address, then press Analyze.": "Escribe un ticker o pega una dirección mint y pulsa Analizar.",
    "Choose the token to analyze:": "Elige el token a analizar:",
    "Token profile": "Perfil del token",
    "Launch platform": "Plataforma de lanzamiento",
    "First pool on": "Primera pool en",
    "Launched": "Lanzado",
    "Main DEXs": "Principales DEX",
    "Listed on": "Cotiza en",
    "Supply": "Suministro",
    "Market cap rank": "Ranking por cap. de mercado",
    "All-time range": "Rango histórico",
    "ATH": "Máx. hist.",
    "ATL": "Mín. hist.",
    "From CoinGecko; not available for every token.": "De CoinGecko; no disponible para todos los tokens.",
    "Analysis could not be loaded right now.": "No se pudo cargar el análisis ahora.",
    "About Token Analysis": "Acerca del Análisis de token",
    "Risk overview": "Resumen de riesgo",
    "Buy vs sell pressure": "Presión de compra vs venta",
    "Liquidity by DEX": "Liquidez por DEX",
    "Recent price (48h)": "Precio reciente (48h)",
    "Key numbers": "Números clave",
    "Security checks": "Controles de seguridad",
    "High risk": "Riesgo alto",
    "Risk points": "Puntos de riesgo",
    "Buys": "Compras",
    "Sells": "Ventas",
    "Market cap": "Cap. de mercado",
    "Liq / MCap": "Liq. / Cap.",
    "Organic score": "Puntaje orgánico",
    "RugCheck findings": "Hallazgos de RugCheck",
    "No findings reported.": "Sin hallazgos reportados.",
    "Self-declared by the token, not verified.": "Declarado por el propio token, no verificado.",
    "Website": "Sitio web",
    "Full RugCheck report ↗": "Reporte completo de RugCheck ↗",
    "Heuristic, not an audit. A low risk reading does not mean a token is safe. Data from Jupiter, RugCheck, DexScreener, GeckoTerminal and CoinGecko; a block shows n/a when its source does not answer.": "Heurística, no una auditoría. Una lectura de riesgo bajo no significa que un token sea seguro. Datos de Jupiter, RugCheck, DexScreener, GeckoTerminal y CoinGecko; un bloque muestra n/d cuando su fuente no responde.",

    // Top 100
    "Top 100 Solana Tokens": "Top 100 tokens de Solana",
    "Live rankings": "Rankings en vivo",
    "Protocols ↓": "Protocolos ↓",
    "Filter by symbol or name...": "Filtrar por símbolo o nombre...",
    "Stocks": "Acciones",
    "Privacy": "Privacidad",
    "Gold / Silver": "Oro / Plata",
    "💼 Portfolio": "💼 Portafolio",
    "Price": "Precio",
    "24h Change": "Cambio 24h",
    "24h Volume": "Volumen 24h",
    "Liquidity": "Liquidez",
    "Action": "Acción",
    "Your Portfolio is empty. Tap ☆ on any token to add it to my Portfolio.": "Tu Portafolio está vacío. Toca ☆ en cualquier token para añadirlo a mi Portafolio.",
    "No tokens in your Portfolio match your search.": "Ningún token de tu Portafolio coincide con tu búsqueda.",
    "No tokens match your search criteria.": "Ningún token coincide con tu búsqueda.",

    // Protocols
    "Solana Protocols": "Protocolos de Solana",
    "By TVL": "Por TVL",
    "Filter protocols...": "Filtrar protocolos...",
    "Filter Solana protocols by name or category": "Filtrar protocolos de Solana por nombre o categoría",
    "Protocol": "Protocolo",
    "Category": "Categoría",
    "Links": "Enlaces",
    "All": "Todos",
    "Show more": "Mostrar más",
    "Loading protocols…": "Cargando protocolos…",
    "No protocols match your search.": "Ningún protocolo coincide con tu búsqueda.",
    "Protocol data is temporarily unavailable.": "Los datos de protocolos no están disponibles temporalmente.",
    "Website ↗": "Sitio web ↗",
    "Multi-chain protocol: DeFiLlama only reports the 7-day change across all chains, so it is not shown here.": "Protocolo multicadena: DeFiLlama solo informa el cambio a 7 días sumando todas las cadenas, por eso no se muestra aquí.",

    // Footer
    "Powered by": "Con tecnología de",
    "Solana swap & bridge guide": "Guía de swap y bridge en Solana",
    "Learn & safety": "Aprende y seguridad",
    "Not affiliated with Jupiter Exchange, Mayan or Sol Incinerator · Non-custodial · Use at your own risk": "Sin afiliación con Jupiter Exchange, Mayan ni Sol Incinerator · Sin custodia · Úsalo bajo tu propio riesgo",
    "Informational only, not financial advice. Cryptocurrency trading involves substantial risk, including total loss.": "Solo informativo, no es asesoría financiera. Operar con criptomonedas implica un riesgo sustancial, incluida la pérdida total.",
    "© 2026 Swap Solana Tokens · Contact:": "© 2026 Swap Solana Tokens · Contacto:"
  };

  // ---- Popup texts (INFO in app.js / incinerator.js) ----
  var INFO_ES = {
    chart: { title: "Gráfico de precios", text: "Muestra el token cargado en el swap. Busca un token, toca uno en una lista o elígelo dentro del swap y las velas lo siguen. Usa 15m / 1H / 4H / 1D para cambiar el plazo." },
    rugcheck: { title: "Auditoría rápida con RugCheck", text: "Pega una dirección mint para abrir su reporte de RugCheck: bloqueos de liquidez, controles de honeypot y autoridad de mint/freeze." },
    airdrop: { title: "Verificador de airdrops", text: "Pega la dirección de tu wallet para abrir su página de Airdrops en Jupiter. Sin conectar la wallet y sin firmar nada. La elegibilidad la muestra Jupiter, no este sitio." },
    lst: { title: "APY de staking líquido", text: "Cuatro tokens de staking líquido con el APY estimado más alto (DeFiLlama, TVL mínimo de $30M). El APY varía y no está garantizado." },
    trending: { title: "Tendencias 24h", text: "Las 5 mayores subidas y bajadas de precio en 24h entre los tokens verificados por Jupiter más operados, con más de $200K de liquidez. Toca un token para cargarlo en el swap." },
    volume: { title: "Mayor volumen 24h", text: "Los 10 tokens verificados por Jupiter con más volumen operado en 24h y más de $200K de liquidez. Mucho volumen es actividad, no seguridad." },
    momentum: { title: "Top Momentum", text: "Los 5 tokens con el momentum más fuerte en 24h (0-100) que además pasan un filtro de riesgo. Requiere más de $100K de liquidez y 48h de antigüedad. Es una heurística, no una auditoría: \"Riesgo bajo\" no significa seguro." },
    top100: { title: "Top 100 tokens de Solana", text: "Los 100 tokens verificados por Jupiter con más liquidez, ordenados por liquidez. Las categorías se asignan por el ticker exacto y no son una calificación de seguridad. Toca Swap para cargar un token, o la estrella para guardarlo en Portafolio (se guarda solo en tu navegador)." },
    protocols: { title: "Protocolos de Solana", text: "Protocolos ordenados por TVL en Solana, según la API pública de DeFiLlama. Se excluyen los exchanges centralizados. Un TVL alto no es una calificación de seguridad." },
    analysis: { title: "Análisis de token", text: "Escribe un ticker o pega una dirección mint y pulsa Analizar. Funciona por su cuenta, sin importar qué token esté cargado en el swap. Obtienes un medidor de riesgo, concentración de holders, presión de compra y venta, cambio de precio, liquidez por DEX, controles de seguridad y un perfil del token con plataforma de lanzamiento, mercados principales y máximo y mínimo históricos. Los datos vienen de Jupiter, RugCheck, DexScreener, GeckoTerminal y CoinGecko, directo desde tu navegador. Es una heurística, no una auditoría: una lectura de riesgo bajo no significa que un token sea seguro." },
    incinerator: { title: "Sol Incinerator", text: "Dos enlaces a Sol Incinerator, un servicio independiente que usas con tu propia wallet. \"Quemar / Reclamar\" sirve para quemar tokens que no quieres y cerrar cuentas vacías para recuperar su depósito de SOL. \"Revocar\" elimina aprobaciones de tokens que ya no quieres. Quemar es permanente. Este sitio no está afiliado a Sol Incinerator y no ve nada de lo que haces allí: revisa cada transacción antes de firmar." }
  };

  var SUS = {
    "low organic score": "puntaje orgánico bajo",
    "big volume from few traders": "mucho volumen de pocos traders",
    "volume far above liquidity": "volumen muy superior a la liquidez"
  };
  var SUS_ALT = "low organic score|big volume from few traders|volume far above liquidity";

  function na(x) { return x === "n/a" ? "n/d" : x; }
  function authState(st) { return st === "active" ? "activa" : st === "off" ? "desactivada" : "n/d"; }
  function flagsEs(s) {
    return s
      .replace(/the mint authority is active/g, "la autoridad de mint está activa")
      .replace(/the freeze authority is active/g, "la autoridad de freeze está activa");
  }

  // ---- Patterns (text with numbers or names inside) ----
  var RULES = [
    [/^Trade (.+), 24h volume (.+)$/, "Operar $1, volumen 24h $2"],
    [/^Trade (.+), 24h (.+)$/, "Operar $1, 24h $2"],
    [/^Trade (.+)$/, "Operar $1"],
    [/^Load (.+) in the swap$/, "Cargar $1 en el swap"],
    [/^Get (.+): load it in the swap$/, "Obtener $1: cárgalo en el swap"],
    [/^Load (.+) (\S+…\S+)$/, "Cargar $1 $2"],
    [/^Copy the full mint address of (.+)$/, "Copiar la dirección mint completa de $1"],
    [/^Sort by (.+)$/, function (m, label) { return "Ordenar por " + tr(label); }],
    [/^Updated (\d{2}:\d{2})$/, "Actualizado $1"],
    [/^Show more \((\d+)\)$/, "Mostrar más ($1)"],
    [/^Your Portfolio is full \((\d+)\)\. Remove one to add another\.$/, "Tu Portafolio está lleno ($1). Quita un token para añadir otro."],
    [/^(\$[\d.,]+[KMB]?) liquidity$/, "$1 de liquidez"],
    [/^Mint authority (active|off|n\/a)$/, function (m, st) { return "Autoridad de mint " + authState(st); }],
    [/^Freeze authority (active|off|n\/a)$/, function (m, st) { return "Autoridad de freeze " + authState(st); }],
    [/^Top holders (\d+%|n\/a)$/, function (m, v) { return "Top holders " + na(v); }],
    [/^Dev holds (\d+%)$/, "Dev posee $1"],
    [/^Oldest pool (.+)$/, "Pool más antigua $1"],
    [/^([+-]?[\d.]+%) from ATH$/, "$1 desde el máx. hist."],
    [/^Age (.+)$/, function (m, v) { return "Antigüedad " + na(v); }],
    [/^Organic score (\d+)$/, "Puntaje orgánico $1"],
    [/^LP locked (\d+%)$/, "LP bloqueada $1"],
    [/^(\d+)% of volume is buys$/, "$1% del volumen son compras"],
    [new RegExp("^(?:" + SUS_ALT + ")(?:, (?:" + SUS_ALT + "))*$"), function (m) {
      return m.replace(new RegExp(SUS_ALT, "g"), function (k) { return SUS[k]; });
    }],
    [/^Risk points: (\d+)\. Under (\d+) is low, under (\d+) is medium; (\d+) or more is left out of this list\.$/,
      "Puntos de riesgo: $1. Menos de $2 es bajo, menos de $3 es medio; $4 o más queda fuera de esta lista."],
    [/^Unverified token: it is not on Jupiter's verified list\. Check the mint address before trading\.(?: \((.+)\)\.)?$/,
      function (m, flags) {
        return "Token no verificado: no está en la lista de verificados de Jupiter. Verifica la dirección mint antes de operar." +
          (flags ? " (" + flagsEs(flags) + ")." : "");
      }],
    [/^Verified by Jupiter\. Note: (.+)\.$/, function (m, flags) { return "Verificado por Jupiter. Nota: " + flagsEs(flags) + "."; }],
    [/^Organic score (\d+)$/, "Puntaje orgánico $1"]
  ];

  function lookup(core) {
    if (Object.prototype.hasOwnProperty.call(EXACT, core)) return EXACT[core];
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(core)) return core.replace(RULES[i][0], RULES[i][1]);
    }
    return null;
  }

  // Translates one string, keeping its leading and trailing spaces.
  function tr(s) {
    if (typeof s !== "string") return s;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2]) return s;
    var out = lookup(m[2]);
    return out === null ? s : m[1] + out + m[3];
  }

  function getLang() {
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q && SUPPORTED.indexOf(q.toLowerCase()) !== -1) return q.toLowerCase();
    } catch (err) {}
    try {
      var saved = window.localStorage.getItem(STORE_KEY);
      if (SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (err) {}
    if (AUTO_FROM_BROWSER) {
      var first = (navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language) || "";
      if (String(first).slice(0, 2).toLowerCase() === "es") return "es";
    }
    return "en";
  }

  // For tests outside the browser.
  if (typeof module === "object" && module && module.exports) module.exports = { tr: tr, lookup: lookup, EXACT: EXACT, INFO_ES: INFO_ES };
  if (typeof document === "undefined") return;

  var lang = getLang();

  // ---- Language switch buttons (markup is in index.html) ----
  function setupSwitch() {
    var buttons = document.querySelectorAll(".lang-btn");
    buttons.forEach(function (btn) {
      var on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-lang");
        if (next === lang) return;
        try { window.localStorage.setItem(STORE_KEY, next); } catch (err) {}
        try {
          var url = new URL(window.location.href);
          if (url.searchParams.has("lang")) {
            url.searchParams.delete("lang");
            window.location.replace(url.toString());
            return;
          }
        } catch (err) {}
        window.location.reload();
      });
    });
  }

  setupSwitch();
  document.documentElement.lang = lang;
  if (lang !== "es") return;

  // ---- Spanish ----
  var SKIP_SELECTOR = "#jupiter-plugin, script, style, textarea, #chart-title, #inspector-symbol, " +
    ".top100-sym, .top100-name, .search-symbol, .search-name, .mover-symbol, .lst-sym, .mom-mint, .lang-switch, .an-skip";
  var ATTRS = ["placeholder", "aria-label", "title"];

  // The Mayan widget is third-party DOM and is left alone, except for the
  // "Loading bridge…" / retry box that app.js writes itself (.bridge-status).
  function isSkipped(el) {
    if (!el || !el.closest) return false;
    if (el.closest(SKIP_SELECTOR)) return true;
    var mayan = el.closest("#mayan-widget");
    return !!mayan && mayan !== el && !el.closest(".bridge-status");
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var v = el.getAttribute(a);
      var t = tr(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }

  function translateTree(node) {
    if (node.nodeType === 3) {
      if (isSkipped(node.parentElement)) return;
      var t = tr(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
      return;
    }
    if (node.nodeType !== 1 || isSkipped(node)) return;
    translateAttrs(node);
    for (var c = node.firstChild; c; c = c.nextSibling) translateTree(c);
  }

  // Popup texts: app.js builds the popup from INFO each time it is opened.
  if (typeof INFO === "object" && INFO) {
    Object.keys(INFO_ES).forEach(function (key) {
      if (!INFO[key]) return;
      INFO[key].title = INFO_ES[key].title;
      INFO[key].text = INFO_ES[key].text;
    });
  }

  document.title = "Swap Solana Tokens | Swap en Solana, Top 100 y bridge entre cadenas";
  translateTree(document.body);

  var observer = new MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.type === "childList") {
        for (var i = 0; i < r.addedNodes.length; i++) translateTree(r.addedNodes[i]);
      } else if (r.type === "characterData") {
        translateTree(r.target);
      } else if (r.type === "attributes" && !isSkipped(r.target)) {
        translateAttrs(r.target);
      }
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS
  });
})();
