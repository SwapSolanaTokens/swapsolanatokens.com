# Swap Solana Tokens

Static, client-side front-end for swapping SPL tokens on Solana and bridging assets in from other chains. This site has **no backend, no database, and no smart contracts of its own** — swaps run through [Jupiter](https://jup.ag)'s official aggregator, and cross-chain bridging runs through [Mayan](https://mayan.finance)'s official widget.

🔗 Live site: https://swapsolanatokens.com

## What this is (and isn't)

- ✅ A focused UI wrapping Jupiter's official `plugin-v1.js` swap widget, Jupiter's public Tokens API (token search and Top movers), and Mayan's official bridge widget.
- ✅ Fully non-custodial — swaps and bridges are signed in your own wallet through Jupiter's and Mayan's own infrastructure. This site never has access to private keys.
- ❌ Not an official Jupiter or Mayan product, and not affiliated with, endorsed by, or operated by Jupiter Exchange or Mayan.
- ❌ No custom smart contracts. No token of its own. No order book.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no server. Every page lives in the site root (nothing in subfolders), so the whole site can be uploaded as-is to the DonWeb root.

| File | Purpose |
|---|---|
| `index.html` | Home page: only the tools — Swap / Bridge tabs, token search, price chart and Top movers. Markup and page styles |
| `how-it-works.html` | Everything that used to sit under the tools on the home page: overview, About, How it works, FAQ, Contact & reviews, Security audits badges, Technical info and Legal. Holds the `FAQPage` structured data |
| `swap-and-bridge-guide.html` | Step-by-step guide to swapping and bridging |
| `shared.css` | Styles shared by the three pages: the top navigation bar and the footer. Change the footer here and it changes everywhere |
| `app.js` | All the logic — Jupiter and Mayan widget setup, token search, `?to=` links, price chart, top movers list (Trending and Top volume tabs), mobile wallet shortcuts. Referral settings live here, in plain text. Only loaded by `index.html` |
| `manifest.webmanifest` | PWA manifest (name, colors and icons for "Add to Home Screen") |
| `sitemap.xml`, `robots.txt` | Search engine files (the sitemap lists all three pages) |
| `.well-known/security.txt` | Where to report a security issue ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)) |
| `.htaccess` | Apache config for the DonWeb hosting environment (forces HTTPS, sets security headers) |
| `vercel.json` | Equivalent security headers for a Vercel deployment |
| `.gitignore` | Standard ignores |

The logo, favicons and PWA icons are plain image files served alongside these.

### Pages and shared footer

- The home page (`/`) is only the tools. Its top navigation links to the tools on the same page (Swap, Bridge, Chart) and to `how-it-works.html` (How it works, Contact).
- `how-it-works.html` has the same navigation bar; its Swap, Bridge and Chart links go back to `/`, `/#bridge-section` and `/#chart-section`.
- The three pages use the exact same footer markup, styled from `shared.css`: brand, "Powered by Jupiter & Mayan", links to How it works and the guide, the non-affiliation notice, contact email and social links. When the footer changes, update the markup in all three HTML files and the CSS in `shared.css`.
- `shared.css` is requested as `shared.css?v=1`. Bump the number in the three pages whenever it changes, so browsers and Cloudflare fetch the new file.

## How the swap works

