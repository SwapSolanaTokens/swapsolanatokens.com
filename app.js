const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// mint -> symbol, used for the chart title and inspector. Seeded with the two
// mints the page itself needs; search results, top movers and direct links add
// the rest at runtime.
const knownSymbols = { [SOL_MINT]: "SOL", [USDC_MINT]: "USDC" };

function formatPrice(p) {
  if (typeof p !== "number" || !isFinite(p)) return "--";
  if (p < 0.00001) return "$" + p.toFixed(8);
  if (p < 0.01) return "$" + p.toFixed(6);
  if (p < 1) return "$" + p.toFixed(4);
  return "$" + p.toFixed(2);
}

// Compact USD amount for liquidity figures ($1.2M, $48K...).
function formatUsd(n) {
  if (typeof n !== "number" || !isFinite(n)) return "--";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + Math.round(n);
}

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isValidMint(mint) {
  return typeof mint === "string" && MINT_REGEX.test(mint);
}

const chartState = { mint: SOL_MINT, symbol: "SOL", interval: "60" };

// Birdeye's public tv-widget iframe needs no API key.
function renderChart() {
  const frame = document.getElementById("price-chart");
  const title = document.getElementById("chart-title");
  const mintLabel = document.getElementById("chart-mint");
  const loading = document.getElementById("chart-loading");
  if (!frame) return;
  frame.classList.remove("loaded");
  if (loading) loading.style.display = "flex";
  const params = new URLSearchParams({
    chain: "solana",
    viewMode: "pair",
    chartInterval: chartState.interval,
    chartType: "Candle",
    chartTimezone: "UTC",
    chartLeftToolbar: "hide",
    theme: "dark",
  });
  frame.src = `https://birdeye.so/tv-widget/${encodeURIComponent(chartState.mint)}?${params.toString()}`;
  if (title) title.textContent = chartState.symbol;
  // The symbol is chosen by whoever created the token, so the shortened mint
  // is always shown next to it. A look-alike ticker can't hide behind it.
  if (mintLabel) mintLabel.textContent = shortenMint(chartState.mint);
  updateTokenInspector(chartState.mint, chartState.symbol);
}

function updateChart(mint, symbol) {
  const safeMint = mint || SOL_MINT;
  if (!isValidMint(safeMint)) return;
  chartState.mint = safeMint;
  chartState.symbol = symbol || symbolForMint(safeMint);
  renderChart();
}

function setChartSymbol(mint, symbol) {
  if (chartState.mint !== mint) return;
  chartState.symbol = symbol;
  const title = document.getElementById("chart-title");
  if (title) title.textContent = symbol;
  updateTokenInspector(mint, symbol);
}

function shortenMint(mint) {
  if (!mint) return "TOKEN";
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function symbolForMint(mint) {
  return knownSymbols[mint] || shortenMint(mint);
}

// ---- Token Inspector update & CA copy ----
function updateTokenInspector(mint, symbol) {
  const safeMint = isValidMint(mint) ? mint : SOL_MINT;
  const safeSym = symbol || symbolForMint(safeMint);

  const symEl = document.getElementById("inspector-symbol");
  const mintEl = document.getElementById("inspector-mint");
  const rugcheck = document.getElementById("inspector-rugcheck");
  const solscan = document.getElementById("inspector-solscan");
  const dexscreener = document.getElementById("inspector-dexscreener");
  const copyBtn = document.getElementById("inspector-copy-ca");

  if (symEl) symEl.textContent = safeSym;
  if (mintEl) mintEl.textContent = shortenMint(safeMint);
  if (rugcheck) rugcheck.href = `https://rugcheck.xyz/tokens/${encodeURIComponent(safeMint)}`;
  if (solscan) solscan.href = `https://solscan.io/token/${encodeURIComponent(safeMint)}`;
  if (dexscreener) dexscreener.href = `https://dexscreener.com/solana/${encodeURIComponent(safeMint)}`;
  if (copyBtn) copyBtn.setAttribute("data-mint", safeMint);
}

function initTokenInspectorCopy() {
  const btn = document.getElementById("inspector-copy-ca");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const mint = btn.getAttribute("data-mint") || chartState.mint;
    const ok = await copyText(mint);
    const label = document.getElementById("inspector-copy-label");
    if (label) label.textContent = ok ? "Copied ✓" : "Failed";
    setTimeout(() => {
      if (label) label.textContent = "Copy CA";
    }, 1500);
  });
}

let lastForm = { fromMint: null, toMint: null };

function handleFormUpdate(form) {
  if (!form) return;
  const fromMint = form.fromMint || form.inputMint || null;
  const toMint = form.toMint || form.outputMint || null;

  let changedMint = null;
  if (toMint && toMint !== lastForm.toMint) {
    changedMint = toMint;
  } else if (fromMint && fromMint !== lastForm.fromMint) {
    changedMint = fromMint;
  }

  lastForm = { fromMint, toMint };

  if (changedMint && isValidMint(changedMint) && changedMint !== chartState.mint) {
    updateChart(changedMint, symbolForMint(changedMint));
  }
}

