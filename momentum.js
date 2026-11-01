// ---- Top Momentum (24h) ----
// A short ranking of Solana tokens with the strongest 24h momentum that also
// pass a risk filter. Everything is computed in the visitor's browser from
// Jupiter's public token index (and, optionally, RugCheck's public summary
// for locked liquidity). No backend, no accounts, nothing is stored except a
// short sessionStorage cache of the LP-lock lookups.
//
// This file is loaded after app.js and reuses its globals (isValidMint,
// formatUsd, formatPrice, makeEl, buildTokenIcon, buildStarButton,
// tradeMover, shortenMint, categorizeToken, knownSymbols, SOL_MINT).
//
// The score is a heuristic, not an audit. Momentum decides the order; risk
// only decides who is allowed in.
(function () {
  "use strict";

  const MOM_MIN_LIQUIDITY_USD = 100000;
  const MOM_MIN_AGE_HOURS = 48;
  const MOM_TOP_N = 5;
  // Only the best momentum candidates get the extra LP-lock lookup.
  const MOM_ENRICH_N = 15;
  const MOM_ENRICH_CHUNK = 5;
  const MOM_REFRESH_MS = 10 * 60 * 1000;
  const LOCK_CACHE_KEY = "momentum-lp-v1";
  const LOCK_CACHE_MS = 30 * 60 * 1000;
  const LOCK_TIMEOUT_MS = 6000;
  const RISK_MEDIUM_FROM = 20;
  const RISK_HIGH_FROM = 40;

  const UNIVERSE_URLS = [
    "https://api.jup.ag/tokens/v2/toptrending/24h?limit=100",
    "https://api.jup.ag/tokens/v2/toptraded/24h?limit=100",
  ];
  const RUGCHECK_SUMMARY_URL = "https://api.rugcheck.xyz/v1/tokens/";

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function fmtPct(x) {
    if (x == null) return "—";
    return (x >= 0 ? "+" : "") + x.toFixed(1) + "%";
  }

  function fmtAge(hours) {
    if (hours == null) return "—";
    const days = hours / 24;
    if (days < 60) return Math.floor(days) + "d";
    if (days < 365) return Math.round(days / 30) + "mo";
    return (days / 365).toFixed(1) + "y";
  }

  // ---- Turning a Jupiter token into a candidate ----
  // Returns null when the token must not be considered at all (hard filters).
  function toCandidate(t) {
    if (!t || typeof t !== "object") return null;
    if (!isValidMint(t.id) || t.id === SOL_MINT) return null;
    if (typeof t.symbol !== "string" || !t.symbol) return null;
    const s = t.stats24h && typeof t.stats24h === "object" ? t.stats24h : null;
    if (!s) return null;

    const liquidity = num(t.liquidity);
    if (liquidity == null || liquidity < MOM_MIN_LIQUIDITY_USD) return null;
    const price = num(t.usdPrice);
    if (price == null) return null;
    const buy = num(s.buyVolume);
    const sell = num(s.sellVolume);
    if (buy == null || sell == null || buy + sell <= 0) return null;
    if (typeof categorizeToken === "function" && categorizeToken(t.symbol) === "stable") return null;

    const audit = t.audit && typeof t.audit === "object" ? t.audit : {};
    if (audit.isSus === true) return null;

    const created = t.firstPool && typeof t.firstPool.createdAt === "string" ? Date.parse(t.firstPool.createdAt) : NaN;
    const ageHours = isFinite(created) ? (Date.now() - created) / 3600000 : null;
    if (ageHours != null && ageHours < MOM_MIN_AGE_HOURS) return null;

    let mintActive = null;
    if (audit.mintAuthorityDisabled === true) mintActive = false;
    else if (audit.mintAuthorityDisabled === false || t.mintAuthority) mintActive = true;
    let freezeActive = null;
    if (audit.freezeAuthorityDisabled === true) freezeActive = false;
    else if (audit.freezeAuthorityDisabled === false || t.freezeAuthority) freezeActive = true;

    const volume = buy + sell;
    const traders = num(s.numTraders);
    const organic = num(t.organicScore);

    // Real vs suspicious volume: a few simple, explainable red flags.
    const why = [];
    if (organic != null && organic < 30) why.push("low organic score");
    if (traders != null && traders < 100 && volume > 250000) why.push("big volume from few traders");
    if (volume / liquidity > 40) why.push("volume far above liquidity");

    return {
      mint: t.id,
      symbol: t.symbol.slice(0, 12),
      name: typeof t.name === "string" ? t.name.slice(0, 32) : "",
      icon: typeof safeIcon === "function" ? safeIcon(t) : null,
      verified: t.isVerified === true,
      token2022: typeof t.tokenProgram === "string" && t.tokenProgram !== "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      price: price,
      liquidity: liquidity,
      volume: volume,
      buyShare: buy / volume,
      traders: traders,
      organic: organic,
      ageHours: ageHours,
      holders: num(t.holderCount),
      priceChange: num(s.priceChange),
      holderChange: num(s.holderChange),
      volumeChange: num(s.volumeChange),
      liquidityChange: num(s.liquidityChange),
      mintActive: mintActive,
      freezeActive: freezeActive,
      topHolders: num(audit.topHoldersPercentage),
      devBalance: num(audit.devBalancePercentage),
      suspicious: why.length > 0,
      suspiciousWhy: why.join(", "),
    };
  }

  // ---- Momentum score (0-100) ----
  // Weights: holder growth 25, volume growth 20, organic activity 20,
  // buy pressure 15, liquidity depth 10, liquidity growth 5, price change 5.
  // Suspicious volume subtracts 15.
  function scoreMomentum(c) {
    const parts = [];
    let total = 0;
    function add(label, max, ratio, detail) {
      const pts = clamp(ratio, 0, 1) * max;
      total += pts;
      parts.push({ label: label, max: max, pts: Math.round(pts * 10) / 10, detail: detail });
    }
    add("Holder growth", 25, c.holderChange == null ? 0 : c.holderChange / 20, fmtPct(c.holderChange));
    add("Volume growth", 20, c.volumeChange == null ? 0 : c.volumeChange / 300, fmtPct(c.volumeChange));
    add("Organic activity", 20, c.organic == null ? 0 : c.organic / 100, c.organic == null ? "n/a" : Math.round(c.organic) + "/100");
    add("Buy pressure", 15, (c.buyShare - 0.5) / 0.15, Math.round(c.buyShare * 100) + "% of volume is buys");
    add("Liquidity depth", 10, Math.log10(c.liquidity / MOM_MIN_LIQUIDITY_USD) / Math.log10(20), formatUsd(c.liquidity));
    add("Liquidity growth", 5, c.liquidityChange == null ? 0 : c.liquidityChange / 30, fmtPct(c.liquidityChange));
    add("Price change", 5, c.priceChange == null ? 0 : c.priceChange / 50, fmtPct(c.priceChange));
    if (c.suspicious) {
      total -= 15;
      parts.push({ label: "Suspicious volume", max: 0, pts: -15, detail: c.suspiciousWhy });
    }
    return { score: Math.round(clamp(total, 0, 100)), parts: parts };
  }

  // ---- Risk (points: higher = riskier) ----
  // lockPct: undefined = not looked up yet (pre-filter), null = lookup failed
  // or no data, number = percent of liquidity locked according to RugCheck.
  function riskOf(c, lockPct) {
    let pts = 0;
    const flags = [];
    function flag(state, text) {
      flags.push({ s: state, t: text });
    }

    if (c.mintActive === true) { pts += 20; flag("bad", "Mint authority active"); }
    else if (c.mintActive === false) flag("ok", "Mint authority off");
    else { pts += 5; flag("na", "Mint authority n/a"); }

    if (c.freezeActive === true) { pts += 15; flag("bad", "Freeze authority active"); }
    else if (c.freezeActive === false) flag("ok", "Freeze authority off");
    else { pts += 5; flag("na", "Freeze authority n/a"); }

    if (c.topHolders == null) { pts += 5; flag("na", "Top holders n/a"); }
    else if (c.topHolders >= 50) { pts += 25; flag("bad", "Top holders " + Math.round(c.topHolders) + "%"); }
    else if (c.topHolders >= 35) { pts += 15; flag("warn", "Top holders " + Math.round(c.topHolders) + "%"); }
    else if (c.topHolders >= 20) { pts += 7; flag("warn", "Top holders " + Math.round(c.topHolders) + "%"); }
    else flag("ok", "Top holders " + Math.round(c.topHolders) + "%");

    if (c.devBalance != null && c.devBalance >= 10) { pts += 8; flag("warn", "Dev holds " + Math.round(c.devBalance) + "%"); }

    if (c.ageHours == null) { pts += 10; flag("na", "Age n/a"); }
    else {
      const days = c.ageHours / 24;
      if (days < 7) { pts += 20; flag("bad", "Age " + fmtAge(c.ageHours)); }
      else if (days < 30) { pts += 10; flag("warn", "Age " + fmtAge(c.ageHours)); }
      else if (days < 90) { pts += 4; flag("ok", "Age " + fmtAge(c.ageHours)); }
      else flag("ok", "Age " + fmtAge(c.ageHours));
    }

    if (!c.verified) { pts += 8; flag("warn", "Unverified"); }
    else flag("ok", "Verified by Jupiter");

    if (c.organic != null) {
      if (c.organic < 30) { pts += 12; flag("bad", "Organic score " + Math.round(c.organic)); }
      else if (c.organic < 50) { pts += 6; flag("warn", "Organic score " + Math.round(c.organic)); }
      else flag("ok", "Organic score " + Math.round(c.organic));
    }

    if (c.suspicious) { pts += 10; flag("bad", "Suspicious volume"); }
    else flag("ok", "Volume: no red flags");

    if (c.token2022) { pts += 3; flag("warn", "Token-2022"); }

    if (lockPct === null) { pts += 4; flag("na", "LP lock n/a"); }
    else if (typeof lockPct === "number") {
      const label = "LP locked " + Math.round(lockPct) + "%";
      if (lockPct < 20) { pts += 15; flag("bad", label); }
      else if (lockPct < 60) { pts += 7; flag("warn", label); }
      else flag("ok", label);
    }

    const level = pts >= RISK_HIGH_FROM ? "high" : pts >= RISK_MEDIUM_FROM ? "medium" : "low";
    return { pts: pts, level: level, flags: flags };
  }

  // ---- LP lock lookup (RugCheck public summary) ----
  // Optional enrichment: if RugCheck is unreachable the token simply shows
  // "LP lock n/a" and takes a small risk penalty.
  let lockCache = null;

  function loadLockCache() {
    if (lockCache) return lockCache;
    lockCache = {};
    try {
      const raw = sessionStorage.getItem(LOCK_CACHE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === "object") {
        Object.keys(data).forEach((mint) => {
          const e = data[mint];
          if (!isValidMint(mint) || !e || typeof e !== "object") return;
          if (typeof e.t !== "number" || Date.now() - e.t > LOCK_CACHE_MS) return;
          if (e.v === null || (typeof e.v === "number" && e.v >= 0 && e.v <= 100)) lockCache[mint] = { t: e.t, v: e.v };
        });
      }
    } catch (err) {}
    return lockCache;
  }

  function saveLockCache() {
    try {
      sessionStorage.setItem(LOCK_CACHE_KEY, JSON.stringify(lockCache || {}));
    } catch (err) {}
  }

  async function fetchLockPct(mint) {
    const cache = loadLockCache();
    const hit = cache[mint];
    if (hit && Date.now() - hit.t < LOCK_CACHE_MS) return hit.v;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LOCK_TIMEOUT_MS);
    try {
      const res = await fetch(RUGCHECK_SUMMARY_URL + encodeURIComponent(mint) + "/report/summary", { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const pct = num(data && data.lpLockedPct);
      if (pct == null) return null;
      const value = clamp(pct, 0, 100);
      cache[mint] = { t: Date.now(), v: value };
      return value;
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function enrichLocks(list) {
    for (let i = 0; i < list.length; i += MOM_ENRICH_CHUNK) {
      const chunk = list.slice(i, i + MOM_ENRICH_CHUNK);
      const values = await Promise.all(chunk.map((c) => fetchLockPct(c.mint)));
      chunk.forEach((c, j) => { c.lockPct = values[j]; });
    }
    saveLockCache();
  }

  // ---- Pipeline ----
  async function loadUniverse() {
    const results = await Promise.allSettled(
      UNIVERSE_URLS.map((u) =>
        fetch(u).then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
      )
    );
    const byMint = new Map();
    let okCount = 0;
    results.forEach((r) => {
      if (r.status !== "fulfilled" || !Array.isArray(r.value)) return;
      okCount++;
      r.value.forEach((t) => {
        if (t && typeof t === "object" && isValidMint(t.id) && !byMint.has(t.id)) byMint.set(t.id, t);
      });
    });
    if (!okCount) throw new Error("No data from Jupiter");
    return Array.from(byMint.values());
  }

  async function buildRanking(tokens) {
    const cands = tokens.map(toCandidate).filter(Boolean);
    cands.forEach((c) => { c.momentum = scoreMomentum(c); });
    cands.sort((a, b) => b.momentum.score - a.momentum.score);

    // Cheap pre-filter without the LP lookup, then enrich only the best ones.
    const pool = cands.filter((c) => riskOf(c, undefined).level !== "high").slice(0, MOM_ENRICH_N);
    await enrichLocks(pool);
    pool.forEach((c) => { c.risk = riskOf(c, c.lockPct); });
    return pool
      .filter((c) => c.risk.level !== "high")
      .sort((a, b) => b.momentum.score - a.momentum.score || a.risk.pts - b.risk.pts)
      .slice(0, MOM_TOP_N);
  }

  // ---- Rendering ----
  function metric(label, value, cls) {
    const box = makeEl("div", "mom-metric");
    box.append(makeEl("span", "mom-metric-label", label), makeEl("span", "mom-metric-value" + (cls ? " " + cls : ""), value));
    return box;
  }

  function pctClass(x) {
    if (x == null) return "";
    return x >= 0 ? "mom-up" : "mom-down";
  }

  function buildCard(c, index) {
    knownSymbols[c.mint] = c.symbol;
    const card = makeEl("article", "mom-card" + (index === 0 ? " mom-card-top" : ""));

    const head = makeEl("div", "mom-head");
    const id = makeEl("div", "mom-id");
    id.append(makeEl("div", "top100-sym", c.symbol));
    if (c.name) id.append(makeEl("div", "top100-name", c.name));
    id.append(makeEl("div", "mom-mint", shortenMint(c.mint)));
    head.append(makeEl("span", "mom-rank", "#" + (index + 1)), buildTokenIcon(c.icon, c.symbol, "mover-icon"), id);
    const riskLabel = c.risk.level === "low" ? "Low risk" : "Medium risk";
    head.append(makeEl("span", "mom-risk " + c.risk.level, riskLabel));
    card.append(head);

    const scoreRow = makeEl("div", "mom-score-row");
    scoreRow.append(makeEl("span", "mom-score", String(c.momentum.score)), makeEl("span", "mom-score-sub", "/ 100 momentum"));
    card.append(scoreRow);
    const bar = makeEl("div", "mom-bar");
    const fill = makeEl("div", "mom-bar-fill");
    fill.style.width = c.momentum.score + "%";
    bar.append(fill);
    card.append(bar);

    const grid = makeEl("div", "mom-metrics");
    grid.append(
      metric("Price", formatPrice(c.price)),
      metric("24h price", fmtPct(c.priceChange), pctClass(c.priceChange)),
      metric("Holders 24h", fmtPct(c.holderChange), pctClass(c.holderChange)),
      metric("24h volume", formatUsd(c.volume)),
      metric("Liquidity", formatUsd(c.liquidity)),
      metric("Age", fmtAge(c.ageHours))
    );
    card.append(grid);

    const chips = makeEl("div", "mom-chips");
    c.risk.flags.forEach((f) => chips.append(makeEl("span", "mom-chip " + f.s, f.t)));
    card.append(chips);

    const details = makeEl("details", "mom-details");
    details.append(makeEl("summary", null, "Score breakdown"));
    c.momentum.parts.forEach((p) => {
      const row = makeEl("div", "mom-part");
      row.append(makeEl("span", "mom-part-label", p.label), makeEl("span", "mom-part-detail", p.detail), makeEl("span", "mom-part-pts", (p.pts > 0 ? "+" : "") + p.pts + (p.max ? " / " + p.max : "")));
      details.append(row);
    });
    details.append(makeEl("p", "mom-details-note", "Risk points: " + c.risk.pts + ". Under " + RISK_MEDIUM_FROM + " is low, under " + RISK_HIGH_FROM + " is medium; " + RISK_HIGH_FROM + " or more is left out of this list."));
    card.append(details);

    const actions = makeEl("div", "mom-actions");
    const swapBtn = makeEl("button", "top100-swap-btn", "Swap");
    swapBtn.type = "button";
    swapBtn.title = "Trade " + c.symbol;
    swapBtn.addEventListener("click", () => tradeMover(c.mint, c.symbol));
    actions.append(buildStarButton(c.mint, c.symbol, c.icon), swapBtn);
    card.append(actions);
    return card;
  }

  function setStatus(text, withRetry) {
    const status = document.getElementById("momentum-status");
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
        setStatus("Loading ranking…", false);
        refresh();
      });
      status.append(retry);
    }
  }

  function render(items) {
    const list = document.getElementById("momentum-list");
    const stamp = document.getElementById("momentum-updated");
    if (!list) return;
    list.replaceChildren();
    if (!items.length) {
      setStatus("No token passes the filters right now.", false);
      if (stamp) stamp.textContent = "";
      return;
    }
    setStatus("", false);
    items.forEach((c, i) => list.appendChild(buildCard(c, i)));
    if (stamp) {
      const d = new Date();
      stamp.textContent = "Updated " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    if (typeof refreshStars === "function") refreshStars();
  }

  let busy = false;

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const tokens = await loadUniverse();
      render(await buildRanking(tokens));
    } catch (err) {
      console.error("Could not load Top Momentum:", err);
      if (!document.getElementById("momentum-list").childElementCount) {
        setStatus("The momentum ranking is temporarily unavailable.", true);
      }
    } finally {
      busy = false;
    }
  }

  function initMomentum() {
    const section = document.getElementById("momentum-section");
    if (!section || typeof isValidMint !== "function" || typeof tradeMover !== "function") return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      refresh();
      setInterval(() => {
        if (!document.hidden) refresh();
      }, MOM_REFRESH_MS);
    };
    // Loaded only when the panel is about to be seen, like the Protocols list.
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          start();
        }
      }, { rootMargin: "600px 0px" });
      observer.observe(section);
    } else {
      start();
    }
  }

  // Exposed so the scoring can be tested outside the browser.
  if (typeof window !== "undefined") {
    window.SwapMomentum = { toCandidate: toCandidate, scoreMomentum: scoreMomentum, riskOf: riskOf };
  }

  if (typeof document !== "undefined" && document.getElementById) initMomentum();
})();
