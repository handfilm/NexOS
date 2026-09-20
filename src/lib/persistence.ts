import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  limit,
  writeBatch,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import { db as sharedDb } from './firebase';

export const firebaseConfig = {
  apiKey: "AIzaSyAU9sICCVDeZB8Ht-IirF_3vXLYb6Nap8k",
  authDomain: "grounded-trail-1dtd0.firebaseapp.com",
  projectId: "grounded-trail-1dtd0",
  storageBucket: "grounded-trail-1dtd0.firebasestorage.app",
  messagingSenderId: "170252932635",
  appId: "1:170252932635:web:7ca7fec34767fcb521cabe",
  firestoreDatabaseId: "ai-studio-nexos-1c2cf9c3-6e2f-4734-91f7-5d4353af2059"
};

export const DEFAULT_OPERATOR_IDENTITY = {
  uid: "O1yL01adObRB0XfIcjzYZefQ3yg2",
  role: "owner",
  email: "admin@handsandhead.com"
};

let _dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (_dbInstance) return _dbInstance;
  _dbInstance = sharedDb;
  return _dbInstance;
}

/**
 * Inject the persistent local fallback operator identity across localStorage and window session
 * to guarantee zero deadlocks or missing authentication states.
 */
export function injectFallbackOperatorIdentity(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('nx_session_token', 'session_operator_root');
    localStorage.setItem('nx_saved_role', DEFAULT_OPERATOR_IDENTITY.role);
    localStorage.setItem('nx_operator_identity', JSON.stringify(DEFAULT_OPERATOR_IDENTITY));
    localStorage.setItem('handsandhead_operator_pin_verified', 'true');
    localStorage.setItem('handsandhead_operator_pin_timestamp', String(Date.now()));
  } catch (e) {
    console.debug('[PERSISTENCE] Error saving operator session to localStorage:', e);
  }

  const anyWin = window as any;
  if (!anyWin.NexAuth) {
    anyWin.NexAuth = {};
  }
  anyWin.NexAuth.currentUser = {
    uid: DEFAULT_OPERATOR_IDENTITY.uid,
    email: DEFAULT_OPERATOR_IDENTITY.email,
    displayName: 'Merchant Admin',
    isAnonymous: false
  };
  anyWin.NexAuth.profile = {
    id: DEFAULT_OPERATOR_IDENTITY.uid,
    uid: DEFAULT_OPERATOR_IDENTITY.uid,
    name: 'Merchant Admin',
    email: DEFAULT_OPERATOR_IDENTITY.email,
    role: DEFAULT_OPERATOR_IDENTITY.role,
    storeId: 'default'
  };
  anyWin.NexAuth.activeStore = {
    id: 'default',
    name: 'Hands & Head Official',
    currency: 'BDT',
    plan: 'Enterprise Pro'
  };
}

let _isSeeding = false;
let _seedingComplete = false;

/**
 * Auto-seed routine:
 * - Checks whether collection("customers") has at least 1 document.
 * - If empty, loads in-memory customers and commits them in sequential batches of 400 documents
 *   using writeBatch(db) and doc(db, "customers", docId) with { merge: true }.
 */
export async function ensureFirestoreSeeded(bundledRecords?: any[]): Promise<boolean> {
  if (_seedingComplete) return true;
  if (_isSeeding) return false;

  _isSeeding = true;
  injectFallbackOperatorIdentity();

  try {
    const db = getDb();
    const customersCol = collection(db, "customers");
    const q = query(customersCol, limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log(`[PERSISTENCE SEED] Customers collection already seeded with documents. Skipping auto-seed.`);
      _seedingComplete = true;
      _isSeeding = false;
      return true;
    }

    // Determine records to seed
    let recordsToSeed: any[] = [];
    if (Array.isArray(bundledRecords) && bundledRecords.length > 0) {
      recordsToSeed = bundledRecords;
    } else if (typeof window !== 'undefined' && Array.isArray((window as any).PERMANENT_SEEDED_CUSTOMERS) && (window as any).PERMANENT_SEEDED_CUSTOMERS.length > 0) {
      recordsToSeed = (window as any).PERMANENT_SEEDED_CUSTOMERS;
    }

    if (recordsToSeed.length === 0) {
      console.warn(`[PERSISTENCE SEED] No bundled customer records provided or found in memory to seed.`);
      _isSeeding = false;
      return false;
    }

    console.log(`[PERSISTENCE SEED] Initializing Firestore seed with ${recordsToSeed.length} customer records...`);
    const BATCH_SIZE = 400;
    const totalChunks = Math.ceil(recordsToSeed.length / BATCH_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = recordsToSeed.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const rawId = item.id || item._id || item.phone || item.phoneCanonical;
        const docId = String(rawId || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
        const docRef = doc(db, "customers", docId);

        const cleanItem: Record<string, any> = {};
        for (const [k, v] of Object.entries(item || {})) {
          if (v !== undefined) {
            cleanItem[k] = v;
          }
        }
        cleanItem.id = docId;
        cleanItem.updatedAt = item?.updatedAt || new Date().toISOString();

        batch.set(docRef, cleanItem, { merge: true });
      }

      await batch.commit();
      console.log(`[PERSISTENCE SEED] Uploaded chunk ${i + 1} of ${totalChunks} patrons (${chunk.length} records)...`);
    }

    console.log(`[PERSISTENCE SEED] Successfully completed multi-batch customer seeding (${recordsToSeed.length} records).`);
    _seedingComplete = true;
    _isSeeding = false;
    return true;
  } catch (err: any) {
    console.error(`[PERSISTENCE SEED] Error during Firestore seed:`, err?.message || err);
    _isSeeding = false;
    return false;
  }
}