function initIntervalSwitch() {
  const wrap = document.getElementById("interval-switch");
  const frame = document.getElementById("price-chart");
  const loading = document.getElementById("chart-loading");
  if (frame) {
    frame.addEventListener("load", () => {
      frame.classList.add("loaded");
      if (loading) loading.style.display = "none";
    });
  }
  if (!wrap) return;
  wrap.querySelectorAll(".interval-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".interval-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      chartState.interval = btn.getAttribute("data-interval");
      renderChart();
    });
  });
}

function safeInitJupiter(outputMint) {
  const validMint = isValidMint(outputMint) ? outputMint : null;
  updateChart(validMint || SOL_MINT, symbolForMint(validMint || SOL_MINT));

  function mount() {
    if (!window.Jupiter) return false;
    try {
      initJupiter(outputMint);
      return true;
    } catch (err) {
      console.error("Jupiter widget init failed:", err);
      return true;
    }
  }

  if (!mount()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (mount() || attempts >= 30) {
        clearInterval(timer);
      }
    }, 150);
  }
}

function initJupiter(outputMint) {
  if (!window.Jupiter) {
    throw new Error("window.Jupiter not present — plugin-v1.js failed to load");
  }
  const validMint = isValidMint(outputMint) ? outputMint : null;
  const initialOutputMint = validMint || USDC_MINT;
  const initialInputMint = initialOutputMint === SOL_MINT ? USDC_MINT : SOL_MINT;
  window.Jupiter.init({
    displayMode: "integrated",
    integratedTargetId: "jupiter-plugin",
    branding: {
      logoUri: "https://swapsolanatokens.com/logo.png",
      name: " ",
    },
    formProps: {
      initialInputMint: initialInputMint,
      initialOutputMint: initialOutputMint,
      referralAccount: "3YpVADrndNQaNcMT1yNg8E9KjvSjmPUwtdrnHGmWh1sm",
      referralFee: 50,
    },
    onFormUpdate: handleFormUpdate,
  });
  lastForm = { fromMint: initialInputMint, toMint: initialOutputMint };
}

function loadToken(mint, symbol) {
  if (!isValidMint(mint)) return;
  if (symbol) knownSymbols[mint] = symbol;
  safeInitJupiter(mint);
}

// ---- Token search ----
const SEARCH_URL = "https://api.jup.ag/tokens/v2/search?query=";
const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_RESULTS = 8;
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

let searchTimer = null;
let searchAbort = null;
let lastLoadedMint = null;

function normalizeToken(t) {
  const audit = t.audit && typeof t.audit === "object" ? t.audit : {};
  return {
    mint: t.id,
    symbol: t.symbol.slice(0, 12),
    name: typeof t.name === "string" ? t.name.slice(0, 40) : "",
    icon: typeof t.icon === "string" && t.icon.indexOf("https://") === 0 ? t.icon : null,
    verified: t.isVerified === true,
    liquidity: typeof t.liquidity === "number" && isFinite(t.liquidity) ? t.liquidity : null,
    token2022: typeof t.tokenProgram === "string" && t.tokenProgram !== SPL_TOKEN_PROGRAM_ID,
    mintAuthorityActive: !!t.mintAuthority || audit.mintAuthorityDisabled === false,
    freezeAuthorityActive: !!t.freezeAuthority || audit.freezeAuthorityDisabled === false,
    organicScore: typeof t.organicScore === "number" && isFinite(t.organicScore) ? Math.round(t.organicScore) : null,
  };
}

function isSearchable(t) {
  return !!t && typeof t === "object" && isValidMint(t.id) && typeof t.symbol === "string" && t.symbol.length > 0;
}

async function fetchTokens(query, signal) {
  const res = await fetch(SEARCH_URL + encodeURIComponent(query), signal ? { signal } : undefined);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response shape");
  return data.filter(isSearchable).map(normalizeToken);
}

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// The notice is written to two places: under the page title (search results)
// and right above the swap widget, so a warning is still visible after the
// page scrolls to the swap (Top movers / Top 100 "Swap" buttons).
const NOTICE_IDS = ["search-notice", "swap-notice"];

function setSearchNotice(text, level) {
  NOTICE_IDS.forEach((id) => {
    const notice = document.getElementById(id);
    if (!notice) return;
    notice.textContent = text || "";
    notice.classList.toggle("warn", level === "warn");
  });
}

function tokenNoticeFor(t) {
  const flags = [];
  if (t.mintAuthorityActive) flags.push("the mint authority is active");
  if (t.freezeAuthorityActive) flags.push("the freeze authority is active");
  if (!t.verified) {
    const base = "Unverified token: it is not on Jupiter's verified list. Check the mint address before trading.";
    return { text: flags.length ? base + " (" + flags.join(", ") + ")." : base, level: "warn" };
  }
  if (flags.length) {
    return { text: "Verified by Jupiter. Note: " + flags.join(", ") + ".", level: "warn" };
  }
  return { text: "", level: "" };
}

