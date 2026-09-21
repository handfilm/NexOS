import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      console.warn('[FirebaseSync] firebase-applet-config.json not found, skipping Firestore sync');
      return;
    }

    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const app = initializeApp(cfg, 'server-sync-app');
    db = getFirestore(app, cfg.firestoreDatabaseId);
    console.log('[FirebaseSync] Connected to Firestore database:', cfg.firestoreDatabaseId);

    // Initial check & merge for orders
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        if (!snap.empty) {
          const currentOrders = getOrders();
          const orderMap = new Map(currentOrders.map(o => [String(o.id || o.orderNumber), o]));
          let added = false;
          snap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
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
        console.warn('[FirebaseSync] Initial orders fetch notice:', err?.message);
      }

      // Set up real-time listener for orders across all devices/browsers
      try {
        onSnapshot(collection(db, 'orders'), (snap) => {
          if (snap.empty) return;
          const currentOrders = getOrders();
          const orderMap = new Map(currentOrders.map(o => [String(o.id || o.orderNumber), o]));
          let changed = false;

          snap.docChanges().forEach((change) => {
            const data = { id: change.doc.id, ...change.doc.data() };
            const key = String(data.id || data.orderNumber);
            if (change.type === 'added' || change.type === 'modified') {
              const existing = orderMap.get(key);
              if (!existing || JSON.stringify(existing) !== JSON.stringify(data)) {
                if (existing) {
                  const idx = currentOrders.findIndex(o => String(o.id || o.orderNumber) === key);
                  if (idx !== -1) currentOrders[idx] = data;
                } else {
                  currentOrders.unshift(data);
                }
                orderMap.set(key, data);
                changed = true;
              }
            }
          });

          if (changed) {
            setOrders(currentOrders);
            console.log(`[FirebaseSync] Orders synced from Firestore event. Total: ${currentOrders.length}`);
            if (typeof broadcastSync === 'function') broadcastSync('orders');
          }
        }, (err) => {
          console.warn('[FirebaseSync] Orders onSnapshot notice:', err?.message);
        });
      } catch (err) {
        console.warn('[FirebaseSync] Orders listener setup error:', err?.message);
      }
    })();

    // Real-time listener for products
    (async () => {
      try {
        onSnapshot(collection(db, 'products'), (snap) => {
          if (snap.empty) return;
          const currentProds = getProducts();
          const prodMap = new Map(currentProds.map(p => [String(p.id), p]));
          let changed = false;

          snap.docChanges().forEach((change) => {
            const data = { id: change.doc.id, ...change.doc.data() };
            const key = String(data.id);
            if (change.type === 'added' || change.type === 'modified') {
              const existing = prodMap.get(key);
              if (!existing || JSON.stringify(existing) !== JSON.stringify(data)) {
                if (existing) {
                  const idx = currentProds.findIndex(p => String(p.id) === key);
                  if (idx !== -1) currentProds[idx] = data;
                } else {
                  currentProds.unshift(data);
                }
                prodMap.set(key, data);
                changed = true;
              }
            }
          });

          if (changed) {
            setProducts(currentProds);
            console.log(`[FirebaseSync] Products synced from Firestore event. Total: ${currentProds.length}`);
            if (typeof broadcastSync === 'function') broadcastSync('products');
          }
        }, (err) => {
          console.warn('[FirebaseSync] Products onSnapshot notice:', err?.message);
        });
      } catch (err) {
        console.warn('[FirebaseSync] Products listener setup error:', err?.message);
      }
    })();

  } catch (err) {
    console.warn('[FirebaseSync] Initialization error:', err?.message);
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
