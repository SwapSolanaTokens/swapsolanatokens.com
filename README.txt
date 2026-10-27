# Swap Solana Tokens (swapsolanatokens.com)

A fast, 100% non-custodial, client-side trading interface for the Solana ecosystem. Powered by Jupiter Aggregator for SPL token swaps and Mayan Finance for cross-chain bridging directly into Solana.

Website: https://swapsolanatokens.com

---

## Key Features

### 1. Instant Swaps (Jupiter Aggregator)
- Wallet-to-wallet execution through Jupiter's routing engine.
- Auto-pair protection: automatically switches input to USDC when SOL is selected to prevent identical pairs.
- Integrated official referral configuration (0.50% fee).

### 2. Inbound Cross-Chain Bridge (Mayan Finance)
- Move assets from Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche, Base and other supported chains into Solana.
- Inbound only: the bridge on this site brings assets into Solana, it does not send them out.
- Transparent fee structure (0.30% bridge referral fee included in quoted rates).
- The Mayan script is pinned to a fixed version with a Subresource Integrity (SRI) hash.

### 3. Real-Time Price Charts (Birdeye)
- Public Birdeye candlestick chart widget embedded in a sandboxed frame.
- Strict Base58 mint validation before loading charts.
- Supports 15m, 1H, 4H and 1D intervals, updating automatically as you select tokens.
- The shortened mint address is always shown next to the token symbol, because symbols can be copied by anyone.

### 4. Token Inspector & Security Checks
- Live Token Inspector: directly under the chart, with one-click links to RugCheck, Solscan and DexScreener, plus a copy-address button.
- RugCheck Quick Audit card: paste any Solana mint address to open its RugCheck report.
- Token warnings: any token loaded from search, Top movers, Top 100 or a direct link is checked against Jupiter's token index. Unverified tokens and tokens with an active mint or freeze authority show a warning above the swap.
- Top movers: only Jupiter-verified tokens with more than $200K USD of liquidity.

### 5. Solana Top 100 Directory
- Full-width directory of the most traded Solana tokens of the last 24 hours.
- Only Jupiter-verified tokens with more than $200k USD of liquidity are listed, so fewer than 100 rows may appear.
- Category filters: All, DeFi, LSTs / Staking, Memecoins, Stablecoins, Stocks, RWA, PoW / PoS, Privacy, Farming and Gold / Silver. Categories are matched on the exact ticker and are only a convenience label, not a safety signal.
- Instant search filter and one-click "Swap" buttons that load pairs directly into the interface.

### 6. Portfolio
- Tap the star on any token (search results, Top 100 rows or the Token Inspector) to save it. Up to 20 tokens.
- Stored only in this browser (localStorage, key swap-watchlist-v1). Nothing is sent to any server and there are no accounts.
- Saved tokens appear in the Portfolio tab of the Tokens list (to the right of Gems, also linked from the top bar) with live price, 24h change, volume and liquidity; the Swap button on each row loads it in the swap and the chart.

### 7. Solana Protocols Directory
- Lists Solana protocols ranked by TVL, using DeFiLlama's public API (https://api.llama.fi/protocols).
- Loaded lazily when the section scrolls into view and cached for 30 minutes in sessionStorage.
- Centralized exchanges and chains are excluded. The 7d change is shown only for protocols that run on Solana alone.
- Category tabs, text filter and a "Show more" button. Third-party data is rendered with textContent and links are validated as https.

### 8. Learn & Safety Hub
- learn.html: a static, plain-English guide to token safety (mint addresses, mint/freeze authority, liquidity, slippage, scams, wallet hygiene) with a FAQ and glossary.

### 9. Deep Linking
- Pre-load pairs directly via URL: https://swapsolanatokens.com/?to=<mint_address>
- The mint is validated before use and the token is checked against Jupiter's index.

### 10. Airdrop Checker
- Card under RugCheck in the swap column. The visitor pastes a wallet ADDRESS (public information) and, if it is valid, a link appears that opens Jupiter's own Airdrops page for that wallet: https://jup.ag/portfolio/<wallet>/airdrop
- No wallet connection, no signature, no request made by this site, nothing stored. The address only leaves the browser when the visitor clicks the link, and it goes to jup.ag. Eligibility is shown by Jupiter, not by this site.
- The address is validated by decoding base58 and requiring exactly 32 bytes (not only length and character set). Token mints the page already knows (SOL, USDC, tokens loaded in the swap, Top 100, Portfolio) are rejected with a message, and .sol names are not supported.
- The URL is built from a fixed host plus the validated, URL-encoded address, and opens with rel="noopener noreferrer". It is a plain link (no form), so the CSP (form-action 'self', connect-src) needs no change.
- On wide screens the grid gives the Trending and Top volume panels the remaining height, so they end on the same line as the last card of the swap column.
- If Jupiter ever changes the /airdrop route, update JUPITER_PORTFOLIO_URL / airdropUrlFor() in app.js.

---

## Non-Custodial Architecture

- Zero Server Custody: this site has no backend database, no user accounts, and no access to private keys.
- Client-Side Execution: all interactions occur directly between your browser, your connected wallet, and audited smart contracts on-chain.
- Hardened delivery: strict Content-Security-Policy, HSTS, and the other security headers are sent from the web server (.htaccess). Check the current grades yourself on SSL Labs, Security Headers, Mozilla Observatory and VirusTotal (links on the "How it works" page).

---

## Repository Structure

.
├── index.html                  # Main application: Swap, Bridge, Chart, Tokens (Top 100), Portfolio, Protocols, Airdrop Checker
├── app.js                      # Client-side logic for Jupiter, Mayan, Birdeye, Top 100, Portfolio, Protocols & Airdrop Checker
├── nav-search.js               # Moves the token search box between the top bar (desktop) and the page (phones)
├── shared.css                  # Shared dark theme styles, navigation, footer
├── learn.html                  # Token safety and basics hub
├── how-it-works.html           # Platform architecture, protocol FAQ, fee breakdown, audits
├── swap-and-bridge-guide.html  # Step-by-step user guide for swapping and bridging
├── manifest.webmanifest        # PWA manifest
├── security.txt                # Security contact (served from /.well-known/security.txt)
├── robots.txt                  # Crawler rules
├── sitemap.xml                 # Sitemap
├── .htaccess                   # Web server headers, HTTPS redirect & caching (DonWeb / Apache)
├── vercel.json                 # Edge security headers (Vercel previews)
└── README.md                   # Project documentation

---

## Local Development

This is a pure static frontend with zero build steps or runtime dependencies:

1. Clone the repository:
   git clone https://github.com/SwapSolanaTokens/swapsolanatokens.com.git

2. Serve locally with any static web server:
   npx serve .

---

## Disclaimer

Swap Solana Tokens is an independent user interface. We do not operate an exchange, order book, or bridge protocol of our own. All routing, liquidity, and transactions are processed directly by Jupiter Exchange and Mayan Finance smart contracts. Always verify token mint addresses independently before confirming transactions.
