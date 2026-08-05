# Customised Gifts — Project Notes (handoff)

This file summarises everything built and discussed so far, so you can paste
it into a new chat with Claude and pick up exactly where you left off.

## What this is
A React + Vite + Tailwind CSS website for "Customised Gifts" (Instagram:
@customised._.gifts_), styled like an Instagram business profile. Customers
browse products, personalise them, and order via WhatsApp with UPI payment.

## Current settings (in `src/App.jsx`, top of file)
- `SELLER_WHATSAPP_NUMBER = "919865376292"` — orders go to this WhatsApp
- `SELLER_PHONE_DISPLAY = "9600427722"` — shown in the bio
- `SELLER_UPI_ID = "subashini4581-1@oksbi"` — shown at checkout for payment
- `ADMIN_PASSCODE = "gifts2024"` — gate for the owner's Add Product panel
- `SHOP_STATS = { followers: "11.7K", following: "811" }` — manual, see below

## Features already built
- Instagram-style profile header (logo, bio, stats) + category dropdown (top-right corner)
- Product grid, product detail modal with personalisation field
- "Send this order on WhatsApp" — quick single-item order button on every post
- Cart → Checkout flow: name/phone/address/landmark/pincode/state, shipping
  auto-calculated (₹50 Tamil Nadu, ₹150 other states), UPI QR + payment
  screenshot upload, then sends full order to WhatsApp
- **Owner admin panel** (🔒 icon, bottom-left, passcode-gated):
  - Add new product: single photo OR **bulk upload multiple photos at once**
    (each gets its own name/price/category fields, then "Post all")
  - Edit any existing post (price, name, description, category, availability)
  - Posts list grouped by category
  - Categories tab: add new categories, or delete a category (if it has
    posts, you get a confirm warning — deleting the category deletes its
    posts too)
- Gift-box "unwrapping" intro animation on page load (skippable by tap)
- 8 starter categories with a few clearly-tagged "Demo" placeholder posts
  (delete/replace these from the Posts tab once real photos are added)

## Latest update — new features added
- **Wallet posts**: name / colour / charm fields (already existed, confirmed
  working) — show automatically for every post in the "Wallets" category.
- **Hampers**: owner can now toggle **"This hamper has clothing"** per post
  (Add Product form) — only then does a shirt-size picker (S/M/L/XL/XXL)
  show to customers. Hampers without the toggle just show a note field.
- **Blinking WhatsApp button** (bottom-right) — pulses continuously so it's
  easy to notice; tapping opens a chat with the seller's WhatsApp number.
- **Wishlist** — heart icon in the header (top of site). Customers tap the
  heart on any product tile, or the bookmark icon inside a post, to save it.
  Saved items live in the browser's `localStorage`, so they persist between
  visits on the same device (no login needed).
- **My account / settings** — gear icon in the header. Lets a customer save
  their name, phone, address, landmark, pincode and state once
  (`localStorage`, no password). Checkout auto-fills from these saved
  details next time. "Log out" clears them.
- **Terms & Conditions** — link at the bottom of the footer, opens a panel
  with standard rules for a made-to-order gifting shop (orders/confirmation,
  payment, customisation, shipping, returns & damage, liability).

## Known limitation — READ THIS FIRST IN THE NEW CHAT
~~Product data was stored in the browser's localStorage~~ — **FIXED.** As of
this update, products and categories live in **Firebase Firestore**
(project: `customised-gifts`), so every visitor on every device now sees
the same live catalog. `src/firebase.js` holds the config.

Firestore layout:
- Collection `products` — one document per product, doc ID = product's `id`
- Document `settings/categories` — single doc with a `names` array field

The app uses `onSnapshot` listeners, so changes the owner makes in the
admin panel appear for other visitors in real time, no refresh needed.

**Still to do — Firestore security rules.** The database is in "test mode",
which means anyone who finds your `firebaseConfig` (it's visible in the
site's JS bundle — that's normal and fine) could technically write to the
database directly, bypassing the admin passcode. The passcode stops casual
access, not a determined bad actor. Before relying on this for real orders
long-term, tighten the Firestore rules (Firebase Console → Firestore →
Rules) — at minimum restrict writes and set an expiry so test mode doesn't
silently stay wide open (Firebase test mode auto-locks after ~30 days
anyway, which will break writes if not addressed).

## Deployment
Discussed deploying via **Vercel** (recommended) or Netlify:
1. Push this project to a GitHub repo
2. Connect the repo on vercel.com → Deploy
3. Vercel builds automatically and gives a live `.vercel.app` link
4. Every future `git push` auto-redeploys

GitHub Pages is possible but needs extra Vite `base` path config — Vercel/
Netlify are simpler for this project.

## Running locally
```
npm install
npm run dev
```
`node_modules` isn't included in this zip — run `npm install` first.
