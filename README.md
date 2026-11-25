# RoFun
RoFun is a playable game launchpad prototype for the BNB Chain hackathon. Relic Vale demonstrates how a player can earn a unique item, sell it in RELIC, and verify delivery in the buyer’s portfolio.

## Run locally

Use Node.js 22.13 or newer with built-in SQLite support.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4199
```

Open http://127.0.0.1:4199/#Discover. The Vite development server serves both the UI and the market API. Local market data lives in memory until the server restarts. Each browser profile gets its own preview identity. Use two browser profiles for separate traders in the shared market. The hosted worker requires an authenticated user header from its hosting gateway and a D1 binding named DB with the SQL migrations from drizzle/ applied in order.

[Watch the recorded desktop trade and portfolio verification](docs/relic-trade-demo.mp4).

## Present the trade

1. On Discover, choose **Start demo**. The private rehearsal has a seller and two buyer wallets with 2 virtual RELIC each.
2. Choose **Play the vault**, uncover three matching pairs in seven turns, then list the earned relic for 1 RELIC. **Use sample listing** skips the game.
3. Request as both buyers and approve as seller. Review the terms for three seconds and confirm both purchases. The server settles a single sale.
4. Check the receipt. The winner pays 1 RELIC, the seller receives 0.99, RoFun receives 0.005, and 0.005 leaves the virtual supply. The second buyer keeps 2 RELIC. Open **View item in Portfolio** to see the winner, valuation basis and BNB equivalent.
5. **Restart demo** resets only that private rehearsal. Discover → Play Relic Vale opens the independent shared market and the manual role-switching room.

The sale is journaled on the server. The optional BNB Smart Chain Testnet action records the receipt ID in a zero-value self-transaction approved by the presenter’s wallet. The explorer link comes from the wallet-submitted hash. Item ownership, fees and burns settle in the demo ledger. Local BNB conversions use simulated prices. The burn reduces the demo supply and makes no prediction about price.

## Proof of Play and migration

Demo Mode → Start guided demo leads through the Arena, cosmetic store, treasury and simulated migration. Qualifying Arena sessions require 30 active seconds, 20 movement samples and three coins. The local event log shows the evidence. Synthetic baseline and attack controls support the graduation comparison. Private Relic Vale rehearsal trades are excluded. The proposed OpenFour integration would enforce the eligibility decision in a Migrate module. No OpenFour contracts are deployed by this app.

## Verify a build

```sh
npm run build
npm run test:domain
npm run test:market
npx playwright install chromium --only-shell
```

With the local dev server running, run the following in a second terminal.

```sh
export ROFUN_URL=http://127.0.0.1:4199
npm run test:trade
node tests/relic-browser.mjs
npm run test:journey
```

The trade test runs desktop and mobile journeys, checks the two purchase responses and verifies the buyer’s item after reload. Set ROFUN_VIDEO to an output directory to record the desktop rehearsal. The API tests exercise fee allocation, authorization, review delay, duplicate confirmations and room isolation. Production build output includes client assets and the worker in dist/.
