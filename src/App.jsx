import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  MessageCircle,
  Heart,
  Package,
  ChevronRight,
  ArrowLeft,
  Check,
  BadgeCheck,
  Share2,
  Lock,
  ImagePlus,
  Trash2,
  ChevronDown,
  Bookmark,
  Grid3x3,
  Frame,
  Wallet,
  Gift,
  Gem,
  Coffee,
  Flower2,
  Magnet,
  Sparkles,
  Settings,
  FileText,
  LogOut,
  UserCircle,
  Shirt,
} from "lucide-react";
import logoImg from "./assets/logo.jpg";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/* ------------------------------------------------------------------
   SELLER SETTINGS — edit these two lines for your real business
------------------------------------------------------------------- */
const SELLER_WHATSAPP_NUMBER = "919865376292"; // country code + number, no + or spaces
const SELLER_PHONE_DISPLAY = "9600427722"; // shown in the bio for calls/enquiries
const SELLER_EMAIL = "psubashini810@gmail.com"; // shown in the bio
const CURRENCY = "₹";
const SELLER_UPI_ID = "subashini4581-1@oksbi"; // your real UPI ID (PhonePe/GPay/Paytm all give one)
const BUSINESS_DISPLAY_NAME = "Customised Gifts"; // shown to the customer's UPI app, keep it simple text
const ADMIN_PASSCODE = "gifts2024"; // change this — simple gate for the Add Product panel

// Meesho-style size chips shown for every Hamper post.
const HAMPER_SIZES = ["S", "M", "L", "XL", "XXL"];

// Instagram doesn't offer a public, key-free way for a website to read live
// follower/following counts — that needs the Meta Graph API with a verified
// business account. So this is just the seed value the first time the shop
// loads; after that, edit it from Admin panel → Settings, which saves to
// Firestore and updates the site live for everyone.
const DEFAULT_SHOP_STATS = {
  followers: "11.8K",
  following: "811",
};

// Shipping is now set per product by the owner (each post can have its own
// shipping cost). Older posts that don't have a shipping value yet fall
// back to this default so nothing breaks.
const DEFAULT_SHIPPING = 80;

