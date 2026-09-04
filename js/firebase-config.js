/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-config.js
   Firebase Foundation: App Init · Auth · Firestore · Storage
   ফেজ ১ — এই ফাইলটি সবার আগে লোড হবে (api.js / app.js এর আগে)
   ═══════════════════════════════════════════════════════════════ */

// Filter benign Firestore offline/unavailable notices in sandbox / offline environments
(function() {
  const origErr = console.error;
  const origWarn = console.warn;
  const isBenignFirestoreMsg = (args) => {
    const text = args.map(a => (a && a.message) ? a.message : String(a)).join(' ');
    return text.includes("Could not reach Cloud Firestore backend") ||
           text.includes("FirebaseError: [code=unavailable]") ||
           (text.includes("@firebase/firestore") && text.includes("unavailable"));
  };
  console.error = function(...args) {
    if (isBenignFirestoreMsg(args)) return;
    origErr.apply(console, args);
  };
  console.warn = function(...args) {
    if (isBenignFirestoreMsg(args)) return;
    origWarn.apply(console, args);
  };
})();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBBDQc5CIzjuKDVVYX87oPGry-tVQys6k4",
  authDomain: "nexos-hh.firebaseapp.com",
  projectId: "nexos-hh",
  storageBucket: "nexos-hh.firebasestorage.app",
  messagingSenderId: "382637524347",
  appId: "1:382637524347:web:c81a6cdc4834bd79f4e9de",
  measurementId: "G-LD289VX0FH"
};

/* ── ২. Firebase App চালু করা ── */
if (typeof firebase !== "undefined") {
  // Set Firestore log level to silent to prevent noisy connection warnings in sandboxed/offline environments
  if (firebase.firestore && typeof firebase.firestore.setLogLevel === "function") {
    try {
      firebase.firestore.setLogLevel("silent");
    } catch (e) {}
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}

/* ── ৩. গ্লোবাল রেফারেন্স (পুরো অ্যাপে window.db / window.auth / window.storage দিয়ে ব্যবহার হবে) ── */
window.db      = firebase.firestore();
window.auth    = firebase.auth();
window.storage = firebase.storage();

/* ── ৪. Firestore সেটিংস ও অফলাইন পারসিস্টেন্স ── */
try {
  window.db.settings({
    experimentalForceLongPolling: true,
    merge: true
  });
} catch (e) {}

if (window.db && typeof window.db.enablePersistence === "function") {
  window.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

// In sandbox iframe environments or when backend is unreachable, gracefully transition to offline cache mode
(async function verifyBackendReachability() {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("offline-timeout")), 2500));
    const probe = window.db.collection("settings").limit(1).get();
    await Promise.race([probe, timeout]);
  } catch (err) {
    // Gracefully switch to offline mode so pending queries resolve instantly from local cache
    try {
      if (window.db && typeof window.db.disableNetwork === "function") {
        await window.db.disableNetwork();
      }
    } catch (e) {}
  }
})();

/* ── ৫. Firestore টাইমস্ট্যাম্প হেল্পার ── */
window.FieldValue = firebase.firestore.FieldValue;
window.serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

/* ── ৬. কালেকশন রেফারেন্স (একটাই জায়গায় নাম ঠিক রাখলে সব মডিউলে reuse করা যাবে) ── */
window.Collections = {
  users:              window.db.collection("users"),
  stores:             window.db.collection("stores"),
  products:           window.db.collection("products"),
  customers:          window.db.collection("customers"),
  orders:             window.db.collection("orders"),
  collections:        window.db.collection("collections"),
  discounts:          window.db.collection("discounts"),
  inventory:          window.db.collection("inventory"),
  inventoryMovements: window.db.collection("inventory_movements"),
  activities:         window.db.collection("activities"),
  settings:           window.db.collection("settings")
};

console.log("✅ NexOS Firebase Foundation লোড হয়েছে — Project:", firebaseConfig.projectId);

