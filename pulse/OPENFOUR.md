# OpenFour Moment Coins

Pulse supports the official creator-owned OpenFour fork on BNB Smart Chain Testnet (chain 97). It uses the fork's built-in **Bonding V1** preset (1778027615722). A launch needs the fork's configured Core signer in the browser wallet. Anyone with test BNB can trade a launched coin while it is in the bonding phase.

## Connect a fork

1. Follow the [OpenFour fork setup](https://github.com/four-meme-community/openfour-docs/tree/main/developer/fork-deploy#usage) to deploy a developer-owned Testnet Registry, or use your team's existing fork. Keep the signer and deployment keys in your wallet or local OpenFour environment.
2. Set `PULSE_OPENFOUR_REGISTRY` in Pulse's `.env.local` to the public `addresses.registry` from that fork's `out/fork-deployment.json`. For a local RPC fork on chain 97, also set `PULSE_OPENFOUR_LOCAL_FORK=1` and select that local RPC in the signer wallet. Restart Pulse with `npm start`.
3. On Pulse, open a Reel and hold its video to capture a frame. Fill in the name, symbol, and description, then choose **Launch on OpenFour** using the fork signer wallet on BSC Testnet. After confirmation, Pulse opens the trade panel with a link to the launch transaction. For an order use **Preview buy** or **Preview sell**, then confirm in the panel and wallet. Selling can require an ERC-20 approval first.

If the Registry is unset, Pulse offers browser simulation. The OpenFour path uses actual preset quotes and fees. Bonding V1 keeps Pulse's source-credit link on the app side and uses the preset's Bonding V1 issuance rules, so it does not implement the planned 10% locked creator allocation or Pulse's fee split. Pulse saves the frame-to-token association in the current browser. The trade panel shows local transaction hashes for a local fork and BscScan links for public Testnet transactions.

## Verify migration and external trades

1. Use a Bonding V1 test market with tBNB in the signer wallet. On a fresh Pulse launch, the bonding curve raises up to 0.30 tBNB before fees. Preview a buy that covers the remaining sale inventory and review the actual estimated debit before confirming.
2. For automatic migration, inspect the final buy receipt for both `TradeExecuted` and `MigrateExecuted`. If the market is waiting in Sold Out or Migrate Pending, Pulse exposes **Request migration**. The panel shows the migrated route only after the vault reaches `Migrated`.
3. Verify the event's PancakeSwap V2 tag and data version, decode the pair, and match it to the router's factory. Check the pair's tokens, its reserves, and its LP supply. A fresh pair also emits `PairCreated` and `Mint`.
4. Keep using **Preview buy** or **Preview sell** in Pulse. The panel now quotes that verified PancakeSwap V2 pool with a 1% output tolerance and a five-minute swap deadline. A sell may need an exact token approval to the PancakeSwap router. Verify the pair's `Swap` event and compare wallet balances after settlement.

Pulse supports the documented PancakeSwap V2 migration route for Bonding V1 on chain 97.

Protocol reference: [OpenFour Integration Guide](https://github.com/four-meme-community/openfour-docs/blob/main/docs/integration-guide.md).
