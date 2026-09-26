import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, setLogLevel } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Silence internal Firestore SDK logs (suppresses benign GrpcConnection idle stream cancels)
try {
  setLogLevel('silent');
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let isInitialized = false;

export function initFirebaseSync({
  getOrders,
  setOrders,
  getCustomers,
  setCustomers,
  getProducts,
  setProducts,
  broadcastSync
}) {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const cfgPath = path.resolve(__dirname, '../firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) {
      console.log('[FirebaseSync] firebase-applet-config.json not found, skipping Firestore sync');
      return;
    }

    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const app = initializeApp(cfg, 'server-sync-app');
    db = getFirestore(app, cfg.firestoreDatabaseId);
    console.log('[FirebaseSync] Connected to Firestore database:', cfg.firestoreDatabaseId);

    // Initial check & merge for orders from Firestore
    const syncOrdersFromFirestore = async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        if (!snap.empty) {
          const currentOrders = getOrders();
          const orderMap = new Map(currentOrders.map(o => [String(o.id || o.orderNumber), o]));
          let added = false;
          snap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
            if (data.archived || data.isMock) return;
            const key = String(data.id || data.orderNumber);
            if (!orderMap.has(key)) {
              currentOrders.unshift(data);
              orderMap.set(key, data);
              added = true;
            }
          });
          if (added) {
            setOrders(currentOrders);
            console.log(`[FirebaseSync] Merged orders from Firestore. Total now: ${currentOrders.length}`);
            if (typeof broadcastSync === 'function') broadcastSync('orders');
          }
        }
      } catch (err) {
        console.debug('[FirebaseSync] Orders sync notice:', err?.message);
      }
    };

    // Initial check & merge for products from Firestore
    const syncProductsFromFirestore = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        if (!snap.empty) {
          const currentProds = getProducts();
          const prodMap = new Map(currentProds.map(p => [String(p.id), p]));
          let changed = false;
          snap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
            const key = String(data.id);
            if (!prodMap.has(key)) {
              currentProds.unshift(data);
              prodMap.set(key, data);
              changed = true;
            }
          });
          if (changed) {
            setProducts(currentProds);
            console.log(`[FirebaseSync] Merged products from Firestore. Total now: ${currentProds.length}`);
            if (typeof broadcastSync === 'function') broadcastSync('products');
          }
        }
      } catch (err) {
        console.debug('[FirebaseSync] Products sync notice:', err?.message);
      }
    };

    // Run initial sync on server boot
    syncOrdersFromFirestore();
    syncProductsFromFirestore();

    // Gentle background reconciliation interval (every 90s) using unary getDocs
    // Prevents idle gRPC stream timeouts and avoids exceeding free-tier daily read limits
    setInterval(() => {
      syncOrdersFromFirestore();
    }, 90000);

  } catch (err) {
    console.debug('[FirebaseSync] Initialization notice:', err?.message);
  }
}

/**
 * Persist an order directly to Firestore asynchronously
 */
export async function syncOrderToFirestore(order) {
  if (!db || !order) return;
  try {
    const id = String(order.id || order.orderNumber || `ord_${Date.now()}`);
    const docRef = doc(db, 'orders', id);
    const cleanOrder = {
      ...order,
      id,
      updatedAt: order.updatedAt || new Date().toISOString()
    };
    await setDoc(docRef, cleanOrder, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] syncOrderToFirestore warning:', err?.message);
  }
}

/**
 * Persist a product directly to Firestore asynchronously
 */
export async function syncProductToFirestore(product) {
  if (!db || !product) return;
  try {
    const id = String(product.id || `prod_${Date.now()}`);
    const docRef = doc(db, 'products', id);
    const cleanProduct = {
      ...product,
      id,
      updatedAt: product.updatedAt || new Date().toISOString()
    };
    await setDoc(docRef, cleanProduct, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] syncProductToFirestore warning:', err?.message);
  }
}

/**
 * Persist a customer directly to Firestore asynchronously
 */
export async function syncCustomerToFirestore(customer) {
  if (!db || !customer) return;
  try {
    const id = String(customer.id || customer._id || customer.phone || `cust_${Date.now()}`);
    const docRef = doc(db, 'customers', id);
    const cleanCustomer = {
      ...customer,
      id,
      updatedAt: customer.updatedAt || new Date().toISOString()
    };
    await setDoc(docRef, cleanCustomer, { merge: true });
  } catch (err) {
    console.warn('[FirebaseSync] syncCustomerToFirestore warning:', err?.message);
  }
}
