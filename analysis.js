// ---- Token Analysis panel ----
// A full-width panel with its OWN input (ticker, name or mint address),
// independent from the swap. When the visitor presses "Analyze" it gathers
// public data about that token and draws it as one overview: a risk gauge,
// holder concentration, buy/sell pressure, price change by window, liquidity
// by DEX, key numbers, security checks and a token profile (icon, name,
// launch platform, main markets, all-time high / low and links).
// Everything runs in the visitor's browser. No backend, no API keys, nothing
// is stored (only a 5 minute in-memory cache).
//
// Sources (all public, all optional: a block shows "n/a" if its source fails):
//  - Jupiter token index (SEARCH_URL): stats per window, audit, holders.
//  - RugCheck public summary: locked liquidity and its list of findings.
//  - DexScreener public API: pools per DEX, pool age, declared links.
//  - GeckoTerminal public API: hourly candles of the biggest pool (sparkline).
//  - CoinGecko public API: all-time high / low, markets and rank. Only for
//    tokens CoinGecko lists; its free tier is rate limited, so it is optional.
//
// Loaded after app.js and momentum.js (it reuses isValidMint, makeEl,
// formatUsd, formatPrice, shortenMint, safeHttpsUrl and, if present,
// SwapMomentum.riskOf). It must load before i18n.js.
//
// It is a heuristic overview, not an audit. All third-party text is written
// with textContent, links are accepted only over https.
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const TIMEOUT_MS = 10000;
  const CACHE_MS = 5 * 60 * 1000;
  const RISK_GAUGE_MAX = 60;

  const JUP_URL = typeof SEARCH_URL === "string" ? SEARCH_URL : "https://api.jup.ag/tokens/v2/search?query=";
  const DEX_URL = "https://api.dexscreener.com/tokens/v1/solana/";
  const RUGCHECK_URL = "https://api.rugcheck.xyz/v1/tokens/";
  const GECKO_URL = "https://api.geckoterminal.com/api/v2/networks/solana/pools/";
  const CG_URL = "https://api.coingecko.com/api/v3/coins/solana/contract/";
  const SPL_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

  // [label, Jupiter key, DexScreener key]
  const WINDOWS = [
    ["5m", "stats5m", "m5"],
    ["1h", "stats1h", "h1"],
    ["6h", "stats6h", "h6"],
    ["24h", "stats24h", "h24"],
  ];

  const cache = {};

  // ---- Small helpers ----
  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function fmtPct(x) {
    if (x == null) return "n/a";
    return (x >= 0 ? "+" : "") + x.toFixed(1) + "%";
  }

  function fmtInt(n) {
    return n == null ? "n/a" : Math.round(n).toLocaleString("en-US");
  }

  function str(v, max) {
    return typeof v === "string" ? v.trim().slice(0, max || 80) : "";
  }

  function fmtCompact(n) {
    if (n == null) return "n/a";
    const a = Math.abs(n);
    const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (let i = 0; i < units.length; i++) {
      if (a >= units[i][0]) return String(parseFloat((n / units[i][0]).toFixed(2))) + units[i][1];
    }
    return Math.round(n).toLocaleString("en-US");
  }

  function fmtDate(ms) {
    return ms != null && isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
  }

  function fmtAge(hours) {
    if (hours == null) return "n/a";
    const days = hours / 24;
    if (days < 1) return Math.max(1, Math.floor(hours)) + "h";
    if (days < 60) return Math.floor(days) + "d";
    if (days < 365) return Math.round(days / 30) + "mo";
    return (days / 365).toFixed(1) + "y";
  }

  function sv(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, String(attrs[k])));
    return node;
  }

  async function getJson(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  // ---- Data ----
  async function loadAll(mint, force) {
    const hit = cache[mint];
    if (!force && hit && Date.now() - hit.t < CACHE_MS) return hit.d;

    const enc = encodeURIComponent(mint);
    const [j, d, r, c] = await Promise.allSettled([
      getJson(JUP_URL + enc),
      getJson(DEX_URL + enc),
      getJson(RUGCHECK_URL + enc + "/report/summary"),
      getJson(CG_URL + enc + "?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false"),
    ]);

    const jup = j.status === "fulfilled" && Array.isArray(j.value)
      ? j.value.find((t) => t && typeof t === "object" && t.id === mint) || null
      : null;
    const pairs = d.status === "fulfilled" && Array.isArray(d.value)
      ? d.value.filter((p) => p && typeof p === "object" && (p.chainId == null || p.chainId === "solana"))
      : null;
    const rc = r.status === "fulfilled" && r.value && typeof r.value === "object" ? r.value : null;

    const cg = c.status === "fulfilled" && c.value && typeof c.value === "object" && !Array.isArray(c.value) ? c.value : null;

    const data = { mint: mint, jup: jup, pairs: pairs, rc: rc, cg: cg, candles: null };

    // Hourly candles of the pool with the most liquidity (optional).
    const best = bestPair(pairs);
    if (best && isValidMint(best.pairAddress)) {
      try {
        const g = await getJson(GECKO_URL + encodeURIComponent(best.pairAddress) + "/ohlcv/hour?aggregate=1&limit=48");
        const list = g && g.data && g.data.attributes && g.data.attributes.ohlcv_list;
        if (Array.isArray(list)) {
          const closes = list
            .map((c) => (Array.isArray(c) ? num(Number(c[4])) : null))
            .filter((x) => x != null)
            .reverse(); // the API lists newest first
          if (closes.length >= 4) data.candles = closes;
        }
      } catch (err) {}
    }

    cache[mint] = { t: Date.now(), d: data };
    return data;
  }

  function bestPair(pairs) {
    if (!pairs || !pairs.length) return null;
    return pairs.slice().sort((a, b) => (liqOf(b) || 0) - (liqOf(a) || 0))[0];
  }

  function liqOf(p) {
    return p && p.liquidity && typeof p.liquidity === "object" ? num(p.liquidity.usd) : null;
  }

  // A candidate shaped like the one momentum.js scores, built from Jupiter's
  // record of any token (no hard filters, so every token can be analysed).
  function toCandidate(t) {
    const s = t.stats24h && typeof t.stats24h === "object" ? t.stats24h : {};
    const audit = t.audit && typeof t.audit === "object" ? t.audit : {};
    const buy = num(s.buyVolume);
    const sell = num(s.sellVolume);
    const volume = (buy || 0) + (sell || 0);
    const liquidity = num(t.liquidity);
    const traders = num(s.numTraders);
    const organic = num(t.organicScore);

    const created = t.firstPool && typeof t.firstPool.createdAt === "string" ? Date.parse(t.firstPool.createdAt) : NaN;
    const ageHours = isFinite(created) ? (Date.now() - created) / 3600000 : null;

    let mintActive = null;
    if (audit.mintAuthorityDisabled === true) mintActive = false;
    else if (audit.mintAuthorityDisabled === false || t.mintAuthority) mintActive = true;
    let freezeActive = null;
    if (audit.freezeAuthorityDisabled === true) freezeActive = false;
    else if (audit.freezeAuthorityDisabled === false || t.freezeAuthority) freezeActive = true;

    const why = [];
    if (organic != null && organic < 30) why.push("low organic score");
    if (traders != null && traders < 100 && volume > 250000) why.push("big volume from few traders");
    if (liquidity && volume / liquidity > 40) why.push("volume far above liquidity");

    return {
      verified: t.isVerified === true,
      token2022: typeof t.tokenProgram === "string" && t.tokenProgram !== SPL_PROGRAM,
      organic: organic,
      ageHours: ageHours,
      mintActive: mintActive,
      freezeActive: freezeActive,
      topHolders: num(audit.topHoldersPercentage),
      devBalance: num(audit.devBalancePercentage),
      suspicious: why.length > 0,
    };
  }

  function computeRisk(data) {
    if (!data.jup || !window.SwapMomentum || typeof window.SwapMomentum.riskOf !== "function") return null;
    const cand = toCandidate(data.jup);
    const lock = data.rc ? num(data.rc.lpLockedPct) : null;
    // riskOf: null = no lock data, number = percent locked
    return window.SwapMomentum.riskOf(cand, lock == null ? null : clamp(lock, 0, 100));
  }

  // ---- Building blocks ----
  function card(title, body, extraClass) {
    const box = makeEl("section", "an-card" + (extraClass ? " " + extraClass : ""));
    box.append(makeEl("h3", "an-card-title", title), body);
    return box;
  }

  function naBox() {
    return makeEl("p", "an-na", "n/a");
  }

  // Risk gauge: a half circle filled in proportion to the risk points.
  function buildGauge(risk) {
    const wrap = makeEl("div", "an-gauge");
    if (!risk) {
      wrap.append(naBox());
      return wrap;
    }
    const d = "M 20 100 A 80 80 0 0 1 180 100";
    const svg = sv("svg", { viewBox: "0 0 200 112", "aria-hidden": "true" });
    svg.append(sv("path", { d: d, class: "an-gauge-track", pathLength: 100 }));
    const pct = clamp(risk.pts / RISK_GAUGE_MAX, 0, 1) * 100;
    svg.append(sv("path", { d: d, class: "an-gauge-fill " + risk.level, pathLength: 100, "stroke-dasharray": Math.max(pct, 1.5) + " 100" }));
    wrap.append(svg);
    const label = risk.level === "low" ? "Low risk" : risk.level === "medium" ? "Medium risk" : "High risk";
    const center = makeEl("div", "an-gauge-center");
    center.append(makeEl("span", "an-gauge-level " + risk.level, label));
    const pts = makeEl("span", "an-gauge-pts");
    pts.append(makeEl("span", null, "Risk points"), document.createTextNode(" " + risk.pts));
    center.append(pts);
    wrap.append(center);
    return wrap;
  }

  // Donut with the share of supply held by the top holders.
  function buildDonut(c) {
    const wrap = makeEl("div", "an-donut-wrap");
    if (!c || c.topHolders == null) {
      wrap.append(naBox());
      return wrap;
    }
    const pct = clamp(c.topHolders, 0, 100);
    const svg = sv("svg", { viewBox: "0 0 100 100", class: "an-donut", "aria-hidden": "true" });
    svg.append(sv("circle", { cx: 50, cy: 50, r: 38, class: "an-donut-track", pathLength: 100 }));
    const level = pct >= 50 ? "bad" : pct >= 20 ? "warn" : "ok";
    svg.append(sv("circle", { cx: 50, cy: 50, r: 38, class: "an-donut-fill " + level, pathLength: 100, "stroke-dasharray": pct + " 100", transform: "rotate(-90 50 50)" }));
    const center = makeEl("div", "an-donut-center");
    center.append(makeEl("span", "an-donut-value", Math.round(pct) + "%"), makeEl("span", "an-donut-label", "Top holders"));
    const box = makeEl("div", "an-donut-box");
    box.append(svg, center);
    wrap.append(box);
    if (c.devBalance != null) {
      wrap.append(makeEl("span", "an-chip " + (c.devBalance >= 10 ? "warn" : "ok"), "Dev holds " + Math.round(c.devBalance) + "%"));
    }
    return wrap;
  }

  // Buy vs sell pressure, one stacked bar per time window.
  function buildPressure(data) {
    const list = makeEl("div", "an-rows");
    let any = false;
    WINDOWS.forEach((w) => {
      let buy = null;
      let sell = null;
      let counts = false;
      const js = data.jup && data.jup[w[1]];
      if (js && typeof js === "object") {
        buy = num(js.buyVolume);
        sell = num(js.sellVolume);
      }
      if ((buy == null || sell == null) && data.pairs) {
        let b = 0;
        let s = 0;
        let seen = false;
        data.pairs.forEach((p) => {
          const t = p.txns && p.txns[w[2]];
          if (t && num(t.buys) != null && num(t.sells) != null) {
            b += t.buys;
            s += t.sells;
            seen = true;
          }
        });
        if (seen) {
          buy = b;
          sell = s;
          counts = true;
        }
      }
      const row = makeEl("div", "an-row");
      row.append(makeEl("span", "an-row-label", w[0]));
      if (buy == null || sell == null || buy + sell <= 0) {
        row.append(makeEl("span", "an-row-na", "n/a"));
        list.append(row);
        return;
      }
      any = true;
      const share = (buy / (buy + sell)) * 100;
      const bar = makeEl("div", "an-stack");
      const g = makeEl("span", "an-stack-buy");
      g.style.width = share.toFixed(1) + "%";
      const r = makeEl("span", "an-stack-sell");
      r.style.width = (100 - share).toFixed(1) + "%";
      bar.append(g, r);
      row.append(bar, makeEl("span", "an-row-value", Math.round(share) + "% buys"));
      row.title = (counts ? fmtInt(buy) + " / " + fmtInt(sell) : formatUsd(buy) + " / " + formatUsd(sell));
      list.append(row);
    });
    const wrap = makeEl("div", "an-block");
    if (!any) {
      wrap.append(naBox());
      return wrap;
    }
    wrap.append(list);
    const legend = makeEl("div", "an-legend");
    legend.append(makeEl("span", "an-dot buy", "Buys"), makeEl("span", "an-dot sell", "Sells"));
    wrap.append(legend);
    return wrap;
  }

  // Price change by window: bars growing left (down) or right (up) from a centre line.
  function buildChanges(data) {
    const list = makeEl("div", "an-rows");
    let any = false;
    WINDOWS.forEach((w) => {
      let change = null;
      let volume = null;
      const js = data.jup && data.jup[w[1]];
      if (js && typeof js === "object") {
        change = num(js.priceChange);
        const b = num(js.buyVolume);
        const s = num(js.sellVolume);
        if (b != null && s != null) volume = b + s;
      }
      if (data.pairs) {
        const best = bestPair(data.pairs);
        if (change == null && best && best.priceChange) change = num(best.priceChange[w[2]]);
        if (volume == null) {
          let v = 0;
          let seen = false;
          data.pairs.forEach((p) => {
            const x = p.volume && num(p.volume[w[2]]);
            if (x != null) {
              v += x;
              seen = true;
            }
          });
          if (seen) volume = v;
        }
      }
      const row = makeEl("div", "an-row");
      row.append(makeEl("span", "an-row-label", w[0]));
      if (change == null) {
        row.append(makeEl("span", "an-row-na", "n/a"));
      } else {
        any = true;
        const track = makeEl("div", "an-diverge");
        const fill = makeEl("span", "an-diverge-fill " + (change >= 0 ? "up" : "down"));
        fill.style.width = (clamp(Math.abs(change), 0, 50) / 50) * 50 + "%";
        track.append(fill);
        row.append(track, makeEl("span", "an-row-value " + (change >= 0 ? "up" : "down"), fmtPct(change)));
      }
      if (volume != null) row.title = formatUsd(volume);
      list.append(row);
    });
    const wrap = makeEl("div", "an-block");
    if (!any) {
      wrap.append(naBox());
      return wrap;
    }
    wrap.append(list);
    return wrap;
  }

  // Liquidity grouped by DEX, biggest first.
  function buildDexes(pairs) {
    const wrap = makeEl("div", "an-block");
    if (!pairs || !pairs.length) {
      wrap.append(naBox());
      return wrap;
    }
    const byDex = {};
    let oldest = null;
    pairs.forEach((p) => {
      const key = typeof p.dexId === "string" && p.dexId ? p.dexId.slice(0, 24) : "other";
      const liq = liqOf(p);
      if (liq != null) byDex[key] = (byDex[key] || 0) + liq;
      const created = num(p.pairCreatedAt);
      if (created != null && (oldest == null || created < oldest)) oldest = created;
    });
    const rows = Object.keys(byDex).map((k) => ({ dex: k, liq: byDex[k] })).sort((a, b) => b.liq - a.liq).slice(0, 6);
    if (!rows.length) {
      wrap.append(naBox());
      return wrap;
    }
    const max = rows[0].liq || 1;
    const list = makeEl("div", "an-rows");
    rows.forEach((r) => {
      const row = makeEl("div", "an-row");
      row.append(makeEl("span", "an-row-label an-skip an-wide", r.dex));
      const track = makeEl("div", "an-hbar");
      const fill = makeEl("span", "an-hbar-fill");
      fill.style.width = Math.max(3, (r.liq / max) * 100).toFixed(1) + "%";
      track.append(fill);
      row.append(track, makeEl("span", "an-row-value", formatUsd(r.liq)));
      list.append(row);
    });
    wrap.append(list);
    if (oldest != null) wrap.append(makeEl("p", "an-note", "Oldest pool " + fmtAge((Date.now() - oldest) / 3600000)));
    return wrap;
  }

  function buildSparkline(closes) {
    const wrap = makeEl("div", "an-block");
    if (!closes) {
      wrap.append(naBox());
      return wrap;
    }
    const w = 300;
    const h = 90;
    const min = Math.min.apply(null, closes);
    const max = Math.max.apply(null, closes);
    const span = max - min || 1;
    const pts = closes.map((v, i) => {
      const x = (i / (closes.length - 1)) * w;
      const y = h - 6 - ((v - min) / span) * (h - 12);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    const up = closes[closes.length - 1] >= closes[0];
    const svg = sv("svg", { viewBox: "0 0 " + w + " " + h, class: "an-spark", preserveAspectRatio: "none", "aria-hidden": "true" });
    svg.append(sv("polygon", { points: "0," + h + " " + pts.join(" ") + " " + w + "," + h, class: "an-spark-area " + (up ? "up" : "down") }));
    svg.append(sv("polyline", { points: pts.join(" "), class: "an-spark-line " + (up ? "up" : "down") }));
    wrap.append(svg);
    const change = ((closes[closes.length - 1] - closes[0]) / (closes[0] || 1)) * 100;
    wrap.append(makeEl("p", "an-note " + (up ? "up" : "down"), fmtPct(change)));
    return wrap;
  }

  function stat(label, value) {
    const box = makeEl("div", "an-stat");
    box.append(makeEl("span", "an-stat-label", label), makeEl("span", "an-stat-value", value));
    return box;
  }

  function buildStats(data) {
    const t = data.jup || {};
    const best = bestPair(data.pairs);
    const price = num(t.usdPrice) != null ? num(t.usdPrice) : best ? num(Number(best.priceUsd)) : null;
    const mcap = num(t.mcap) != null ? num(t.mcap) : best ? num(best.marketCap) : null;
    const fdv = num(t.fdv) != null ? num(t.fdv) : best ? num(best.fdv) : null;
    let liq = num(t.liquidity);
    if (liq == null && data.pairs) {
      const sum = data.pairs.reduce((a, p) => a + (liqOf(p) || 0), 0);
      liq = sum > 0 ? sum : null;
    }
    const s24 = t.stats24h && typeof t.stats24h === "object" ? t.stats24h : {};
    let ageHours = null;
    const created = t.firstPool && typeof t.firstPool.createdAt === "string" ? Date.parse(t.firstPool.createdAt) : NaN;
    if (isFinite(created)) ageHours = (Date.now() - created) / 3600000;
    else if (data.pairs) {
      const times = data.pairs.map((p) => num(p.pairCreatedAt)).filter((x) => x != null);
      if (times.length) ageHours = (Date.now() - Math.min.apply(null, times)) / 3600000;
    }
    const ratio = liq != null && mcap ? (liq / mcap) * 100 : null;

    const grid = makeEl("div", "an-stats");
    grid.append(
      stat("Price", price == null ? "n/a" : formatPrice(price)),
      stat("Market cap", mcap == null ? "n/a" : formatUsd(mcap)),
      stat("FDV", fdv == null ? "n/a" : formatUsd(fdv)),
      stat("Liquidity", liq == null ? "n/a" : formatUsd(liq)),
      stat("Liq / MCap", ratio == null ? "n/a" : ratio.toFixed(1) + "%"),
      stat("Holders", fmtInt(num(t.holderCount))),
      stat("Traders 24h", fmtInt(num(s24.numTraders))),
      stat("Organic score", num(t.organicScore) == null ? "n/a" : Math.round(t.organicScore) + "/100"),
      stat("Age", fmtAge(ageHours))
    );
    return grid;
  }

  function levelClass(level) {
    const l = typeof level === "string" ? level.toLowerCase() : "";
    if (l === "danger" || l === "critical" || l === "high" || l === "error") return "bad";
    if (l === "warn" || l === "warning" || l === "medium") return "warn";
    return "na";
  }

  function buildSecurity(risk, rc) {
    const wrap = makeEl("div", "an-block");
    if (risk) {
      const chips = makeEl("div", "an-chips");
      risk.flags.forEach((f) => chips.append(makeEl("span", "an-chip " + f.s, f.t)));
      wrap.append(chips);
    } else {
      wrap.append(naBox());
    }
    if (rc && Array.isArray(rc.risks)) {
      wrap.append(makeEl("h4", "an-sub", "RugCheck findings"));
      const found = rc.risks.filter((x) => x && typeof x === "object" && typeof x.name === "string").slice(0, 8);
      if (!found.length) {
        wrap.append(makeEl("p", "an-note", "No findings reported."));
      } else {
        const chips = makeEl("div", "an-chips");
        found.forEach((x) => {
          const chip = makeEl("span", "an-chip an-skip " + levelClass(x.level), x.name.slice(0, 48));
          if (typeof x.description === "string") chip.title = x.description.slice(0, 200);
          chips.append(chip);
        });
        wrap.append(chips);
      }
    }
    return wrap;
  }

  function linkLabel(type) {
    const k = typeof type === "string" ? type.toLowerCase() : "";
    if (k === "twitter") return "X";
    if (k === "telegram") return "Telegram";
    if (k === "discord") return "Discord";
    return "Link";
  }

  function buildLinks(data) {
    const wrap = makeEl("div", "an-block");
    const out = [];
    const best = bestPair(data.pairs);
    const info = best && best.info && typeof best.info === "object" ? best.info : null;
    if (info) {
      if (Array.isArray(info.websites)) {
        info.websites.slice(0, 2).forEach((s) => {
          const u = s && typeof safeHttpsUrl === "function" ? safeHttpsUrl(s.url) : null;
          if (u) out.push(["Website", u]);
        });
      }
      if (Array.isArray(info.socials)) {
        info.socials.slice(0, 4).forEach((s) => {
          const u = s && typeof safeHttpsUrl === "function" ? safeHttpsUrl(s.url) : null;
          if (u) out.push([linkLabel(s.type), u]);
        });
      }
    }
    if (out.length) {
      const row = makeEl("div", "an-links");
      out.forEach((l) => {
        const a = makeEl("a", "an-link", l[0] + " ↗");
        a.href = l[1];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        row.append(a);
      });
      wrap.append(row);
      wrap.append(makeEl("p", "an-note", "Self-declared by the token, not verified."));
    } else {
      wrap.append(naBox());
    }
    const full = makeEl("a", "an-link an-link-main", "Full RugCheck report ↗");
    full.href = "https://rugcheck.xyz/tokens/" + encodeURIComponent(data.mint);
    full.target = "_blank";
    full.rel = "noopener noreferrer";
    wrap.append(full);
    return wrap;
  }

  // ---- Token profile ----
  function priceOf(data) {
    const t = data.jup || {};
    const best = bestPair(data.pairs);
    const md = data.cg && data.cg.market_data && typeof data.cg.market_data === "object" ? data.cg.market_data : null;
    if (num(t.usdPrice) != null) return num(t.usdPrice);
    if (best && num(Number(best.priceUsd)) != null) return num(Number(best.priceUsd));
    return md && md.current_price ? num(md.current_price.usd) : null;
  }

  function identityOf(data) {
    const t = data.jup || {};
    const cg = data.cg || {};
    const best = bestPair(data.pairs);
    const base = best && best.baseToken && typeof best.baseToken === "object" ? best.baseToken : {};
    const info = best && best.info && typeof best.info === "object" ? best.info : {};
    const img = cg.image && typeof cg.image === "object" ? cg.image : {};
    const iconRaw = str(t.icon, 300) || str(img.small, 300) || str(img.large, 300) || str(info.imageUrl, 300);
    return {
      name: str(t.name) || str(cg.name) || str(base.name) || "",
      symbol: str(t.symbol, 24) || str(cg.symbol, 24).toUpperCase() || str(base.symbol, 24),
      icon: iconRaw && typeof safeHttpsUrl === "function" ? safeHttpsUrl(iconRaw) : null,
    };
  }

  function chipsOf(list, hoverFn) {
    const chips = makeEl("div", "an-chips");
    list.forEach((x) => {
      const chip = makeEl("span", "an-chip na an-skip", x.name);
      if (hoverFn) chip.title = hoverFn(x);
      chips.append(chip);
    });
    return chips;
  }

  function prow(label, node) {
    const row = makeEl("div", "an-prow");
    row.append(makeEl("span", "an-prow-label", label), node);
    return row;
  }

  function textVal(text, skip) {
    return makeEl("span", "an-prow-value" + (skip ? " an-skip" : ""), text);
  }

  function copyButton(mint) {
    const btn = makeEl("button", "an-copy", "Copy CA");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(mint);
        ok = true;
      } catch (err) {}
      btn.textContent = ok ? "Copied ✓" : "Copy failed";
      setTimeout(() => { btn.textContent = "Copy CA"; }, 1500);
    });
    return btn;
  }

  // All-time range: a bar from the all-time low to the all-time high (log scale)
  // with a dot where the current price sits. Data: CoinGecko (listed tokens only).
  function buildRange(data) {
    const wrap = makeEl("div", "an-block");
    const md = data.cg && data.cg.market_data && typeof data.cg.market_data === "object" ? data.cg.market_data : null;
    const ath = md && md.ath ? num(md.ath.usd) : null;
    const atl = md && md.atl ? num(md.atl.usd) : null;
    const price = priceOf(data);
    if (!ath || !atl || !price || atl <= 0 || price <= 0 || ath < atl) {
      wrap.append(naBox());
      wrap.append(makeEl("p", "an-note", "From CoinGecko; not available for every token."));
      return wrap;
    }
    const pos = ath === atl ? 100 : clamp((Math.log(price) - Math.log(atl)) / (Math.log(ath) - Math.log(atl)), 0, 1) * 100;
    const track = makeEl("div", "an-range-track");
    const dot = makeEl("span", "an-range-dot");
    dot.style.left = pos.toFixed(1) + "%";
    track.append(dot);
    wrap.append(track);

    const dateOf = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");
    const ends = makeEl("div", "an-range-ends");
    const lo = makeEl("div", "an-range-end");
    lo.append(makeEl("span", "an-range-tag", "ATL"), makeEl("span", "an-range-num", formatPrice(atl)), makeEl("span", "an-note", dateOf(md.atl_date && md.atl_date.usd)));
    const hi = makeEl("div", "an-range-end right");
    hi.append(makeEl("span", "an-range-tag", "ATH"), makeEl("span", "an-range-num", formatPrice(ath)), makeEl("span", "an-note", dateOf(md.ath_date && md.ath_date.usd)));
    ends.append(lo, hi);
    wrap.append(ends);

    const fromAth = (price / ath - 1) * 100;
    wrap.append(makeEl("p", "an-note " + (fromAth >= 0 ? "up" : "down"), fmtPct(fromAth) + " from ATH"));
    return wrap;
  }

  function buildProfile(data) {
    const t = data.jup || {};
    const cg = data.cg || null;
    const best = bestPair(data.pairs);
    const id = identityOf(data);
    const wrap = makeEl("div", "an-block an-profile");

    // Header: icon, full name, symbol, verification
    const head = makeEl("div", "an-prof-head");
    const fallback = () => makeEl("span", "an-prof-icon an-prof-fb an-skip", (id.symbol || "?").charAt(0).toUpperCase());
    if (id.icon) {
      const img = makeEl("img", "an-prof-icon");
      img.src = id.icon;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => img.replaceWith(fallback()));
      head.append(img);
    } else {
      head.append(fallback());
    }
    const names = makeEl("div", "an-prof-names");
    names.append(makeEl("span", "an-prof-name an-skip", id.name || id.symbol || "n/a"));
    const sub = makeEl("span", "an-prof-sym");
    if (id.symbol) sub.append(makeEl("span", "an-skip", id.symbol));
    if (data.jup) sub.append(makeEl("span", "an-chip " + (t.isVerified === true ? "ok" : "warn"), t.isVerified === true ? "Verified by Jupiter" : "Unverified"));
    names.append(sub);
    head.append(names);
    wrap.append(head);

    // Contract
    const mintRow = makeEl("div", "an-prof-mint");
    const mintText = makeEl("span", "an-mono an-skip", shortenMint(data.mint));
    mintText.title = data.mint;
    mintRow.append(mintText, copyButton(data.mint));
    wrap.append(mintRow);

    const rows = makeEl("div", "an-prows");

    // Launch platform: Jupiter's launchpad when it reports one, otherwise the
    // DEX of the oldest pool DexScreener lists (a good hint, not a guarantee).
    let platform = str(t.launchpad, 40);
    let platformLabel = "Launch platform";
    let oldestMs = null;
    let oldestDex = "";
    (data.pairs || []).forEach((p) => {
      const c = num(p.pairCreatedAt);
      if (c != null && (oldestMs == null || c < oldestMs)) {
        oldestMs = c;
        oldestDex = str(p.dexId, 24);
      }
    });
    if (!platform && oldestDex) {
      platform = oldestDex;
      platformLabel = "First pool on";
    }
    rows.append(prow(platformLabel, textVal(platform || "n/a", !!platform)));

    let launchedMs = t.firstPool && typeof t.firstPool.createdAt === "string" ? Date.parse(t.firstPool.createdAt) : NaN;
    if (!isFinite(launchedMs)) launchedMs = oldestMs != null ? oldestMs : cg && typeof cg.genesis_date === "string" ? Date.parse(cg.genesis_date) : NaN;
    rows.append(prow("Launched", textVal(fmtDate(isFinite(launchedMs) ? launchedMs : null) || "n/a")));

    // Main DEXs by liquidity (DexScreener pools)
    const byDex = {};
    (data.pairs || []).forEach((p) => {
      const k = str(p.dexId, 24);
      const liq = liqOf(p);
      if (k && liq != null) byDex[k] = (byDex[k] || 0) + liq;
    });
    const dexes = Object.keys(byDex).map((k) => ({ name: k, liq: byDex[k] })).sort((a, b) => b.liq - a.liq).slice(0, 4);
    rows.append(prow("Main DEXs", dexes.length ? chipsOf(dexes, (x) => formatUsd(x.liq)) : textVal("n/a")));

    // Markets from CoinGecko tickers (CEX and DEX), by 24h volume
    const byMarket = {};
    if (cg && Array.isArray(cg.tickers)) {
      cg.tickers.forEach((tk) => {
        const name = tk && tk.market && typeof tk.market === "object" ? str(tk.market.name, 28) : "";
        const vol = tk && tk.converted_volume && typeof tk.converted_volume === "object" ? num(tk.converted_volume.usd) : null;
        if (name) byMarket[name] = (byMarket[name] || 0) + (vol || 0);
      });
    }
    const markets = Object.keys(byMarket).map((k) => ({ name: k, vol: byMarket[k] })).sort((a, b) => b.vol - a.vol).slice(0, 5);
    rows.append(prow("Listed on", markets.length ? chipsOf(markets, (x) => formatUsd(x.vol)) : textVal("n/a")));

    const circ = num(t.circSupply);
    const total = num(t.totalSupply);
    if (circ != null || total != null) {
      rows.append(prow("Supply", textVal(fmtCompact(circ) + " / " + fmtCompact(total))));
    }
    const rank = cg ? num(cg.market_cap_rank) : null;
    if (rank != null) rows.append(prow("Market cap rank", textVal("#" + rank)));
    wrap.append(rows);

    wrap.append(makeEl("h4", "an-sub", "Links"));
    wrap.append(buildLinks(data));
    return wrap;
  }

  // ---- Panel ----
  function render(data) {
    const body = document.getElementById("analysis-body");
    if (!body) return;
    body.replaceChildren();

    const risk = computeRisk(data);
    const cand = data.jup ? toCandidate(data.jup) : null;

    const grid = makeEl("div", "an-grid");
    grid.append(
      card("Risk overview", buildGauge(risk)),
      card("Holders", buildDonut(cand)),
      card("Buy vs sell pressure", buildPressure(data)),
      card("Price change", buildChanges(data)),
      card("Liquidity by DEX", buildDexes(data.pairs)),
      card("Recent price (48h)", buildSparkline(data.candles)),
      card("Key numbers", buildStats(data), "an-card-wide"),
      card("All-time range", buildRange(data), "an-card-wide"),
      card("Security checks", buildSecurity(risk, data.rc), "an-card-wide"),
      card("Token profile", buildProfile(data), "an-card-tall")
    );
    body.append(grid);
    body.append(makeEl("p", "an-disclaimer", "Heuristic, not an audit. A low risk reading does not mean a token is safe. Data from Jupiter, RugCheck, DexScreener, GeckoTerminal and CoinGecko; a block shows n/a when its source does not answer."));
  }

  let busy = false;
  let analyzedMint = null;
  let lastMint = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setBusy(on) {
    busy = on;
    const btn = $("analysis-btn");
    if (btn) btn.disabled = on;
  }

  function setHint(text) {
    const hint = $("analysis-hint");
    if (hint && hint.textContent !== text) hint.textContent = text;
  }

  function setStatus(text, withRetry) {
    const status = $("analysis-status");
    if (!status) return;
    status.replaceChildren();
    if (!text) {
      status.style.display = "none";
      return;
    }
    status.style.display = "block";
    status.append(document.createTextNode(text));
    if (withRetry && lastMint) {
      const retry = makeEl("button", "proto-retry", "Retry");
      retry.type = "button";
      retry.addEventListener("click", () => analyze(lastMint, true));
      status.append(retry);
    }
  }

  function clearPicks() {
    const list = $("analysis-picks");
    if (!list) return;
    list.replaceChildren();
    list.hidden = true;
  }

  // Several tokens share a ticker: let the visitor choose the exact one.
  function showPicks(tokens) {
    const list = $("analysis-picks");
    if (!list) return;
    list.replaceChildren();
    tokens.forEach((t) => {
      const li = document.createElement("li");
      const btn = makeEl("button", "an-pick");
      btn.type = "button";
      btn.title = t.id;
      const iconUrl = typeof safeHttpsUrl === "function" ? safeHttpsUrl(str(t.icon, 300)) : null;
      if (iconUrl) {
        const img = makeEl("img", "an-pick-icon");
        img.src = iconUrl;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => { img.style.visibility = "hidden"; });
        btn.append(img);
      } else {
        btn.append(makeEl("span", "an-pick-icon"));
      }
      const main = makeEl("span", "an-pick-main");
      main.append(makeEl("span", "an-pick-sym an-skip", str(t.symbol, 24) || "?"), makeEl("span", "an-pick-name an-skip", str(t.name)));
      const meta = makeEl("span", "an-pick-meta an-skip", (t.isVerified === true ? "✓ " : "") + shortenMint(t.id) + (num(t.liquidity) != null ? " · " + formatUsd(t.liquidity) : ""));
      btn.append(main, meta);
      btn.addEventListener("click", () => {
        const input = $("analysis-input");
        if (input) input.value = str(t.symbol, 24) || t.id;
        clearPicks();
        setHint("");
        analyze(t.id, false);
      });
      li.append(btn);
      list.append(li);
    });
    list.hidden = false;
    setHint("Choose the token to analyze:");
  }

  async function analyze(mint, force) {
    if (busy || !isValidMint(mint)) return;
    lastMint = mint;
    setBusy(true);
    setStatus("Analyzing…", false);
    try {
      const data = await loadAll(mint, force === true);
      if (!data.jup && !data.pairs && !data.rc && !data.cg) throw new Error("No data from any source");
      analyzedMint = mint;
      render(data);
      const id = identityOf(data);
      const tokenEl = $("analysis-token");
      if (tokenEl) tokenEl.textContent = (id.symbol ? id.symbol + " · " : "") + shortenMint(mint);
      setHint("");
      setStatus("", false);
    } catch (err) {
      console.error("Could not load Token Analysis:", err);
      setStatus("Analysis could not be loaded right now.", true);
    } finally {
      setBusy(false);
    }
  }

  // The visitor typed a mint (analyse it) or a ticker / name (look it up first).
  async function submit() {
    if (busy) return;
    const input = $("analysis-input");
    if (!input) return;
    const q = input.value.trim().slice(0, 100);
    clearPicks();
    if (!q) {
      input.focus();
      return;
    }
    if (isValidMint(q)) {
      setHint("");
      analyze(q, false);
      return;
    }
    setBusy(true);
    setStatus("Searching…", false);
    let found = [];
    try {
      const res = await getJson(JUP_URL + encodeURIComponent(q));
      found = Array.isArray(res)
        ? res.filter((t) => t && typeof t === "object" && typeof t.id === "string" && isValidMint(t.id)).slice(0, 6)
        : [];
    } catch (err) {
      console.error("Token Analysis search failed:", err);
      setBusy(false);
      setStatus("Analysis could not be loaded right now.", false);
      return;
    }
    setBusy(false);
    if (!found.length) {
      setStatus("No tokens found. Try the exact symbol, or paste the mint address.", false);
      return;
    }
    setStatus("", false);
    if (found.length === 1) {
      setHint("");
      analyze(found[0].id, false);
    } else {
      showPicks(found);
    }
  }

  function initAnalysis() {
    const section = $("analysis-section");
    const btn = $("analysis-btn");
    const input = $("analysis-input");
    if (!section || !btn || !input || typeof isValidMint !== "function") return;
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener("input", () => {
      clearPicks();
      if (!analyzedMint) setHint("Type a ticker or paste a mint address, then press Analyze.");
    });
    setHint("Type a ticker or paste a mint address, then press Analyze.");
  }

  if (typeof INFO === "object" && INFO !== null) {
    INFO.analysis = {
      title: "Token Analysis",
      text: "Type a ticker or paste a mint address, then press Analyze. It works on its own, whatever token is loaded in the swap. You get a risk gauge, holder concentration, buy and sell pressure, price change, liquidity by DEX, security checks and a token profile with launch platform, main markets and all-time high and low. Data comes from Jupiter, RugCheck, DexScreener, GeckoTerminal and CoinGecko, straight from your browser. A heuristic, not an audit: a low risk reading does not mean a token is safe.",
      faq: "faq-analysis",
    };
  }

  // Exposed so the helpers can be tested outside the browser.
  if (typeof window !== "undefined") {
    window.SwapAnalysis = { toCandidate: toCandidate, computeRisk: computeRisk };
  }

  if (typeof document !== "undefined" && document.getElementById) initAnalysis();
})();
