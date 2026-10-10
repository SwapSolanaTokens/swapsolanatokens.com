# Swap Solana Tokens (swapsolanatokens.com)

A fast, 100% non-custodial, client-side trading interface for the Solana ecosystem. Powered by Jupiter Aggregator for SPL token swaps and Mayan Finance for cross-chain bridging directly into Solana.

Website: https://swapsolanatokens.com

---

## Key Features

### 1. Instant Swaps (Jupiter Aggregator)
- Native wallet-to-wallet execution via Jupiter's audited v6 routing engine.
- Auto-pair protection: automatically switches input to USDC when SOL is selected to prevent identical pairs.
- Integrated official referral configuration (0.50% fee).

### 2. Inbound Cross-Chain Bridge (Mayan Finance)
- Move assets from Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche, and Base into Solana.
- Dedicated inbound architecture: routes assets into Solana smoothly with pre-configured ATA token support.
- Transparent fee structure (0.30% bridge referral fee included in quoted rates).

### 3. Real-Time Price Charts (Birdeye)
- Public Birdeye candlestick chart widget embedded in a sandboxed, read-only frame.
- Strict Base58 mint validation before loading charts.
- Supports 15m, 1H, 4H, and 1D intervals, updating automatically as you select tokens.

### 4. Token Inspector & Security Audits
- Live Token Inspector: Directly under the chart, tracks active tokens with one-click verification links on RugCheck, Solscan, and DexScreener.
- RugCheck Quick Audit Card: Paste any Solana mint address for instant client-side validation and audit reports.
- Top Movers: Filters verified listings and high liquidity (> $1M USD) for trending and top-volume SPL tokens.

### 5. Solana Top 100 Directory
- Full-width interactive directory of Solana's top 100 traded tokens.
- Category filters: All, DeFi, LSTs / Staking, and Memecoins.
- Instant search filter and one-click "Swap" buttons that load pairs directly into the interface.

### 6. Deep Linking
- Pre-load pairs directly via URL: https://swapsolanatokens.com/?to=<mint_address>

---

## Non-Custodial Architecture

- Zero Server Custody: This site has no backend database, no user accounts, and no access to private keys.
- Client-Side Execution: All interactions occur directly between your browser, your connected wallet, and audited smart contracts on-chain.
- Verified Standards: Scanned clean (0/90 on VirusTotal) and configured to top-tier SSL/TLS and security header standards (A+ ratings on public audits).

---

## Repository Structure

.
├── index.html                  # Main application: Swap, Bridge, Chart, Top 100 directory
├── app.js                      # Client-side logic for Jupiter, Mayan, Birdeye & Top 100
├── shared.css                  # Shared dark theme styles, mobile navigation, layout
├── how-it-works.html           # Platform architecture, protocol FAQ, fee breakdown, audits
├── swap-and-bridge-guide.html  # Step-by-step user guide for swapping and bridging
├── manifest.webmanifest        # PWA manifest
├── .htaccess                   # Web server headers & caching configuration
├── vercel.json                 # Edge routing and security headers
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