# Swap Solana Tokens

Static, client-side front-end that combines two things onto one page: swapping SPL tokens on Solana, and bridging assets in from other chains. This site has **no backend, no database, and no smart contracts of its own** — every swap runs through [Jupiter](https://jup.ag)'s official aggregator, and every bridge runs through [deBridge](https://debridge.com)'s official cross-chain protocol.

🔗 Live site: https://swapsolanatokens.com

## What this is (and isn't)

- ✅ A Solana swap panel wrapping Jupiter's official `plugin-v1.js` widget and public price API.
- ✅ A cross-chain bridge panel wrapping deBridge's official widget, for moving assets in from Ethereum, BNB Chain, Polygon, Arbitrum and other chains directly into Solana.
- ✅ Fully non-custodial on both sides — swaps and bridges are signed wallet-to-wallet through each protocol's own audited infrastructure. This site never has access to private keys.
- ❌ Not an official Jupiter or deBridge product, and not affiliated with, endorsed by, or operated by either.
- ❌ No custom smart contracts, no token of its own, no order book, no bridge contracts of its own.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no server.

| File | Purpose |
|---|---|
| `index.html` | The entire site — markup, styles, and logic in one file |
| `.htaccess` | Apache config for the DonWeb hosting environment (forces HTTPS, sets security headers) |
| `vercel.json` | Equivalent security headers for a Vercel deployment |
| `.gitignore` | Standard ignores |

## How it works

**Swap (Jupiter)**
1. The page loads Jupiter's official plugin script (`https://plugin.jup.ag/plugin-v1.js`).
2. `window.Jupiter.init()` mounts the swap widget, targeting Jupiter's public Swap API — see the [official docs](https://station.jup.ag/docs/v6/swap-api).
3. Quotes and routes come directly from Jupiter's aggregator, which routes through Jupiter's on-chain program:
   - `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` — verify live on [Solscan](https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4) or [Solana Explorer](https://explorer.solana.com/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4).
4. A 0.5% referral fee (Jupiter's platform minimum) is baked into the quote via `referralAccount` / `referralFee` in the widget config — visible in plain text in `app.js`, nothing hidden.

**Bridge (deBridge)**
1. The page loads deBridge's official widget script (`https://app.debridge.finance/assets/scripts/widget.js`).
2. `window.deBridge.widget()` mounts an independent bridge widget in `deswap` mode, defaulting from Solana to Ethereum (the user can change the destination chain inside the widget).
3. deBridge finds the route and settles the cross-chain transfer through its own non-custodial infrastructure — completely separate from Jupiter's.
4. A 0.3% affiliate fee is baked in on both the Solana and EVM side, via `setAffiliateFee()` in the widget config — visible in plain text in `app.js`.

**Shared / supporting**
- Live token prices (the scrolling ticker) come from Jupiter's public Price API (`lite-api.jup.ag/price/v3`).
- The price chart is Birdeye's public, embeddable `tv-widget` iframe — tracks the token in the Jupiter swap panel only, informational only, sandboxed, no wallet access.

Because addresses and API versions can change as Jupiter or deBridge ship upgrades, this README intentionally links to each protocol's own documentation rather than duplicating values that could go stale.

## Security

- Content-Security-Policy is enforced via a real HTTP response header (`vercel.json` on Vercel, `.htaccess` on DonWeb) — not a `<meta>` tag, since directives like `frame-ancestors` only take effect from an HTTP header.
- `script-src` and `frame-src` explicitly allowlist both Jupiter's and deBridge's domains — no wildcard third-party script execution.
- `style-src` intentionally uses `'unsafe-inline'` rather than a SHA-256 hash. Both the Jupiter and deBridge widgets inject their own styles at runtime (CSS-in-JS with non-deterministic content), which can't be pinned to a static hash — a hash-only policy silently breaks widget styling in modern browsers. This is a known, accepted trade-off for embedding these two third-party widgets.
- No inline event handlers reaching outside the sandboxed chart iframe.
- No third-party analytics or trackers.
- Full audit history (SSL Labs, VirusTotal, Security Headers, Mozilla HTTP Observatory) linked from the site's Security Audits section.

Found an issue? Open an issue on this repo or contact support@swapsolanatokens.com.

## License

Copyright © 2026 Swap Solana Tokens. Not affiliated with Jupiter Exchange or deBridge.change.
