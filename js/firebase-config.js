/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-config.js
   Firebase Foundation: App Init · Auth · Firestore · Storage
   ফেজ ১ — এই ফাইলটি সবার আগে লোড হবে (api.js / app.js এর আগে)
   ═══════════════════════════════════════════════════════════════ */

/* ── ১. আপনার Firebase কনফিগ এখানে বসান ──
   Firebase Console → Project Settings → General → Your apps → SDK setup
   এখান থেকে কপি করে নিচের অবজেক্টে বসিয়ে দিন। */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* ── ২. Firebase App চালু করা ── */
firebase.initializeApp(firebaseConfig);

/* ── ৩. গ্লোবাল রেফারেন্স (পুরো অ্যাপে window.db / window.auth / window.storage দিয়ে ব্যবহার হবে) ── */
window.db      = firebase.firestore();
window.auth    = firebase.auth();
window.storage = firebase.storage();

/* ── ৪. অফলাইন পারসিস্টেন্স (PWA / Offline Cache Mode এর জন্য জরুরি) ── */
window.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore persistence: একই সময়ে একাধিক ট্যাব খোলা আছে, তাই persistence বন্ধ থাকবে।");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence: এই ব্রাউজার সাপোর্ট করে না।");
  }
});

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