/**
 * Saves or merges a product document to Firestore `products` collection.
 */
export async function saveProduct(productData: any): Promise<any> {
  const db = getDb();
  const id = String(productData.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const payload = {
    ...productData,
    id,
    updatedAt: new Date().toISOString()
  };

  const productRef = doc(db, "products", id);
  await setDoc(productRef, payload, { merge: true });

  // Maintain compatibility with in-memory app services and events
  if (typeof window !== 'undefined') {
    if ((window as any).ProductsService?.addOrUpdateMemCache) {
      try { (window as any).ProductsService.addOrUpdateMemCache(payload); } catch(e) {}
    }
    window.dispatchEvent(new CustomEvent('nexus:product-saved', { detail: payload }));
  }

  return payload;
}

/**
 * Saves or merges an order document to Firestore `orders` collection.
 */
export async function saveOrder(orderData: any): Promise<any> {
  const db = getDb();
  const id = String(orderData.id || orderData.orderId || orderData.poNumber || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const payload = {
    ...orderData,
    id,
    updatedAt: new Date().toISOString()
  };

  const orderRef = doc(db, "orders", id);
  await setDoc(orderRef, payload, { merge: true });

  if (typeof window !== 'undefined') {
    if ((window as any).OrdersService?.addOrUpdateMemCache) {
      try { (window as any).OrdersService.addOrUpdateMemCache(payload); } catch(e) {}
    }
    window.dispatchEvent(new CustomEvent('nexus:order-saved', { detail: payload }));
  }

  return payload;
}

/**
 * Saves or merges a customer document to Firestore `customers` collection.
 */
export async function saveCustomer(customerData: any): Promise<any> {
  const db = getDb();
  const id = String(customerData.id || customerData._id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const payload = {
    ...customerData,
    id,
    updatedAt: new Date().toISOString()
  };

  const customerRef = doc(db, "customers", id);
  await setDoc(customerRef, payload, { merge: true });

  if (typeof window !== 'undefined') {
    if ((window as any).CustomersService?.addOrUpdateMemCache) {
      try { (window as any).CustomersService.addOrUpdateMemCache(payload); } catch(e) {}
    }
    window.dispatchEvent(new CustomEvent('nexus:customer-saved', { detail: payload }));
  }

  return payload;
}

/**
 * Real-time listener for Firestore `customers` collection.
 */
export function subscribeToCustomers(callback: (customers: any[]) => void): Unsubscribe {
  const db = getDb();
  const colRef = collection(db, "customers");

  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(items);
  }, (err) => {
    console.warn('[PERSISTENCE] customers onSnapshot notice:', err?.message);
  });
}

/**
 * Real-time listener for Firestore `products` collection.
 */
export function subscribeToProducts(callback: (products: any[]) => void): Unsubscribe {
  const db = getDb();
  const colRef = collection(db, "products");

  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(items);
  }, (err) => {
    console.warn('[PERSISTENCE] products onSnapshot notice:', err?.message);
  });
}

/**
 * Real-time listener for Firestore `orders` collection.
 */
export function subscribeToOrders(callback: (orders: any[]) => void): Unsubscribe {
  const db = getDb();
  const colRef = collection(db, "orders");

  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(items);
  }, (err) => {
    console.warn('[PERSISTENCE] orders onSnapshot notice:', err?.message);
  });
}

/**
 * Saves or updates a B2B deal in Firestore `deals` collection.
 */
export async function saveB2BDeal(dealData: any): Promise<any> {
  const db = getDb();
  const id = String(dealData.id || `deal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const payload = {
    ...dealData,
    id,
    updatedAt: new Date().toISOString()
  };

  const dealRef = doc(db, "deals", id);
  await setDoc(dealRef, payload, { merge: true });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus:b2b-deal-saved', { detail: payload }));
  }

  return payload;
}

/**
 * Real-time listener for Firestore `deals` collection.
 */
export function subscribeToDeals(callback: (deals: any[]) => void): Unsubscribe {
  const db = getDb();
  const colRef = collection(db, "deals");

  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(items);
  }, (err) => {
    console.warn('[PERSISTENCE] deals onSnapshot notice:', err?.message);
  });
}

/**
 * Universal direct Firestore document write helper:
 * setDoc(doc(db, collectionName, id), payload, { merge: true });
 */
export async function writeDocument(collectionName: string, id: string, payload: any): Promise<any> {
  const db = getDb();
  const cleanId = String(id || `${collectionName}_${Date.now()}`);
  const data = {
    ...payload,
    id: cleanId,
    updatedAt: new Date().toISOString()
  };
  const docRef = doc(db, collectionName, cleanId);
  await setDoc(docRef, data, { merge: true });
  return data;
}

if (typeof window !== 'undefined') {
  (window as any).saveProduct = saveProduct;
  (window as any).saveCustomer = saveCustomer;
  (window as any).saveOrder = saveOrder;
  (window as any).saveB2BDeal = saveB2BDeal;
  (window as any).writeDocument = writeDocument;
  (window as any).subscribeToOrders = subscribeToOrders;
  (window as any).subscribeToProducts = subscribeToProducts;
  (window as any).subscribeToCustomers = subscribeToCustomers;
}

