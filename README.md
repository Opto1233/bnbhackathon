# RoFun

RoFun is a browser-local gaming discovery and Proof of Play launchpad for the BNB Chain Hackathon. Run `npm ci` and `npm run dev` for local development. Run `npm run build` to type-check and generate the production site in `dist/`.

## Presenter walkthrough

Open **Demo Mode → Start guided demo**. The guide follows a round from Discover to the Arena, through local verification, the cosmetic store and treasury, and finally to simulated token migration. Allow about a minute for the game itself. Use **Reset demonstration → Confirm reset** for a fresh wallet, inventory, ledger, player identity, leaderboard, sponsor points and sample games.

In the Arena, head right to collect the opening three gold coins. Keep moving around the grid and steer around drones. A run ends after 60 seconds or when all four shields are gone. Either outcome can qualify with 30 active seconds, 20 movement samples and three coins. The game pauses when its tab loses focus. The local leaderboard ranks finished runs by score.

Developer Hub exposes session events, player IDs, scores, qualification, day-seven retention and returning sessions. The same game selector opens the developer earnings ledger and milestone claims. Day-seven retention uses a qualified player's first session and requires a complete observation window. Historic platform statistics come from the sample dataset. Bot-attack controls add simulated suspicious accounts that the graduation engine excludes.

## Simulated money

Each wallet starts with 50 virtual BNB. Gold earned during a round is a score collectible. New demo wallets also receive 100 ARENA. Arena cosmetics settle in ARENA and Relic Vale resales settle in RELIC. Each sale pays the seller 99%, credits the platform 0.5%, and burns 0.5% in the same currency. Arena receipts retain their original denominations. Relic Vale uses a new RELIC ledger with a 2 RELIC starter allocation per trader. The launch configuration specifies BNB Smart Chain (56) and BNB gas for future on-chain settlement. Trades on RoFun charge the displayed fee in BNB. Buys deduct the fee before adding liquidity, and sells deduct the fee from gross BNB proceeds. Token launches charge 0.05 BNB once. Receipts keep the gross transaction, treasury share, developer share, timestamp and payer together.

Platform Revenue reads the local receipt ledger. Its daily, weekly and monthly filters cover the last 24 hours, 7 days and 30 days. The projection simulator uses independent hypothetical inputs. Existing prototype saves retain their balances, trades, milestones and graduation history. The new treasury ledger begins with the first transaction made after upgrading.

Milestone claims transfer points from a fixed 50,000-point demo sponsorship budget. Previously claimed rewards reduce the available balance when upgrading an older save. Points have no cash value. The prototype uses a fixed 600 USD per BNB for market displays and performs no chain calls.

## Verification

Run `npm run test:domain` to check fee thresholds, balance conservation, duplicate purchases, insufficient funds, reward claims, player uniqueness, activity expiry and old saves.

For the browser journey, install the browser with `npx playwright install chromium --only-shell`, start the app at port 4198, and run `npm run test:journey`. Set `ROFUN_URL` to test another preview URL. The journey drives keyboard and touch movement, verifies finished and idle sessions, and follows the presenter flow through cosmetic receipts, trading, launch, treasury, migration and reset.