function showTokenNotice(t) {
  const n = tokenNoticeFor(t);
  setSearchNotice(n.text, n.level);
}

function setSearchOpen(open) {
  document.body.classList.toggle("search-open", open);
}

function closeSearchResults() {
  const list = document.getElementById("search-results");
  setSearchOpen(false);
  if (!list) return;
  list.hidden = true;
  list.replaceChildren();
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {}
  const previous = document.activeElement;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.className = "copy-fallback";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    if (previous && typeof previous.focus === "function") previous.focus();
    return ok;
  } catch (err) {
    return false;
  }
}

function makeCopyIcon() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", "9");
  rect.setAttribute("y", "9");
  rect.setAttribute("width", "13");
  rect.setAttribute("height", "13");
  rect.setAttribute("rx", "2");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");
  svg.append(rect, path);
  return svg;
}

function buildCopyButton(t) {
  const btn = makeEl("button", "search-copy");
  btn.type = "button";
  btn.title = "Copy the full mint address";
  btn.setAttribute("aria-label", "Copy the full mint address of " + t.symbol);
  const label = makeEl("span", "search-copy-label", shortenMint(t.mint));
  btn.append(makeCopyIcon(), label);

  let resetTimer = null;
  btn.addEventListener("click", async () => {
    const ok = await copyText(t.mint);
    label.textContent = ok ? "Copied ✓" : "Copy failed";
    btn.classList.toggle("copied", ok);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      label.textContent = shortenMint(t.mint);
      btn.classList.remove("copied");
    }, 1500);
  });
  return btn;
}

// Builds a token icon that never sends a Referer to the icon host and falls
// back to the first letter of the symbol when the image can't be loaded.
// Icon URLs come from token creators, so they are treated as untrusted.
function buildTokenIcon(url, symbol, className) {
  const fallbackClass = className + " search-token-fallback";
  const letter = symbol.charAt(0).toUpperCase();
  if (!url) return makeEl("span", fallbackClass, letter);
  const icon = document.createElement("img");
  icon.className = className;
  icon.alt = "";
  icon.loading = "lazy";
  icon.referrerPolicy = "no-referrer";
  icon.src = url;
  icon.addEventListener("error", () => {
    icon.replaceWith(makeEl("span", fallbackClass, letter));
  });
  return icon;
}

function buildSearchRow(t) {
  const li = document.createElement("li");
  const btn = makeEl("button", "search-item");
  btn.type = "button";
  btn.setAttribute("aria-label", "Load " + t.symbol + " " + shortenMint(t.mint));

  const icon = buildTokenIcon(t.icon, t.symbol, "search-token-icon");

  const main = makeEl("div", "search-main");
  const line = makeEl("div", "search-line");
  line.append(makeEl("span", "search-symbol", t.symbol));
  if (t.name) line.append(makeEl("span", "search-name", t.name));
  main.append(line);
  if (t.liquidity != null) {
    main.append(makeEl("div", "search-meta", formatUsd(t.liquidity) + " liquidity"));
  }

  const tags = [];
  if (t.mintAuthorityActive) tags.push(["Mint authority active", true]);
  if (t.freezeAuthorityActive) tags.push(["Freeze authority active", true]);
  if (t.token2022) tags.push(["Token-2022", true]);
  if (t.organicScore != null) tags.push(["Organic score " + t.organicScore, false]);
  if (tags.length) {
    const tagRow = makeEl("div", "search-tags");
    tags.forEach(([label, risky]) => tagRow.append(makeEl("span", "search-tag" + (risky ? "" : " neutral"), label)));
    main.append(tagRow);
  }

  const badge = t.verified
    ? makeEl("span", "search-badge verified", "✓ Verified by Jupiter")
    : makeEl("span", "search-badge unverified", "⚠ Unverified");

  btn.append(icon, main, badge);
  btn.addEventListener("click", () => selectSearchResult(t));
  li.append(btn, buildCopyButton(t));
  return li;
}

function renderSearchResults(tokens) {
  const list = document.getElementById("search-results");
  if (!list) return;
  list.replaceChildren();
  tokens.forEach((t) => list.appendChild(buildSearchRow(t)));
  list.hidden = tokens.length === 0;
  setSearchOpen(tokens.length > 0);
}

function selectSearchResult(t) {
  const input = document.getElementById("token-search");
  knownSymbols[t.mint] = t.symbol;
  lastLoadedMint = t.mint;
  closeSearchResults();
  if (input) input.value = t.symbol;
  loadToken(t.mint, t.symbol);
  showTokenNotice(t);
}

async function inspectMint(mint) {
  setSearchNotice("Checking token…", "");
  try {
    const tokens = await fetchTokens(mint);
    if (chartState.mint !== mint) return;
    const t = tokens.find((x) => x.mint === mint);
    if (!t) {
      setSearchNotice("This mint is not in Jupiter's token index. It was loaded anyway: verify the address before trading.", "warn");
      return;
    }
    knownSymbols[mint] = t.symbol;
    setChartSymbol(mint, t.symbol);
    showTokenNotice(t);
  } catch (err) {
    console.error("Could not check token:", err);
    if (chartState.mint !== mint) return;
    setSearchNotice("Could not check this token's details. Verify the mint address before trading.", "warn");
  }
}

