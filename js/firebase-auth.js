/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-auth.js
   Authentication + Role System (Owner · Admin · Manager · Staff)
   ═══════════════════════════════════════════════════════════════ */

window.NexAuth = {
  currentUser: null,   // Firebase Auth user object
  profile: null,       // users/{uid} document (role, name, storeId, etc.)

  ROLES: {
    owner:   4,
    admin:   3,
    manager: 2,
    staff:   1
  },

  /* ── Auto-ensure an active authenticated operator session ── */
  async ensureAuth() {
    if (this.currentUser && this.profile) return this.profile;
    
    return new Promise((resolve) => {
      const unsub = window.auth.onAuthStateChanged(async (user) => {
        unsub();
        if (user) {
          this.currentUser = user;
          const prof = await this._loadProfile(user.uid);
          resolve(prof);
        } else {
          // Auto-sign in anonymously as authorized merchant operator for seamless immediate CRUD access
          try {
            const cred = await window.auth.signInAnonymously();
            this.currentUser = cred.user;
            const prof = await this._loadProfile(cred.user.uid, { name: "Merchant Admin", role: "admin" });
            resolve(prof);
          } catch (e) {
            console.warn("Anonymous operator auth notice (using local operator mode):", e.message);
            this.profile = {
              id: "operator-local",
              name: "Merchant Admin",
              email: "admin@handsandhead.com",
              role: "admin"
            };
            const badge = document.getElementById("modeTag");
            if (badge) badge.innerText = "ADMIN · Merchant Admin";
            resolve(this.profile);
          }
        }
      });
    });
  },

  /* ── Email / Password Login ── */
  async login(email, password) {
    try {
      const cred = await window.auth.signInWithEmailAndPassword(email, password);
      this.currentUser = cred.user;
      await this._loadProfile(cred.user.uid);
      return { ok: true, user: cred.user, profile: this.profile };
    } catch (err) {
      console.error("Login failed:", err);
      return { ok: false, error: this._friendlyError(err) };
    }
  },

  /* ── Email / Password Registration / Operator Provisioning ── */
  async register(email, password, name = "Operator", role = "admin") {
    try {
      const cred = await window.auth.createUserWithEmailAndPassword(email, password);
      this.currentUser = cred.user;
      const profile = {
        name,
        email,
        role,
        storeId: "default",
        active: true,
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      };
      await window.Collections.users.doc(cred.user.uid).set(profile);
      this.profile = { id: cred.user.uid, ...profile };
      return { ok: true, user: cred.user, profile: this.profile };
    } catch (err) {
      return { ok: false, error: this._friendlyError(err) };
    }
  },

  /* ── Quick Operator Session ── */
  async loginAsOperator(name = "Merchant Admin", role = "admin") {
    try {
      let user = window.auth.currentUser;
      if (!user) {
        const cred = await window.auth.signInAnonymously();
        user = cred.user;
      }
      this.currentUser = user;
      const profile = await this._loadProfile(user.uid, { name, role });
      return { ok: true, user, profile };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  /* ── Logout ── */
  async logout() {
    await window.auth.signOut();
    this.currentUser = null;
    this.profile = null;
  },

  /* ── Create Staff / Team Account ── */
  async createStaffAccount({ email, password, name, role = "staff", storeId = "default" }) {
    if (!this.hasRole("admin")) {
      return { ok: false, error: "Only Admin or Owner can provision new staff accounts." };
    }
    try {
      // Secondary auth client to avoid switching current active session
      const secondaryApp = firebase.apps.find(a => a.name === "StaffProvisioner") ||
        firebase.initializeApp(firebase.app().options, "StaffProvisioner");
      const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      await window.Collections.users.doc(cred.user.uid).set({
        name, email, role, storeId,
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp(),
        active: true
      });
      await secondaryApp.auth().signOut();
      return { ok: true, uid: cred.user.uid };
    } catch (err) {
      return { ok: false, error: this._friendlyError(err) };
    }
  },

  /* ── Switch Active Operator Role in Firestore ── */
  async setOperatorRole(newRole) {
    if (!this.currentUser) return;
    const patch = { role: newRole, updatedAt: window.serverTimestamp() };
    await window.Collections.users.doc(this.currentUser.uid).set(patch, { merge: true });
    if (this.profile) this.profile.role = newRole;
    document.dispatchEvent(new CustomEvent("nexos:authReady", { detail: this.profile }));
  },

  /* ── users/{uid} profile loader ── */
  async _loadProfile(uid, defaultData = null) {
    try {
      const doc = await window.Collections.users.doc(uid).get();
      if (doc.exists) {
        this.profile = { id: doc.id, ...doc.data() };
        // Ensure default role is at least staff/admin
        if (!this.profile.role) {
          this.profile.role = "admin";
          await window.Collections.users.doc(uid).update({ role: "admin", updatedAt: window.serverTimestamp() });
        }
      } else {
        const fallback = {
          name: defaultData?.name || this.currentUser?.displayName || this.currentUser?.email?.split("@")[0] || "Merchant Admin",
          email: defaultData?.email || this.currentUser?.email || "admin@handsandhead.com",
          role: defaultData?.role || "admin",
          storeId: "default",
          createdAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp(),
          active: true
        };
        await window.Collections.users.doc(uid).set(fallback);
        this.profile = { id: uid, ...fallback };
      }
    } catch (err) {
      console.warn("Profile load fallback:", err);
      this.profile = {
        id: uid,
        name: defaultData?.name || "Merchant Admin",
        email: defaultData?.email || "admin@handsandhead.com",
        role: defaultData?.role || "admin"
      };
    }
    return this.profile;
  },

  /* ── Role verification ── */
  hasRole(minRole) {
    if (!this.profile) return false;
    const mine = this.ROLES[this.profile.role] || 0;
    const need = this.ROLES[minRole] || 999;
    return mine >= need;
  },

  _friendlyError(err) {
    const map = {
      "auth/wrong-password": "Incorrect password. Please verify and retry.",
      "auth/user-not-found": "No registered account found with this email.",
      "auth/invalid-email": "Invalid email address format.",
      "auth/too-many-requests": "Too many failed attempts. Please retry shortly.",
      "auth/email-already-in-use": "An account already exists with this email."
    };
    return map[err.code] || err.message || "An error occurred during authentication.";
  }
};

/* ── Global Auth State Listener ── */
window.auth.onAuthStateChanged(async (user) => {
  window.NexAuth.currentUser = user;
  if (user) {
    await window.NexAuth._loadProfile(user.uid);
    const badge = document.getElementById("modeTag");
    if (badge && window.NexAuth.profile) {
      badge.innerText = `${window.NexAuth.profile.role.toUpperCase()} · ${window.NexAuth.profile.name}`;
    }
    document.dispatchEvent(new CustomEvent("nexos:authReady", { detail: window.NexAuth.profile }));
  } else {
    window.NexAuth.profile = null;
    const badge = document.getElementById("modeTag");
    if (badge) badge.innerText = "LITE SELLER";
    document.dispatchEvent(new CustomEvent("nexos:authReady", { detail: null }));
  }
});

/* ── Operator Auth & Account Profile Modal ── */
window.openAuthModal = function () {
  const p = window.NexAuth.profile;
  const user = window.NexAuth.currentUser;

  if (user && p) {
    openSheet(`
      <h3>Operator Profile</h3>
      <p class="hint">Authenticated as ${p.name} (${p.email || 'Anonymous Session'})</p>
      <div style="padding:0 20px 20px;">
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;">Active Role</div>
            <span class="pill ok">${(p.role || 'admin').toUpperCase()}</span>
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:2px;">${p.name}</div>
          <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${p.email || 'Operator session ID: ' + user.uid.slice(0, 8)}</div>
        </div>

        <div class="field"><label>Change Role Level (Security Tier)</label>
          <select id="auth_role_select" onchange="window.NexAuth.setOperatorRole(this.value); toast('Role updated to ' + this.value);">
            <option value="owner" ${p.role === 'owner' ? 'selected' : ''}>Owner (Level 4 - Full System Access)</option>
            <option value="admin" ${p.role === 'admin' ? 'selected' : ''}>Admin (Level 3 - Catalog, CRM, Orders, Inventory)</option>
            <option value="manager" ${p.role === 'manager' ? 'selected' : ''}>Manager (Level 2 - Operations, Reports, Stock)</option>
            <option value="staff" ${p.role === 'staff' ? 'selected' : ''}>Staff (Level 1 - Orders & Data Entry)</option>
          </select>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn btn-dark" onclick="window.NexAuth.logout().then(() => { toast('Signed out'); closeSheet(); render(); });">Sign Out</button>
          <button class="btn btn-gold" onclick="closeSheet()">Done</button>
        </div>
      </div>
    `);
    return;
  }

  // Not signed in
  openSheet(`
    <h3>Staff Access</h3>
    <p class="hint">Authenticate to access management features</p>
    <div style="padding:0 20px 20px;">
      <div class="field"><label>Email</label><input id="fb_email" type="email" placeholder="admin@handsandhead.com"/></div>
      <div class="field"><label>Password</label><input id="fb_pass" type="password" placeholder="••••••••"/></div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-gold" id="fb_login_btn" onclick="window.submitFirebaseLogin()">Sign In</button>
        <button class="btn btn-dark" onclick="window.NexAuth.loginAsOperator('Merchant Admin', 'admin').then(() => { toast('Unlocked Operator Access ✓'); closeSheet(); render(); });">Instant Unlock</button>
      </div>
    </div>
  `);
};

window.submitFirebaseLogin = async function () {
  const email = document.getElementById("fb_email").value.trim();
  const pass = document.getElementById("fb_pass").value;
  if (!email || !pass) { toast("Please enter email and password"); return; }
  const btn = document.getElementById("fb_login_btn");
  btn.innerText = "Signing in…";
  const res = await window.NexAuth.login(email, pass);
  if (res.ok) {
    closeSheet();
    mode = "expert";
    applyTheme(mode);
    render();
    toast(`Welcome, ${res.profile.name} (${res.profile.role.toUpperCase()}) ✓`);
  } else {
    btn.innerText = "Sign In";
    toast(res.error);
  }
};

window.openFirebaseGate = window.openAuthModal;

// Auto-initialize session on load
window.NexAuth.ensureAuth();

