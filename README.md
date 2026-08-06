# Swap Solana Tokens

Static, client-side front-end for swapping SPL tokens on Solana. This site has **no backend, no database, and no smart contracts of its own** — every swap is executed through [Jupiter](https://jup.ag)'s official aggregator, the same infrastructure that powers the majority of Solana's DEX volume.

🔗 Live site: https://swapsolanatokens.com

## What this is (and isn't)

- ✅ A focused UI wrapping Jupiter's official `plugin-v1.js` widget and public price API.
- ✅ Fully non-custodial — swaps are signed wallet-to-wallet through Jupiter's audited contracts. This site never has access to private keys.
- ❌ Not an official Jupiter product, and not affiliated with, endorsed by, or operated by Jupiter Exchange.
- ❌ No custom smart contracts. No token of its own. No order book.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no server.

| File | Purpose |
|---|---|
| `index.html` | The entire site — markup, styles, and logic in one file |
| `.htaccess` | Apache config for the DonWeb hosting environment (forces HTTPS, sets security headers) |
| `vercel.json` | Equivalent security headers for a Vercel deployment |
| `.gitignore` | Standard ignores |

## How the swap works

1. The page loads Jupiter's official plugin script (`https://plugin.jup.ag/plugin-v1.js`).
2. `window.Jupiter.init()` mounts the swap widget, targeting Jupiter's public Swap API — see the [official docs](https://station.jup.ag/docs/v6/swap-api).
3. Quotes and routes come directly from Jupiter's aggregator, which routes through Jupiter's on-chain program:
   - `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` — verify live on [Solscan](https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4) or [Solana Explorer](https://explorer.solana.com/address/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4).
4. A 0.5% referral fee (Jupiter's platform minimum) is baked into the quote via `referralAccount` / `referralFee` in the widget config — visible in plain text in `index.html`, nothing hidden.
5. Live token prices (the scrolling ticker) come from Jupiter's public Price API (`lite-api.jup.ag/price/v3`).
6. The price chart is Birdeye's public, embeddable `tv-widget` iframe — informational only, sandboxed, no wallet access.

Because addresses and API versions can change as Jupiter ships upgrades, this README intentionally links to Jupiter's own documentation rather than duplicating values that could go stale. Always cross-check against the official links above.

## Security

- Content-Security-Policy is enforced via a real HTTP response header (`vercel.json` on Vercel, `.htaccess` on DonWeb) — not a `<meta>` tag, since directives like `frame-ancestors` only take effect from an HTTP header.
- `style-src` intentionally uses `'unsafe-inline'` rather than a SHA-256 hash. The Jupiter plugin widget injects its own styles at runtime (CSS-in-JS with non-deterministic content), which can't be pinned to a static hash — a hash-only policy silently breaks the widget's styling in modern browsers, since a hash-source present in a directive causes browsers to ignore `'unsafe-inline'` in that same directive. This is a known, accepted trade-off for embedding this specific third-party widget.
- No inline event handlers reaching outside the sandboxed chart iframe.
- No third-party analytics or trackers.
- Full audit history (SSL Labs, Pentest-Tools, VirusTotal, Security Headers, Mozilla HTTP Observatory) linked from the site's Security Audits section.

Found an issue? Open an issue on this repo or contact support@swapsolanatokens.com.

## License

Copyright © 2026 Swap Solana Tokens. Not affiliated with Jupiter Exchange.