function loadByMint(mint) {
  if (mint === lastLoadedMint) return;
  lastLoadedMint = mint;
  closeSearchResults();
  loadToken(mint);
  inspectMint(mint);
}

async function runSearch(query) {
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  setSearchNotice("Searching…", "");
  try {
    const tokens = await fetchTokens(query, searchAbort.signal);
    const input = document.getElementById("token-search");
    if (input && input.value.trim() !== query) return;
    const ordered = tokens.slice(0, 20).sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0)).slice(0, SEARCH_MAX_RESULTS);
    if (!ordered.length) {
      closeSearchResults();
      setSearchNotice("No tokens found. Try the exact symbol, or paste the mint address.", "");
      return;
    }
    renderSearchResults(ordered);
    setSearchNotice("", "");
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.error("Token search failed:", err);
    closeSearchResults();
    setSearchNotice("Search is temporarily unavailable. You can still paste a mint address, or use the token selector inside the swap.", "warn");
  }
}

function onSearchInput() {
  const input = document.getElementById("token-search");
  if (!input) return;
  const q = input.value.trim();
  clearTimeout(searchTimer);
  if (searchAbort) searchAbort.abort();
  if (!q) {
    closeSearchResults();
    setSearchNotice("", "");
    return;
  }
  if (q.length < SEARCH_MIN_CHARS) {
    closeSearchResults();
    return;
  }
  searchTimer = setTimeout(() => {
    if (isValidMint(q)) loadByMint(q);
    else runSearch(q);
  }, SEARCH_DEBOUNCE_MS);
}

function loadPreset(mint, symbol) {
  const input = document.getElementById("token-search");
  if (input) input.value = "";
  lastLoadedMint = null;
  closeSearchResults();
  setSearchNotice("", "");
  loadToken(mint, symbol);
}

function initSearch() {
  const input = document.getElementById("token-search");
  const wrap = document.getElementById("search-wrap");
  const backdrop = document.getElementById("search-backdrop");
  if (input) {
    input.addEventListener("input", onSearchInput);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSearchResults();
      } else if (e.key === "Enter") {
        const q = input.value.trim();
        if (isValidMint(q)) {
          clearTimeout(searchTimer);
          loadByMint(q);
        }
      }
    });
  }
  document.addEventListener("click", (e) => {
    if (wrap && !wrap.contains(e.target)) closeSearchResults();
  });
  if (backdrop) backdrop.addEventListener("click", closeSearchResults);
}

function readLinkedMint() {
  try {
    const value = new URLSearchParams(window.location.search).get("to");
    return isValidMint(value) ? value : null;
  } catch (err) {
    return null;
  }
}

// ---- Mayan cross-chain bridge widget ----
const MAYAN_REFERRER_SOLANA = "DQShR4tEozY2WNN3kxggoRgSQhXDZtzekS7TEK6A6x8b";
const MAYAN_REFERRER_EVM = "0x8AE8BA04dBfD5748CcA38f1D47B57cdB5e152a91";
const MAYAN_REFERRER_SUI = "0xef1c80bbc4245655148ff0743e1d04ed5f2a9170fc4a108fa8f3f8c43203c1b1";
const MAYAN_REFERRER_BPS = 30;
const MAYAN_SCRIPT_URL = "https://cdn.mayan.finance/widget/1_8_0/main.js";
const MAYAN_SCRIPT_INTEGRITY = "sha256-csokBs9wUf3aZCKTR7/XXElwXugjzCQeUygLmN+/Y7Y=";

const MAYAN_SOURCE_CHAINS = ["ethereum", "monad", "bsc", "HyperEVM", "polygon", "avalanche", "arbitrum", "optimism", "base", "sui", "Linea", "Unichain"];

function buildMayanConfigs() {
  return {
    appIdentity: {
      uri: "https://swapsolanatokens.com",
      icon: "https://swapsolanatokens.com/logo.png",
      name: "Swap Solana Tokens",
    },
    setDefaultToken: true,
    solanaReferrerAddress: MAYAN_REFERRER_SOLANA,
    evmReferrerAddress: MAYAN_REFERRER_EVM,
    suiReferrerAddress: MAYAN_REFERRER_SUI,
    sourceChains: MAYAN_SOURCE_CHAINS,
    defaultSelected: {
      sourceChain: "ethereum",
      destinationChain: "solana",
      fromToken: "0x0000000000000000000000000000000000000000",
      toToken: "0x0000000000000000000000000000000000000000",
    },
    referrerBps: MAYAN_REFERRER_BPS,
  };
}

function showMayanLoadingState() {
  const container = document.getElementById("mayan-widget");
  if (!container) return;
  container.innerHTML = `
    <div class="bridge-status">
      <p class="bridge-status-text">Loading bridge…</p>
    </div>`;
}