1. The page loads Jupiter's official plugin script (`https://plugin.jup.ag/plugin-v1.js`).
2. `window.Jupiter.init()` (in `app.js`) mounts the swap widget, targeting Jupiter's public Swap API — see the [official docs](https://dev.jup.ag/docs/swap). It also sets Jupiter's documented `branding` option (`logoUri`, plus a blank `name` so only the icon shows), so the widget header shows this site's logo instead of Jupiter's. That option is cosmetic only: it does not change routing, quotes, fees or the signing flow, and the site keeps saying "Powered by Jupiter" in the footer and on the How it works page.
3. Quotes and routes come directly from Jupiter's aggregator, which routes through Jupiter's on-chain program:
   - `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` — verify live on [Solscan](https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4) or [Solana Explorer](https://explorer.solana.com/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4).
4. A 0.5% referral fee (Jupiter's platform minimum) is baked into the quote via `referralAccount` / `referralFee` in the widget config — visible in plain text in `app.js`, nothing hidden.
5. Every way of picking a token (search box, Top movers, `?to=` links) goes through one function, `loadToken()` in `app.js`, which re-initializes the widget with that token as the output. If SOL itself is picked as the output (for example from the Top volume tab), the widget pays with USDC so input and output are never the same token.
6. The price chart is Birdeye's public, embeddable `tv-widget` iframe — informational only, sandboxed, no wallet access. It follows the token loaded in the swap.

## How the token search works

1. The search box above the swap accepts a name, a symbol or a mint address. It queries Jupiter's public Tokens API (`api.jup.ag/tokens/v2/search`) from the visitor's browser, with a 300 ms debounce. No backend, no API key so far (re-check this if the endpoint ever starts returning 401).
2. A well-formed mint (base58, 32–44 characters) loads straight away and is then looked up, so the page can show its symbol and whether Jupiter lists it as verified. A name or symbol shows a short list instead (up to 8 results, verified listings first, because name searches return many clones of the same ticker).
3. Each result shows the icon, a shortened mint, liquidity and a badge: "Verified by Jupiter" or "Unverified". Verified is Jupiter's listing flag, not a safety guarantee, and the UI never says "safe". Results are also tagged when the mint authority or freeze authority is still active, when the token uses Token-2022, and with Jupiter's organic score when available.
4. Unverified tokens can still be loaded. They get a warning line under the search box asking the visitor to check the mint address first.
5. Everything returned by the API is treated as untrusted: it is reduced to plain strings, numbers and booleans, rendered with `textContent` only, icon URLs must be `https`, and the mint is validated before it reaches the chart URL.

## Direct links

`https://swapsolanatokens.com/?to=<mint>` opens the swap and the chart with that token as the output, and shows the same verified / unverified notice as the search box. The value is only used if it is a well-formed mint; anything else is ignored and the page loads as usual. Nothing is executed until the visitor reviews the quote and signs in their own wallet.

## How the bridge works

1. The page loads Mayan's official widget script from `cdn.mayan.finance`, pinned to an exact version and protected with a Subresource Integrity (SRI) hash, so the browser refuses the file if its contents ever change.
2. `MayanSwap.init()` (in `app.js`) mounts the widget directly into the page — there is no cross-origin iframe. If the script fails to load or the mount fails, the panel shows a retry button instead of failing silently.
3. Routes, quotes and execution come from Mayan. Bridge transactions are signed in your own wallet, on the chain you are bridging from.
4. The bridge only goes **into** Solana. The widget is configured with Mayan's own `sourceChains` option (`MAYAN_SOURCE_CHAINS` in `app.js`), a list of the chains you can send from; Solana is deliberately not in it. Destinations are not restricted, and Solana stays the default destination. The names are Mayan's chain identifiers (`nameId` in [Mayan's chain config](https://sia.mayan.finance/v10/init)). It is an allowlist: a chain Mayan adds later will not appear as a source until it is added to that constant.
5. This site sets a 0.30% referral fee on the Mayan widget (`referrerBps: 30`) through Mayan's own referrer mechanism. It is separate from, and in addition to, Jupiter's 0.5% swap fee above. The referrer addresses and the bps value are in plain text in `app.js`, nothing hidden.

## How the Top movers panel works

The panel has two tabs, **Trending** and **Top volume**, built from one request.

0. The panel is shown on every screen size: to the right of the swap on wide desktops (1360px and up), below the swap on mid-width screens (641px to 1359px), and below the chart on phones.
1. On load, `app.js` asks Jupiter's public Tokens API (`api.jup.ag/tokens/v2/toptraded/24h`) for the 100 most-traded Solana tokens of the last 24 hours. It runs in the visitor's browser: no backend, no API key, no scheduled job and no credentials that could upload files to the host. Both tabs are built from that single response, so the second tab adds no extra request.
2. Filters live in plain text in `app.js` (constants at the top of the "Top movers" block).

   **Trending** (`passesMoverFilters`): liquidity above $1M, classic SPL Token program only (Token-2022 is excluded because of its transfer-fee, hook and permanent-delegate extensions), no mint authority (supply can't be increased) and a Jupiter-verified listing. SOL is left out.

   **Top volume** (`passesVolumeFilters`): liquidity above $1M and a Jupiter-verified listing. It is deliberately lighter: it is an activity ranking, and SOL and the large stablecoins (which have a mint authority) are what normally lead it, so Token-2022 and mint-authority tokens are not excluded here.
3. **Trending:** the first 50 tokens that pass, ordered by traded volume, form the universe. From it, the 5 biggest gainers and 5 biggest losers by 24h price change are shown. Jupiter's API only exposes 5m / 1h / 6h / 24h windows, so this is a 24-hour ranking.
4. **Top volume:** the tokens that pass are sorted by 24h traded volume (`stats24h.buyVolume + stats24h.sellVolume`, as reported by Jupiter) and the top 10 are shown (`VOLUME_LIST_SIZE`). Each row has the same layout as Trending, with the 24h volume on the right instead of the price change. High volume means a token is actively traded, not that it is good or safe, and the panel and FAQ say so.
5. The result for both tabs is cached together in `sessionStorage` under `movers-v3` for 5 minutes and refreshed every 10 minutes while the page is open. Token fields are rendered with `textContent` only. Bump the cache key whenever the cached shape changes.
6. Tapping a row reloads the swap widget with that token as the output. Nothing is executed until you review the quote and sign in your own wallet.

The filters rely on Jupiter's own data, not on an independent on-chain check, and they reduce risk rather than remove it.

Because addresses, versions and API details can change as Jupiter and Mayan ship upgrades, this README intentionally links to their own documentation rather than duplicating values that could go stale. Always cross-check against the official sources: [Jupiter docs](https://dev.jup.ag/) and [Mayan](https://mayan.finance).

## Security

- **Headers:** Content-Security-Policy and the other security headers are enforced via real HTTP response headers (`vercel.json` on Vercel, `.htaccess` on DonWeb) — not a `<meta>` tag, since directives like `frame-ancestors` only take effect from an HTTP header. Both files are kept identical. They apply to every page, so `how-it-works.html`, the guide and `shared.css` need no extra configuration.
- **Scripts:** no inline scripts and no inline event handlers; `script-src` allows only this site, Jupiter's domains and Mayan's CDN, and Mayan's script is additionally pinned to an exact version with an SRI hash. Jupiter's `plugin-v1.js` is a rolling file maintained by Jupiter, so it is loaded without SRI (a hash would break the widget on Jupiter's next release) — a known trade-off of embedding it. Only `index.html` loads third-party scripts; `how-it-works.html` and the guide load none (their JSON-LD blocks are data, not executable code).
- **Styles:** `style-src` intentionally uses `'unsafe-inline'` rather than a SHA-256 hash. The Jupiter plugin widget injects its own styles at runtime (CSS-in-JS with non-deterministic content), which can't be pinned to a static hash — a hash-only policy silently breaks the widget's styling in modern browsers, since a hash-source present in a directive causes browsers to ignore `'unsafe-inline'` in that same directive. This is a known, accepted trade-off for embedding this specific third-party widget. `shared.css` is served from this same origin, which `style-src 'self'` already allows.
- **Network:** `connect-src` is intentionally broad (`https:` and `wss:`), because the swap and bridge widgets talk to many RPC and API hosts. Narrowing it to an allowlist is possible, but has to be validated against the real hosts both widgets use, or a wallet flow could break. The token search and Top movers (both tabs) need no CSP change: they use `connect-src` for the API and `img-src https:` for token icons.
- **Permissions-Policy:** geolocation, microphone, camera, payment, motion sensors, MIDI and screen capture are denied. USB, HID, Bluetooth and Serial are deliberately left alone so hardware wallets keep working.
- **Untrusted input:** token addresses coming from the swap widget, the search box, the `?to=` parameter or the APIs are validated (base58 format) before they are used to build the chart URL. API fields are rendered only through `textContent` and formatted numbers, never as HTML. The Birdeye chart iframe is sandboxed and pinned by `frame-src`.
- **Widget customization:** the only changes made to the widgets are options their own documentation provides (Jupiter's `branding`, Mayan's `sourceChains`). Nothing alters how either widget quotes, routes, signs or sends a transaction, and no CSP directive was loosened for them.
- **Third-party requests:** the home page loads Jupiter's plugin and Tokens API (token search and top movers), Mayan's widget, and Birdeye's chart, plus a few icons (Google's favicon service, Jupiter's static icon, token icons returned by the search). `how-it-works.html` also loads a Product Hunt badge image. There are no third-party analytics or trackers.
- **Scan grades:** the badges in the Security Audits section of `how-it-works.html` (SSL Labs, VirusTotal, Security Headers, Mozilla HTTP Observatory) are point-in-time scans of this site's configuration, not audits of its code. Re-run them from the linked reports for current results. The audited, battle-tested code is Jupiter's and Mayan's; this site has no smart contracts of its own to audit.

## Deploying

There is no build step: upload the files as they are. Everything goes in the site root, with no subfolders besides `.well-known/`.

1. Test on Vercel first (deploys from this repo).
2. Upload the same files to the DonWeb root and to GitHub (there is no automatic sync between them).
3. Purge Cloudflare's cache so the new `shared.css` and pages are served.
4. After adding or renaming a page, update `sitemap.xml`, and resubmit it in Google Search Console and Bing Webmaster Tools.

Found an issue? Open an issue on this repo or contact support@swapsolanatokens.com — see `.well-known/security.txt`.

## License

Copyright © 2026 Swap Solana Tokens. Not affiliated with Jupiter Exchange or Mayan.
