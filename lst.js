// ---- Liquid Staking (LST) APY panel ----
// A compact panel with 4 Solana liquid staking tokens (the ones with the
// highest APY among a fixed list, above a minimum TVL). Everything runs in the
// visitor's browser: APY and TVL come from DeFiLlama's public yields API, and
// the optional icons from Jupiter's token index. No backend, no accounts.
//
// SAFETY MODEL: the list of tokens and their mint addresses is hardcoded here.
// The remote data only supplies numbers (APY, TVL) and is matched to our own
// list by symbol, so an API response can never introduce a new token or a
// different mint into the page. "Get" loads the hardcoded mint in the swap.
//
// Loaded after app.js (it reuses isValidMint, makeEl, buildTokenIcon, formatUsd,
// safeIcon, tradeMover and SEARCH_URL).
(function () {
  "use strict";

  // To change the selection rule: LST_SHOW (how many cards), LST_MIN_TVL_USD
  // (minimum TVL in USD to be eligible) or LST_PICK_BY ("apy" or "tvl").
  const LST_SHOW = 4;
  const LST_MIN_TVL_USD = 30e6;
  const LST_PICK_BY = "apy";
  const LST_MAX_SANE_APY = 100;

  const YIELDS_URL = "https://yields.llama.fi/pools";
  const CACHE_KEY = "lst-apy-v1";
  const CACHE_MS = 30 * 60 * 1000;
  const REFRESH_MS = 30 * 60 * 1000;

  // symbol = how DeFiLlama writes it (upper case); label = what we display.
  const LST_LIST = [
    { symbol: "JITOSOL", label: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" },
    { symbol: "MSOL", label: "mSOL", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" },
    { symbol: "BSOL", label: "bSOL", mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1" },
    { symbol: "INF", label: "INF", mint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm" },
    { symbol: "JUPSOL", label: "JupSOL", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v" },
    { symbol: "BBSOL", label: "bbSOL", mint: "bbso1MfE7KVL7DhqwZ6dVfKrD3oNV1PEykLNM4kk5dD" },
    { symbol: "DSOL", label: "dSOL", mint: "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ" },
  ];
  // Shown (without APY) if the yields API is unreachable.
  const FALLBACK_SYMBOLS = ["JITOSOL", "MSOL", "BSOL", "INF"];

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function bySymbol(symbol) {
    return LST_LIST.find((l) => l.symbol === symbol) || null;
  }

  function fmtApy(x) {
    return x == null ? "n/a" : x.toFixed(2) + "%";
  }

  // ---- Data ----
  // For each LST of our list keeps the Solana pool with the most TVL.
  function pickYields(payload) {
    const rows = payload && Array.isArray(payload.data) ? payload.data : null;
    if (!rows) throw new Error("Unexpected response shape");
    const best = {};
    rows.forEach((p) => {
      if (!p || typeof p !== "object" || p.chain !== "Solana" || typeof p.symbol !== "string") return;
      const sym = p.symbol.toUpperCase();
      if (!bySymbol(sym)) return;
      const tvl = num(p.tvlUsd);
      const apy = num(p.apy) != null ? num(p.apy) : num(p.apyBase);
      if (tvl == null || apy == null || apy < 0 || apy > LST_MAX_SANE_APY) return;
      if (!best[sym] || tvl > best[sym].tvl) best[sym] = { symbol: sym, apy: apy, tvl: tvl };
    });
    return Object.keys(best).map((k) => best[k]);
  }

  // Last good answer, kept in localStorage with no expiry: shown while the
  // fresh data loads, or when DeFiLlama does not answer. APYs move slowly.
  const LAST_KEY = "lst-apy-last-v1";

  function cleanRows(data) {
    if (!Array.isArray(data)) return null;
    const clean = data.filter((r) => r && bySymbol(r.symbol) && num(r.apy) != null && num(r.tvl) != null);
    return clean.length ? clean : null;
  }

  function readLast() {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      return raw ? cleanRows(JSON.parse(raw).data) : null;
    } catch (err) {
      return null;
    }
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || Date.now() - cached.t > CACHE_MS || !Array.isArray(cached.data)) return null;
      // Re-validate: storage can be edited by the visitor.
      const clean = cached.data.filter((r) => r && bySymbol(r.symbol) && num(r.apy) != null && num(r.tvl) != null);
      return clean.length ? clean : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data }));
    } catch (err) {}
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ t: Date.now(), data: data }));
    } catch (err) {}
  }

  async function loadYields() {
    const cached = readCache();
    if (cached) return cached;
    const res = await fetch(YIELDS_URL, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = pickYields(await res.json());
    if (!data.length) throw new Error("No LST pools found");
    writeCache(data);
    return data;
  }

  function choose(rows) {
    const eligible = rows.filter((r) => r.tvl >= LST_MIN_TVL_USD);
    const key = LST_PICK_BY === "tvl" ? "tvl" : "apy";
    return eligible.sort((a, b) => b[key] - a[key]).slice(0, LST_SHOW);
  }

  // Optional icons from Jupiter's token index (one request, mints separated by
  // commas). If it fails, the cards simply show the first letter of the symbol.
  async function loadIcons(mints) {
    const icons = {};
    try {
      const res = await fetch(SEARCH_URL + encodeURIComponent(mints.join(",")));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) return icons;
      data.forEach((t) => {
        if (t && typeof t === "object" && mints.indexOf(t.id) !== -1) icons[t.id] = safeIcon(t);
      });
    } catch (err) {}
    return icons;
  }

  // ---- Rendering ----
  function buildCard(item, icon) {
    const lst = item.lst;
    const card = makeEl("div", "lst-card");

    const main = makeEl("div", "lst-main");
    main.append(makeEl("span", "lst-sym", lst.label));
    main.append(makeEl("span", "lst-tvl", item.tvl == null ? "TVL n/a" : "TVL " + formatUsd(item.tvl)));

    const apy = makeEl("div", "lst-apy");
    apy.append(makeEl("span", "lst-apy-value" + (item.apy == null ? " na" : ""), fmtApy(item.apy)), makeEl("span", "lst-apy-label", "APY"));

    const btn = makeEl("button", "top100-swap-btn", "Get");
    btn.type = "button";
    btn.title = "Load " + lst.label + " in the swap";
    btn.setAttribute("aria-label", "Get " + lst.label + ": load it in the swap");
    btn.addEventListener("click", () => tradeMover(lst.mint, lst.label));

    card.append(buildTokenIcon(icon, lst.label, "mover-icon"), main, apy, btn);
    return card;
  }

  function setStatus(text, withRetry) {
    const status = document.getElementById("lst-status");
    if (!status) return;
    status.replaceChildren();
    if (!text) {
      status.style.display = "none";
      return;
    }
    status.style.display = "block";
    status.append(document.createTextNode(text));
    if (withRetry) {
      const retry = makeEl("button", "proto-retry", "Retry");
      retry.type = "button";
      retry.addEventListener("click", () => {
        setStatus("Loading APY…", false);
        refresh();
      });
      status.append(retry);
    }
  }

  async function render(items) {
    const grid = document.getElementById("lst-grid");
    if (!grid) return;
    const icons = await loadIcons(items.map((i) => i.lst.mint));
    grid.replaceChildren();
    items.forEach((i) => {
      if (typeof knownSymbols !== "undefined") knownSymbols[i.lst.mint] = i.lst.label;
      grid.appendChild(buildCard(i, icons[i.lst.mint] || null));
    });
    if (typeof refreshStars === "function") refreshStars();
  }

  let busy = false;

  async function refresh() {
    if (busy) return;
    busy = true;
    const toPicked = (rows) =>
      choose(rows)
        .map((r) => ({ lst: bySymbol(r.symbol), apy: r.apy, tvl: r.tvl }))
        .filter((r) => r.lst && isValidMint(r.lst.mint));
    const last = readLast();
    if (last && !readCache()) {
      // Show the last good data right away; it is replaced when the new data arrives.
      const stale = toPicked(last);
      if (stale.length) {
        setStatus("", false);
        await render(stale);
      }
    }
    try {
      const rows = await loadYields();
      const picked = toPicked(rows);
      if (!picked.length) {
        setStatus("No liquid staking token passes the filters right now.", false);
        return;
      }
      setStatus("", false);
      await render(picked);
    } catch (err) {
      console.error("Could not load LST APYs:", err);
      if (last && toPicked(last).length) return;
      const fallback = FALLBACK_SYMBOLS.map(bySymbol)
        .filter((l) => l && isValidMint(l.mint))
        .map((l) => ({ lst: l, apy: null, tvl: null }));
      await render(fallback);
      setStatus("APY data is temporarily unavailable.", true);
    } finally {
      busy = false;
    }
  }

  function initLst() {
    const section = document.getElementById("lst-section");
    if (!section || typeof isValidMint !== "function" || typeof tradeMover !== "function") return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      refresh();
      setInterval(() => {
        if (!document.hidden) refresh();
      }, REFRESH_MS);
    };
    // Load right away (no waiting for the scroll).
    start();
  }

  // Exposed so the selection logic can be tested outside the browser.
  if (typeof window !== "undefined") {
    window.SwapLst = { pickYields: pickYields, choose: choose };
  }

  if (typeof document !== "undefined" && document.getElementById) initLst();
})();