function showMayanRetryButton() {
  const container = document.getElementById("mayan-widget");
  if (!container) return;
  container.innerHTML = `
    <div class="bridge-status">
      <p class="bridge-status-text">The bridge widget couldn't load — usually a temporary network hiccup, not something wrong with your wallet.</p>
      <button type="button" id="mayan-manual-retry" class="wallet-cta-btn">Retry bridge</button>
    </div>`;
  const btn = document.getElementById("mayan-manual-retry");
  if (btn) btn.addEventListener("click", retryMayanWidget);
}

function mountMayanWidget() {
  const container = document.getElementById("mayan-widget");
  if (container) container.innerHTML = "";
  if (!window.MayanSwap) {
    throw new Error("window.MayanSwap not present — script failed to load, or hasn't finished loading yet");
  }
  window.MayanSwap.init("mayan-widget", buildMayanConfigs());
}

function initMayan() {
  showMayanLoadingState();
  try {
    mountMayanWidget();
  } catch (err) {
    console.error("Mayan widget init failed:", err);
    showMayanRetryButton();
  }
}

function retryMayanWidget() {
  showMayanLoadingState();
  document.querySelectorAll('script[src^="' + MAYAN_SCRIPT_URL + '"]').forEach((el) => el.remove());
  delete window.MayanSwap;

  const script = document.createElement("script");
  script.src = MAYAN_SCRIPT_URL + "?cb=" + Date.now();
  script.integrity = MAYAN_SCRIPT_INTEGRITY;
  script.crossOrigin = "anonymous";
  script.defer = true;
  script.onload = () => initMayan();
  script.onerror = () => {
    console.error("Mayan script reload failed");
    showMayanRetryButton();
  };
  document.head.appendChild(script);
}

// ---- Top movers (24h) ----
const MOVERS_URL = "https://api.jup.ag/tokens/v2/toptraded/24h?limit=100";
const MOVERS_MIN_LIQUIDITY_USD = 1000000;
const MOVERS_UNIVERSE_SIZE = 50;
const MOVERS_PER_SIDE = 5;
const VOLUME_LIST_SIZE = 10;
const MOVERS_CACHE_KEY = "movers-v11";
const MOVERS_CACHE_MS = 5 * 60 * 1000;
const MOVERS_REFRESH_MS = 10 * 60 * 1000;

// No mint-authority exclusion here, so Liquid Staking Tokens are admitted.
function passesMoverFilters(t) {
  if (!t || typeof t !== "object") return false;
  if (!isValidMint(t.id) || t.id === SOL_MINT) return false;
  if (typeof t.symbol !== "string" || !t.symbol) return false;
  if (t.isVerified !== true) return false;
  if (typeof t.liquidity !== "number" || !(t.liquidity > MOVERS_MIN_LIQUIDITY_USD)) return false;
  if (typeof t.usdPrice !== "number" || !isFinite(t.usdPrice)) return false;
  const change = t.stats24h && t.stats24h.priceChange;
  if (typeof change !== "number" || !isFinite(change)) return false;
  return true;
}

function volume24h(t) {
  const s = t && t.stats24h;
  if (!s || typeof s !== "object") return null;
  if (typeof s.buyVolume !== "number" || !isFinite(s.buyVolume)) return null;
  if (typeof s.sellVolume !== "number" || !isFinite(s.sellVolume)) return null;
  const total = s.buyVolume + s.sellVolume;
  return total > 0 ? total : null;
}

// Shared by "Top volume" and the "Top 100" table: only Jupiter-verified
// tokens with more than $1M of liquidity and a real 24h volume qualify.
function passesVolumeFilters(t) {
  if (!t || typeof t !== "object") return false;
  if (!isValidMint(t.id)) return false;
  if (typeof t.symbol !== "string" || !t.symbol) return false;
  if (t.isVerified !== true) return false;
  if (typeof t.liquidity !== "number" || !(t.liquidity > MOVERS_MIN_LIQUIDITY_USD)) return false;
  if (typeof t.usdPrice !== "number" || !isFinite(t.usdPrice)) return false;
  if (volume24h(t) == null) return false;
  return true;
}

function safeIcon(t) {
  return typeof t.icon === "string" && t.icon.indexOf("https://") === 0 ? t.icon : null;
}

function pickMovers(tokens) {
  const universe = tokens
    .filter(passesMoverFilters)
    .slice(0, MOVERS_UNIVERSE_SIZE)
    .map((t) => ({
      mint: t.id,
      symbol: t.symbol.slice(0, 12),
      price: t.usdPrice,
      change: t.stats24h.priceChange,
      icon: safeIcon(t),
    }));
  const gainers = universe.filter((t) => t.change > 0).sort((a, b) => b.change - a.change).slice(0, MOVERS_PER_SIDE);
  const losers = universe.filter((t) => t.change < 0).sort((a, b) => a.change - b.change).slice(0, MOVERS_PER_SIDE);
  return { gainers, losers, volume: pickVolume(tokens) };
}

