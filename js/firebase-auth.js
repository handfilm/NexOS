/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-auth.js
   Authentication + Role System (Owner · Admin · Manager · Staff)
   পুরনো PINS{} সিস্টেমের জায়গায় আসল Firebase Auth
   ═══════════════════════════════════════════════════════════════ */

window.NexAuth = {
  currentUser: null,   // Firebase Auth user object
  profile: null,       // users/{uid} ডকুমেন্ট (role, name, storeId ইত্যাদি)

  ROLES: {
    owner:   4,
    admin:   3,
    manager: 2,
    staff:   1
  },

  /* ── ইমেইল/পাসওয়ার্ড দিয়ে লগইন ── */
  async login(email, password) {
    try {
      const cred = await window.auth.signInWithEmailAndPassword(email, password);
      await this._loadProfile(cred.user.uid);
      return { ok: true, user: cred.user, profile: this.profile };
    } catch (err) {
      console.error("Login failed:", err);
      return { ok: false, error: this._friendlyError(err) };
    }
  },

  /* ── লগআউট ── */
  async logout() {
    await window.auth.signOut();
    this.currentUser = null;
    this.profile = null;
  },

  /* ── নতুন স্টাফ/অপারেটর তৈরি (শুধু owner/admin থেকে কল করা উচিত) ──
     নোট: প্রোডাকশনে ইউজার তৈরি Cloud Function দিয়ে করাই নিরাপদ,
     যাতে client-side এ admin secret বা কারো password expose না হয়। */
  async createStaffAccount({ email, password, name, role = "staff", storeId }) {
    if (!this.hasRole("admin")) {
      return { ok: false, error: "শুধুমাত্র Admin/Owner নতুন অ্যাকাউন্ট তৈরি করতে পারবে।" };
    }
    try {
      // সুপারিশ: এটি backend/Cloud Function এ সরিয়ে নিন (createUserWithEmailAndPassword
      // কল করলে বর্তমান সেশন থেকে লগআউট হয়ে যায় — তাই secondary app instance ব্যবহার করা ভালো)
      const secondaryApp = firebase.initializeApp(firebase.app().options, "Secondary");
      const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      await window.Collections.users.doc(cred.user.uid).set({
        name, email, role, storeId,
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp(),
        active: true
      });
      await secondaryApp.auth().signOut();
      await secondaryApp.delete();
      return { ok: true, uid: cred.user.uid };
    } catch (err) {
      return { ok: false, error: this._friendlyError(err) };
    }
  },

  /* ── users/{uid} প্রোফাইল লোড করা (role সহ) ── */
  async _loadProfile(uid) {
    const doc = await window.Collections.users.doc(uid).get();
    if (doc.exists) {
      this.profile = { id: doc.id, ...doc.data() };
    } else {
      // প্রথমবার লগইন — ডিফল্ট staff প্রোফাইল তৈরি
      const fallback = {
        name: window.auth.currentUser?.email || "New User",
        email: window.auth.currentUser?.email || "",
        role: "staff",
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp(),
        active: true
      };
      await window.Collections.users.doc(uid).set(fallback);
      this.profile = { id: uid, ...fallback };
    }
    return this.profile;
  },

  /* ── রোল চেক (hierarchical: admin চাইলে manager/staff এর কাজও করতে পারবে) ── */
  hasRole(minRole) {
    if (!this.profile) return false;
    const mine = this.ROLES[this.profile.role] || 0;
    const need = this.ROLES[minRole] || 999;
    return mine >= need;
  },

  _friendlyError(err) {
    const map = {
      "auth/wrong-password": "পাসওয়ার্ড ভুল হয়েছে।",
      "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।",
      "auth/invalid-email": "ইমেইল ঠিকানা সঠিক নয়।",
      "auth/too-many-requests": "অনেকবার ভুল চেষ্টা হয়েছে, একটু পর আবার চেষ্টা করুন।",
      "auth/email-already-in-use": "এই ইমেইল দিয়ে আগে থেকেই অ্যাকাউন্ট আছে।"
    };
    return map[err.code] || err.message || "অজানা সমস্যা হয়েছে।";
  }
};

/* ── অ্যাপ লোড হওয়ার সাথে সাথে সেশন চেক ──
   Firebase নিজে থেকেই ব্রাউজারে সেশন মনে রাখে, তাই রিফ্রেশ দিলেও লগইন থাকবে। */
window.auth.onAuthStateChanged(async (user) => {
  window.NexAuth.currentUser = user;
  if (user) {
    await window.NexAuth._loadProfile(user.uid);
    document.dispatchEvent(new CustomEvent("nexos:authReady", { detail: window.NexAuth.profile }));
  } else {
    window.NexAuth.profile = null;
    document.dispatchEvent(new CustomEvent("nexos:authReady", { detail: null }));
  }
});

/* ── পুরনো PIN-Gate UI এর সাথে সংযোগ (ধাপে ধাপে migrate করার জন্য) ──
   openGate() এখন ইমেইল/পাসওয়ার্ড ফর্ম দেখাবে, PIN নয়। */
window.openFirebaseGate = function () {
  openSheet(`
    <h3>স্টাফ লগইন</h3>
    <p class="hint">আপনার H&amp;H Nexus অ্যাকাউন্ট দিয়ে লগইন করুন</p>
    <div style="padding:0 20px 20px;">
      <div class="field"><label>ইমেইল</label><input id="fb_email" type="email" placeholder="you@handsandhead.com"/></div>
      <div class="field"><label>পাসওয়ার্ড</label><input id="fb_pass" type="password" placeholder="••••••••"/></div>
      <button class="btn btn-gold" id="fb_login_btn" style="margin-top:8px;" onclick="window.submitFirebaseLogin()">লগইন করুন</button>
    </div>
  `);
};

window.submitFirebaseLogin = async function () {
  const email = document.getElementById("fb_email").value.trim();
  const pass = document.getElementById("fb_pass").value;
  if (!email || !pass) { toast("ইমেইল ও পাসওয়ার্ড দিন"); return; }
  const btn = document.getElementById("fb_login_btn");
  btn.innerText = "লগইন হচ্ছে…";
  const res = await window.NexAuth.login(email, pass);
  if (res.ok) {
    closeSheet();
    mode = res.profile.role === "staff" ? "lite" : "expert";
    applyTheme(mode);
    render();
    toast(`স্বাগতম, ${res.profile.name} (${res.profile.role}) ✓`);
  } else {
    btn.innerText = "লগইন করুন";
    toast(res.error);
  }
};
