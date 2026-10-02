# Swap Solana Tokens

Static, client-side front-end for swapping SPL tokens on Solana and bridging assets in from other chains. This site has **no backend, no database, and no smart contracts of its own** — swaps run through [Jupiter](https://jup.ag)'s official aggregator, and cross-chain bridging runs through [Mayan](https://mayan.finance)'s official widget.

🔗 Live site: https://swapsolanatokens.com

## What this is (and isn't)

- ✅ A focused UI wrapping Jupiter's official `plugin-v1.js` swap widget, Jupiter's public price API, and Mayan's official bridge widget.
- ✅ Fully non-custodial — swaps and bridges are signed in your own wallet through Jupiter's and Mayan's own infrastructure. This site never has access to private keys.
- ❌ Not an official Jupiter or Mayan product, and not affiliated with, endorsed by, or operated by Jupiter Exchange or Mayan.
- ❌ No custom smart contracts. No token of its own. No order book.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no server.

| File | Purpose |
|---|---|
| `index.html` | Markup and styles |
| `app.js` | All the logic — Jupiter and Mayan widget setup, price ticker, price chart, top movers list, mobile wallet shortcuts. Referral settings live here, in plain text |
| `manifest.webmanifest` | PWA manifest (name, colors and icons for "Add to Home Screen") |
| `.well-known/security.txt` | Where to report a security issue ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)) |
| `.htaccess` | Apache config for the DonWeb hosting environment (forces HTTPS, sets security headers) |
| `vercel.json` | Equivalent security headers for a Vercel deployment |
| `.gitignore` | Standard ignores |

The logo, favicons and PWA icons are plain image files served alongside these.

## How the swap works

1. The page loads Jupiter's official plugin script (`https://plugin.jup.ag/plugin-v1.js`).
2. `window.Jupiter.init()` (in `app.js`) mounts the swap widget, targeting Jupiter's public Swap API — see the [official docs](https://dev.jup.ag/docs/swap).
3. Quotes and routes come directly from Jupiter's aggregator, which routes through Jupiter's on-chain program:
   - `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` — verify live on [Solscan](https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4) or [Solana Explorer](https://explorer.solana.com/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4).
4. A 0.5% referral fee (Jupiter's platform minimum) is baked into the quote via `referralAccount` / `referralFee` in the widget config — visible in plain text in `app.js`, nothing hidden.
5. Live token prices (the scrolling ticker) come from Jupiter's public Price API (`lite-api.jup.ag/price/v3`).
6. The price chart is Birdeye's public, embeddable `tv-widget` iframe — informational only, sandboxed, no wallet access.

## How the bridge works

1. The page loads Mayan's official widget script from `cdn.mayan.finance`, pinned to an exact version and protected with a Subresource Integrity (SRI) hash, so the browser refuses the file if its contents ever change.
2. `MayanSwap.init()` (in `app.js`) mounts the widget directly into the page — there is no cross-origin iframe. If the script fails to load or the mount fails, the panel shows a retry button instead of failing silently.
3. Routes, quotes and execution come from Mayan. Bridge transactions are signed in your own wallet, on the chain you are bridging from.
4. This site sets a 0.30% referral fee on the Mayan widget (`referrerBps: 30`) through Mayan's own referrer mechanism. It is separate from, and in addition to, Jupiter's 0.5% swap fee above. The referrer addresses and the bps value are in plain text in `app.js`, nothing hidden.

## How the Top movers list works

0. The panel is shown only on wide desktop screens (1360px and up); narrower screens hide it and never request the data.
1. On load, `app.js` asks Jupiter's public Tokens API (`api.jup.ag/tokens/v2/toptraded/24h`) for the 100 most-traded Solana tokens of the last 24 hours. It runs in the visitor's browser: no backend, no API key, no scheduled job and no credentials that could upload files to the host.
2. Tokens are filtered in plain text in `app.js` (constants at the top of the "Top movers" block): liquidity above $1M, classic SPL Token program only (Token-2022 is excluded because of its transfer-fee, hook and permanent-delegate extensions), no mint authority (supply can't be increased) and a Jupiter-verified listing.
3. The first 50 tokens that pass, ordered by traded volume, form the universe. From it, the 5 biggest gainers and 5 biggest losers by 24h price change are shown. Jupiter's API only exposes 5m / 1h / 6h / 24h windows, so this is a 24-hour ranking.
4. The result is cached in `sessionStorage` for 5 minutes and refreshed every 10 minutes while the page is open. Token fields are rendered with `textContent` only.
5. The Trade button reloads the swap widget with that token as the output. Nothing is executed until you review the quote and sign in your own wallet.

The filters rely on Jupiter's own data, not on an independent on-chain check, and they reduce risk rather than remove it.

Because addresses, versions and API details can change as Jupiter and Mayan ship upgrades, this README intentionally links to their own documentation rather than duplicating values that could go stale. Always cross-check against the official sources: [Jupiter docs](https://dev.jup.ag/) and [Mayan](https://mayan.finance).

## Security

- **Headers:** Content-Security-Policy and the other security headers are enforced via real HTTP response headers (`vercel.json` on Vercel, `.htaccess` on DonWeb) — not a `<meta>` tag, since directives like `frame-ancestors` only take effect from an HTTP header. Both files are kept identical.
- **Scripts:** no inline scripts and no inline event handlers; `script-src` allows only this site, Jupiter's domains and Mayan's CDN, and Mayan's script is additionally pinned to an exact version with an SRI hash. Jupiter's `plugin-v1.js` is a rolling file maintained by Jupiter, so it is loaded without SRI (a hash would break the widget on Jupiter's next release) — a known trade-off of embedding it.
- **Styles:** `style-src` intentionally uses `'unsafe-inline'` rather than a SHA-256 hash. The Jupiter plugin widget injects its own styles at runtime (CSS-in-JS with non-deterministic content), which can't be pinned to a static hash — a hash-only policy silently breaks the widget's styling in modern browsers, since a hash-source present in a directive causes browsers to ignore `'unsafe-inline'` in that same directive. This is a known, accepted trade-off for embedding this specific third-party widget.
- **Network:** `connect-src` is intentionally broad (`https:` and `wss:`), because the swap and bridge widgets talk to many RPC and API hosts. Narrowing it to an allowlist is possible, but has to be validated against the real hosts both widgets use, or a wallet flow could break.
- **Permissions-Policy:** geolocation, microphone, camera, payment, motion sensors, MIDI and screen capture are denied. USB, HID, Bluetooth and Serial are deliberately left alone so hardware wallets keep working.
- **Untrusted input:** token addresses coming from the swap widget are validated (base58 format) before they are used to build the chart URL, and prices from the API are rendered only as formatted numbers. The Birdeye chart iframe is sandboxed and pinned by `frame-src`.
- **Third-party requests:** the page loads Jupiter's plugin, price API and Tokens API (top movers), Mayan's widget, and Birdeye's chart, plus a few icons and badges (Google's favicon service, Jupiter's static icon, a Product Hunt badge). There are no third-party analytics or trackers.
- **Scan grades:** the badges in the site's Security Audits section (SSL Labs, VirusTotal, Security Headers, Mozilla HTTP Observatory) are point-in-time scans of this site's configuration, not audits of its code. Re-run them from the linked reports for current results. The audited, battle-tested code is Jupiter's and Mayan's; this site has no smart contracts of its own to audit.

Found an issue? Open an issue on this repo or contact support@swapsolanatokens.com — see `.well-known/security.txt`.

## License

Copyright © 2026 Swap Solana Tokens. Not affiliated with Jupiter Exchange or Mayan.