function pickVolume(tokens) {
  return tokens
    .filter(passesVolumeFilters)
    .map((t) => ({
      mint: t.id,
      symbol: t.symbol.slice(0, 12),
      price: t.usdPrice,
      volume: volume24h(t),
      icon: safeIcon(t),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, VOLUME_LIST_SIZE);
}

function goToSwap() {
  showTab("swap");
  const target = document.getElementById("swap-section");
  if (!target) return;
  let smooth = true;
  try {
    smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {}
  target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

// Used by Top movers, Top volume and the Top 100 table. The token is loaded
// into the swap and then checked against Jupiter's index, so any warning
// (unverified, active mint/freeze authority) shows up above the swap widget.
function tradeMover(mint, symbol) {
  loadPreset(mint, symbol);
  inspectMint(mint);
  goToSwap();
}

function renderMoverList(listEl, items, kind) {
  if (!listEl) return;
  listEl.replaceChildren();
  const showVolume = kind === "volume";
  items.forEach((item) => {
    knownSymbols[item.mint] = item.symbol;
    const up = !showVolume && item.change >= 0;

    const li = document.createElement("li");
    const row = document.createElement("button");
    row.type = "button";
    row.className = "mover-row";
    row.title = "Trade " + item.symbol;
    row.setAttribute(
      "aria-label",
      showVolume
        ? "Trade " + item.symbol + ", 24h volume " + formatUsd(item.volume)
        : "Trade " + item.symbol + ", 24h " + (up ? "+" : "") + item.change.toFixed(1) + "%"
    );
    row.addEventListener("click", () => tradeMover(item.mint, item.symbol));

    const icon = buildTokenIcon(item.icon, item.symbol, "mover-icon");

    const main = document.createElement("div");
    main.className = "mover-main";
    const sym = document.createElement("span");
    sym.className = "mover-symbol";
    sym.textContent = item.symbol;
    const price = document.createElement("span");
    price.className = "mover-price";
    price.textContent = formatPrice(item.price);
    main.append(sym, price);

    const chg = document.createElement("span");
    if (showVolume) {
      chg.className = "mover-change neutral";
      chg.textContent = formatUsd(item.volume);
    } else {
      chg.className = "mover-change " + (up ? "up" : "down");
      chg.textContent = (up ? "+" : "") + item.change.toFixed(1) + "%";
    }

    row.append(icon, main, chg);
    li.appendChild(row);
    listEl.appendChild(li);
  });
}

function renderMovers(result) {
  const status = document.getElementById("movers-status");
  const volumeStatus = document.getElementById("volume-status");
  renderMoverList(document.getElementById("movers-gainers"), result.gainers, "change");
  renderMoverList(document.getElementById("movers-losers"), result.losers, "change");
  renderMoverList(document.getElementById("movers-volume"), result.volume, "volume");
  if (status) {
    status.textContent = result.gainers.length || result.losers.length
      ? ""
      : "No tokens match the filters right now.";
  }
  if (volumeStatus) {
    volumeStatus.textContent = result.volume.length
      ? ""
      : "No tokens match the filters right now.";
  }
}

function showMoversError() {
  const status = document.getElementById("movers-status");
  const volumeStatus = document.getElementById("volume-status");
  renderMoverList(document.getElementById("movers-gainers"), [], "change");
  renderMoverList(document.getElementById("movers-losers"), [], "change");
  renderMoverList(document.getElementById("movers-volume"), [], "volume");
  if (status) status.textContent = "Rankings are temporarily unavailable.";
  if (volumeStatus) volumeStatus.textContent = "Rankings are temporarily unavailable.";
}

function readMoversCache() {
  try {
    const raw = sessionStorage.getItem(MOVERS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || Date.now() - cached.t > MOVERS_CACHE_MS) return null;
    if (!cached.data || !Array.isArray(cached.data.gainers) || !cached.data.gainers.length) return null;
    return cached.data || null;
  } catch (err) {
    return null;
  }
}

function writeMoversCache(data, rawTokens) {
  try {
    sessionStorage.setItem(MOVERS_CACHE_KEY, JSON.stringify({ t: Date.now(), data, rawTokens }));
  } catch (err) {}
}

function readRawTokensCache() {
  try {
    const raw = sessionStorage.getItem(MOVERS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return cached && cached.rawTokens ? cached.rawTokens : null;
  } catch (e) { return null; }
}

async function fetchMovers() {
  const cached = readMoversCache();
  if (cached) {
    renderMovers(cached);
    const raw = readRawTokensCache();
    if (raw) updateTop100Data(raw);
    return;
  }
  try {
    const res = await fetch(MOVERS_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const tokens = await res.json();
    if (!Array.isArray(tokens)) throw new Error("Unexpected response shape");
    const result = pickMovers(tokens);
    writeMoversCache(result, tokens);
    renderMovers(result);
    updateTop100Data(tokens);
  } catch (err) {
    console.error("Could not load top movers:", err);
    showMoversError();
  }
}

// ---- RugCheck Quick Audit card ----
function initRugCheckCard() {
  const input = document.getElementById("rugcheck-input");
  const btn = document.getElementById("rugcheck-btn");
  const errorEl = document.getElementById("rugcheck-error");
  if (!btn || !input) return;

  function handleAudit() {
    const mint = input.value.trim();
    if (!isValidMint(mint)) {
      if (errorEl) errorEl.textContent = "Please enter a valid Solana mint address (base58).";
      return;
    }
    if (errorEl) errorEl.textContent = "";
    window.open(`https://rugcheck.xyz/tokens/${encodeURIComponent(mint)}`, "_blank", "noopener,noreferrer");
  }

  btn.addEventListener("click", handleAudit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAudit();
  });
  input.addEventListener("input", () => {
    if (errorEl) errorEl.textContent = "";
  });
}

// ---- Top 100 categories ----
// Categories are a convenience label, not a safety signal. They are matched
// on the EXACT ticker (never on prefixes, suffixes or token names, which
// anyone can copy) and are only applied to tokens that already passed the
// Jupiter-verified + liquidity filter above.
const LST_SYMBOLS = new Set(["JITOSOL", "MSOL", "BSOL", "JUPSOL", "BONKSOL", "INF", "VSOL", "BBSOL", "COMPOSOL"]);
const DEFI_SYMBOLS = new Set(["JUP", "RAY", "ORCA", "DRIFT", "KMNO", "JTO", "PYTH", "HNT", "MNGO", "PRCL", "SLND", "MNDE", "TENSOR", "ZEX", "MET"]);
const MEME_SYMBOLS = new Set(["BONK", "WIF", "POPCAT", "MEW", "BOME", "SLERF", "MYRO", "GIGA", "MOTHER", "MOODENG", "FWOG", "PONKE", "GOAT", "MICHI", "FIDA", "ACT", "PNUT"]);
const STABLE_SYMBOLS = new Set(["USDC", "USDT", "USDG", "PYUSD", "USDS", "EURC", "UXD", "USDY", "FDUSD", "CASH", "ISC", "USDE", "USDH"]);
const STOCKS_SYMBOLS = new Set(["AAPLX", "TSLAX", "NVDAX", "MSFTX", "AMZNX", "GOOGLX", "METAX", "SPYX", "QQQX", "COINX"]);
const RWA_SYMBOLS = new Set(["ONDO", "USDY", "PRCL", "HNT", "MOBILE", "IOT", "CHAI", "MPL", "CFG"]);
const POW_POS_SYMBOLS = new Set(["WBTC", "TBTC", "CBTC", "WETH", "ETH", "BTC", "SOL", "SUI", "NEAR", "AVAX", "BNB", "POL", "DOGE", "LTC", "KAS", "ZEUS", "WHALES"]);
const PRIVACY_SYMBOLS = new Set(["DARK", "SHDW", "ANON", "GHOST", "MASK", "PRIV", "TORN"]);
const FARMING_SYMBOLS = new Set(["RAY", "ORCA", "KMNO", "MET", "STEP", "SAROS", "LFNTY", "SLND", "CBR", "CYS"]);
const METALS_SYMBOLS = new Set(["XAUT", "PAXG", "GLD", "SLV", "GLDX", "SLVX", "SILVER", "GOLD", "AUX"]);

function categorizeToken(symbol) {
  const sym = (symbol || "").toUpperCase();
  if (STABLE_SYMBOLS.has(sym)) return "stable";
  if (METALS_SYMBOLS.has(sym)) return "metals";
  if (STOCKS_SYMBOLS.has(sym)) return "stocks";
  if (LST_SYMBOLS.has(sym)) return "lst";
  if (RWA_SYMBOLS.has(sym)) return "rwa";
  if (PRIVACY_SYMBOLS.has(sym)) return "privacy";
  if (FARMING_SYMBOLS.has(sym)) return "farming";
  if (POW_POS_SYMBOLS.has(sym)) return "powpos";
  if (DEFI_SYMBOLS.has(sym)) return "defi";
  if (MEME_SYMBOLS.has(sym)) return "meme";
  return "other";
}

let top100Tokens = [];
let top100Category = "all";
let top100FilterText = "";

function updateTop100Data(tokens) {
  if (!Array.isArray(tokens)) return;
  top100Tokens = tokens
    .filter(passesVolumeFilters)
    .map((t) => ({
      mint: t.id,
      symbol: t.symbol.slice(0, 12),
      name: typeof t.name === "string" ? t.name.slice(0, 32) : "",
      price: t.usdPrice,
      change: t.stats24h && typeof t.stats24h.priceChange === "number" ? t.stats24h.priceChange : 0,
      volume: volume24h(t) || 0,
      icon: safeIcon(t),
      category: categorizeToken(t.symbol),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 100)
    .map((t, i) => Object.assign(t, { rank: i + 1 }));

  renderTop100Table();
}

function renderTop100Table() {
  const tbody = document.getElementById("top100-tbody");
  const status = document.getElementById("top100-status");
  if (!tbody) return;
  tbody.replaceChildren();

  const filtered = top100Tokens.filter((t) => {
    if (top100Category !== "all" && t.category !== top100Category) return false;
    if (top100FilterText) {
      const matchSym = t.symbol.toLowerCase().includes(top100FilterText);
      const matchName = t.name.toLowerCase().includes(top100FilterText);
      if (!matchSym && !matchName) return false;
    }
    return true;
  });

  if (!filtered.length) {
    if (status) {
      status.style.display = "block";
      status.textContent = top100Tokens.length ? "No tokens match your search criteria." : "Loading rankings…";
    }
    return;
  }

  if (status) status.style.display = "none";

  filtered.forEach((item) => {
    knownSymbols[item.mint] = item.symbol;
    const tr = document.createElement("tr");

    // Overall rank by 24h volume, so it doesn't change when filtering.
    const tdRank = makeEl("td", "top100-rank", String(item.rank));

    const tdToken = document.createElement("td");
    const tokenWrap = makeEl("div", "top100-token-cell");
    const icon = buildTokenIcon(item.icon, item.symbol, "mover-icon");

    const info = document.createElement("div");
    info.append(makeEl("div", "top100-sym", item.symbol));
    if (item.name) info.append(makeEl("div", "top100-name", item.name));
    tokenWrap.append(icon, info);
    tdToken.appendChild(tokenWrap);

    const tdPrice = makeEl("td", null, formatPrice(item.price));

    const up = item.change >= 0;
    const tdChange = makeEl("td", "mover-change " + (up ? "up" : "down"), (up ? "+" : "") + item.change.toFixed(1) + "%");

    const tdVolume = makeEl("td", null, formatUsd(item.volume));

    const tdAction = makeEl("td", null);
    tdAction.style.textAlign = "right";
    const swapBtn = makeEl("button", "top100-swap-btn", "Swap");
    swapBtn.type = "button";
    swapBtn.title = "Trade " + item.symbol;
    swapBtn.addEventListener("click", () => tradeMover(item.mint, item.symbol));
    tdAction.appendChild(swapBtn);

    tr.append(tdRank, tdToken, tdPrice, tdChange, tdVolume, tdAction);
    tbody.appendChild(tr);
  });
}

function initTop100() {
  const searchInput = document.getElementById("top100-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      top100FilterText = e.target.value.trim().toLowerCase();
      renderTop100Table();
    });
  }

  document.querySelectorAll(".top100-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".top100-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      top100Category = btn.getAttribute("data-cat") || "all";
      renderTop100Table();
    });
  });
}

// ---- Mobile wallet connect CTA ----
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function hasInjectedSolanaWallet() {
  return !!(
    window.solana ||
    (window.phantom && window.phantom.solana) ||
    window.solflare ||
    window.backpack
  );
}

function initMobileWalletCta() {
  const cta = document.getElementById("mobile-wallet-cta");
  if (!cta) return;
  if (!isMobileDevice() || hasInjectedSolanaWallet()) return;

  const pageUrl = window.location.href;
  const refUrl = window.location.origin + "/";

  const links = {
    "wallet-btn-phantom": `https://phantom.app/ul/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
    "wallet-btn-solflare": `https://solflare.com/ul/v1/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
    "wallet-btn-backpack": `https://backpack.app/ul/v1/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
  };

  Object.keys(links).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = links[id];
  });

  cta.classList.add("visible");
}

// ---- Panels: Swap / Bridge (driven by the top navigation links) ----
let mayanStarted = false;
const TAB_FOR_HASH = {
  "#swap-section": "swap",
  "#chart-section": "swap",
  "#top100-section": "swap",
  "#bridge-section": "bridge",
};

function showTab(name) {
  ["swap", "bridge"].forEach((t) => {
    const panel = document.getElementById("panel-" + t);
    if (panel) panel.hidden = t !== name;
  });
  if (name === "bridge" && !mayanStarted) {
    mayanStarted = true;
    initMayan();
  }
}

function initTabs() {
  document.querySelectorAll(".topnav-link").forEach((link) => {
    link.addEventListener("click", () => {
      const tab = TAB_FOR_HASH[link.getAttribute("href")];
      if (tab) showTab(tab);
    });
  });
  showTab("swap");
}

function applyInitialHash() {
  const tab = TAB_FOR_HASH[window.location.hash];
  if (!tab) return;
  showTab(tab);
  const target = document.getElementById(window.location.hash.slice(1));
  if (target) target.scrollIntoView();
}

function initApp() {
  initIntervalSwitch();
  initSearch();
  initRugCheckCard();
  initTop100();
  initTokenInspectorCopy();
  const linkedMint = readLinkedMint();
  if (linkedMint) lastLoadedMint = linkedMint;
  safeInitJupiter(linkedMint || undefined);
  if (linkedMint) inspectMint(linkedMint);
  fetchMovers();
  initTabs();
  initMobileWalletCta();
  applyInitialHash();
  setInterval(fetchMovers, MOVERS_REFRESH_MS);
}

// Start immediately, without depending on whether window.load already fired.
if (document.readyState === "loading") {
  window.addEventListener("load", initApp);
} else {
  initApp();
}
