# Connect Pulse to Supabase

Use one Supabase project for the team. Pulse reads published videos and creator profiles as a guest. Publishing requires a wallet signature. The database enforces one channel per verified wallet and one owner per ticker, including simultaneous claims and case variations.

## Configure the project

1. Open the Supabase dashboard and select your project. Click **Connect** and copy the **Project URL**. In **Settings → API Keys**, copy the **Publishable key** beginning with `sb_publishable_`.
2. Under **Authentication → Sign In / Providers**, enable the Ethereum Web3 provider. In **Authentication → URL Configuration**, set the site URL to the deployed Pulse origin and add the local development origin, e.g. `http://localhost:8000/**`, to the allowed redirect URLs.
3. Open **SQL Editor → New query** and run [the initial migration](supabase/migrations/202611260001_pulse.sql), then [the wallet lookup fix](supabase/migrations/202611260002_fix_wallet_lookup.sql). For an existing installation of the initial migration, run only the wallet lookup fix. The initial migration creates the two tables, public video bucket, access policies, and authenticated operations. If the project restricts its Data API, enable it for the public schema.
4. In the cloned repository's `pulse` directory, use Node.js 22.12 or newer. Copy the template and enter the two values in your local copy.

```sh
cp .env.example .env.local
```

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

5. Build and serve Pulse. Open `http://localhost:8000`. For another port, add the corresponding localhost URL to the allowed redirect URLs.

```sh
npm install
npm run build
python3 -m http.server 8000 --directory dist
```

## Share the repository and deploy

Commit source files, the SQL migration, and the empty `.env.example`. Each teammate can use the same project's URL and publishable key in their own `.env.local`. Git ignores both that file and the generated `dist/pulse-config.js`. To check locally, run:

```sh
git check-ignore .env.local dist/pulse-config.js
git status --short
```

For a hosted deployment, set the two variables in the host's **build environment**, run `npm install && npm run build` from `pulse`, and publish the entire generated `dist` directory. Static deploys that skip the build must include the generated config file in the deployment artifact. Visitors can inspect the publishable key in their browser. Access is enforced by authenticated database operations and storage policies. Keep Supabase secret keys, service-role credentials, and database passwords out of browser code and Git.

## Verify with two browsers

1. Sign in with wallet A on BSC Testnet, create a channel, claim a ticker, and publish an MP4, WebM or MOV of up to 50 MiB.
2. Open the same site in a second browser as a guest. The video appears in the feed and its share link opens the same video.
3. Sign in with wallet B, create a channel, and try the same ticker in lowercase. The database rejects the duplicate. The four starter market tickers are reserved.

Existing browser-only videos stay on the device that created them. To share an older upload, publish its original file through the configured app. A build with empty settings runs the local demo.

[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) · [Web3 wallet sign-in](https://supabase.com/docs/guides/auth/auth-web3)
