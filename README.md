# QATTA — Telegram-native shared-goal widgets

QATTA's primary participant interface is a Telegram Widget inside the message bubble. The dashboard is for creating goals and tracking verified payments/invite joins; its bubble is a read-only layout preview and does not simulate transactions. No demo balances or manual pledge endpoint remain.

## Current behavior

- Create expense splits, group collections, campaigns and shared goals in USD.
- Goal and every payment choice are bounded **$5 to $10,000 USD**. Widget choices are $5, $10, $25, $50, $100, $250, $500, $1,000, $2,500, $5,000 and $10,000.
- The widget's Pay action requires Telegram's in-app wallet. It asks the backend for a fresh live TON/USD quote, then presents a real TON Connect transaction in Telegram's own wallet window. If wallet, receiver, or quote is unavailable, it stops without making a contribution record or charging anyone.
- Payments are pending until an independently operated TON verifier confirms the exact recipient, sender, amount, invoice comment and successful transaction. Only then do raised totals, the participant list and live shared-widget state update.
- Share links use Telegram's chooser; QR codes point to the same invite. Friends are recorded as joined only after they open the deep link and start the bot. The organizer gets a bot message only if they first claim/connect the goal and the invitee has started the bot—Telegram bots cannot message users who have never started them.
- The dashboard does not imitate a Telegram payment. `/api/contributions` returns `410` and does not record anything.

## Telegram Widgets constraints

Implementation follows [Telegram's official Widget documentation](https://blogfork.telegram.org/bots/widgets): one self-contained inline HTML/CSS/JS document, bot-written `public_data`, `TelegramWidget.request`, `widget_query` / `shared_widget_query`, and shared-state updates. The widget makes no network calls and uses no external assets. It is checked against the 32,768-byte HTML and 4,096-byte zlib level-9 compressed limits; state is kept below Telegram's 1,024-byte limit.

Telegram currently documents production Widgets as available only in private chats with the bot. Group Widgets, inline mode and forwarded Widgets are still test-server-only per the documented rollout. Do not advertise group Widget delivery in production until Telegram enables it for your bot.

## Local run

Requires Node.js 20+.

```sh
npm install
npm test
# Configure environment variables from .env.example, then:
npm start
```

The workspace dashboard is served at `http://localhost:3000`. It starts with **no fake sample campaign**. Use `/start` in Telegram, then `/create My shared goal`, or create a goal in the dashboard. Bot-created goals show their ID. Use `/wallet` in a private chat for an optional account-level TON Connect session, remembered on that device until the user disconnects. Use `/connect <goal-id>` when the organizer wants to set that goal's receiving address from the connected wallet; goal IDs work with or without the `q_` prefix. Dashboard-created goals have a **Connect wallet** action; the session stays connected until explicitly disconnected. QATTA stores no private keys, and each payment still needs explicit wallet approval. Set `PUBLIC_BASE_URL` to the public HTTPS app origin in production so Telegram Mini App links and the TON Connect manifest resolve correctly. The organizer should open **Connect as organizer in Telegram** before sharing so join notifications go to the correct account.

For local development, `BOT_POLLING=1` enables long polling and removes any webhook currently configured for that bot. For a stable deployment, use HTTPS plus the configured Telegram webhook instead. Do not run polling and webhook delivery at the same time.

## Vercel deployment

`api/index.js` adapts the HTTP router to a Vercel Function; `vercel.json` rewrites requests through that handler. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=Qatta_Bot`, `PUBLIC_BASE_URL=https://<your-project>.vercel.app`, and a random `TELEGRAM_WEBHOOK_SECRET` in Vercel Environment Variables. Leave `BOT_POLLING` off on Vercel; configure Telegram to call `/telegram/webhook` with the authenticated `/api/telegram/configure-webhook` endpoint.

Vercel's function filesystem is temporary. This preview writes to `/tmp`, reports that in `/api/health`, and intentionally disables contributions on Vercel so payments cannot be accepted without durable state or a recurring TON verifier. Attach a durable database and verifier/cron worker before enabling real payments or treating campaign changes as persistent. Never upload `.env` to GitHub.

## TON payments: direct recipient, optional account wallet

The organizer sets a **public TON receiving address for each goal**. Users may optionally connect a TON wallet at the QATTA account/device level; TON Connect remembers the session on that device until the user disconnects. This stores no private keys, and each payment still requires a separate approval in the wallet. Transfers go directly to the goal's organizer; QATTA never pools funds or signs on a user's behalf.

The receiving address field is currently optional so a goal/invite can be prepared first. **Checkout stays disabled until a valid public EQ…/UQ… address is saved.** For payment, the server obtains a live USD/TON quote (CoinGecko by default), builds a TON transaction with a unique invoice comment, and polls TON Center v2 over HTTPS every 15 seconds. It matches the receiving address, sender, exact nanoTON value, invoice comment and successful transaction before updating progress. The Telegram-reported message hash alone is never treated as proof. `TONCENTER_API_KEY` is optional for low-volume development and recommended for rate limits in production.

Set `TON_USD_PRICE_URL`, `TONCENTER_API_URL` and optionally `TONCENTER_API_KEY` in the server environment. The organizer enters a public receiving address in the goal creation form or the goal's share/settings panel. Never enter or store a seed phrase/private key. A direct transfer goes to that goal's organizer address; QATTA does not pool funds or perform payouts.

The signed `/api/payments/ton-webhook` endpoint remains an optional integration route; it is not needed for Toncenter polling. Production needs durable storage, transaction-hash uniqueness/replay protection, retry/reconciliation, a paid Toncenter plan/key or equivalent trusted indexer, and organizer authorization before handling funds.

## Bot setup

- Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=Qatta_Bot`, and either `BOT_POLLING=1` for development or webhook settings for production.
- In Telegram, send `/start`, then `/create A goal between five and ten thousand dollars`.
- The bot supports invite deep links: a friend must open the link and tap Start before the bot can send them the Widget or report their join to the organizer.
- When upgrading Widget HTML, old Telegram messages retain their original HTML by design. On the next `/start` for a saved goal, QATTA removes its most recent old message when possible and sends the current version. Other old forwards/messages may need to be resent.

## Security / production gaps

This project was assembled from an empty workspace. The local JSON store and dashboard are development scaffolding—not a production fundraising backend. Add an authenticated organizer dashboard, authorization/tenant controls for creation/send routes, a durable transactional database, rate limiting, durable queueing for updates, raw webhook signature verification, a trusted TON indexer integration, and secrets management before public deployment. The bot token should be rotated if it has been exposed outside a private secret store.