const INDIAN_STATES = [
  "Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

function shippingOf(product) {
  return product && product.shipping != null ? Number(product.shipping) : DEFAULT_SHIPPING;
}

// Each cart line adds its own product's shipping cost (once per line, not
// multiplied by quantity — it's a per-listing packing/courier charge).
function shippingForCart(cart, products) {
  return cart.reduce((sum, item) => {
    const p = products.find((pr) => pr.id === item.id);
    return sum + shippingOf(p);
  }, 0);
}

// Builds a scannable UPI QR code for the exact order amount using a free QR image API.
// Tapping these on a phone opens that specific app with the amount
// pre-filled, ready to pay in one tap. No QR code shown — avoids someone
// screenshotting/reusing a static QR.
function buildGpayLink(amount) {
  return `tez://upi/pay?pa=${SELLER_UPI_ID}&pn=${encodeURIComponent(BUSINESS_DISPLAY_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Customised Gifts order")}`;
}
function buildPhonePeLink(amount) {
  return `phonepe://pay?pa=${SELLER_UPI_ID}&pn=${encodeURIComponent(BUSINESS_DISPLAY_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Customised Gifts order")}`;
}
function buildPaytmLink(amount) {
  return `paytmmp://pay?pa=${SELLER_UPI_ID}&pn=${encodeURIComponent(BUSINESS_DISPLAY_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Customised Gifts order")}`;
}

/* ------------------------------------------------------------------
   THEME TOKENS
------------------------------------------------------------------- */
const theme = {
  kraft: "#F8F1F6",
  kraftDark: "#EEDDE8",
  cream: "#FFFCFA",
  ink: "#3B2E4A",
  inkSoft: "#6B5A7D",
  gold: "#C08579",
  goldSoft: "#E3B6AC",
  rust: "#8E6BA8",
  charcoal: "#2E2438",
  line: "#E3D3E8",
  emerald: "#6E5A9E",
  emeraldDark: "#453465",
};

const display = { fontFamily: "'Fraunces', serif" };
const body = { fontFamily: "'Work Sans', sans-serif" };
const script = { fontFamily: "'Caveat', cursive" };

/* ------------------------------------------------------------------
   PRODUCT DATA — replace with your real catalog & photos
------------------------------------------------------------------- */
const STARTER_CATEGORIES = [
  "Frames",
  "Wallets",
  "Hampers",
  "Jewellery",
  "Mugs & Bottles",
  "Plaques",
  "Bouquet",
  "Fridge Magnet",
];

// Maps a stored icon name back to its component — used for the demo posts
// below since React components can't be saved into localStorage directly.
const ICON_MAP = { Frame, Wallet, Gift, Gem, Coffee, Package, Flower2, Magnet };

// Temporary placeholders so the grid isn't empty before you post real
// photos — icon tiles, not real products. These are seeded into your
// editable posts on first load, so you can edit or delete each one from
// the owner panel (lock icon → Posts tab) just like any real post.
const DEMO_PRODUCTS = [
  { id: "demo-1", category: "Frames", name: "Engraved Photo Frame", price: 899, iconName: "Frame", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Name to engrave" },
  { id: "demo-2", category: "Wallets", name: "Personalised Leather Wallet", price: 1399, iconName: "Wallet", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Name or initials" },
  { id: "demo-3", category: "Hampers", name: "Custom Gift Hamper", price: 1999, iconName: "Gift", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Occasion / note", hasClothing: true },
  { id: "demo-4", category: "Jewellery", name: "Engraved Pendant", price: 1199, iconName: "Gem", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Name to engrave" },
  { id: "demo-5", category: "Mugs & Bottles", name: "Photo Print Mug", price: 499, iconName: "Coffee", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Photo / message" },
  { id: "demo-6", category: "Plaques", name: "Engraved Wooden Plaque", price: 1099, iconName: "Package", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Quote or names" },
  { id: "demo-7", category: "Bouquet", name: "Forever Rose Bouquet", price: 799, iconName: "Flower2", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Message for the tag" },
  { id: "demo-8", category: "Fridge Magnet", name: "Photo Fridge Magnet Set", price: 349, iconName: "Magnet", tag: "Demo", desc: "Sample placeholder — replace with your real photo.", customizable: true, placeholder: "Any note" },
];

/* ------------------------------------------------------------------
   HELPERS
------------------------------------------------------------------- */
function formatPrice(n) {
  return `${CURRENCY}${n.toLocaleString("en-IN")}`;
}

// Wishlist and "my account" details live in the browser's localStorage —
// simple, no password needed, and remembers the customer next visit on the
// same device/browser. Wrapped in try/catch since some browsers block
// storage in private mode.
const WISHLIST_KEY = "cg_wishlist";
const ACCOUNT_KEY = "cg_account";

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(ids) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch (e) {
    /* storage unavailable — wishlist just won't persist this session */
  }
}

function loadAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveAccount(account) {
  try {
    if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch (e) {
    /* storage unavailable */
  }
}

// Phone camera photos are often 3-5MB — way over Firestore's 1MB-per-document
// limit once base64-encoded. This resizes to a sensible max dimension and
// re-compresses as JPEG before we ever store it, so uploads don't silently fail.
function compressImageFile(file, maxDimension = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function buildWhatsAppMessage({ cart, products, customer, orderRef }) {
  const lines = [];
  lines.push("Hello Customised Gifts! I'd like to place an order:");
  if (orderRef) lines.push(`Order Ref: ${orderRef}`);
  lines.push("");
  let subtotal = 0;
  let hasPhoto = false;
  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product) return;
    const lineTotal = product.price * item.qty;
    subtotal += lineTotal;
    lines.push(`• ${product.name} x${item.qty} — ${formatPrice(lineTotal)}`);
    if (item.personalization) {
      lines.push(`   Personalisation: "${item.personalization}"`);
    }
    if (item.photo) {
      hasPhoto = true;
      lines.push(`   📷 Photo uploaded for this item`);
    }
  });
  const shipping = shippingForCart(cart, products);
  const total = subtotal + shipping;
  lines.push("");
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  lines.push(`Shipping: ${formatPrice(shipping)}`);
  lines.push(`Total: ${formatPrice(total)}`);
  lines.push("");
  lines.push(`Name: ${customer.name || "-"}`);
  lines.push(`Phone: ${customer.phone || "-"}`);
  lines.push(`Delivery address: ${customer.address || "-"}`);
  lines.push(`Landmark: ${customer.landmark || "-"}`);
  lines.push(`Pincode: ${customer.pincode || "-"}`);
  lines.push(`State: ${customer.state || "-"}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  if (hasPhoto) lines.push(`\n📎 I'm attaching my personalisation photo(s) to this chat.`);
  lines.push("");
  lines.push(`Payment: Paid ${formatPrice(total)} via UPI to ${SELLER_UPI_ID}. Attaching my payment screenshot below 👇`);
  return lines.join("\n");
}

// Quick single-product order message, sent straight from a post — no cart needed.
function buildQuickOrderMessage({ product, personalization, photo, orderRef }) {
  const lines = [];
  const shipping = shippingOf(product);
  const total = product.price + shipping;
  lines.push("Hello Customised Gifts! I'd like to order this:");
  if (orderRef) lines.push(`Order Ref: ${orderRef}`);
  lines.push("");
  lines.push(`• ${product.name} — ${formatPrice(product.price)}`);
  if (personalization) lines.push(`   Personalisation: "${personalization}"`);
  if (photo) lines.push(`   📎 I'm attaching my photo for this to this chat.`);
  lines.push("");
  lines.push(`Subtotal: ${formatPrice(product.price)}`);
  lines.push(`Shipping: ${formatPrice(shipping)}`);
  lines.push(`Total: ${formatPrice(total)}`);
  lines.push("");
  lines.push(`Payment: I'll pay ${formatPrice(total)} via UPI to ${SELLER_UPI_ID} and send my screenshot here.`);
  return lines.join("\n");
}

// Orders (with any uploaded personalisation photos) are saved to Firestore
// since a WhatsApp click-to-chat link can only carry text, never a file —
// this is how the photo actually reaches the owner, referenced by order ID.
async function saveOrder(orderData) {
  try {
    const ref = await addDoc(collection(db, "orders"), {
      ...orderData,
      status: "new",
      createdAt: serverTimestamp(),
    });
    return ref.id.slice(-6).toUpperCase();
  } catch (e) {
    console.error("Save order failed:", e);
    return null;
  }
}

// WhatsApp's wa.me links can only pre-fill text, never attach a file — so we
// download the uploaded photo straight to the customer's device right before
// opening WhatsApp, so they can attach it in the chat with one tap.
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadPhotosWithDelay(photos) {
  photos.forEach((photo, i) => {
    setTimeout(() => downloadDataUrl(photo, `customised-gifts-photo-${i + 1}.jpg`), i * 400);
  });
}

/* ------------------------------------------------------------------
   PROFILE HEADER — Instagram-style business profile
------------------------------------------------------------------- */
function ProfileHeader({ productCount, activeCategory, categories, onCategoryChange, shopStats }) {
  return (
    <section className="relative z-50 px-6 pt-10 pb-4 max-w-2xl mx-auto cg-fade-in">
      <div className="flex flex-col items-center text-center">
        <div
          className="rounded-full flex-shrink-0 overflow-hidden"
          style={{
            width: 108,
            height: 108,
            border: `3px solid ${theme.rust}`,
            padding: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <img
            src={logoImg}
            alt="Customised Gifts logo"
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          <span style={{ ...display, fontSize: 24, fontWeight: 600 }}>Customised Gifts</span>
          <BadgeCheck size={18} color={theme.rust} />
        </div>

        <p style={{ ...script, fontSize: 22, color: theme.rust, marginTop: 4 }}>
          Personalised gifts, wrapped with love
        </p>

        <p style={{ ...body, fontSize: 12.5, color: theme.inkSoft, marginTop: 8 }}>
          ❤️ Loved by {shopStats.followers} happy customers &nbsp;·&nbsp; {productCount} gifts in the shop
        </p>

        <div className="flex items-center justify-center gap-4 mt-4" style={{ ...body, fontSize: 12.5, color: theme.inkSoft }}>
          <a href={`https://wa.me/${SELLER_WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5" style={{ color: theme.charcoal }}>
            <MessageCircle size={14} color="#25D366" /> WhatsApp
          </a>
          <span style={{ color: theme.line }}>•</span>
          <span className="flex items-center gap-1.5">📞 {SELLER_PHONE_DISPLAY}</span>
          <span style={{ color: theme.line }}>•</span>
          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SELLER_EMAIL)}&su=${encodeURIComponent("Enquiry - Customised Gifts")}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: theme.charcoal, textDecoration: "underline" }}
          >
            Email
          </a>
        </div>
      </div>

      <div
        className="flex items-center justify-between mt-6 py-2.5"
        style={{ borderTop: `1.5px solid ${theme.line}` }}
      >
        <div className="flex items-center gap-1">
          <Grid3x3 size={14} color={theme.ink} />
          <span style={{ ...body, fontSize: 12, letterSpacing: 1, color: theme.ink, textTransform: "uppercase" }}>
            Shop grid
          </span>
        </div>
        <CategoryTabs active={activeCategory} onChange={onCategoryChange} categories={categories} />
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span style={{ ...display, fontSize: 17, fontWeight: 600, color: theme.charcoal }}>{value}</span>
      <span style={{ fontSize: 12, color: theme.inkSoft }}>{label}</span>
    </div>
  );
}

function CategoryTabs({ active, onChange, categories }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
        style={{
          ...body,
          fontSize: 12,
          fontWeight: 600,
          background: theme.kraftDark,
          color: theme.ink,
          border: `1.3px solid ${theme.line}`,
          maxWidth: 150,
        }}
      >
        <span className="truncate">{active}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-50 mt-1 rounded-md overflow-hidden max-h-64 overflow-y-auto"
            style={{ background: theme.cream, border: `1.3px solid ${theme.line}`, minWidth: 190, boxShadow: "0 8px 20px rgba(43,58,47,0.18)" }}
          >
            {categories.map((cat) => {
              const isActive = cat === active;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    onChange(cat);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5"
                  style={{
                    ...body,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? theme.kraftDark : "transparent",
                    color: theme.charcoal,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   INSTAGRAM-STYLE GRID TILE
------------------------------------------------------------------- */
function GridTile({ product, onOpen, wishlist = [], onToggleWishlist }) {
  const Icon = product.icon || ICON_MAP[product.iconName] || Package;
  const isWishlisted = wishlist.includes(product.id);
  return (
    <button
      onClick={() => onOpen(product)}
      className="relative group"
      style={{ aspectRatio: "1 / 1", background: theme.kraftDark, overflow: "hidden" }}
    >
      <div className="w-full h-full flex items-center justify-center">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Icon size={34} color={theme.ink} strokeWidth={1.3} />
        )}
      </div>
      {onToggleWishlist && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute bottom-1.5 left-1.5 flex items-center justify-center rounded-full"
          style={{ width: 24, height: 24, background: "rgba(251,247,238,0.9)" }}
        >
          <Heart size={13} color={isWishlisted ? theme.rust : theme.ink} fill={isWishlisted ? theme.rust : "none"} />
        </span>
      )}
      {product.available === false && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(43,58,47,0.55)" }}
        >
          <span
            className="px-2 py-0.5 rounded"
            style={{ ...body, fontSize: 10.5, fontWeight: 600, background: theme.charcoal, color: theme.cream }}
          >
            Out of stock
          </span>
        </div>
      )}
      {product.tag && (
        <span
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded"
          style={{ ...body, fontSize: 9.5, background: theme.gold, color: theme.cream }}
        >
          {product.tag}
        </span>
      )}
      {product.images && product.images.length > 1 && (
        <span
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
          style={{ ...body, fontSize: 9.5, fontWeight: 600, background: "rgba(43,58,47,0.65)", color: "#fff" }}
        >
          <ImagePlus size={10} /> {product.images.length}
        </span>
      )}
      <div
        className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(43,58,47,0.55)" }}
      >
        <span className="flex items-center gap-1 text-white text-sm" style={body}>
          <Heart size={16} fill="#fff" /> {product.name.split(" ")[0]}
        </span>
      </div>
      <span
        className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded"
        style={{ ...body, fontSize: 10.5, fontWeight: 600, background: "rgba(251,247,238,0.9)", color: theme.charcoal }}
      >
        {formatPrice(product.price)}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------
   HELP BUTTON — lets a customer message the seller anytime, outside
   of the order flow (questions, sizing, delivery time, etc.)
------------------------------------------------------------------- */
function HelpButton() {
  const helpMessage = "Hi Customised Gifts! I had a question before ordering — ";
  const url = `https://wa.me/${SELLER_WHATSAPP_NUMBER}?text=${encodeURIComponent(helpMessage)}`;

  return (
    <>
      <style>{`
        @keyframes cgWhatsBlink {
          0%, 100% { box-shadow: 0 6px 16px rgba(43,58,47,0.35), 0 0 0 0 rgba(37,211,102,0.6); }
          50% { box-shadow: 0 6px 16px rgba(43,58,47,0.35), 0 0 0 9px rgba(37,211,102,0); }
        }
        .cg-whats-blink { animation: cgWhatsBlink 1.8s ease-in-out infinite; }
      `}</style>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="cg-whats-blink fixed bottom-5 right-5 z-30 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full"
        style={{ background: "#25D366", color: "#fff" }}
      >
        <MessageCircle size={20} />
        <span style={{ ...body, fontSize: 13, fontWeight: 600 }}>Need help?</span>
      </a>
    </>
  );
}

/* ------------------------------------------------------------------
   PRODUCT MODAL — Instagram post-style detail view
------------------------------------------------------------------- */
function ProductModal({ product, onClose, onAdd, wishlist = [], onToggleWishlist }) {
  const isWishlisted = wishlist.includes(product.id);
  const [note, setNote] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletColour, setWalletColour] = useState("");
  const [walletCharm, setWalletCharm] = useState("");
  const [hamperSize, setHamperSize] = useState("");
  const [liked, setLiked] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const Icon = product.icon || ICON_MAP[product.iconName] || Package;
  const outOfStock = product.available === false;
  const postImages = product.images && product.images.length ? product.images : product.image ? [product.image] : [];
  const isWallet = product.category === "Wallets";
  const isHamper = product.category === "Hampers";
  // Only hampers the owner has marked as "includes clothing" show a size
  // picker — a fruit/chocolate hamper has nothing to size.
  const hamperHasClothing = isHamper && product.hasClothing === true;

  // Wallets collect three specific fields, Hampers collect a size — these
  // combine into one readable line for the cart/WhatsApp/order instead of
  // the generic free-text note.
  const effectiveNote = isWallet
    ? [
        walletName.trim() && `Name: ${walletName.trim()}`,
        walletColour.trim() && `Colour: ${walletColour.trim()}`,
        walletCharm.trim() && `Charm: ${walletCharm.trim()}`,
      ].filter(Boolean).join(" · ")
    : isHamper
    ? [hamperHasClothing && hamperSize && `Size: ${hamperSize}`, note.trim()].filter(Boolean).join(" · ")
    : note;

  const scrollerRef = React.useRef(null);
  const handleScrollerScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(index);
  };
  const goToSlide = (index) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${product.name} — ${formatPrice(product.price)} from Customised Gifts`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: shareUrl });
      } catch (e) {
        /* user cancelled the share sheet — nothing to do */
      }
    } else {
      // Fallback for browsers without the native share sheet: open WhatsApp share directly.
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoProcessing(true);
    try {
      const compressed = await compressImageFile(file);
      setPhoto(compressed);
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Couldn't process that photo — try a different one.");
    }
    setPhotoProcessing(false);
    e.target.value = "";
  };

  const handleQuickWhatsAppOrder = async () => {
    setSending(true);
    const orderRef = await saveOrder({
      kind: "quick",
      items: [{ name: product.name, price: product.price, qty: 1, personalization: effectiveNote, photo: photo || null }],
      subtotal: product.price,
      shipping: null,
      total: null,
    });
    if (photo) downloadPhotosWithDelay([photo]);
    const message = buildQuickOrderMessage({ product, personalization: effectiveNote, photo, orderRef });
    window.open(`https://wa.me/${SELLER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(43,58,47,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: theme.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${theme.line}` }}>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Customised Gifts" className="w-7 h-7 rounded-full object-cover" />
            <span style={{ ...body, fontSize: 13, fontWeight: 600 }}>customised._.gifts_</span>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={20} color={theme.ink} />
          </button>
        </div>

        <div
          className="w-full relative"
          style={{ aspectRatio: "1 / 1", background: theme.kraftDark }}
        >
          {postImages.length > 0 ? (
            <div
              ref={scrollerRef}
              onScroll={handleScrollerScroll}
              className="w-full h-full flex overflow-x-auto"
              style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
            >
              {postImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className="w-full h-full object-cover flex-shrink-0"
                  style={{ scrollSnapAlign: "start" }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon size={64} color={theme.ink} strokeWidth={1.2} />
            </div>
          )}

          {postImages.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
              {postImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Photo ${i + 1}`}
                  className="rounded-full"
                  style={{
                    width: i === activeSlide ? 7 : 5.5,
                    height: i === activeSlide ? 7 : 5.5,
                    background: i === activeSlide ? theme.cream : "rgba(255,255,255,0.55)",
                    boxShadow: "0 0 2px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
            </div>
          )}

          {product.tag && (
            <span
              className="absolute top-3 left-3 px-2 py-0.5 rounded-full"
              style={{ ...body, fontSize: 11, background: theme.gold, color: theme.cream }}
            >
              {product.tag}
            </span>
          )}
          {outOfStock && (
            <span
              className="absolute top-3 right-3 px-2 py-0.5 rounded-full"
              style={{ ...body, fontSize: 11, background: theme.charcoal, color: theme.cream }}
            >
              Out of stock
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 pt-3">
          <button onClick={() => setLiked((l) => !l)} aria-label="Like">
            <Heart size={22} color={liked ? theme.rust : theme.ink} fill={liked ? theme.rust : "none"} />
          </button>
          <button onClick={handleShare} aria-label="Share">
            <Share2 size={20} color={theme.ink} />
          </button>
          <button
            onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className="ml-auto"
          >
            <Bookmark size={22} color={isWishlisted ? theme.rust : theme.ink} fill={isWishlisted ? theme.rust : "none"} />
          </button>
        </div>

        <div className="px-4 pt-2 pb-4">
          <p style={{ ...body, fontSize: 13.5, lineHeight: 1.5, color: theme.charcoal }}>
            <span style={{ fontWeight: 600 }}>customised._.gifts_</span>{" "}
            <span style={{ fontWeight: 600 }}>{product.name}</span> — {product.desc}
          </p>
          <p style={{ ...display, fontSize: 19, color: theme.rust, marginTop: 8 }}>{formatPrice(product.price)}</p>
          <p style={{ ...body, fontSize: 12, color: theme.inkSoft, marginTop: 2 }}>
            + {formatPrice(shippingOf(product))} shipping · Total {formatPrice(product.price + shippingOf(product))}
          </p>

          {product.customizable && (
            <div className="mt-3">
              {isWallet ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Wallet name</label>
                    <input
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      placeholder="Name to print/engrave"
                      disabled={outOfStock}
                      className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
                      style={{ ...body, border: `1.3px solid ${theme.line}`, background: theme.kraft, color: theme.charcoal }}
                    />
                  </div>
                  <div>
                    <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Wallet colour</label>
                    <input
                      value={walletColour}
                      onChange={(e) => setWalletColour(e.target.value)}
                      placeholder="e.g. Tan brown, Black"
                      disabled={outOfStock}
                      className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
                      style={{ ...body, border: `1.3px solid ${theme.line}`, background: theme.kraft, color: theme.charcoal }}
                    />
                  </div>
                  <div>
                    <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Wallet charm (optional)</label>
                    <input
                      value={walletCharm}
                      onChange={(e) => setWalletCharm(e.target.value)}
                      placeholder="e.g. Initial charm, none"
                      disabled={outOfStock}
                      className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
                      style={{ ...body, border: `1.3px solid ${theme.line}`, background: theme.kraft, color: theme.charcoal }}
                    />
                  </div>
                </div>
              ) : isHamper ? (
                <div className="flex flex-col gap-2">
                  {hamperHasClothing && (
                  <div>
                    <label style={{ ...body, fontSize: 12, color: theme.inkSoft, display: "flex", alignItems: "center", gap: 5 }}>
                      <Shirt size={13} /> Shirt / clothing size
                    </label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {HAMPER_SIZES.map((s) => {
                        const isActive = hamperSize === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => setHamperSize(s)}
                            className="rounded-md disabled:opacity-50"
                            style={{
                              ...body,
                              fontSize: 13,
                              fontWeight: 600,
                              width: 42,
                              height: 38,
                              border: `1.5px solid ${isActive ? theme.rust : theme.line}`,
                              background: isActive ? theme.rust : theme.kraft,
                              color: isActive ? theme.cream : theme.charcoal,
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}
                  <div>
                    <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Note (optional)</label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={product.placeholder}
                      disabled={outOfStock}
                      className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
                      style={{ ...body, border: `1.3px solid ${theme.line}`, background: theme.kraft, color: theme.charcoal }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Personalise it</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={product.placeholder}
                    disabled={outOfStock}
                    className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
                    style={{ ...body, border: `1.3px solid ${theme.line}`, background: theme.kraft, color: theme.charcoal }}
                  />
                </>
              )}

              <label style={{ ...body, fontSize: 12, color: theme.inkSoft, marginTop: 8, display: "block" }}>
                Upload a photo (optional — for frames, mugs, magnets etc.)
              </label>
              <label
                className="mt-1 flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer"
                style={{ border: `1.3px dashed ${theme.line}`, background: theme.kraftDark }}
              >
                {photo ? (
                  <img src={photo} alt="Uploaded" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <ImagePlus size={18} color={theme.inkSoft} />
                )}
                <span style={{ ...body, fontSize: 12, color: theme.inkSoft }}>
                  {photoProcessing ? "Processing…" : photo ? "Photo added — tap to change" : "Tap to upload a photo"}
                </span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={outOfStock || photoProcessing} />
              </label>
              {photo && (
                <p style={{ ...body, fontSize: 10.5, color: theme.inkSoft, marginTop: 4 }}>
                  On send, this photo downloads to your device — just attach it in the WhatsApp chat that opens.
                </p>
              )}
            </div>
          )}

          <button
            disabled={outOfStock || sending || photoProcessing}
            onClick={handleQuickWhatsAppOrder}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-md disabled:opacity-40"
            style={{ ...body, fontWeight: 600, background: "#25D366", color: "#fff" }}
          >
            <MessageCircle size={16} /> {sending ? "Sending…" : "Send this order on WhatsApp"}
          </button>

          <button
            disabled={outOfStock || photoProcessing}
            onClick={() => {
              onAdd(product.id, effectiveNote, photo);
              onClose();
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
          >
            <Plus size={16} /> {outOfStock ? "Out of stock" : "Add to gift bag"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   CART PANEL
------------------------------------------------------------------- */
function CartPanel({ cart, products, onClose, onQty, onRemove, onCheckout }) {
  const total = cart.reduce((sum, item) => {
    const p = products.find((pr) => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1.5px solid ${theme.line}` }}
        >
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>Your gift bag</h2>
          <button onClick={onClose} aria-label="Close cart">
            <X size={22} color={theme.ink} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {cart.length === 0 && (
            <p style={{ ...body, color: theme.inkSoft, fontSize: 14 }}>
              Nothing here yet — add a gift to get started.
            </p>
          )}
          {cart.map((item) => {
            const p = products.find((pr) => pr.id === item.id);
            if (!p) return null;
            return (
              <div key={item.id} className="flex gap-3 pb-4" style={{ borderBottom: `1px solid ${theme.line}` }}>
                <div
                  className="flex items-center justify-center rounded-md flex-shrink-0 overflow-hidden"
                  style={{ width: 52, height: 52, background: theme.kraftDark }}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    (() => {
                      const CartIcon = p.icon || ICON_MAP[p.iconName] || Package;
                      return <CartIcon size={22} color={theme.ink} />;
                    })()
                  )}
                </div>
                <div className="flex-1">
                  <p style={{ ...body, fontWeight: 600, fontSize: 14, color: theme.charcoal, margin: 0 }}>
                    {p.name}
                  </p>
                  {item.personalization && (
                    <p style={{ ...script, fontSize: 16, color: theme.rust, margin: "2px 0" }}>
                      "{item.personalization}"
                    </p>
                  )}
                  {item.photo && (
                    <p style={{ ...body, fontSize: 11, color: theme.inkSoft, margin: "2px 0", display: "flex", alignItems: "center", gap: 3 }}>
                      <ImagePlus size={11} /> Photo attached
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => onQty(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded"
                      style={{ border: `1px solid ${theme.line}` }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ ...body, fontSize: 13 }}>{item.qty}</span>
                    <button
                      onClick={() => onQty(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded"
                      style={{ border: `1px solid ${theme.line}` }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{ ...body, fontSize: 12, color: theme.rust, marginLeft: "auto" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p style={{ ...body, fontSize: 14, fontWeight: 600, color: theme.charcoal }}>
                  {formatPrice(p.price * item.qty)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4" style={{ borderTop: `1.5px solid ${theme.line}` }}>
          <div className="flex justify-between mb-3">
            <span style={{ ...body, color: theme.inkSoft }}>Total</span>
            <span style={{ ...display, fontSize: 18, color: theme.charcoal }}>{formatPrice(total)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
            style={{ ...body, fontWeight: 600, background: theme.rust, color: theme.cream }}
          >
            Checkout <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   CHECKOUT PANEL
------------------------------------------------------------------- */
function CheckoutPanel({ cart, products, onBack, onClose, savedCustomer }) {
  const [step, setStep] = useState("details"); // details | payment | sent
  const [customer, setCustomer] = useState({
    name: savedCustomer?.name || "",
    phone: savedCustomer?.phone || "",
    address: savedCustomer?.address || "",
    landmark: savedCustomer?.landmark || "",
    pincode: savedCustomer?.pincode || "",
    state: savedCustomer?.state || "Tamil Nadu",
    notes: "",
  });
  const [screenshot, setScreenshot] = useState(null); // data URL
  const [screenshotName, setScreenshotName] = useState("");

  const subtotal = cart.reduce((sum, item) => {
    const p = products.find((pr) => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
  const shipping = shippingForCart(cart, products);
  const total = subtotal + shipping;

  const canContinue =
    customer.name.trim() &&
    customer.phone.trim() &&
    customer.address.trim() &&
    customer.pincode.trim() &&
    customer.state.trim();
  const canSend = !!screenshot;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result);
    reader.readAsDataURL(file);
  };

  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const items = cart.map((item) => {
      const p = products.find((pr) => pr.id === item.id);
      return {
        name: p ? p.name : item.id,
        price: p ? p.price : 0,
        qty: item.qty,
        personalization: item.personalization || "",
        photo: item.photo || null,
      };
    });
    const orderRef = await saveOrder({
      kind: "cart",
      items,
      customer,
      subtotal,
      shipping,
      total,
    });
    const itemPhotos = items.map((i) => i.photo).filter(Boolean);
    if (itemPhotos.length > 0) downloadPhotosWithDelay(itemPhotos);
    const message = buildWhatsAppMessage({ cart, products, customer, orderRef });
    const url = `https://wa.me/${SELLER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setSending(false);
    setStep("sent");
  };

  const titles = { details: "Delivery details", payment: "Pay & confirm", sent: "Almost done!" };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1.5px solid ${theme.line}` }}>
          <button
            onClick={() => (step === "details" ? onBack() : setStep("details"))}
            aria-label="Back"
          >
            <ArrowLeft size={20} color={theme.ink} />
          </button>
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>{titles[step]}</h2>
          <button onClick={onClose} className="ml-auto" aria-label="Close">
            <X size={22} color={theme.ink} />
          </button>
        </div>

        {step === "details" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            <Field label="Full name" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} placeholder="Your name" />
            <Field label="Phone number" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} placeholder="For delivery updates" />
            <Field label="Delivery address" value={customer.address} onChange={(v) => setCustomer({ ...customer, address: v })} placeholder="House no, street, area" textarea />
            <Field label="Landmark" value={customer.landmark} onChange={(v) => setCustomer({ ...customer, landmark: v })} placeholder="e.g. Near Ganesh Temple" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pincode" value={customer.pincode} onChange={(v) => setCustomer({ ...customer, pincode: v.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit pincode" />
              <div>
                <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>State</label>
                <select
                  value={customer.state}
                  onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md outline-none"
                  style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <Field label="Notes (optional)" value={customer.notes} onChange={(v) => setCustomer({ ...customer, notes: v })} placeholder="Gift wrap, delivery date, etc." textarea />

            <div className="mt-2 p-3 rounded-md flex flex-col gap-1.5" style={{ background: theme.kraftDark }}>
              <div className="flex justify-between">
                <span style={{ ...body, fontSize: 13, color: theme.inkSoft }}>Subtotal</span>
                <span style={{ ...body, fontSize: 13, color: theme.charcoal }}>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ ...body, fontSize: 13, color: theme.inkSoft }}>
                  Shipping ({cart.length} item{cart.length === 1 ? "" : "s"})
                </span>
                <span style={{ ...body, fontSize: 13, color: theme.charcoal }}>{formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between pt-1.5" style={{ borderTop: `1px solid ${theme.line}` }}>
                <span style={{ ...body, fontSize: 13, fontWeight: 600, color: theme.inkSoft }}>Order total</span>
                <span style={{ ...display, fontSize: 16, color: theme.charcoal }}>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              disabled={!canContinue}
              onClick={() => setStep("payment")}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
              style={{ ...body, fontWeight: 600, background: theme.rust, color: theme.cream }}
            >
              Continue to payment <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === "payment" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 p-4 rounded-md" style={{ background: theme.kraftDark }}>
              <p style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>{formatPrice(total)}</p>
              <p style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Pay using your UPI app</p>

              <a
                href={buildGpayLink(total)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md"
                style={{ ...body, fontWeight: 600, fontSize: 13.5, background: "#fff", color: theme.charcoal, border: `1.3px solid ${theme.line}` }}
              >
                <Wallet size={16} color="#4285F4" /> Pay with GPay
              </a>

              <a
                href={buildPhonePeLink(total)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md"
                style={{ ...body, fontWeight: 600, fontSize: 13.5, background: "#fff", color: theme.charcoal, border: `1.3px solid ${theme.line}` }}
              >
                <Wallet size={16} color="#5F259F" /> Pay with PhonePe
              </a>

              <a
                href={buildPaytmLink(total)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md"
                style={{ ...body, fontWeight: 600, fontSize: 13.5, background: "#fff", color: theme.charcoal, border: `1.3px solid ${theme.line}` }}
              >
                <Wallet size={16} color="#00BAF2" /> Pay with Paytm
              </a>

              <p style={{ ...body, fontSize: 10.5, color: theme.inkSoft, textAlign: "center" }}>
                Opens the app on this phone. Doesn't work on a laptop/desktop browser.
              </p>
            </div>

            <div>
              <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>
                Upload your payment screenshot
              </label>
              <label
                className="mt-1 flex flex-col items-center justify-center gap-1 py-5 rounded-md cursor-pointer"
                style={{ border: `1.5px dashed ${theme.line}`, background: theme.cream }}
              >
                {screenshot ? (
                  <img src={screenshot} alt="Payment screenshot" style={{ maxHeight: 140, borderRadius: 6 }} />
                ) : (
                  <>
                    <Package size={22} color={theme.inkSoft} />
                    <span style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Tap to choose a screenshot</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
              {screenshotName && (
                <p style={{ ...body, fontSize: 11, color: theme.inkSoft, marginTop: 4 }}>{screenshotName}</p>
              )}
            </div>

            <button
              disabled={!canSend || sending}
              onClick={handleSend}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
              style={{ ...body, fontWeight: 600, background: "#25D366", color: "#fff" }}
            >
              <MessageCircle size={18} /> {sending ? "Saving order…" : "I've paid — send order on WhatsApp"}
            </button>
            <p style={{ ...body, fontSize: 11, color: theme.inkSoft, textAlign: "center" }}>
              WhatsApp doesn't allow links to auto-attach images, so on the next screen you'll get
              a one-tap way to save your screenshot and attach it in the chat that opens.
            </p>
          </div>
        )}

        {step === "sent" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
              <Check size={28} color="#fff" />
            </div>
            <h3 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>One last step</h3>
            <p style={{ ...body, fontSize: 14, color: theme.inkSoft }}>
              WhatsApp opened with your order details. Now attach your payment screenshot in that
              chat, or save it below first.
            </p>
            {screenshot && (
              <a
                href={screenshot}
                download={screenshotName || "payment-screenshot.jpg"}
                className="flex items-center gap-2 px-4 py-2 rounded-md"
                style={{ ...body, fontWeight: 600, fontSize: 13, background: theme.kraftDark, color: theme.ink }}
              >
                Save screenshot
              </a>
            )}

            <div
              className="mt-3 p-4 rounded-md w-full"
              style={{ background: theme.kraftDark, border: `1px solid ${theme.line}` }}
            >
              <p style={{ ...display, fontSize: 16, color: theme.charcoal, margin: 0 }}>
                🎉 Thank you for your order!
              </p>
              <p style={{ ...body, fontSize: 13, color: theme.charcoal, marginTop: 6 }}>
                We've received your order and will confirm it on WhatsApp shortly.
              </p>
              <p style={{ ...body, fontSize: 13, color: theme.charcoal, marginTop: 8 }}>
                📸 Follow us on Instagram{" "}
                <a
                  href="https://www.instagram.com/customised._.gifts_"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: theme.rust, fontWeight: 600 }}
                >
                  @customised._.gifts_
                </a>{" "}
                for new arrivals, offers &amp; customer reviews!
              </p>
              <p style={{ ...script, fontSize: 15, color: theme.rust, marginTop: 8 }}>
                Customised Gifts — personalised with love.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-md"
              style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }) {
  const Comp = textarea ? "textarea" : "input";
  return (
    <div>
      <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>{label}</label>
      <Comp
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 2 : undefined}
        className="w-full mt-1 px-3 py-2 rounded-md outline-none resize-none"
        style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   APP
------------------------------------------------------------------- */
/* ------------------------------------------------------------------
   ADMIN GATE — simple passcode check before the add-product panel.
   Client-side only, so treat it as a light deterrent, not real security.
------------------------------------------------------------------- */
function AdminGate({ onSuccess, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (code === ADMIN_PASSCODE) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(43,58,47,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-xl p-5"
        style={{ background: theme.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lock size={18} color={theme.rust} />
          <h3 style={{ ...display, fontSize: 17, color: theme.charcoal, margin: 0 }}>Owner login</h3>
        </div>
        <p style={{ ...body, fontSize: 12.5, color: theme.inkSoft, marginBottom: 10 }}>
          Enter the passcode to add or manage products.
        </p>
        <input
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Passcode"
          autoFocus
          className="w-full px-3 py-2 rounded-md outline-none"
          style={{ ...body, fontSize: 14, border: `1.3px solid ${error ? theme.rust : theme.line}`, background: theme.kraft, color: theme.charcoal }}
        />
        {error && (
          <p style={{ ...body, fontSize: 11.5, color: theme.rust, marginTop: 4 }}>Wrong passcode, try again.</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-md"
            style={{ ...body, fontWeight: 600, fontSize: 13, background: theme.kraftDark, color: theme.ink }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-md"
            style={{ ...body, fontWeight: 600, fontSize: 13, background: theme.ink, color: theme.cream }}
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ADD PRODUCT PANEL — gallery photo upload + product details, posts
   straight into the chosen category (or a brand-new one).
------------------------------------------------------------------- */
function AddProductPanel({ categories, customProducts, onAdd, onEdit, onDelete, onAddCategory, onDeleteCategory, shopStats, onUpdateShopStats, onClose }) {
  const [images, setImages] = useState([]); // up to 6 photos for one post
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [shipping, setShipping] = useState(String(DEFAULT_SHIPPING));
  const [category, setCategory] = useState(categories[0] || "");
  const [newCategory, setNewCategory] = useState("");
  const [usingNewCategory, setUsingNewCategory] = useState(false);
  const [desc, setDesc] = useState("");
  const [available, setAvailable] = useState(true);
  const [hasClothing, setHasClothing] = useState(false); // hampers only: shows a shirt-size picker to customers
  const [tab, setTab] = useState("add"); // add | manage | orders | categories | settings
  const [followersInput, setFollowersInput] = useState(shopStats.followers);
  const [followingInput, setFollowingInput] = useState(shopStats.following);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [addMode, setAddMode] = useState("single"); // single | bulk
  const [bulkQueue, setBulkQueue] = useState([]); // [{tempId, image, name, price, category, available}]
  const [bulkCategory, setBulkCategory] = useState(categories[0] || "");

  const MAX_PHOTOS = 6;
  const [imageProcessing, setImageProcessing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [orders, setOrders] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ docId: d.id, ref: d.id.slice(-6).toUpperCase(), ...d.data() })));
    }, (err) => console.error("Orders listener error:", err));
    return () => unsub();
  }, []);

  const handleMarkOrderDone = async (docId) => {
    try {
      await updateDoc(doc(db, "orders", docId), { status: "done" });
    } catch (e) {
      console.error("Update order failed:", e);
    }
  };

  const handleDeleteOrder = async (docId) => {
    try {
      await deleteDoc(doc(db, "orders", docId));
    } catch (e) {
      console.error("Delete order failed:", e);
    }
  };

  const newOrderCount = orders.filter((o) => o.status !== "done").length;

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) {
      alert(`You can add up to ${MAX_PHOTOS} photos per post.`);
      e.target.value = "";
      return;
    }
    setImageProcessing(true);
    for (const file of files.slice(0, room)) {
      try {
        const compressed = await compressImageFile(file);
        setImages((prev) => [...prev, compressed]);
      } catch (err) {
        console.error("Image compression failed:", err);
        alert("Couldn't process that photo — try a different one.");
      }
    }
    setImageProcessing(false);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBulkProcessing(true);
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImageFile(files[i]);
        setBulkQueue((prev) => [
          ...prev,
          {
            tempId: `bulk-${Date.now()}-${i}`,
            image: compressed,
            name: "",
            price: "",
            shipping: String(DEFAULT_SHIPPING),
            category: bulkCategory,
            available: true,
          },
        ]);
      } catch (err) {
        console.error("Image compression failed:", err);
      }
    }
    setBulkProcessing(false);
    e.target.value = ""; // allow re-selecting the same files later
  };

  const updateBulkItem = (tempId, field, value) => {
    setBulkQueue((prev) => prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
  };

  const removeBulkItem = (tempId) => {
    setBulkQueue((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const bulkReadyCount = bulkQueue.filter((item) => item.name.trim() && item.price && Number(item.price) > 0 && item.category).length;

  const handlePostAllBulk = () => {
    bulkQueue.forEach((item, i) => {
      if (!(item.name.trim() && item.price && Number(item.price) > 0 && item.category)) return;
      onAdd({
        id: `custom-${Date.now()}-${i}`,
        category: item.category,
        name: item.name.trim(),
        price: Number(item.price),
        shipping: item.shipping ? Number(item.shipping) : DEFAULT_SHIPPING,
        image: item.image,
        tag: "New",
        desc: "Personalised just for you.",
        customizable: true,
        placeholder: "Add a note or name for this order",
        available: item.available,
      });
    });
    setBulkQueue([]);
    setTab("manage");
  };

  const resetForm = () => {
    setImages([]);
    setName("");
    setPrice("");
    setShipping(String(DEFAULT_SHIPPING));
    setDesc("");
    setNewCategory("");
    setUsingNewCategory(false);
    setAvailable(true);
    setHasClothing(false);
    setEditingId(null);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setImages(p.images && p.images.length ? p.images : p.image ? [p.image] : []);
    setName(p.name);
    setPrice(String(p.price));
    setShipping(String(shippingOf(p)));
    setDesc(p.desc || "");
    setAvailable(p.available !== false);
    setHasClothing(p.hasClothing === true);
    setUsingNewCategory(!categories.includes(p.category));
    if (categories.includes(p.category)) {
      setCategory(p.category);
    } else {
      setNewCategory(p.category);
    }
    setTab("add");
  };

  const finalCategory = usingNewCategory ? newCategory.trim() : category;
  const canSubmit =
    images.length > 0 && !imageProcessing && name.trim() && price && Number(price) > 0 &&
    shipping !== "" && Number(shipping) >= 0 && finalCategory;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (usingNewCategory) onAddCategory(finalCategory);
    if (editingId) {
      onEdit(editingId, {
        category: finalCategory,
        name: name.trim(),
        price: Number(price),
        shipping: Number(shipping),
        images,
        image: images[0],
        desc: desc.trim() || "Personalised just for you.",
        available,
        hasClothing: finalCategory === "Hampers" ? hasClothing : false,
      });
    } else {
      onAdd({
        id: `custom-${Date.now()}`,
        category: finalCategory,
        name: name.trim(),
        price: Number(price),
        shipping: Number(shipping),
        images,
        image: images[0],
        tag: "New",
        desc: desc.trim() || "Personalised just for you.",
        customizable: true,
        placeholder: "Add a note or name for this order",
        available,
        hasClothing: finalCategory === "Hampers" ? hasClothing : false,
      });
    }
    resetForm();
    setTab("manage");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1.5px solid ${theme.line}` }}>
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>Manage products</h2>
          <button onClick={onClose} className="ml-auto" aria-label="Close">
            <X size={22} color={theme.ink} />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => {
              resetForm();
              setTab("add");
            }}
            className="py-2 px-3 rounded-md flex-shrink-0"
            style={{ ...body, fontWeight: 600, fontSize: 12.5, background: tab === "add" ? theme.ink : theme.kraftDark, color: tab === "add" ? theme.cream : theme.ink, whiteSpace: "nowrap" }}
          >
            Add new
          </button>
          <button
            onClick={() => setTab("manage")}
            className="py-2 px-3 rounded-md flex-shrink-0"
            style={{ ...body, fontWeight: 600, fontSize: 12.5, background: tab === "manage" ? theme.ink : theme.kraftDark, color: tab === "manage" ? theme.cream : theme.ink, whiteSpace: "nowrap" }}
          >
            Posts ({customProducts.length})
          </button>
          <button
            onClick={() => setTab("orders")}
            className="py-2 px-3 rounded-md flex-shrink-0"
            style={{ ...body, fontWeight: 600, fontSize: 12.5, background: tab === "orders" ? theme.ink : theme.kraftDark, color: tab === "orders" ? theme.cream : theme.ink, whiteSpace: "nowrap" }}
          >
            Orders {newOrderCount > 0 ? `(${newOrderCount})` : ""}
          </button>
          <button
            onClick={() => setTab("categories")}
            className="py-2 px-3 rounded-md flex-shrink-0"
            style={{ ...body, fontWeight: 600, fontSize: 12.5, background: tab === "categories" ? theme.ink : theme.kraftDark, color: tab === "categories" ? theme.cream : theme.ink, whiteSpace: "nowrap" }}
          >
            Categories
          </button>
          <button
            onClick={() => setTab("settings")}
            className="py-2 px-3 rounded-md flex-shrink-0"
            style={{ ...body, fontWeight: 600, fontSize: 12.5, background: tab === "settings" ? theme.ink : theme.kraftDark, color: tab === "settings" ? theme.cream : theme.ink, whiteSpace: "nowrap" }}
          >
            Settings
          </button>
        </div>
        {editingId && tab === "add" && (
          <p className="px-5 pt-2" style={{ ...body, fontSize: 12, color: theme.rust }}>
            Editing "{name}" — changes will update this existing post.
          </p>
        )}

        {tab === "add" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {!editingId && (
              <div className="flex gap-2 mb-1">
                <button
                  onClick={() => setAddMode("single")}
                  className="flex-1 py-1.5 rounded-md"
                  style={{ ...body, fontSize: 12, fontWeight: 600, background: addMode === "single" ? theme.rust : theme.kraftDark, color: addMode === "single" ? theme.cream : theme.ink }}
                >
                  One photo
                </button>
                <button
                  onClick={() => setAddMode("bulk")}
                  className="flex-1 py-1.5 rounded-md"
                  style={{ ...body, fontSize: 12, fontWeight: 600, background: addMode === "bulk" ? theme.rust : theme.kraftDark, color: addMode === "bulk" ? theme.cream : theme.ink }}
                >
                  Multiple photos
                </button>
              </div>
            )}

            {addMode === "single" && (
            <>
            <div>
              <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>
                Photos (up to {MAX_PHOTOS} — customers can swipe through them)
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden" style={{ aspectRatio: "1 / 1", background: theme.kraftDark }}>
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                      style={{ width: 20, height: 20, background: "rgba(43,58,47,0.75)" }}
                      aria-label="Remove photo"
                    >
                      <X size={13} color="#fff" />
                    </button>
                    {i === 0 && (
                      <span
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded"
                        style={{ ...body, fontSize: 9, fontWeight: 600, background: theme.rust, color: theme.cream }}
                      >
                        Cover
                      </span>
                    )}
                  </div>
                ))}
                {images.length < MAX_PHOTOS && (
                  <label
                    className="flex flex-col items-center justify-center gap-1 rounded-md cursor-pointer"
                    style={{ aspectRatio: "1 / 1", border: `1.5px dashed ${theme.line}`, background: theme.kraftDark }}
                  >
                    {imageProcessing ? (
                      <span style={{ ...body, fontSize: 10, color: theme.inkSoft, textAlign: "center" }}>Processing…</span>
                    ) : (
                      <>
                        <ImagePlus size={20} color={theme.inkSoft} />
                        <span style={{ ...body, fontSize: 10, color: theme.inkSoft }}>Add photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" multiple onChange={handleFile} className="hidden" disabled={imageProcessing} />
                  </label>
                )}
              </div>
            </div>

            <Field label="Product name" value={name} onChange={setName} placeholder="e.g. Engraved Keychain" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" value={price} onChange={(v) => setPrice(v.replace(/\D/g, ""))} placeholder="e.g. 499" />
              <Field label="Shipping cost (₹)" value={shipping} onChange={(v) => setShipping(v.replace(/\D/g, ""))} placeholder="e.g. 80" />
            </div>
            <Field label="Description (optional)" value={desc} onChange={setDesc} placeholder="Short description for the post" textarea />

            <div>
              <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Category</label>
              {!usingNewCategory ? (
                <div className="flex gap-2 mt-1">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md outline-none"
                    style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setUsingNewCategory(true)}
                    className="px-3 py-2 rounded-md"
                    style={{ ...body, fontSize: 12.5, fontWeight: 600, background: theme.kraftDark, color: theme.ink, whiteSpace: "nowrap" }}
                  >
                    + New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-3 py-2 rounded-md outline-none"
                    style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                  />
                  <button
                    onClick={() => setUsingNewCategory(false)}
                    className="px-3 py-2 rounded-md"
                    style={{ ...body, fontSize: 12.5, fontWeight: 600, background: theme.kraftDark, color: theme.ink }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {finalCategory === "Hampers" && (
              <div
                className="flex items-center justify-between mt-1 px-3 py-2.5 rounded-md"
                style={{ background: theme.kraft, border: `1.3px solid ${theme.line}` }}
              >
                <div className="flex items-center gap-2">
                  <Shirt size={16} color={theme.ink} />
                  <label style={{ ...body, fontSize: 12.5, color: theme.charcoal, lineHeight: 1.3 }}>
                    This hamper has clothing —<br />show shirt size options to customers
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setHasClothing((v) => !v)}
                  className="rounded-full shrink-0"
                  style={{ width: 42, height: 24, background: hasClothing ? theme.rust : theme.kraftDark, position: "relative", transition: "background 0.15s" }}
                  aria-pressed={hasClothing}
                  aria-label="Toggle shirt size options"
                >
                  <span
                    className="absolute rounded-full"
                    style={{ width: 18, height: 18, top: 3, left: hasClothing ? 21 : 3, background: theme.cream, transition: "left 0.15s" }}
                  />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <label style={{ ...body, fontSize: 13, color: theme.charcoal }}>Availability</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAvailable(true)}
                  className="px-3 py-1.5 rounded-full"
                  style={{ ...body, fontSize: 12, fontWeight: 600, background: available ? theme.rust : theme.kraftDark, color: available ? theme.cream : theme.ink }}
                >
                  In stock
                </button>
                <button
                  onClick={() => setAvailable(false)}
                  className="px-3 py-1.5 rounded-full"
                  style={{ ...body, fontSize: 12, fontWeight: 600, background: !available ? theme.rust : theme.kraftDark, color: !available ? theme.cream : theme.ink }}
                >
                  Out of stock
                </button>
              </div>
            </div>

            <button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
              style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
            >
              {editingId ? (
                <><Check size={16} /> Save changes</>
              ) : (
                <><Plus size={16} /> Post to shop</>
              )}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  resetForm();
                  setTab("manage");
                }}
                className="w-full py-2 rounded-md"
                style={{ ...body, fontWeight: 600, fontSize: 13, background: theme.kraftDark, color: theme.ink }}
              >
                Cancel edit
              </button>
            )}
            </>
            )}

            {addMode === "bulk" && !editingId && (
              <>
                <div>
                  <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>Category for these photos</label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md outline-none"
                    style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p style={{ ...body, fontSize: 11, color: theme.inkSoft, marginTop: 3 }}>
                    You can still change the category per photo below.
                  </p>
                </div>

                <label
                  className="flex flex-col items-center justify-center gap-1 py-6 rounded-md cursor-pointer"
                  style={{ border: `1.5px dashed ${theme.line}`, background: theme.kraftDark }}
                >
                  <ImagePlus size={24} color={theme.inkSoft} />
                  <span style={{ ...body, fontSize: 12, color: theme.inkSoft }}>
                    {bulkProcessing ? "Processing photos…" : "Tap to choose several photos at once"}
                  </span>
                  <input type="file" accept="image/*" multiple onChange={handleBulkFiles} className="hidden" disabled={bulkProcessing} />
                </label>

                {bulkQueue.length > 0 && (
                  <div className="flex flex-col gap-3 mt-1">
                    {bulkQueue.map((item) => (
                      <div key={item.tempId} className="flex gap-2 p-2 rounded-md" style={{ background: theme.kraftDark }}>
                        <img src={item.image} alt="" className="rounded-md object-cover flex-shrink-0" style={{ width: 56, height: 56 }} />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <input
                            value={item.name}
                            onChange={(e) => updateBulkItem(item.tempId, "name", e.target.value)}
                            placeholder="Product name"
                            className="px-2 py-1.5 rounded outline-none"
                            style={{ ...body, fontSize: 12.5, border: `1.2px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                          />
                          <div className="flex gap-1.5">
                            <input
                              value={item.price}
                              onChange={(e) => updateBulkItem(item.tempId, "price", e.target.value.replace(/\D/g, ""))}
                              placeholder="Price ₹"
                              className="flex-1 px-2 py-1.5 rounded outline-none"
                              style={{ ...body, fontSize: 12.5, border: `1.2px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                            />
                            <input
                              value={item.shipping}
                              onChange={(e) => updateBulkItem(item.tempId, "shipping", e.target.value.replace(/\D/g, ""))}
                              placeholder="Ship ₹"
                              className="flex-1 px-2 py-1.5 rounded outline-none"
                              style={{ ...body, fontSize: 12.5, border: `1.2px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                            />
                            <select
                              value={item.category}
                              onChange={(e) => updateBulkItem(item.tempId, "category", e.target.value)}
                              className="flex-1 px-2 py-1.5 rounded outline-none"
                              style={{ ...body, fontSize: 12.5, border: `1.2px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button onClick={() => removeBulkItem(item.tempId)} aria-label="Remove photo" className="flex-shrink-0">
                          <X size={16} color={theme.rust} />
                        </button>
                      </div>
                    ))}

                    <button
                      disabled={bulkReadyCount === 0 || bulkProcessing}
                      onClick={handlePostAllBulk}
                      className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
                      style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
                    >
                      <Plus size={16} /> Post {bulkReadyCount} photo{bulkReadyCount === 1 ? "" : "s"} to shop
                    </button>
                    {bulkReadyCount < bulkQueue.length && (
                      <p style={{ ...body, fontSize: 11, color: theme.inkSoft, textAlign: "center" }}>
                        Fill in a name and price for each photo to include it.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "manage" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {customProducts.length === 0 ? (
              <p style={{ ...body, fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "30px 0" }}>
                You haven't posted any products from here yet.
              </p>
            ) : (
              categories
                .filter((cat) => customProducts.some((p) => p.category === cat))
                .map((cat) => (
                  <div key={cat}>
                    <p
                      className="mb-2"
                      style={{ ...body, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: theme.rust }}
                    >
                      {cat} ({customProducts.filter((p) => p.category === cat).length})
                    </p>
                    <div className="flex flex-col gap-3">
                      {customProducts
                        .filter((p) => p.category === cat)
                        .map((p) => {
                          const ThumbIcon = p.icon || ICON_MAP[p.iconName] || Package;
                          return (
                            <div key={p.id} className="flex gap-3 items-center pb-3" style={{ borderBottom: `1px solid ${theme.line}` }}>
                              <div
                                className="rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
                                style={{ width: 48, height: 48, background: theme.kraftDark }}
                              >
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ThumbIcon size={20} color={theme.ink} />
                                )}
                              </div>
                              <div className="flex-1">
                                <p style={{ ...body, fontWeight: 600, fontSize: 13.5, color: theme.charcoal, margin: 0 }}>{p.name}</p>
                                <p style={{ ...body, fontSize: 12, color: theme.inkSoft, margin: 0 }}>
                                  {formatPrice(p.price)} · Ship {formatPrice(shippingOf(p))} · {p.available === false ? "Out of stock" : "In stock"}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button onClick={() => startEdit(p)} aria-label="Edit product">
                                  <span
                                    className="px-2.5 py-1 rounded-md"
                                    style={{ ...body, fontSize: 11.5, fontWeight: 600, background: theme.kraftDark, color: theme.ink }}
                                  >
                                    Edit
                                  </span>
                                </button>
                                <button onClick={() => onDelete(p.id)} aria-label="Delete product">
                                  <Trash2 size={17} color={theme.rust} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {orders.length === 0 ? (
              <p style={{ ...body, fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "30px 0" }}>
                No orders yet. Orders placed on the site — including any uploaded
                personalisation photos — will show up here.
              </p>
            ) : (
              orders.map((o) => (
                <div
                  key={o.docId}
                  className="p-3 rounded-md flex flex-col gap-2"
                  style={{ background: theme.kraftDark, opacity: o.status === "done" ? 0.55 : 1 }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ ...body, fontSize: 12, fontWeight: 700, color: theme.rust }}>#{o.ref}</span>
                    <span style={{ ...body, fontSize: 11, color: theme.inkSoft }}>
                      {o.status === "done" ? "Done" : "New"}
                    </span>
                  </div>

                  {(o.items || []).map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      {item.photo && (
                        <img src={item.photo} alt="" className="rounded object-cover flex-shrink-0" style={{ width: 44, height: 44 }} />
                      )}
                      <div className="flex-1">
                        <p style={{ ...body, fontSize: 13, fontWeight: 600, color: theme.charcoal, margin: 0 }}>
                          {item.name} x{item.qty} — {formatPrice(item.price * item.qty)}
                        </p>
                        {item.personalization && (
                          <p style={{ ...body, fontSize: 12, color: theme.inkSoft, margin: 0 }}>"{item.personalization}"</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {o.customer && (
                    <p style={{ ...body, fontSize: 11.5, color: theme.inkSoft, margin: 0 }}>
                      {o.customer.name} · {o.customer.phone} · {o.customer.state}
                      {o.total ? ` · Total ${formatPrice(o.total)}` : ""}
                    </p>
                  )}

                  <div className="flex gap-2 mt-1">
                    {o.status !== "done" && (
                      <button
                        onClick={() => handleMarkOrderDone(o.docId)}
                        className="px-3 py-1.5 rounded-md"
                        style={{ ...body, fontSize: 11.5, fontWeight: 600, background: theme.ink, color: theme.cream }}
                      >
                        Mark as done
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteOrder(o.docId)}
                      className="px-3 py-1.5 rounded-md"
                      style={{ ...body, fontSize: 11.5, fontWeight: 600, background: theme.kraft, color: theme.rust }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "categories" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="flex-1 px-3 py-2 rounded-md outline-none"
                style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
              />
              <button
                onClick={() => {
                  if (newCategoryName.trim()) {
                    onAddCategory(newCategoryName.trim());
                    setNewCategoryName("");
                  }
                }}
                className="px-3 py-2 rounded-md"
                style={{ ...body, fontSize: 12.5, fontWeight: 600, background: theme.ink, color: theme.cream, whiteSpace: "nowrap" }}
              >
                <Plus size={15} />
              </button>
            </div>

            {categories.map((cat) => {
              const postCount = customProducts.filter((p) => p.category === cat).length;
              return (
                <div key={cat} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${theme.line}` }}>
                  <div>
                    <p style={{ ...body, fontSize: 13.5, color: theme.charcoal, margin: 0 }}>{cat}</p>
                    {postCount > 0 && (
                      <p style={{ ...body, fontSize: 11, color: theme.inkSoft, margin: 0 }}>
                        {postCount} post{postCount === 1 ? "" : "s"} — deleting this category deletes them too
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (postCount > 0) {
                        const ok = window.confirm(
                          `Delete "${cat}"? This will also delete ${postCount} post${postCount === 1 ? "" : "s"} in it.`
                        );
                        if (!ok) return;
                      }
                      onDeleteCategory(cat);
                    }}
                    aria-label={`Delete ${cat}`}
                  >
                    <Trash2 size={16} color={theme.rust} />
                  </button>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p style={{ ...body, fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "20px 0" }}>
                No categories yet — add one above.
              </p>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            <p style={{ ...body, fontSize: 12.5, color: theme.inkSoft }}>
              Update these whenever your real Instagram numbers change — the
              whole shop updates live, no code or redeploy needed.
            </p>
            <Field label="Followers (e.g. 11.8K)" value={followersInput} onChange={setFollowersInput} placeholder="11.8K" />
            <Field label="Following" value={followingInput} onChange={setFollowingInput} placeholder="811" />
            <button
              disabled={!followersInput.trim() || !followingInput.trim()}
              onClick={() => onUpdateShopStats(followersInput.trim(), followingInput.trim())}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
              style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
            >
              <Check size={16} /> Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   INTRO SPLASH — a little gift box unwraps itself on first load
------------------------------------------------------------------- */
/* ------------------------------------------------------------------
   GIFT SPARKLES — a few soft sparkles drifting down for ambience
------------------------------------------------------------------- */
function GiftSparkles() {
  const sparkles = React.useMemo(() => {
    const glyphs = ["✨", "🎀", "⭐"];
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      glyph: glyphs[i % glyphs.length],
      left: Math.round(Math.random() * 100),
      size: 10 + Math.round(Math.random() * 10),
      duration: 14 + Math.round(Math.random() * 12),
      delay: Math.round(Math.random() * 14),
      opacity: 0.25 + Math.random() * 0.35,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 2, pointerEvents: "none" }}>
      <style>{`
        @keyframes cgSparkleFall {
          0% { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: var(--cg-op, 0.35); }
          90% { opacity: var(--cg-op, 0.35); }
          100% { transform: translateY(108vh) translateX(24px) rotate(60deg); opacity: 0; }
        }
        .cg-sparkle { position: absolute; top: 0; animation-name: cgSparkleFall; animation-timing-function: linear; animation-iteration-count: infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cg-sparkle { display: none; }
        }
      `}</style>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="cg-sparkle"
          style={{
            left: `${s.left}%`,
            fontSize: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            "--cg-op": s.opacity,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

function IntroSplash({ onDone }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => setClosing(true), 2000);
    const doneTimer = setTimeout(() => onDone(), 2450);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const skip = () => {
    setClosing(true);
    setTimeout(onDone, 350);
  };

  return (
    <div
      onClick={skip}
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center cursor-pointer ${closing ? "cg-splash-overlay-out" : ""}`}
      style={{ background: `linear-gradient(160deg, ${theme.kraft}, ${theme.kraftDark})` }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        {/* sparkles bursting out from behind the box */}
        {[
          { top: 10, left: 6, delay: "1.05s" },
          { top: -6, left: 100, delay: "1.15s" },
          { top: 60, left: 118, delay: "1.25s" },
          { top: 90, left: 0, delay: "1.35s" },
        ].map((s, i) => (
          <Sparkles
            key={i}
            size={16}
            color={theme.gold}
            className="cg-splash-sparkle absolute"
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          />
        ))}

        {/* box */}
        <div className="cg-splash-box relative" style={{ width: 96, height: 84 }}>
          {/* ribbon (fades as lid pops) */}
          <div
            className="cg-splash-ribbon absolute"
            style={{ left: "50%", top: 0, width: 14, height: "100%", marginLeft: -7, background: theme.gold, transformOrigin: "top" }}
          />
          {/* box body */}
          <div
            className="absolute rounded-md"
            style={{ left: 0, top: 22, width: 96, height: 62, background: theme.rust }}
          />
          {/* lid */}
          <div
            className="cg-splash-lid absolute rounded-md flex items-center justify-center"
            style={{ left: -4, top: 8, width: 104, height: 26, background: theme.charcoal }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${theme.gold}`, background: theme.kraft }} />
          </div>
        </div>
      </div>

      <div className="cg-splash-text mt-4 flex flex-col items-center">
        <span style={{ ...display, fontSize: 22, fontWeight: 600, color: theme.charcoal }}>Customised Gifts</span>
        <span style={{ ...body, fontSize: 12, letterSpacing: 1.5, color: theme.inkSoft, textTransform: "uppercase", marginTop: 2 }}>
          unwrapping something special
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   WISHLIST PANEL — saved products, shown from the heart icon at the
   top of the site. Wishlist itself lives in localStorage per browser.
------------------------------------------------------------------- */
function WishlistPanel({ wishlist, products, onClose, onOpenProduct, onToggleWishlist }) {
  const items = products.filter((p) => wishlist.includes(p.id));
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1.5px solid ${theme.line}` }}>
          <Heart size={20} color={theme.rust} fill={theme.rust} />
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>Wishlist</h2>
          <button onClick={onClose} className="ml-auto" aria-label="Close">
            <X size={22} color={theme.ink} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p style={{ ...body, fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "40px 0" }}>
              Nothing saved yet — tap the heart on any product to save it here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-md"
                  style={{ border: `1.3px solid ${theme.line}`, background: theme.kraft }}
                >
                  <button
                    onClick={() => {
                      onOpenProduct(p);
                      onClose();
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div
                      className="w-14 h-14 rounded-md overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: theme.kraftDark }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} color={theme.ink} />
                      )}
                    </div>
                    <div>
                      <p style={{ ...body, fontSize: 13.5, fontWeight: 600, color: theme.charcoal, margin: 0 }}>{p.name}</p>
                      <p style={{ ...body, fontSize: 12.5, color: theme.inkSoft, margin: 0 }}>{formatPrice(p.price)}</p>
                    </div>
                  </button>
                  <button onClick={() => onToggleWishlist(p.id)} aria-label="Remove from wishlist">
                    <Trash2 size={17} color={theme.inkSoft} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   SETTINGS PANEL — lightweight "customer login": name + delivery
   details saved on this device/browser (localStorage, no password),
   so Checkout can pre-fill itself the way the customer prefers.
------------------------------------------------------------------- */
function SettingsPanel({ account, onSave, onLogout, onClose }) {
  const [name, setName] = useState(account?.name || "");
  const [phone, setPhone] = useState(account?.phone || "");
  const [address, setAddress] = useState(account?.address || "");
  const [landmark, setLandmark] = useState(account?.landmark || "");
  const [pincode, setPincode] = useState(account?.pincode || "");
  const [state, setState] = useState(account?.state || "Tamil Nadu");

  const canSave = name.trim() && phone.trim();

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), phone: phone.trim(), address: address.trim(), landmark: landmark.trim(), pincode: pincode.trim(), state });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1.5px solid ${theme.line}` }}>
          <Settings size={19} color={theme.ink} />
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>My account</h2>
          <button onClick={onClose} className="ml-auto" aria-label="Close">
            <X size={22} color={theme.ink} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {account && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-md"
              style={{ background: theme.kraft, border: `1.3px solid ${theme.line}` }}
            >
              <UserCircle size={20} color={theme.rust} />
              <p style={{ ...body, fontSize: 13, color: theme.charcoal, margin: 0 }}>
                Logged in as <b>{account.name}</b>
              </p>
            </div>
          )}
          <p style={{ ...body, fontSize: 12, color: theme.inkSoft, marginTop: 2 }}>
            Save your details once — Checkout will fill itself in for you next time, on this device.
          </p>
          <Field label="Your name" value={name} onChange={setName} placeholder="Full name" />
          <Field label="Phone number" value={phone} onChange={(v) => setPhone(v.replace(/[^\d+ ]/g, ""))} placeholder="10-digit mobile number" />
          <Field label="Delivery address" value={address} onChange={setAddress} placeholder="House / street / area" textarea />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Landmark (optional)" value={landmark} onChange={setLandmark} placeholder="Nearby landmark" />
            <Field label="Pincode" value={pincode} onChange={(v) => setPincode(v.replace(/\D/g, ""))} placeholder="6-digit pincode" />
          </div>
          <div>
            <label style={{ ...body, fontSize: 12, color: theme.inkSoft }}>State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md outline-none"
              style={{ ...body, fontSize: 14, border: `1.3px solid ${theme.line}`, background: theme.cream, color: theme.charcoal }}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            disabled={!canSave}
            onClick={handleSave}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-md disabled:opacity-40"
            style={{ ...body, fontWeight: 600, background: theme.ink, color: theme.cream }}
          >
            Save my details
          </button>

          {account && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md"
              style={{ ...body, fontWeight: 600, background: theme.kraftDark, color: theme.charcoal }}
            >
              <LogOut size={16} /> Log out / clear my details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   TERMS & CONDITIONS PANEL — standard rules for a made-to-order,
   personalised gifting shop.
------------------------------------------------------------------- */
function TermsPanel({ onClose }) {
  const sections = [
    {
      title: "Orders & confirmation",
      points: [
        "Every order is confirmed by us on WhatsApp before it goes into production — please reply promptly so we can start on time.",
        "Please double-check names, spellings, sizes, colours and photos before sending — personalised items are made exactly as instructed.",
      ],
    },
    {
      title: "Payment",
      points: [
        "Orders are made only after full or advance payment (as informed on WhatsApp) is received and the payment screenshot is shared.",
        "Prices shown on the site are subject to change without prior notice; the price confirmed at the time of order stands.",
      ],
    },
    {
      title: "Customisation & production",
      points: [
        "Being handmade/personalised, slight variation in colour, design or finish compared to the reference photo is normal and not a defect.",
        "Once production has started on a personalised item, the order cannot be cancelled or changed.",
      ],
    },
    {
      title: "Shipping & delivery",
      points: [
        "Dispatch and delivery timelines shared on WhatsApp are estimates and may vary due to courier delays, weather or high order volume.",
        "Shipping charges shown at checkout are non-refundable once an order is dispatched.",
      ],
    },
    {
      title: "Returns, exchange & damage",
      points: [
        "Personalised/customised items cannot be returned or exchanged unless they arrive damaged or defective.",
        "Please share an unboxing video or photos within 24–48 hours of delivery for any damage or defect claim.",
      ],
    },
    {
      title: "Liability",
      points: [
        "We are not responsible for delays or losses caused by the courier partner once an order is handed over for delivery.",
        "By placing an order, you agree to these terms.",
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,58,47,0.45)" }}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: theme.cream }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1.5px solid ${theme.line}` }}>
          <FileText size={19} color={theme.ink} />
          <h2 style={{ ...display, fontSize: 20, color: theme.charcoal, margin: 0 }}>Terms & Conditions</h2>
          <button onClick={onClose} className="ml-auto" aria-label="Close">
            <X size={22} color={theme.ink} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h3 style={{ ...display, fontSize: 14.5, color: theme.charcoal, margin: 0 }}>{sec.title}</h3>
              <ul className="mt-1.5 pl-4" style={{ ...body, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.6 }}>
                {sec.points.map((pt, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [cart, setCart] = useState([]);
  const [panel, setPanel] = useState(null); // null | 'cart' | 'checkout' | 'wishlist' | 'settings' | 'terms'
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [customProducts, setCustomProducts] = useState([]);
  const [ownerCategories, setOwnerCategories] = useState(STARTER_CATEGORIES);
  const [shopStats, setShopStats] = useState(DEFAULT_SHOP_STATS);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [wishlist, setWishlist] = useState(() => loadWishlist());
  const [account, setAccount] = useState(() => loadAccount());

  const handleToggleWishlist = (id) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveWishlist(next);
      return next;
    });
  };

  const handleSaveAccount = (details) => {
    setAccount(details);
    saveAccount(details);
    setPanel(null);
  };

  const handleLogoutAccount = () => {
    setAccount(null);
    saveAccount(null);
    setPanel(null);
  };

  // Live shared data from Firestore — every visitor, on every device, sees
  // the same products and categories the moment the owner changes them.
  useEffect(() => {
    let seededProducts = false;

    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      if (snap.empty && !seededProducts) {
        // Nobody has posted anything to this shop yet — seed the demo posts once.
        seededProducts = true;
        DEMO_PRODUCTS.forEach((p) => {
          setDoc(doc(db, "products", p.id), p).catch((e) => console.error("Seed product failed:", e));
        });
        return;
      }
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomProducts(items);
    }, (err) => console.error("Products listener error:", err));

    const categoriesRef = doc(db, "settings", "categories");
    const unsubCategories = onSnapshot(categoriesRef, (snap) => {
      if (!snap.exists()) {
        setDoc(categoriesRef, { names: STARTER_CATEGORIES }).catch((e) => console.error("Seed categories failed:", e));
        setOwnerCategories(STARTER_CATEGORIES);
        return;
      }
      setOwnerCategories(snap.data().names || STARTER_CATEGORIES);
    }, (err) => console.error("Categories listener error:", err));

    const statsRef = doc(db, "settings", "shopStats");
    const unsubStats = onSnapshot(statsRef, (snap) => {
      if (!snap.exists()) {
        setDoc(statsRef, DEFAULT_SHOP_STATS).catch((e) => console.error("Seed shop stats failed:", e));
        setShopStats(DEFAULT_SHOP_STATS);
        return;
      }
      setShopStats({ ...DEFAULT_SHOP_STATS, ...snap.data() });
    }, (err) => console.error("Shop stats listener error:", err));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubStats();
    };
  }, []);

  const handleUpdateShopStats = async (followers, following) => {
    try {
      await setDoc(doc(db, "settings", "shopStats"), { followers, following });
    } catch (e) {
      console.error("Update shop stats failed:", e);
      alert("Couldn't save — check your internet connection and try again.");
    }
  };

  const allProducts = customProducts;

  const shopCategories = useMemo(() => ["All", ...ownerCategories], [ownerCategories]);

  const visibleProducts = useMemo(
    () => (activeCategory === "All" ? allProducts : allProducts.filter((p) => p.category === activeCategory)),
    [activeCategory, allProducts]
  );

  const cartCount = useMemo(() => cart.reduce((n, i) => n + i.qty, 0), [cart]);

  const handleAddProduct = async (product) => {
    try {
      await setDoc(doc(db, "products", product.id), product);
    } catch (e) {
      console.error("Add product failed:", e);
      alert("Couldn't save that product — check your internet connection and try again.");
    }
    setShowAddProduct(false);
  };

  const handleDeleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      console.error("Delete product failed:", e);
      alert("Couldn't delete that product — check your internet connection and try again.");
    }
  };

  const handleEditProduct = async (id, updates) => {
    try {
      await updateDoc(doc(db, "products", id), updates);
    } catch (e) {
      console.error("Edit product failed:", e);
      alert("Couldn't save those changes — check your internet connection and try again.");
    }
  };

  const handleAddCategory = async (name) => {
    if (ownerCategories.includes(name)) return;
    const next = [...ownerCategories, name];
    try {
      await setDoc(doc(db, "settings", "categories"), { names: next });
    } catch (e) {
      console.error("Add category failed:", e);
      alert("Couldn't save that category — check your internet connection and try again.");
    }
  };

  const handleDeleteCategory = async (name) => {
    const next = ownerCategories.filter((c) => c !== name);
    try {
      await setDoc(doc(db, "settings", "categories"), { names: next });
      // Any posts still in this category go too, so nothing is left orphaned.
      const toDelete = customProducts.filter((p) => p.category === name);
      await Promise.all(toDelete.map((p) => deleteDoc(doc(db, "products", p.id))));
    } catch (e) {
      console.error("Delete category failed:", e);
      alert("Couldn't delete that category — check your internet connection and try again.");
    }
    if (activeCategory === name) setActiveCategory("All");
  };

  const handleAdd = (id, personalization, photo) => {
    setCart((prev) => {
      if (photo) {
        // Each uploaded photo is its own order — don't merge into an existing line.
        return [...prev, { id, qty: 1, personalization, photo }];
      }
      const existing = prev.find((i) => i.id === id && i.personalization === personalization && !i.photo);
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id, qty: 1, personalization, photo: null }];
    });
  };

  const handleQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const handleRemove = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  return (
    <div
      style={{
        ...body,
        minHeight: "100vh",
        color: theme.charcoal,
        backgroundColor: theme.kraft,
        backgroundImage: `
          radial-gradient(ellipse 900px 520px at 12% -8%, rgba(110,90,158,0.14), transparent 60%),
          radial-gradient(ellipse 750px 520px at 102% 12%, rgba(192,133,121,0.18), transparent 55%),
          radial-gradient(circle, rgba(110,90,158,0.05) 1px, transparent 1.2px)
        `,
        backgroundSize: "auto, auto, 5px 5px",
        backgroundAttachment: "fixed, fixed, fixed",
      }}
    >
      <style>{`
        @keyframes cgFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .cg-fade-in { animation: cgFadeIn 0.5s ease-out both; }
      `}</style>
      {showSplash && <IntroSplash onDone={() => setShowSplash(false)} />}
      {!showSplash && <GiftSparkles />}
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: theme.emerald, borderBottom: `1.5px solid ${theme.gold}` }}
      >
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="Customised Gifts"
            className="w-7 h-7 rounded-full object-cover"
            style={{ border: `1.5px solid ${theme.gold}` }}
          />
          <span style={{ ...display, fontSize: 20, fontWeight: 600, color: theme.cream }}>Customised Gifts</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setPanel("wishlist")} className="relative flex items-center" aria-label="Wishlist">
            <Heart size={21} color={theme.goldSoft} fill={wishlist.length > 0 ? theme.goldSoft : "none"} />
            {wishlist.length > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: theme.gold, color: theme.emeraldDark, fontSize: 11, fontWeight: 700 }}
              >
                {wishlist.length}
              </span>
            )}
          </button>
          <button onClick={() => setPanel("settings")} className="flex items-center" aria-label="My account">
            {account ? <UserCircle size={22} color={theme.goldSoft} /> : <Settings size={21} color={theme.goldSoft} />}
          </button>
          <button onClick={() => setPanel("cart")} className="relative flex items-center gap-2" aria-label="Cart">
            <ShoppingBag size={22} color={theme.goldSoft} />
            {cartCount > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: theme.gold, color: theme.emeraldDark, fontSize: 11, fontWeight: 700 }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Instagram-style profile + grid */}
      <ProfileHeader
        productCount={allProducts.length}
        activeCategory={activeCategory}
        categories={shopCategories}
        onCategoryChange={setActiveCategory}
        shopStats={shopStats}
      />
      <section id="shop" className="max-w-2xl mx-auto pb-16 px-3">
        <div
          className="relative rounded-[26px] pt-8 pb-3 px-3"
          style={{
            background: `
              repeating-linear-gradient(45deg, ${theme.emerald}26 0px, ${theme.emerald}26 3px, transparent 3px, transparent 30px),
              repeating-linear-gradient(-45deg, ${theme.gold}30 0px, ${theme.gold}30 2px, transparent 2px, transparent 30px),
              radial-gradient(circle at 18% 28%, rgba(255,255,255,0.65) 1.6px, transparent 1.8px),
              radial-gradient(circle at 62% 68%, rgba(255,255,255,0.65) 1.6px, transparent 1.8px),
              radial-gradient(circle at 82% 22%, rgba(255,255,255,0.55) 1.4px, transparent 1.6px),
              linear-gradient(160deg, ${theme.kraftDark}, ${theme.goldSoft}55)
            `,
            border: `1.5px dashed ${theme.gold}80`,
          }}
        >
          <span
            className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full"
            style={{
              ...body,
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 16px",
              background: theme.emerald,
              color: theme.cream,
              boxShadow: "0 4px 12px rgba(69,52,101,0.35)",
            }}
          >
            🎀 Unwrap our gifts
          </span>

          <div className="rounded-[20px] overflow-hidden" style={{ background: theme.cream, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5)" }}>
            {visibleProducts.length === 0 ? (
              <p style={{ ...body, fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "40px 0" }}>
                No products in this category yet.
              </p>
            ) : (
              <div className="grid grid-cols-3" style={{ gap: 2 }}>
                {visibleProducts.map((p) => (
                  <GridTile key={p.id} product={p} onOpen={setActiveProduct} wishlist={wishlist} onToggleWishlist={handleToggleWishlist} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-10 text-center"
        style={{ background: theme.emeraldDark, color: theme.cream, borderTop: `1.5px solid ${theme.gold}` }}
      >
        <p style={{ ...display, fontSize: 18, margin: 0 }}>Customised Gifts</p>
        <p style={{ ...body, fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          Every order is confirmed by us on WhatsApp before it's made.
        </p>
        <a
          href={`https://wa.me/${SELLER_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Customised Gifts! I had a question — ")}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...body, fontSize: 13, color: theme.goldSoft, marginTop: 10, display: "inline-block", textDecoration: "underline" }}
        >
          Need help? Message us
        </a>
        <div>
          <button
            onClick={() => setPanel("terms")}
            style={{ ...body, fontSize: 12, color: theme.goldSoft, marginTop: 14, textDecoration: "underline", opacity: 0.85 }}
          >
            Terms & Conditions
          </button>
        </div>
      </footer>

      <HelpButton />

      {/* Owner-only: tap to add a new product from the gallery */}
      <button
        onClick={() => setShowAdminGate(true)}
        className="fixed bottom-5 left-5 z-30 flex items-center justify-center w-11 h-11 rounded-full"
        style={{ background: theme.ink, color: theme.cream, boxShadow: "0 6px 16px rgba(43,58,47,0.35)" }}
        aria-label="Owner: add product"
      >
        <Lock size={17} />
      </button>

      {showAdminGate && (
        <AdminGate
          onSuccess={() => {
            setShowAdminGate(false);
            setShowAddProduct(true);
          }}
          onClose={() => setShowAdminGate(false)}
        />
      )}
      {showAddProduct && (
        <AddProductPanel
          categories={ownerCategories}
          customProducts={customProducts}
          onAdd={handleAddProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          shopStats={shopStats}
          onUpdateShopStats={handleUpdateShopStats}
          onClose={() => setShowAddProduct(false)}
        />
      )}

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAdd={handleAdd}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      )}
      {panel === "cart" && (
        <CartPanel
          cart={cart}
          products={allProducts}
          onClose={() => setPanel(null)}
          onQty={handleQty}
          onRemove={handleRemove}
          onCheckout={() => setPanel("checkout")}
        />
      )}
      {panel === "checkout" && (
        <CheckoutPanel
          cart={cart}
          products={allProducts}
          onBack={() => setPanel("cart")}
          onClose={() => {
            setPanel(null);
            setCart([]);
          }}
          savedCustomer={account}
        />
      )}
      {panel === "wishlist" && (
        <WishlistPanel
          wishlist={wishlist}
          products={allProducts}
          onClose={() => setPanel(null)}
          onOpenProduct={setActiveProduct}
          onToggleWishlist={handleToggleWishlist}
        />
      )}
      {panel === "settings" && (
        <SettingsPanel
          account={account}
          onSave={handleSaveAccount}
          onLogout={handleLogoutAccount}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "terms" && <TermsPanel onClose={() => setPanel(null)} />}
    </div>
  );
}
