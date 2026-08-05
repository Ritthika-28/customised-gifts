# Customised Gifts

An Instagram-style storefront for a personalised gifts business, built with React + Vite + Tailwind CSS. Orders are sent straight to your WhatsApp as a pre-filled message — no backend or payment gateway needed to get started.

## 1. Open in VS Code

Unzip this folder and open it in VS Code:

```
File → Open Folder... → customisd-gifts
```

## 2. Install dependencies

Open a terminal in VS Code (`` Ctrl+` ``) and run:

```bash
npm install
```

## 3. Run it locally

```bash
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`) — open it in your browser.

## 4. Configure your business

Open `src/App.jsx` and edit the top of the file:

```js
const SELLER_WHATSAPP_NUMBER = "919865376292"; // your WhatsApp number, country code + number, no + or spaces
const CURRENCY = "₹"; // change if you're not in India
const SELLER_UPI_ID = "subashini4581-1@oksbi"; // your real UPI ID, from PhonePe/GPay/Paytm
const BUSINESS_DISPLAY_NAME = "Customised Gifts"; // shown in the customer's UPI app
```

Then update the `PRODUCTS` array a bit further down with your real items, prices, descriptions, and personalisation prompts. Each product uses a `lucide-react` icon as a placeholder image — swap these for real photos when you're ready (see below).

## 5. Add real product photos (optional)

Right now each product tile shows an icon instead of a photo. To use real images:

1. Put your product photos in `src/assets/` (e.g. `src/assets/photo-frame.jpg`)
2. Import them at the top of `App.jsx`: `import photoFrameImg from "./assets/photo-frame.jpg";`
3. Add an `image: photoFrameImg` field to that product in `PRODUCTS`
4. In `GridTile` and `ProductModal`, render `<img src={product.image} className="w-full h-full object-cover" />` instead of the `<Icon />` when `product.image` exists

## 6. Build for production / deploy

```bash
npm run build
```

This creates a `dist/` folder with static files you can deploy anywhere that serves static sites — Netlify, Vercel, GitHub Pages, or your own hosting.

## How ordering works

There's no order database. Checkout has three steps:

1. **Delivery details** — name, phone, address
2. **Payment** — a UPI QR code is generated for the exact order total (scan with any UPI app), plus your UPI ID to copy/paste. The customer uploads a screenshot of their payment as proof.
3. **Send to WhatsApp** — this opens `https://wa.me/<your-number>?text=<order details>` with the order and a note that a payment screenshot is attached.

**Important limitation:** WhatsApp's link-based chat (`wa.me`) can only pre-fill text — there is no way for a website link to automatically attach an image to a WhatsApp message; this is a restriction WhatsApp enforces for security reasons, not something any code can work around. So after the chat opens, the customer needs to manually attach the screenshot themselves. The app makes this easy with a "Save screenshot" button that downloads the exact image they uploaded, ready to attach in the chat.

## "Need help?" button

A floating WhatsApp button (bottom-right, on every page) and a footer link both let customers message you directly with questions — separate from the order flow. Both use `SELLER_WHATSAPP_NUMBER`, so no extra setup needed once you've added your number.

## Project structure

```
customisd-gifts/
├── index.html          # HTML entry point, loads Google Fonts
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx         # React entry point
    ├── index.css        # Tailwind imports
    └── App.jsx          # The entire app — products, cart, checkout, WhatsApp logic
```
