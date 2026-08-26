    // List of main Solana coins + popular memecoins
    const COINS = [
      { symbol: "SOL",     emoji: "◎",  mint: "So11111111111111111111111111111111111111112" },
      { symbol: "JUP",     emoji: "🪐", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
      { symbol: "BONK",    emoji: "🐶", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
      { symbol: "WIF",     emoji: "🐕", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
      { symbol: "RAY",     emoji: "⚡", mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
      { symbol: "PYTH",    emoji: "🔮", mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3" },
      { symbol: "JTO",     emoji: "🚀", mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL" },
      { symbol: "POPCAT",  emoji: "🐱", mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr" },
      { symbol: "ORCA",    emoji: "🐋", mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE" },
      { symbol: "RENDER",  emoji: "🖥️", mint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof" },
      { symbol: "mSOL",    emoji: "🌊", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" },
      { symbol: "USDT",    emoji: "💵", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
      { symbol: "USDC",    emoji: "🪙", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      { symbol: "PENGU",   emoji: "🐧", mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv" },
      { symbol: "TRUMP",   emoji: "🇺🇸", mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
      { symbol: "FARTCOIN",emoji: "💨", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
      { symbol: "BOME",    emoji: "📖", mint: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82" },
      { symbol: "JitoSOL", emoji: "🔷", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" },
      { symbol: "JupSOL",  emoji: "🌟", mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v" },
      { symbol: "JLP",     emoji: "💧", mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4" },
      { symbol: "PUMP",    emoji: "🎈", mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn" },
      { symbol: "MET",     emoji: "☄️", mint: "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL" },
      { symbol: "META",    emoji: "🏛️", mint: "METAwkXcqyXKy1AtsSgJ8JiUHwGCafnZL38n3vYmeta" },
      { symbol: "HYPE",    emoji: "🔥", mint: "98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g" },
      { symbol: "ZEC",     emoji: "🛡️", mint: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS" },
      { symbol: "EURC",    emoji: "💶", mint: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr" },
      { symbol: "DBR",     emoji: "🌉", mint: "DBRiDgJAMsM95moTzJs7M9LnkGErpbv9v6CUR1DXnUu5" },
      { symbol: "USDe",    emoji: "🅴",  mint: "DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT" },
      { symbol: "USD1",    emoji: "🏦", mint: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB" },
      { symbol: "ETH",     emoji: "⟠",  mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs" },
      { symbol: "cbBTC",   emoji: "🟠", mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij" },
      { symbol: "WBTC",    emoji: "₿",  mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh" },
    ];

    function formatPrice(p) {
      if (p == null) return "--";
      if (p < 0.01) return "$" + p.toFixed(6);
      if (p < 1) return "$" + p.toFixed(4);
      return "$" + p.toFixed(2);
    }

    function renderTicker(prices) {
      const ticker = document.getElementById("ticker");
      // Rendered twice in a row so the scroll animation loops seamlessly
      const chips = COINS.map((coin) => {
        const info = prices[coin.mint];
        const price = info ? formatPrice(info.usdPrice) : "...";
        const change = info && typeof info.priceChange24h === "number" ? info.priceChange24h : null;
        const changeClass = change == null ? "" : change >= 0 ? "up" : "down";
        const changeText = change == null ? "" : `<span class="coin-change ${changeClass}">${change >= 0 ? "+" : ""}${change.toFixed(1)}%</span>`;
        return `
          <div class="coin-chip" data-mint="${coin.mint}" data-symbol="${coin.symbol}">
            <span class="coin-emoji">${coin.emoji}</span>
            <span class="coin-symbol">${coin.symbol}</span>
            <span class="coin-price">${price}</span>
            ${changeText}
          </div>`;
      }).join("");
      ticker.innerHTML = chips + chips; // duplicated for the infinite loop effect

      // Clicking a coin sets it as the output token in the swap widget
      ticker.querySelectorAll(".coin-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const mint = chip.getAttribute("data-mint");
          initJupiter(mint);
        });
      });
    }


    async function fetchPrices() {
      try {
        const ids = COINS.map((c) => c.mint).join(",");
        const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids}`);
        const data = await res.json();
        renderTicker(data);
      } catch (err) {
        console.error("Could not load prices:", err);
      }
    }

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

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
      frame.src = `https://birdeye.so/tv-widget/${chartState.mint}?${params.toString()}`;
      if (title) title.textContent = chartState.symbol;
    }

    function updateChart(mint, symbol) {
      chartState.mint = mint || SOL_MINT;
      chartState.symbol = symbol || "SOL";
      renderChart();
    }

    function shortenMint(mint) {
      if (!mint) return "TOKEN";
      return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
    }

    function symbolForMint(mint) {
      const coin = COINS.find((c) => c.mint === mint);
      return coin ? coin.symbol : shortenMint(mint);
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

      if (changedMint && changedMint !== chartState.mint) {
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

    function initJupiter(outputMint) {
      const initialOutputMint = outputMint || USDC_MINT;
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "jupiter-plugin",
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: initialOutputMint,
          referralAccount: "3YpVADrndNQaNcMT1yNg8E9KjvSjmPUwtdrnHGmWh1sm",
          referralFee: 50, // 50 bps = 0.5% (Jupiter's minimum allowed fee)
        },
        onFormUpdate: handleFormUpdate,
      });
      lastForm = { fromMint: SOL_MINT, toMint: initialOutputMint };
      updateChart(outputMint || SOL_MINT, symbolForMint(outputMint || SOL_MINT));
    }

    // deBridge cross-chain bridge widget. Independent from Jupiter — its own
    // script, its own iframe/render target, its own affiliate fee mechanism
    // (deBridge's, not Jupiter's referralAccount).
    //
    // deBridge's own CDN occasionally serves widget.js referencing webpack
    // chunk hashes that don't match what's live on their backend at that
    // moment, which makes the widget fail to mount with no visible error
    // (only a console warning). This is NOT something Cloudflare caching on
    // our side can cause or fix — app.debridge.com is not behind our CDN,
    // so nothing we control caches it. Instead of relying on a manual
    // Cloudflare purge, we retry automatically: if window.deBridge isn't
    // present yet, or widget() throws, we remove the old <script> tag,
    // reinject it with a cache-busting query param (forces the browser to
    // bypass its own HTTP cache and refetch), and try mounting again, up to
    // DEBRIDGE_MAX_RETRIES times with a short backoff between attempts.
    const DEBRIDGE_SCRIPT_URL = "https://app.debridge.com/assets/scripts/widget.js";
    // Fixed schedule of delays (ms) between attempts — one entry per gap
    // between attempts, so this schedule gives DEBRIDGE_RETRY_DELAYS_MS.length + 1
    // total attempts. The first couple of gaps are short in case it's a
    // one-off hiccup; the later gaps grow much longer on purpose, because
    // the real failure mode is deBridge's own CDN edge serving a stale
    // widget.js while their deployment propagates, and that can take well
    // over 20-30s to clear. Manually hitting F5 two or three times was
    // effectively re-running this same short schedule from scratch each
    // time — this just gives it one long enough run to not need that.
    const DEBRIDGE_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 18000];
    const DEBRIDGE_MAX_ATTEMPTS = DEBRIDGE_RETRY_DELAYS_MS.length + 1; // 7 attempts, ~75s total window
    const DEBRIDGE_HEALTH_CHECK_DELAY_MS = 4000; // a bit more headroom than deBridge's normal 1-2s render time

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // The real failure mode we're seeing: deBridge's widget.js references
    // internal, hashed chunk files (chunk-XXXX.js) that 404 because the
    // CDN's manifest is momentarily out of sync with what's actually
    // deployed. Crucially, this does NOT throw from window.deBridge.widget()
    // and does NOT necessarily collapse the outer iframe — the base widget
    // can still render at full height while missing pieces internally, so
    // neither our try/catch nor the height check in debridgeLooksHealthy()
    // ever notices. Resource load failures (script/link/img) don't bubble,
    // so they have to be caught with a capture-phase listener on window.
    // Any such failure with "debridge" in its URL during a mount attempt is
    // treated as a real failure, even if the iframe itself looks fine.
    let debridgeResourceErrorDetected = false;
    window.addEventListener("error", (e) => {
      const src = (e && e.target && (e.target.src || e.target.href)) || "";
      if (src && /debridge/i.test(src)) {
        console.warn("deBridge resource failed to load (likely a stale CDN chunk):", src);
        debridgeResourceErrorDetected = true;
      }
    }, true);

    // widget() can resolve successfully even when the CDN served a broken
    // chunk — the call doesn't throw, but the render is incomplete (empty
    // or partial container). A bare "does an iframe exist" check doesn't
    // catch that: a broken render can still produce an iframe element,
    // just one with no real height/content — this is the "aparece
    // incompleto" case. Checking the rendered height catches that too: a
    // fully mounted widget fills its 740px container, a broken one
    // collapses to 0 or a sliver, so anything under 200px is treated as
    // unhealthy. This is combined with debridgeResourceErrorDetected (see
    // above) since a broken mount can also fail silently at full height.
    function debridgeLooksHealthy() {
      const container = document.getElementById("debridge-widget");
      if (!container) return false;
      const iframe = container.querySelector("iframe");
      if (!iframe) return false;
      return iframe.offsetHeight > 200 && container.offsetHeight > 200;
    }

    function waitAndCheckHealth(ms) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(debridgeLooksHealthy()), ms);
      });
    }

    function reloadDebridgeScript() {
      return new Promise((resolve, reject) => {
        // Drop any previous copy so the browser treats the next one as a
        // genuinely new load rather than a no-op (identical src = ignored).
        document.querySelectorAll('script[src^="' + DEBRIDGE_SCRIPT_URL + '"]').forEach((el) => el.remove());
        delete window.deBridge;

        const script = document.createElement("script");
        script.src = DEBRIDGE_SCRIPT_URL + "?cb=" + Date.now();
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("deBridge script tag failed to load"));
        document.head.appendChild(script);
      });
    }

    // Shown while a (re)try is in flight, so the panel doesn't just sit
    // blank during the longer later gaps in the retry schedule.
    function showDebridgeLoadingState(attempt) {
      const container = document.getElementById("debridge-widget");
      if (!container) return;
      container.innerHTML = `
        <div class="debridge-status">
          <p class="debridge-status-text">${attempt > 1 ? "Still trying to load the bridge…" : "Loading bridge…"}</p>
        </div>`;
    }

    // Shown only after every automatic attempt in the schedule has failed.
    // Lets the person retry just this panel instead of reloading the whole
    // page (which is what manually hitting F5 a few times was really doing).
    function showDebridgeRetryButton() {
      const container = document.getElementById("debridge-widget");
      if (!container) return;
      container.innerHTML = `
        <div class="debridge-status">
          <p class="debridge-status-text">The bridge widget couldn't load — this is a temporary issue on deBridge's side, not yours.</p>
          <button type="button" id="debridge-manual-retry" class="wallet-cta-btn">Retry bridge</button>
        </div>`;
      const btn = document.getElementById("debridge-manual-retry");
      if (btn) {
        btn.addEventListener("click", () => {
          container.innerHTML = "";
          initDebridge(1);
        });
      }
    }

    async function mountDebridgeWidget() {
      const container = document.getElementById("debridge-widget");
      if (container) container.innerHTML = ""; // clear any leftover partial mount from a prior failed attempt
      debridgeResourceErrorDetected = false; // reset before this attempt so stale flags from a prior attempt don't leak in

      const widget = await window.deBridge.widget({
        element: "debridge-widget",
        v: "1",
        mode: "deswap",
        width: "100%",
        height: "740",
        inputChain: 7565164, // Solana
        outputChain: 1,      // Ethereum (user can change inside the widget)
        lang: "en",
        theme: "dark",
        styles: btoa(JSON.stringify({
          appBackground: "#141028",
          appAccentBg: "#0d0b1e",
          primary: "#c7f284",
          secondary: "#9b8cff",
          borderRadius: 16,
          fontColor: "#e8f9ff",
          fontColorAccent: "#c7f284",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        })),
      });

      // Affiliate fee: 0.3% on both the Solana and EVM side. Solana fees
      // accrue on-chain and must be claimed manually (withdrawAffiliateFee);
      // EVM fees are transferred automatically to the recipient when a
      // solver claims/unlocks the order.
      widget.setAffiliateFee({
        solana: {
          affiliateFeePercent: "0.3",
          affiliateFeeRecipient: "3YpVADrndNQaNcMT1yNg8E9KjvSjmPUwtdrnHGmWh1sm",
        },
        evm: {
          affiliateFeePercent: "0.3",
          affiliateFeeRecipient: "0x57F2cbc4b13727652735F0Bc7854BBe597dB1FF3",
        },
      });

      // widget() resolving doesn't guarantee a complete render — if the CDN
      // served a mismatched chunk the widget can come back "empty" or
      // partial with no exception at all. Treat that as a failure so
      // initDebridge()'s existing retry/reload logic kicks in. This checks
      // both signals: the outer iframe collapsing (debridgeLooksHealthy)
      // and internal chunk 404s that leave the iframe at full height but
      // missing pieces (debridgeResourceErrorDetected).
      const healthy = await waitAndCheckHealth(DEBRIDGE_HEALTH_CHECK_DELAY_MS);
      if (!healthy || debridgeResourceErrorDetected) {
        throw new Error(
          debridgeResourceErrorDetected
            ? "deBridge widget mounted but one or more internal resources 404'd (stale CDN chunk)"
            : "deBridge widget mounted incompletely (no full-height iframe found after render window)"
        );
      }
    }

    async function initDebridge(attempt = 1) {
      showDebridgeLoadingState(attempt);
      try {
        if (!window.deBridge) {
          throw new Error("window.deBridge not present yet");
        }
        await mountDebridgeWidget();
        if (attempt > 1) {
          console.info(`deBridge widget mounted after ${attempt} attempts.`);
        }
      } catch (err) {
        console.error(`deBridge widget init failed (attempt ${attempt}/${DEBRIDGE_MAX_ATTEMPTS}):`, err);
        if (attempt >= DEBRIDGE_MAX_ATTEMPTS) {
          console.error("deBridge widget: giving up after max retries. Showing manual retry option.");
          showDebridgeRetryButton();
          return;
        }
        await wait(DEBRIDGE_RETRY_DELAYS_MS[attempt - 1]);
        try {
          await reloadDebridgeScript();
        } catch (loadErr) {
          console.error("deBridge script reload failed:", loadErr);
        }
        return initDebridge(attempt + 1);
      }
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

    window.onload = function () {
      initJupiter();
      fetchPrices();
      initIntervalSwitch();
      initDebridge();
      initMobileWalletCta();
      setInterval(fetchPrices, 30000); // refresh ticker prices every 30 seconds
    };
