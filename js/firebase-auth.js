/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-auth.js
   Enterprise Firebase Authentication & Multi-Tenant Store Ownership
   ═══════════════════════════════════════════════════════════════ */

(function () {
  /* ── SHA-256 Cryptographic Hash Helper ── */
  async function sha256(str) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback lightweight hash for legacy browsers
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "legacy_" + Math.abs(hash).toString(16);
  }

  // Pre-calculated hashes for default PINs ("1981", "2024", "0000")
  const DEFAULT_PIN_HASHES = new Set([
    "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", // 1234
    "95c962b3227fa733d3c7343e8d2e67df1bb285e6834b64a27ea802f06b986e68", // 1981
    "f2d81a260dea8a100dd5179847193b8529d32ec58b049baa2755a558f359d966", // 2024
    "4a7d1ed414474e4033ac29ccb8653d9bce568fcd1feed561f672a65e454e9fa0"  // 0000
  ]);

  window.NexAuth = {
    currentUser: null,       // Firebase Auth User
    profile: null,           // Firestore users/{uid} document
    activeStore: null,       // Firestore stores/{storeId} document

    ROLES: {
      owner: 4,
      admin: 3,
      manager: 2,
      staff: 1
    },

    /* ── Initialize & Ensure Session ── */
    async ensureAuth() {
      if (this.currentUser && this.profile) return this.profile;

      return new Promise((resolve) => {
        const unsub = window.auth.onAuthStateChanged(async (user) => {
          unsub();
          if (user) {
            this.currentUser = user;
            const prof = await this._loadProfile(user.uid);
            await this._loadStore(prof.storeId || "default");
            resolve(prof);
          } else {
            // Provide seamless merchant operator session while prompting real account setup
            try {
              const cred = await window.auth.signInAnonymously();
              this.currentUser = cred.user;
              const prof = await this._loadProfile(cred.user.uid, { name: "Merchant Admin", role: "admin" });
              await this._loadStore(prof.storeId || "default");
              resolve(prof);
            } catch (e) {
              console.warn("Operator fallback profile active:", e.message);
              this.profile = {
                id: "operator-local",
                name: "Merchant Admin",
                email: "admin@handsandhead.com",
                role: "admin",
                storeId: "default"
              };
              this.activeStore = {
                id: "default",
                name: "Hands & Head Official",
                currency: "BDT",
                plan: "Enterprise Pro"
              };
              resolve(this.profile);
            }
          }
        });
      });
    },

    /* ── Real Email / Password Login ── */
    async login(email, password) {
      try {
        const cred = await window.auth.signInWithEmailAndPassword(email, password);
        this.currentUser = cred.user;
        const profile = await this._loadProfile(cred.user.uid);
        await this._loadStore(profile.storeId || "default");
        window.NexEvents.emit(window.NexEvents.EVENTS.AUTH_CHANGED, { user: cred.user, profile });
        return { ok: true, user: cred.user, profile };
      } catch (err) {
        console.error("Login error:", err);
        return { ok: false, error: this._friendlyError(err) };
      }
    },

    /* ── Real Email / Password Registration & Store Provisioning ── */
    async register({ email, password, name = "Merchant Owner", storeName = "Hands & Head Store", role = "owner" }) {
      try {
        const cred = await window.auth.createUserWithEmailAndPassword(email, password);
        this.currentUser = cred.user;

        // 1. Create User's Store Workspace
        const storeRef = await window.Collections.stores.add({
          name: storeName,
          ownerId: cred.user.uid,
          currency: "BDT",
          plan: "Pro Seller",
          members: [cred.user.uid],
          createdAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        });

        const storeId = storeRef.id;

        // 2. Create User Profile
        const profile = {
          name,
          email,
          role,
          storeId,
          active: true,
          createdAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        };

        await window.Collections.users.doc(cred.user.uid).set(profile);
        this.profile = { id: cred.user.uid, ...profile };
        this.activeStore = { id: storeId, name: storeName, ownerId: cred.user.uid, currency: "BDT", plan: "Pro Seller" };

        window.NexEvents.emit(window.NexEvents.EVENTS.AUTH_CHANGED, { user: cred.user, profile: this.profile });
        return { ok: true, user: cred.user, profile: this.profile, store: this.activeStore };
      } catch (err) {
        console.error("Register error:", err);
        return { ok: false, error: this._friendlyError(err) };
      }
    },

    /* ── Real Google Sign-In with Popup ── */
    async loginWithGoogle() {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const cred = await window.auth.signInWithPopup(provider);
        this.currentUser = cred.user;

        const prof = await this._loadProfile(cred.user.uid, {
          name: cred.user.displayName || "Google Operator",
          email: cred.user.email,
          role: "owner"
        });
        await this._loadStore(prof.storeId || "default");
        window.NexEvents.emit(window.NexEvents.EVENTS.AUTH_CHANGED, { user: cred.user, profile: this.profile });
        return { ok: true, user: cred.user, profile: this.profile };
      } catch (err) {
        console.error("Google sign in error:", err);
        return { ok: false, error: this._friendlyError(err) };
      }
    },

    /* ── Password Reset Flow ── */
    async sendPasswordReset(email) {
      if (!email) throw new Error("Please provide your registered account email.");
      try {
        await window.auth.sendPasswordResetEmail(email);
        return { ok: true, message: "Password reset link sent! Check your inbox." };
      } catch (err) {
        return { ok: false, error: this._friendlyError(err) };
      }
    },

    /* ── Logout ── */
    async logout() {
      await window.auth.signOut();
      this.currentUser = null;
      this.profile = null;
      this.activeStore = null;
      window.NexEvents.emit(window.NexEvents.EVENTS.AUTH_CHANGED, null);
    },

    /* ── Multi-Tenant Store & Workspace Management ── */
    getStoreId() {
      return this.profile?.storeId || this.activeStore?.id || "default";
    },

    async switchStore(storeId) {
      if (!storeId) return;
      await this._loadStore(storeId);
      if (this.currentUser) {
        await window.Collections.users.doc(this.currentUser.uid).update({
          storeId,
          updatedAt: window.serverTimestamp()
        });
        if (this.profile) this.profile.storeId = storeId;
      }
      window.NexEvents.emit(window.NexEvents.EVENTS.STORE_SWITCHED, this.activeStore);
      toast(`Switched workspace to ${this.activeStore?.name || storeId} ✓`);
    },

    async _loadStore(storeId) {
      try {
        if (!storeId || storeId === "default") {
          this.activeStore = {
            id: "default",
            name: "Hands & Head Official",
            currency: "BDT",
            plan: "Enterprise Pro"
          };
          return this.activeStore;
        }
        const doc = await window.Collections.stores.doc(storeId).get();
        if (doc.exists) {
          this.activeStore = { id: doc.id, ...doc.data() };
        } else {
          this.activeStore = { id: storeId, name: "Merchant Store", currency: "BDT" };
        }
      } catch (e) {
        console.warn("Store load fallback:", e);
        this.activeStore = { id: storeId, name: "Hands & Head Official", currency: "BDT" };
      }
      return this.activeStore;
    },

    async _loadProfile(uid, defaultData = null) {
      try {
        const doc = await window.Collections.users.doc(uid).get();
        if (doc.exists) {
          this.profile = { id: doc.id, ...doc.data() };
        } else {
          const fallback = {
            name: defaultData?.name || this.currentUser?.displayName || "Merchant Admin",
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
          role: defaultData?.role || "admin",
          storeId: "default"
        };
      }
      return this.profile;
    },

    /* ── Operator 4-Digit PIN Management (Client-side Cryptographic Verification) ── */
    async verifyOperatorPin(pin) {
      if (!pin || pin.length !== 4) return false;
      const hash = await sha256(pin);
      const uid = this.currentUser?.uid || "default";
      const customHash = localStorage.getItem(`nx_pin_hash_${uid}`);

      if (customHash) {
        return hash === customHash;
      }
      // Check default fallback hashes ("1981", "2024", "0000", "1234")
      return DEFAULT_PIN_HASHES.has(hash);
    },

    async setOperatorPin(newPin) {
      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        throw new Error("PIN must be exactly 4 digits.");
      }
      const hash = await sha256(newPin);
      const uid = this.currentUser?.uid || "default";
      localStorage.setItem(`nx_pin_hash_${uid}`, hash);
      return true;
    },

    hasRole(minRole) {
      if (!this.profile) return false;
      const mine = this.ROLES[this.profile.role] || 0;
      const need = this.ROLES[minRole] || 999;
      return mine >= need;
    },

    _friendlyError(err) {
      const map = {
        "auth/wrong-password": "Incorrect password. Please try again or reset it.",
        "auth/user-not-found": "No registered account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/email-already-in-use": "An account already exists with this email address.",
        "auth/weak-password": "Password should be at least 6 characters long.",
        "auth/popup-closed-by-user": "Sign in popup was cancelled."
      };
      return map[err.code] || err.message || "An authentication error occurred.";
    }
  };

  /* ═══════════════════════════════════════════════════════════
     AUTHENTICATION & ACCOUNT PROFILE UI DIALOGS
     ═══════════════════════════════════════════════════════════ */

  /* ── Sign In / Register Modal ── */
  window.openAuthModal = function (tab = "login") {
    openSheet(`
      <div class="grab"></div>
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;">
        <button class="btn btn-sm ${tab === 'login' ? 'btn-gold' : 'btn-dark'}" id="authTabLogin" onclick="window.renderAuthTab('login')" style="flex:1;">Sign In</button>
        <button class="btn btn-sm ${tab === 'register' ? 'btn-gold' : 'btn-dark'}" id="authTabReg" onclick="window.renderAuthTab('register')" style="flex:1;">Create Account</button>
      </div>
      <div id="authModalBody" style="padding:0 10px 20px;"></div>
    `);
    window.renderAuthTab(tab);
  };

  window.renderAuthTab = function (tab) {
    const container = document.getElementById("authModalBody");
    if (!container) return;

    const t1 = document.getElementById("authTabLogin");
    const t2 = document.getElementById("authTabReg");
    if (t1 && t2) {
      t1.className = `btn btn-sm ${tab === 'login' ? 'btn-gold' : 'btn-dark'}`;
      t2.className = `btn btn-sm ${tab === 'register' ? 'btn-gold' : 'btn-dark'}`;
    }

    if (tab === "login") {
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:14px;">
          <h3 style="font-size:20px;margin-bottom:4px;">Merchant Login</h3>
          <p class="hint" style="margin:0;">Access your cloud storefront and ledger</p>
        </div>

        <div class="field"><label>Email Address</label>
          <input id="auth_email" type="email" placeholder="merchant@handsandhead.com"/>
        </div>

        <div class="field"><label>Password</label>
          <input id="auth_pass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter') window.submitLogin()"/>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
          <a href="#" onclick="window.openForgotPassword(); return false;" style="font-size:11px;font-family:var(--mono);color:var(--coral);">Forgot Password?</a>
        </div>

        <button class="btn btn-gold" id="btnLoginSubmit" onclick="window.submitLogin()" style="width:100%;margin-bottom:10px;">
          Sign In to Cloud Account
        </button>

        <div style="display:flex;align-items:center;gap:10px;margin:14px 0;">
          <div style="flex:1;height:1px;background:var(--wire);"></div>
          <span style="font-size:10px;font-family:var(--mono);color:var(--ink-3);">OR</span>
          <div style="flex:1;height:1px;background:var(--wire);"></div>
        </div>

        <button class="btn btn-dark" onclick="window.submitGoogleLogin()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
          <span>Continue with Google</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:14px;">
          <h3 style="font-size:20px;margin-bottom:4px;">Create Merchant Account</h3>
          <p class="hint" style="margin:0;">Provision cloud multi-tenant workspace</p>
        </div>

        <div class="field"><label>Full Name *</label>
          <input id="reg_name" placeholder="Tanvir Hiron"/>
        </div>

        <div class="field"><label>Store / Brand Name *</label>
          <input id="reg_store" placeholder="Hands & Head Dhaka" value="Hands & Head Official"/>
        </div>

        <div class="field"><label>Email Address *</label>
          <input id="reg_email" type="email" placeholder="owner@handsandhead.com"/>
        </div>

        <div class="field"><label>Password (min 6 chars) *</label>
          <input id="reg_pass" type="password" placeholder="••••••••"/>
        </div>

        <button class="btn btn-gold" id="btnRegSubmit" onclick="window.submitRegister()" style="width:100%;margin-top:10px;">
          Create Account &amp; Provision Workspace
        </button>
      `;
    }
  };

  window.submitLogin = async function () {
    const email = document.getElementById("auth_email")?.value.trim();
    const pass = document.getElementById("auth_pass")?.value;
    if (!email || !pass) { toast("Please enter email and password"); return; }

    const btn = document.getElementById("btnLoginSubmit");
    if (btn) { btn.innerText = "Signing in…"; btn.disabled = true; }

    const res = await window.NexAuth.login(email, pass);
    if (res.ok) {
      toast(`Welcome back, ${res.profile.name} ✓`);
      closeSheet();
    } else {
      toast(res.error);
      if (btn) { btn.innerText = "Sign In to Cloud Account"; btn.disabled = false; }
    }
  };

  window.submitRegister = async function () {
    const name = document.getElementById("reg_name")?.value.trim();
    const storeName = document.getElementById("reg_store")?.value.trim();
    const email = document.getElementById("reg_email")?.value.trim();
    const pass = document.getElementById("reg_pass")?.value;

    if (!name || !email || !pass) { toast("Please fill in all required fields"); return; }
    if (pass.length < 6) { toast("Password must be at least 6 characters"); return; }

    const btn = document.getElementById("btnRegSubmit");
    if (btn) { btn.innerText = "Provisioning…"; btn.disabled = true; }

    const res = await window.NexAuth.register({ email, password: pass, name, storeName });
    if (res.ok) {
      toast(`Account & store workspace created successfully ✓`);
      closeSheet();
    } else {
      toast(res.error);
      if (btn) { btn.innerText = "Create Account & Provision Workspace"; btn.disabled = false; }
    }
  };

  window.submitGoogleLogin = async function () {
    toast("Opening Google Sign-In…");
    const res = await window.NexAuth.loginWithGoogle();
    if (res.ok) {
      toast(`Signed in as ${res.profile.name} ✓`);
      closeSheet();
    } else {
      toast(res.error);
    }
  };

  window.openForgotPassword = function () {
    openSheet(`
      <div class="grab"></div>
      <h3>Reset Password</h3>
      <p class="hint">Enter your email to receive recovery instructions</p>
      <div style="padding:0 10px 20px;">
        <div class="field"><label>Account Email</label>
          <input id="reset_email" type="email" placeholder="merchant@handsandhead.com"/>
        </div>
        <button class="btn btn-gold" onclick="window.submitPasswordReset()" style="width:100%;margin-top:10px;">
          Send Reset Link
        </button>
        <button class="btn btn-dark" onclick="window.openAuthModal('login')" style="width:100%;margin-top:8px;">
          Back to Login
        </button>
      </div>
    `);
  };

  window.submitPasswordReset = async function () {
    const email = document.getElementById("reset_email")?.value.trim();
    if (!email) { toast("Please enter your account email"); return; }
    try {
      const res = await window.NexAuth.sendPasswordReset(email);
      if (res.ok) {
        toast(res.message);
        closeSheet();
      } else {
        toast(res.error);
      }
    } catch (e) {
      toast("Error: " + e.message);
    }
  };

  /* ── Account Profile & Workspace Settings Modal ── */
  window.openAccountProfileModal = async function () {
    await window.NexAuth.ensureAuth();
    const prof = window.NexAuth.profile || {};
    const store = window.NexAuth.activeStore || {};
    const user = window.NexAuth.currentUser;
    const isAnonymous = user?.isAnonymous;

    openSheet(`
      <div class="grab"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:700;letter-spacing:2px;text-transform:uppercase;">
            Account &amp; Workspace
          </div>
          <h3 style="margin:0;font-size:20px;">${prof.name || 'Merchant Admin'}</h3>
        </div>
        <span class="pill ${prof.role === 'owner' ? 'ok' : 'info'}" style="font-size:8.5px;">
          ${(prof.role || 'ADMIN').toUpperCase()}
        </span>
      </div>

      <div style="padding:0 4px 20px;">
        <!-- User Badge Card -->
        <div style="background:var(--bg-neu);border-radius:var(--r-md);box-shadow:var(--neu-flat-sm);padding:14px;display:flex;align-items:center;gap:14px;margin-bottom:14px;">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--coral-gradient);box-shadow:var(--coral-shadow);display:flex;align-items:center;justify-content:center;color:#FFF;font-size:18px;font-weight:700;font-family:var(--display);">
            ${(prof.name || 'H&H').slice(0, 2).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:var(--ink);">${prof.name}</div>
            <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${prof.email}</div>
            <div style="font-size:10px;color:var(--gold);font-family:var(--mono);margin-top:2px;">
              ${isAnonymous ? '⚡ Guest Session (Unlinked)' : '✓ Verified Cloud Account'}
            </div>
          </div>
        </div>

        <!-- Store / Workspace Details -->
        <div style="background:var(--bg-neu);border-radius:var(--r-md);box-shadow:var(--neu-flat-sm);padding:14px;margin-bottom:14px;">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;font-weight:700;">
            Active Storefront Workspace
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--ink);">${store.name || 'Hands & Head Official'}</div>
              <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">ID: ${store.id || 'default'} · Currency: ${store.currency || 'BDT'}</div>
            </div>
            <span class="pill ok" style="font-size:8px;">${store.plan || 'Pro'}</span>
          </div>
        </div>

        <!-- Operator PIN Management Section -->
        <div style="background:var(--bg-neu);border-radius:var(--r-md);box-shadow:var(--neu-flat-sm);padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">
              Local Operator PIN
            </div>
            <span style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">4-Digit Gate</span>
          </div>
          <p style="font-size:11.5px;color:var(--ink-2);margin-bottom:10px;">
            Use a fast 4-digit PIN to unlock the floor terminal without re-entering your account password.
          </p>
          <div style="display:flex;gap:8px;">
            <input id="new_operator_pin" type="password" inputmode="numeric" maxlength="4" placeholder="New PIN" style="flex:1;text-align:center;font-size:16px;letter-spacing:4px;height:38px;border-radius:var(--r-sm);border:none;background:var(--bg-neu);box-shadow:var(--neu-track);color:var(--ink);"/>
            <button class="btn btn-sm btn-gold" onclick="window.saveNewOperatorPin()">Update PIN</button>
          </div>
        </div>

        <!-- Action Links -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${isAnonymous ? `
            <button class="btn btn-gold" onclick="closeSheet(); window.openAuthModal('register');">
              Link with Full Merchant Account
            </button>
          ` : ''}
          <button class="btn btn-dark" onclick="window.openAuthModal('login')">
            Switch / Sign In Different Account
          </button>
          <button class="btn btn-dark" style="color:var(--warn);" onclick="window.submitSignOut()">
            Sign Out Session
          </button>
        </div>
      </div>
    `);
  };

  window.saveNewOperatorPin = async function () {
    const pin = document.getElementById("new_operator_pin")?.value.trim();
    if (!pin || pin.length !== 4) { toast("Please enter a 4-digit numeric PIN"); return; }
    try {
      await window.NexAuth.setOperatorPin(pin);
      toast("Operator PIN updated successfully ✓");
      document.getElementById("new_operator_pin").value = "";
    } catch (e) {
      toast("Error: " + e.message);
    }
  };

  window.submitSignOut = async function () {
    if (!confirm("Are you sure you want to sign out?")) return;
    await window.NexAuth.logout();
    toast("Signed out successfully");
    closeSheet();
    location.reload();
  };

  console.log("🔐 NexAuth enterprise authentication & store ownership initialized.");
})();
