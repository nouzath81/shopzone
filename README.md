# ShopZone – Lazada-style multi-vendor marketplace

Next.js 14 (App Router) + Prisma + Postgres (works with Supabase). Card payments by PayHere (Sri Lanka).

## ⚠️ Use a separate database

ShopZone has its own `User`, `Product`, `Order`… tables. Do NOT point it at the database of another app
(for example the Daynight store). Either create a new Supabase project, or keep `?schema=shopzone`
at the end of `DATABASE_URL` so it lives in its own schema. The seed script refuses to run if it finds
more than 200 products already in the database.

## Run it

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET (openssl rand -hex 32)
npx prisma db push          # create tables
npm run db:seed             # demo accounts + 4 sellers + 64 products
npm run dev                 # http://localhost:3000
```

If you ran an earlier version against the same database, the simplest way is to reset it once and seed again:
`npx prisma db push --force-reset && npm run db:seed` (this erases ShopZone's own tables only, so make sure it is the ShopZone database).
If you want to keep your data instead, run `npx prisma db push` (the newest additions only add optional columns and tables, so no reset is needed for them), then approve your sellers in Admin → Users & Sellers
(existing sellers start as "waiting", and their products stay hidden until approved).

**Updating an existing database:** run `npx prisma db push`, then mark your current users as verified so they are not blocked at checkout once email is on:

```sql
UPDATE "User" SET "emailVerified" = now() WHERE "emailVerified" IS NULL;
```

(With `?schema=shopzone` in your URL, write `"shopzone"."User"`.) Everyone is signed out once by this update, because login cookies now carry a version number. They just log in again.

## Demo logins (created by the seed — delete or change before going live)

| Role     | Email                     | Password       |
|----------|---------------------------|----------------|
| Admin    | admin@shopzone.test       | admin1234      |
| Seller   | seller1@shopzone.test (…seller4) | seller1234 |
| Customer | customer@shopzone.test    | customer1234   |

## What's included

**Shopping**
- Home, category pages, search with sort + price filter, product page, cart, checkout (Cash on Delivery or card)
- Login required to check out; prices and stock are always checked on the server

**Customers** – address book (save up to 10 delivery addresses, pick one at checkout, or tick "Save this address" while ordering), register, login, My Orders, order details, cancel pending items (stock is returned)
- Wishlist: tap ♡ on a product, find everything in Wishlist (top bar)
- Order tracking: each item shows Ordered → Shipped → Delivered with dates and the seller's tracking number
- Shipping fees: shown per seller at checkout (and on the product page); free when the seller's fee is 0 or the goods from that seller reach their "free shipping over" amount
- Voucher codes at checkout (try `WELCOME10` for 10% off, or `SAVE500` for Rs 500 off orders over Rs 3,000)
- Reviews: after an item is delivered, the buyer can rate it 1–5 stars with a comment (one review per item, shown as "Verified purchase"); the product's star rating is recalculated from real reviews

**Variants (size, colour…)** – a seller can add variants to a product (for example S / M / L, or Red / Blue), each with its own stock; the product's stock is the total. Shoppers must choose an option before adding to the cart; the cart, checkout, order page, emails and CSV show it. Stock is checked and reduced per variant, and cancelling or expiring an order puts it back. Every variant has the same price as the product. If a seller deletes a variant, old orders keep its name.

**Weight-based shipping** – a seller can enter a weight (grams) on each product and an "extra fee for each additional kg" in Shop profile. Each seller's parcel weight is the sum of their items; the first kg is included, and every started kg after that adds the fee (2.5 kg = 2 extra kg). It is added to the seller's usual / city fee, and "free shipping over" still makes it free. Products without a weight count as 0 g. Everything is recalculated on the server.

**Questions & answers** – shoppers ask a question on a product page (login needed, 10 per hour); the seller answers in Seller Centre → Questions and the shopper is emailed. Only answered questions are shown to everyone (the asker also sees their own pending ones); an admin can delete any question.

**Sellers** (register with "I want to sell") – Seller Centre at `/seller`
- Overview: a daily sales chart (last 7 / 30 / 90 days, hover for the exact day, "Show table" for the numbers), active products, units sold, delivered revenue, orders to ship, low-stock list
- Add / edit / remove products with image upload (JPG/PNG/WebP, max 3 MB, up to 8 images)
- Orders: buyer address and phone, mark shipped (asks for an optional courier + tracking number) / delivered / cancel
- Shop profile & shipping: set a flat shipping fee and an optional "free over" amount (each seller ships their own parcel, so the fee is charged per seller); edit the shop name and an "About" text; every approved shop gets a public page at `/shop/<name>` that shoppers reach with "Visit shop" on any of its products

**Returns & refunds**
- A customer can ask to return a delivered item within 7 days (reason required); the order page shows the status and the seller's reply.
- The seller (or an admin) approves or rejects it. The refund is the item's price minus its share of any voucher; shipping is not refunded.
- An admin sends the money back (for card orders, in the PayHere dashboard) and presses "Mark refunded". Sellers see requests in Seller Centre → Returns, admins in Admin → Returns.

**Delivery zones** – a seller can set a different shipping fee per city (Shop profile). Checkout matches the city the customer types; other cities use the seller's usual fee, and "free over" still applies.

**Commission & payouts**
- Every seller has a commission rate (default 10%, set by an admin in Admin → Payouts; a change only affects later orders).
- Card orders: ShopZone holds the money and owes the seller price minus commission. Cash on delivery: the seller keeps the cash, so the commission is taken off their balance (it can go negative).
- Delivered items become "available" after the 7-day return window with no open return. The admin pays by bank transfer and records it under Admin → Payouts (cannot exceed the available balance). Sellers see their balance in Seller Centre → Earnings.

**Unpaid card orders** – cancelled automatically after 24 hours once `CRON_SECRET` is set (a daily job in `vercel.json`; on other hosts call `GET /api/cron/expire-orders` with `Authorization: Bearer <CRON_SECRET>`). Admin → Orders also has a manual button. Stock returns. Cancelling the last item of an order gives the voucher use back.

**Spreadsheet export** – Seller Centre → Orders and Admin → Orders have "Download CSV" (7 days / 30 days / 90 days / 1 year). One row per item with status, payment, commission, customer contact, tracking and return status; sellers get their own items, admins get all (up to 5,000 rows). Opens in Excel or Google Sheets.

**Admin** – `/admin`: marketplace sales chart with the same 7 / 30 / 90 day filter, sales overview, all orders (any status), show/hide products, users & sellers, add categories
- **Seller approval:** new sellers can add products, but nothing shows in the shop until an admin approves them (and "Suspend" hides a shop again)
- **Vouchers:** create percent or fixed-amount codes with a minimum spend, max uses and expiry date; turn them on/off

**Card payments (PayHere)**
- The customer picks "Pay online by card" at checkout, is sent to PayHere's secure page, and comes back to the order page.
- An order is marked **paid only when PayHere's server confirms it** (signature and amount are checked), never because the browser says so.
- Sellers cannot ship (or cancel) a card order until it is paid. An unpaid order shows a "Pay now" button, so a failed payment can be retried.
- Customers can cancel an unpaid card order (stock returns). Once paid, cancelling needs a person, because refunds are done in the PayHere dashboard.
- Without the PayHere settings in `.env`, the card option is simply hidden and the shop works with Cash on Delivery only.

**Email (optional, via Resend)**
- "Forgot password?" on the login page sends a reset link that works for 1 hour and only once (only a hash of the token is stored; requests are rate limited; the answer is the same whether or not the email has an account).
- Sellers get an email for each new order and each return request; customers get one when an item ships, is delivered or cancelled by the shop, and when a return is approved, rejected or refunded.
- Customers get an order confirmation email after checkout (with a "Pay now" button for card orders).
- Set `RESEND_API_KEY` and `MAIL_FROM` in `.env` (see below). Without them no email is sent, the shop still works, and in development the reset link is printed in the terminal.
- **Email verification:** new accounts get a confirmation link (valid 24 hours, only a hash is stored). Until it is used, a yellow bar with a "Resend" button shows and checkout is blocked. This is enforced **only when email is configured**; without Resend nobody could receive the link, so the check is skipped. Finishing a password reset also confirms the email.
- **Account security** (`/account/security`): change password (needs the current one, rate limited) and "Sign out everywhere". Changing or resetting a password signs out every other device.

**Security:** failed logins are limited (5 per email+address and 30 per address in 15 minutes) and sign-ups to 10 per hour per address. The counters live in the database, so no extra service is needed.

Order status is stored per item, so each seller ships their own part of a mixed-seller order.

## Image uploads

- Production: create a **public** Supabase Storage bucket named `products`, then set `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Keep the service key secret (server only).
- Local testing: with those empty, images are saved to `public/uploads` (works in `npm run dev` only).

