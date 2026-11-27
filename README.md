# Pulse

**Turn a clip you love into a Moment Coin and give its creator a share.**

Pulse is a short-video launchpad prototype for **BNB Hack Bangkok · Four.meme / OpenFour Boost**.

When a memorable clip becomes a meme coin, the link back to the original video and its creator can disappear. Pulse is for short-video creators and the fans who discover those moments. A fan can capture and crop a frame, name the coin, review its launch terms, and trade it in a simulated market. The coin links back to the original video and credits its creator.

The proposed launch model reserves **10% of the supply** for the original clip creator, locked until liquidity pool migration. This allocation is a design shown in the prototype.

## Run the prototype

Install Node.js 22.12 or newer and Python 3. The checked-in demo runs with bundled clips and works without a wallet or Supabase credentials.

```sh
git clone https://github.com/Opto1233/bnbhackathon.git
cd bnbhackathon/pulse
PULSE_LOCAL_DEMO=1 npm start
```

On Windows PowerShell, use `$env:PULSE_LOCAL_DEMO = "1"; npm start` for the last line.

1. Open [the sample reel](http://localhost:8499/#Clips/1) and press and hold the video to capture a frame. Keyboard users can focus **Hold to create Moment Coin** and press Enter.
2. Pick a timestamp, adjust the crop, enter a coin name and description, and review the original creator credit and launch terms. Select **Create demo coin**.
3. Open **Trade**, preview and confirm a simulated buy, and then preview a sell. The crop and demo trades are saved in the current browser.

## OpenFour integration status

The optional BSC Testnet path uses **OpenFour Bonding V1**. Pulse reads the preset schema, sends the launch through `OpenFourCore`, links the `TokenCreated` receipt to the source clip, and uses OpenFour quotes for Buy / Sell. We exercised launch, bonding-curve trades, automatic migration, and PancakeSwap V2 swaps from the Pulse UI on a local OpenFour fork. A public Pulse OpenFour Registry on BSC Testnet is pending. The default prototype uses simulated balances and trades with a 0% demo fee.

Bonding V1 does not enforce Pulse’s proposed 10% creator allocation or production fee split. Those terms require a separate preset.

- [OpenFour configuration](pulse/OPENFOUR.md)
- [Shared Supabase configuration](pulse/SUPABASE.md)

## Tests

From the `pulse` directory, run `npm ci` and `npm test`.

[License](LICENSE)
