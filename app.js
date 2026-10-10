    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    // mint -> symbol, used for the chart title. Seeded with the two mints the
    // page itself needs; search results, top movers and direct links add the
    // rest at runtime.
    const knownSymbols = { [SOL_MINT]: "SOL", [USDC_MINT]: "USDC" };

    function formatPrice(p) {
      // Prices come from a third-party API. Only real, finite numbers are
      // allowed through, so nothing but digits, "$" and "." can ever reach
      // the DOM from here.
      if (typeof p !== "number" || !isFinite(p)) return "--";
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

    // Solana mint addresses are base58 strings of 32-44 characters (the
    // base58 alphabet has no 0, O, I or l). The mint that reaches
    // renderChart() can originate in Jupiter's widget (onFormUpdate), in the
    // search box, in a ?to= link or in API data, i.e. untrusted input, so it
    // is validated before being interpolated into the Birdeye iframe URL.
    // frame-src in the CSP already pins the host; this keeps the path
    // segment well-formed too (defense in depth).
    const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    function isValidMint(mint) {
      return typeof mint === "string" && MINT_REGEX.test(mint);
    }

    const chartState = { mint: SOL_MINT, symbol: "SOL", interval: "60" };

    // Birdeye's public tv-widget iframe needs no API key. It shows the
    // price chart for a single token address (viewMode=pair picks the
    // most liquid market for that token automatically).
    function renderChart() {
      const frame = document.getElementById("price-chart");
      const title = document.getElementById("chart-title");
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
    }

    function updateChart(mint, symbol) {
      const safeMint = mint || SOL_MINT;
      if (!isValidMint(safeMint)) return; // ignore anything that isn't a well-formed mint
      chartState.mint = safeMint;
      chartState.symbol = symbol || "SOL";
      renderChart();
    }

    // Updates only the chart title (no iframe reload), e.g. once a lookup
    // has resolved the symbol of a token that was loaded by mint.
    function setChartSymbol(mint, symbol) {
      if (chartState.mint !== mint) return;
      chartState.symbol = symbol;
      const title = document.getElementById("chart-title");
      if (title) title.textContent = symbol;
    }

    function shortenMint(mint) {
      if (!mint) return "TOKEN";
      return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
    }

    function symbolForMint(mint) {
      return knownSymbols[mint] || shortenMint(mint);
    }

    // Tracks the swap widget's last known input/output mints so we can
    // tell which side the user just changed inside the widget itself
    // (Jupiter's onFormUpdate fires on every keystroke too, not just
    // token changes, so we only react when a mint actually differs).
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

    // Jupiter's plugin is a third-party script. If it fails to load (Jupiter
    // outage, ad blocker, flaky network), window.Jupiter is undefined and
    // initJupiter() throws. Wrapping it keeps the rest of the page alive
    // (search, tabs, Bridge, mobile CTA) and still shows the chart.
    function safeInitJupiter(outputMint) {
      try {
        initJupiter(outputMint);
      } catch (err) {
        console.error("Jupiter widget init failed:", err);
        const validMint = isValidMint(outputMint) ? outputMint : null;
        updateChart(validMint || SOL_MINT, symbolForMint(validMint || SOL_MINT));
      }
    }

    function initJupiter(outputMint) {
      if (!window.Jupiter) {
        throw new Error("window.Jupiter not present — plugin-v1.js failed to load");
      }
      const validMint = isValidMint(outputMint) ? outputMint : null;
      const initialOutputMint = validMint || USDC_MINT;
      // If SOL itself is chosen as the output (e.g. from the Top volume
      // list), pay with USDC so input and output are never the same token.
      const initialInputMint = initialOutputMint === SOL_MINT ? USDC_MINT : SOL_MINT;
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "jupiter-plugin",
        // Jupiter's official `branding` option: swaps the logo shown in the
        // widget header for this site's own. The name is a single space on
        // purpose: the header then shows only the icon (an empty or missing
        // name could fall back to "Jupiter"). It is purely cosmetic: it
        // does not touch routing, quotes, fees or the signing flow, and the
        // page still says "Powered by Jupiter" below the swap. The logo is a
        // plain https image, already allowed by img-src in the CSP.
        branding: {
          logoUri: "https://swapsolanatokens.com/logo.png",
          name: " ",
        },
        formProps: {
          initialInputMint: initialInputMint,
          initialOutputMint: initialOutputMint,
          referralAccount: "3YpVADrndNQaNcMT1yNg8E9KjvSjmPUwtdrnHGmWh1sm",
          referralFee: 50, // 50 bps = 0.5% (Jupiter's minimum allowed fee)
        },
        onFormUpdate: handleFormUpdate,
      });
      lastForm = { fromMint: initialInputMint, toMint: initialOutputMint };
      updateChart(validMint || SOL_MINT, symbolForMint(validMint || SOL_MINT));
    }

    // ---- Loading a token into the swap + chart ----
    // Single entry point shared by the search box, the Top movers rows
    // and ?to=<mint> links.
    function loadToken(mint, symbol) {
      if (!isValidMint(mint)) return;
      if (symbol) knownSymbols[mint] = symbol;
      safeInitJupiter(mint);
    }

    // ---- Token search ----
    // Fully client-side: the visitor's browser asks Jupiter's public Tokens
    // API (no key needed so far — re-check if it ever starts returning 401).
    // Everything that comes back is third-party input: it is normalized into
    // a small object of plain strings/numbers/booleans and rendered with
    // textContent only. Icon URLs must be https; img-src in the CSP allows it.
    //
    // "Verified" is Jupiter's own listing flag. It is NOT a safety
    // guarantee, and the UI says "Verified by Jupiter", never "safe".
    const SEARCH_URL = "https://api.jup.ag/tokens/v2/search?query=";
    const SEARCH_MIN_CHARS = 2;
    const SEARCH_DEBOUNCE_MS = 300;
    const SEARCH_MAX_RESULTS = 8;
    const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

    let searchTimer = null;
    let searchAbort = null;
    let lastLoadedMint = null; // last mint loaded from the box, avoids reloading the same paste

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

    function setSearchNotice(text, level) {
      const notice = document.getElementById("search-notice");
      if (!notice) return;
      notice.textContent = text || "";
      notice.classList.toggle("warn", level === "warn");
    }

    // One short sentence about a token, shown under the search box once it
    // has been chosen. Empty when there is nothing worth flagging.
    function tokenNoticeFor(t) {
      const flags = [];
      if (t.mintAuthorityActive) flags.push("the mint authority is still active, so the issuer can create more supply");
      if (t.freezeAuthorityActive) flags.push("the freeze authority is still active, so the issuer can freeze token accounts");
      if (!t.verified) {
        const base = "Unverified token: it is not on Jupiter's verified list. Check the mint address before trading.";
        return { text: flags.length ? base + " Also, " + flags.join(" and ") + "." : base, level: "warn" };
      }
      if (flags.length) {
        return { text: "Verified by Jupiter, but " + flags.join(" and ") + ".", level: "warn" };
      }
      return { text: "", level: "" };
    }

    function showTokenNotice(t) {
      const n = tokenNoticeFor(t);
      setSearchNotice(n.text, n.level);
    }

    // The blur layer behind the results is pure CSS: body.search-open shows
    // .search-backdrop and lifts .search-wrap above it (see index.html).
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

    // Copies text to the clipboard. navigator.clipboard needs a secure
    // context (https, which the site always uses); the textarea fallback
    // covers older browsers and in-app browsers that block the async API.
    async function copyText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) { /* fall through to the fallback */ }
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

    // Shows the shortened mint (ABCD…WXYZ); clicking it copies the FULL
    // address, so it can be pasted into a block explorer or a web search.
    // It is a separate button next to the row's "load this token" button
    // (a button can't be nested inside another button).
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

    function buildSearchRow(t) {
      const li = document.createElement("li");
      const btn = makeEl("button", "search-item");
      btn.type = "button";
      btn.setAttribute("aria-label", "Load " + t.symbol + " " + shortenMint(t.mint));

      let icon;
      if (t.icon) {
        icon = document.createElement("img");
        icon.className = "search-token-icon";
        icon.alt = "";
        icon.loading = "lazy";
        icon.referrerPolicy = "no-referrer";
        icon.src = t.icon;
        icon.addEventListener("error", () => {
          const fallback = makeEl("span", "search-token-icon search-token-fallback", t.symbol.charAt(0).toUpperCase());
          icon.replaceWith(fallback);
        });
      } else {
        icon = makeEl("span", "search-token-icon search-token-fallback", t.symbol.charAt(0).toUpperCase());
      }

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

    // Looks a mint up in Jupiter's index to learn its symbol and verification
    // status, then updates the chart title and the notice under the box.
    // Used for pasted mints and ?to= links, where we only have the address.
    async function inspectMint(mint) {
      setSearchNotice("Checking token…", "");
      try {
        const tokens = await fetchTokens(mint);
        if (chartState.mint !== mint) return; // the user moved on to another token
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
        if (input && input.value.trim() !== query) return; // stale response
        // Verified listings first: searching by name returns many clones of
        // the same ticker. Sort is stable, so Jupiter's own order is kept
        // inside each group.
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
        if (isValidMint(q)) loadByMint(q); // a well-formed mint loads straight away
        else runSearch(q);
      }, SEARCH_DEBOUNCE_MS);
    }

    // Top movers: no lookup needed, so just load and clear any previous
    // notice.
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
      // The blurred backdrop is outside the search box, so the handler
      // above already closes the results when it is clicked; this explicit
      // listener keeps that working on iOS Safari, which doesn't deliver
      // document-level clicks for non-interactive elements.
      if (backdrop) backdrop.addEventListener("click", closeSearchResults);
    }

    // ---- Direct links: https://swapsolanatokens.com/?to=<mint> ----
    // Opens the swap and the chart with that token as the output. The value
    // is untrusted (anyone can craft a link), so it only counts if it is a
    // well-formed mint, and the notice under the search box then shows
    // whether Jupiter lists it as verified.
    function readLinkedMint() {
      try {
        const value = new URLSearchParams(window.location.search).get("to");
        return isValidMint(value) ? value : null;
      } catch (err) {
        return null;
      }
    }

    // Mayan cross-chain bridge widget. Independent from Jupiter — its own
    // script, its own render target, its own referrer fee mechanism (the
    // three addresses + referrerBps below, not Jupiter's referralAccount).
    //
    // Unlike the previous deBridge integration, MayanSwap.init() mounts
    // the widget directly into the #mayan-widget element in THIS
    // document — there is no cross-origin <iframe> in between. That
    // matters a lot: deBridge's real failure mode (its CDN serving a
    // widget.js that referenced stale webpack chunk hashes) was invisible
    // to us specifically because those chunk failures happened inside a
    // cross-origin iframe's own document, where browsers never let error
    // events reach a listener on our parent window no matter how the
    // listener is attached. With Mayan there's no such boundary: if
    // MayanSwap.init() throws, or window.MayanSwap never shows up, we
    // actually find out about it directly. No iframe-height heuristics,
    // no "looks healthy but might silently be broken" handling needed —
    // that whole category of problem doesn't apply to this integration.
    //
    // Referrer fields (solanaReferrerAddress / evmReferrerAddress /
    // suiReferrerAddress / referrerBps / defaultSelected) come straight
    // from the snippet generated at widget.mayan.finance — confirmed
    // field names, not guessed. defaultSelected pre-fills the widget for
    // this site's main use case: bridging ETH -> SOL into Solana; users
    // can still change either side inside the widget.
    //
    // IMPORTANT: per Mayan's docs, the Solana referrer address needs
    // initialized token accounts (ATAs) for USDC, USDT and WETH, or the
    // referral bps may silently be lost on some routes. If
    // MAYAN_REFERRER_SOLANA hasn't received at least a dust amount of
    // each of those tokens yet, send a tiny amount of each to create the
    // ATAs — see the SPL mint addresses in Mayan's referral docs.
    const MAYAN_REFERRER_SOLANA = "DQShR4tEozY2WNN3kxggoRgSQhXDZtzekS7TEK6A6x8b";
    const MAYAN_REFERRER_EVM = "0x8AE8BA04dBfD5748CcA38f1D47B57cdB5e152a91";
    const MAYAN_REFERRER_SUI = "0xef1c80bbc4245655148ff0743e1d04ed5f2a9170fc4a108fa8f3f8c43203c1b1";
    const MAYAN_REFERRER_BPS = 30; // 0.30% — from widget.mayan.finance. Cap is 100 bps from Solana, 50 bps from other chains. Adjust from the dashboard if you want to change it later.
    const MAYAN_SCRIPT_URL = "https://cdn.mayan.finance/widget/1_8_0/main.js";
    const MAYAN_SCRIPT_INTEGRITY = "sha256-csokBs9wUf3aZCKTR7/XXElwXugjzCQeUygLmN+/Y7Y=";

    // Chains the bridge can send FROM. Solana is deliberately left out: this
    // site only bridges INTO Solana (destination stays unrestricted, so
    // Solana is still the default destination). Widget `sourceChains` is
    // Mayan's own documented option; names are Mayan's `nameId` values (see
    // https://sia.mayan.finance/v10/init). It is an allowlist, so a chain
    // Mayan adds later will NOT show up as a source until it is added here.
    // Not included on purpose (all live at Mayan, add them if wanted):
    // monad, unichain, linea, hyperevm.
    const MAYAN_SOURCE_CHAINS = ["ethereum", "monad","bsc", "HyperEVM", "polygon", "avalanche", "arbitrum", "optimism", "base", "sui", "Linea", "Unichain"];

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

    // Shown only if mounting genuinely fails (script never loaded, or
    // MayanSwap.init() threw). Lets the person retry just this panel
    // instead of reloading the whole page.
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
      if (container) container.innerHTML = ""; // clear any leftover loading/retry state from a prior attempt
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

    // Full teardown + fresh script load + fresh mount, with a
    // cache-busting query param so the browser doesn't just replay a
    // cached failure. Used by the "Retry bridge" button that
    // showMayanRetryButton() renders inside the widget when a mount
    // genuinely fails — Mayan's DOM-mount approach means we always know
    // when that happens, so there's no need for an always-visible
    // fallback link like the old deBridge iframe integration needed.
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
    // Fully client-side: no backend, no uploaded files, no API key. The
    // visitor's browser asks Jupiter's public Tokens API for the most-traded
    // tokens of the last 24 hours, filters them here, and fills two
    // separate panels from the same response:
    //   - Trending: the biggest gainers and losers by 24h price change.
    //   - Top volume: the 10 tokens with the most traded volume in 24h.
    // Jupiter's API only exposes 5m / 1h / 6h / 24h windows, so these are
    // 24h rankings (not 7 days).
    //
    // The panels are shown on every screen size (below the chart on wide
    // desktops, below the swap on mid-width screens, below the chart on
    // phones), so the list is requested on every page load.
    //
    // Trending filters (all enforced in passesMoverFilters):
    //  - liquidity above MOVERS_MIN_LIQUIDITY_USD
    //  - classic SPL Token program only (excludes Token-2022 and its
    //    transfer-fee / hook / permanent-delegate extensions)
    //  - no mint authority, so supply can't be increased
    //  - verified listing on Jupiter
    // The first MOVERS_UNIVERSE_SIZE tokens that pass (the API returns them
    // ordered by traded volume) form the universe the 5 + 5 are picked from.
    //
    // Top volume filters (passesVolumeFilters) are lighter on purpose: it is
    // an information list, and SOL and the big stablecoins (which have a
    // mint authority) are exactly what tops it. It keeps Jupiter-verified
    // tokens with over $1M of liquidity, sorted by buy + sell volume.
    // These checks rely on Jupiter's data, not an independent on-chain read.
    const MOVERS_URL = "https://api.jup.ag/tokens/v2/toptraded/24h?limit=100";
    const SPL_TOKEN_PROGRAM = SPL_TOKEN_PROGRAM_ID;
    const MOVERS_MIN_LIQUIDITY_USD = 1000000;
    const MOVERS_UNIVERSE_SIZE = 50;
    const MOVERS_PER_SIDE = 5;
    const VOLUME_LIST_SIZE = 10;
    const MOVERS_CACHE_KEY = "movers-v3";
    const MOVERS_CACHE_MS = 5 * 60 * 1000;    // reuse the last result for 5 min
    const MOVERS_REFRESH_MS = 10 * 60 * 1000; // re-query every 10 min

    function passesMoverFilters(t) {
      if (!t || typeof t !== "object") return false;
      if (!isValidMint(t.id) || t.id === SOL_MINT) return false;
      if (typeof t.symbol !== "string" || !t.symbol) return false;
      if (t.isVerified !== true) return false;
      if (t.tokenProgram !== SPL_TOKEN_PROGRAM) return false;
      if (t.mintAuthority) return false;
      if (t.audit && t.audit.mintAuthorityDisabled === false) return false;
      if (typeof t.liquidity !== "number" || !(t.liquidity > MOVERS_MIN_LIQUIDITY_USD)) return false;
      if (typeof t.usdPrice !== "number" || !isFinite(t.usdPrice)) return false;
      const change = t.stats24h && t.stats24h.priceChange;
      if (typeof change !== "number" || !isFinite(change)) return false;
      return true;
    }

    // 24h traded volume in USD: buy volume + sell volume, as reported by
    // Jupiter. Returns null unless both are real, finite numbers.
    function volume24h(t) {
      const s = t && t.stats24h;
      if (!s || typeof s !== "object") return null;
      if (typeof s.buyVolume !== "number" || !isFinite(s.buyVolume)) return null;
      if (typeof s.sellVolume !== "number" || !isFinite(s.sellVolume)) return null;
      const total = s.buyVolume + s.sellVolume;
      return total > 0 ? total : null;
    }

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

    // Icon comes from Jupiter's own token data. Only https URLs are kept;
    // anything else falls back to a letter badge.
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

    // Scrolls the page up to the swap so the person sees the token that was
    // just loaded. The movers panels sit in the Swap tab, so that tab is
    // already open; showTab("swap") is called anyway to be safe. The
    // .nav-anchor scroll-margin on #swap-section keeps the sticky nav bar
    // from covering the top of the widget. Smooth scrolling is skipped for
    // visitors who prefer reduced motion.
    function goToSwap() {
      showTab("swap");
      const target = document.getElementById("swap-section");
      if (!target) return;
      let smooth = true;
      try {
        smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (err) { /* matchMedia unavailable: keep smooth */ }
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }

    function tradeMover(mint, symbol) {
      loadPreset(mint, symbol); // same loader the search box uses
      goToSwap();
    }

    // Renders one list of rows. kind "change" shows the 24h price change
    // (Trending panel); kind "volume" shows the 24h traded volume (Top
    // volume panel). Same row layout either way.
    function renderMoverList(listEl, items, kind) {
      if (!listEl) return;
      listEl.replaceChildren();
      const showVolume = kind === "volume";
      items.forEach((item) => {
        // Built with textContent only: token data is third-party input.
        knownSymbols[item.mint] = item.symbol;
        const up = !showVolume && item.change >= 0;

        const li = document.createElement("li");
        // The whole row is the button: tapping anywhere on it loads the token.
        // A native <button> also gives keyboard and screen-reader support.
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

        let icon;
        if (item.icon) {
          icon = document.createElement("img");
          icon.className = "mover-icon";
          icon.alt = "";
          icon.loading = "lazy";
          icon.referrerPolicy = "no-referrer";
          icon.src = item.icon;
          icon.addEventListener("error", () => {
            icon.replaceWith(makeEl("span", "mover-icon search-token-fallback", item.symbol.charAt(0).toUpperCase()));
          });
        } else {
          icon = makeEl("span", "mover-icon search-token-fallback", item.symbol.charAt(0).toUpperCase());
        }

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
        const okChange = (list) => Array.isArray(list) && list.every((i) =>
          i && isValidMint(i.mint) && typeof i.symbol === "string" &&
          typeof i.price === "number" && typeof i.change === "number" && isFinite(i.change));
        const okVolume = (list) => Array.isArray(list) && list.every((i) =>
          i && isValidMint(i.mint) && typeof i.symbol === "string" &&
          typeof i.price === "number" && typeof i.volume === "number" && isFinite(i.volume));
        const d = cached.data;
        return d && okChange(d.gainers) && okChange(d.losers) && okVolume(d.volume) ? d : null;
      } catch (err) {
        return null;
      }
    }

    function writeMoversCache(data) {
      try {
        sessionStorage.setItem(MOVERS_CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
      } catch (err) { /* storage unavailable: just skip caching */ }
    }

    async function fetchMovers() {
      const cached = readMoversCache();
      if (cached) {
        renderMovers(cached);
        return;
      }
      try {
        const res = await fetch(MOVERS_URL);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const tokens = await res.json();
        if (!Array.isArray(tokens)) throw new Error("Unexpected response shape");
        const result = pickMovers(tokens);
        writeMoversCache(result);
        renderMovers(result);
      } catch (err) {
        console.error("Could not load top movers:", err);
        showMoversError();
      }
    }

    // Legacy Trending / Top volume tabs. The movers are now two separate
    // panels, so these elements no longer exist and the functions do
    // nothing; they can be deleted.
    function showMoversView(name) {
      document.querySelectorAll("#movers-tabs .interval-btn").forEach((btn) => {
        const active = btn.getAttribute("data-mview") === name;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      ["trending", "volume"].forEach((v) => {
        const view = document.getElementById("movers-view-" + v);
        if (view) view.hidden = v !== name;
      });
    }

    function initMoversTabs() {
      document.querySelectorAll("#movers-tabs .interval-btn").forEach((btn) => {
        btn.addEventListener("click", () => showMoversView(btn.getAttribute("data-mview")));
      });
    }

    // ---- Mobile wallet connect CTA ----
    // Jupiter's plugin, outside a wallet's own in-app browser, often can't
    // surface any wallet option on Android/iOS (no injected provider, and
    // Mobile Wallet Adapter frequently fails to show anything usable). The
    // fix is the same pattern Jupiter/Raydium/Orca use themselves: deep-link
    // into the wallet app's own in-app browser via each wallet's official
    // "Browse" universal link, where the wallet injects its provider and
    // the swap widget connects normally. This CTA is only shown when BOTH
    // conditions hold: mobile device AND no wallet provider already
    // injected (i.e. we're not already inside a wallet's browser, where
    // Jupiter works fine and the CTA would be redundant/confusing).
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
      if (!isMobileDevice() || hasInjectedSolanaWallet()) return; // stays hidden

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

    // ---- Tabs: Swap (Jupiter + Birdeye chart) / Bridge (Mayan) ----
    // Both panels stay in the DOM; the inactive one is just hidden, so the
    // Jupiter widget keeps its state when you flip to Bridge and back.
    // Mayan is mounted lazily the first time the Bridge tab is opened,
    // because widgets that measure their size on mount misbehave inside a
    // display:none container.
    let mayanStarted = false;
    const TAB_FOR_HASH = {
      "#swap-section": "swap",
      "#chart-section": "swap",
      "#bridge-section": "bridge",
    };

    function showTab(name) {
      ["swap", "bridge"].forEach((t) => {
        const btn = document.getElementById("tab-" + t);
        const panel = document.getElementById("panel-" + t);
        const active = t === name;
        if (btn) {
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
          btn.tabIndex = active ? 0 : -1;
        }
        if (panel) panel.hidden = !active;
      });
      if (name === "bridge" && !mayanStarted) {
        mayanStarted = true;
        initMayan();
      }
    }

    function initTabs() {
      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
      });
      // Nav links (Swap / Bridge / Chart) open the right tab first; the
      // browser's default anchor scroll then runs on a visible target.
      document.querySelectorAll(".topnav-link").forEach((link) => {
        link.addEventListener("click", () => {
          const tab = TAB_FOR_HASH[link.getAttribute("href")];
          if (tab) showTab(tab);
        });
      });
      showTab("swap");
    }

    // Deep links like /#bridge-section: Jupiter is mounted first while the
    // Swap tab is visible, then we switch and scroll.
    function applyInitialHash() {
      const tab = TAB_FOR_HASH[window.location.hash];
      if (!tab) return;
      showTab(tab);
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) target.scrollIntoView();
    }

    // addEventListener (not window.onload =) so a third-party script can't
    // overwrite this handler.
    window.addEventListener("load", function () {
      // initIntervalSwitch() goes first so the chart iframe's load listener
      // is attached before safeInitJupiter() sets the iframe src.
      initIntervalSwitch();
      initSearch();
      initMoversTabs();
      const linkedMint = readLinkedMint(); // ?to=<mint>
      if (linkedMint) lastLoadedMint = linkedMint;
      safeInitJupiter(linkedMint || undefined);
      if (linkedMint) inspectMint(linkedMint);
      fetchMovers();
      initTabs();
      initMobileWalletCta();
      applyInitialHash();
      setInterval(fetchMovers, MOVERS_REFRESH_MS); // top movers: every 10 minutes (served from cache within 5)
    });