## Turn on card payments (PayHere sandbox first)

1. Create a free sandbox account at sandbox.payhere.lk and add your site's domain under Settings → Domains & Credentials.
2. Copy the **Merchant ID** and that domain's **Merchant Secret** into `.env` (`PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`), keep `PAYHERE_SANDBOX="true"`.
3. Set `SITE_URL` to your public address, e.g. `https://yourshop.vercel.app`.
   PayHere confirms payments by calling `SITE_URL/api/payhere/notify` from the internet, so **`localhost` cannot receive the confirmation**.
   For local testing, run a tunnel (for example `ngrok http 3000`) and use that address as `SITE_URL`.
4. Pay with PayHere's sandbox test cards (listed in their docs). When it all works, apply for a live PayHere account, switch to the live Merchant ID/Secret and set `PAYHERE_SANDBOX="false"`.

Currency: the shop now defaults to Sri Lankan rupees (`NEXT_PUBLIC_CURRENCY_CODE="LKR"`, label `Rs`). PayHere accepts LKR and USD only.
Demo prices in the seed are in the Rs 500 – 12,000 range.

## Turn on email (Resend)

1. Create a free account at resend.com and make an API key.
2. Put it in `.env` as `RESEND_API_KEY`, and set `MAIL_FROM` (for example `ShopZone <onboarding@resend.dev>` for testing).
3. The test sender is usually limited to your own email address. To email real customers, verify your own domain in Resend and use an address on it in `MAIL_FROM`.
4. Set `SITE_URL` (the same public address used for PayHere) so the links in emails point to your real site.

## Before going live

- Set a strong `SESSION_SECRET`; delete the demo accounts
- Refunds and payouts are recorded here but the money is moved by hand (PayHere dashboard, bank transfer)
- Set `CRON_SECRET` so unpaid card orders expire by themselves (Vercel's free plan allows one run per day)
- Rate limiting depends on the `x-forwarded-for` header, so check your host sets it correctly
- Change the currency in `src/lib/format.ts` (default `RM`; prices are stored in cents)
