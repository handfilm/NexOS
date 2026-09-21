/**
 * ═════════════════════════════════════════════════════════════════════
 * NEXOS API LAYER — 100% FIREBASE FIRESTORE DATA ADAPTER
 * Single Source of Truth: Federated Catalog, Buyer Orders, RFQ Threads, Users
 * ZERO Mock Data · ZERO SQL Dependencies · Strict Resilience Boundaries
 * ═════════════════════════════════════════════════════════════════════
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

// ── TypeScript Interfaces for Live Firestore Entities ──

export interface WholesaleTier {
  minQuantity: number;
  unitPriceUsd: number;
  discountPercentage?: number;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  handle?: string;
  description: string;
  category?: string;
  origin?: 'shop.handsandhead.com' | 'arutemika.com' | string;
  originDisplayName?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string;
  retailPrice: number;
  retailPriceUsd?: number;
  wholesalePrice?: number;
  wholesalePriceLadder?: WholesaleTier[];
  moq: number;
  images: string[];
  thumbnailUrl?: string;
  materials?: string[];
  tags?: string[];
  inventoryCount?: number;
  inStock: boolean;
  leadTimeDays?: number;
  provenance?: {
    originRegion?: string;
    traceabilityGrade?: string;
    materialCompliance?: string[];
  };
  specifications?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
  thumbnailUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  buyerId?: string;
  customerName?: string;
  customerEmail?: string;
  total: number;
  subtotal?: number;
  amountPaid: number;
  currency: string;
  paymentStatus: 'paid' | 'pending' | 'advance_50_pct' | 'refunded' | string;
  fulfillmentStatus: 'fulfilled' | 'unfulfilled' | 'partial' | 'cutting' | string;
  status: 'open' | 'cutting_authorized' | 'completed' | 'cancelled' | string;
  productionUnlockedAt?: string;
  paymentMethod?: string;
  items: OrderItem[];
  shippingAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RfqThread {
  id: string;
  threadId?: string;
  buyerId: string;
  buyerName?: string;
  productId?: string;
  productTitle?: string;
  targetQuantity: number;
  targetPriceUsd?: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'FACTORY_ASSIGNED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  role: 'buyer' | 'seller' | 'admin' | 'operator';
  country?: string;
  currency?: string;
  createdAt?: string;
}

// ── 1. Fetch Live Catalog (`federated_catalog` Firestore Collection) ──

export async function fetchLiveCatalog(options?: {
  category?: string;
  limitCount?: number;
  origin?: string;
}): Promise<Product[]> {
  try {
    const catalogCol = collection(db, 'federated_catalog');
    const maxItems = Math.min(options?.limitCount || 50, 100);

    let q = query(catalogCol, limit(maxItems));

    if (options?.category && options.category !== 'ALL') {
      q = query(catalogCol, where('category', '==', options.category), limit(maxItems));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[NexOS Firebase Sync]: No data found or connection issue.');
      return [];
    }

    const products: Product[] = [];
    snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      products.push({
        id: docSnap.id,
        sku: data.sku || `SKU-${docSnap.id.slice(0, 6).toUpperCase()}`,
        title: data.title || 'Untitled Atelier Item',
        handle: data.handle || '',
        description: data.description || '',
        category: data.category || 'Apparel & Leathercraft',
        origin: data.origin || 'shop.handsandhead.com',
        originDisplayName: data.originDisplayName || 'Hands & Head Atelier',
        status: data.status || 'ACTIVE',
        retailPrice: typeof data.retailPrice === 'number' ? data.retailPrice : (data.retailPriceUsd || 0),
        retailPriceUsd: typeof data.retailPriceUsd === 'number' ? data.retailPriceUsd : (data.retailPrice || 0),
        wholesalePrice: typeof data.wholesalePrice === 'number' ? data.wholesalePrice : undefined,
        wholesalePriceLadder: Array.isArray(data.wholesalePriceLadder) ? data.wholesalePriceLadder : [],
        moq: typeof data.moq === 'number' ? data.moq : 5,
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.thumbnailUrl ? [data.thumbnailUrl] : []),
        thumbnailUrl: data.thumbnailUrl || (Array.isArray(data.images) && data.images[0]) || '',
        materials: Array.isArray(data.materials) ? data.materials : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        inventoryCount: typeof data.inventoryCount === 'number' ? data.inventoryCount : (data.totalInventory || 0),
        inStock: typeof data.inStock === 'boolean' ? data.inStock : ((data.inventoryCount || data.totalInventory || 0) > 0),
        leadTimeDays: typeof data.leadTimeDays === 'number' ? data.leadTimeDays : 7,
        provenance: data.provenance || {},
        specifications: data.specifications || {},
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return products;
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    handleFirestoreError(error, OperationType.LIST, 'federated_catalog');
    return [];
  }
}

// ── 2. Fetch Buyer Orders (`orders` Firestore Collection) ──

export async function fetchBuyerOrders(buyerId?: string): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    const maxItems = 50;

    let q = query(ordersCol, limit(maxItems));

    if (buyerId && buyerId.trim() !== '') {
      // Query by customerId / buyerId
      q = query(ordersCol, where('customerId', '==', buyerId.trim()), limit(maxItems));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[NexOS Firebase Sync]: No data found or connection issue.');
      return [];
    }

    const orders: Order[] = [];
    snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data.archived || data.isMock) return;
      orders.push({
        id: docSnap.id,
        orderNumber: data.orderNumber || `ORD-${docSnap.id.slice(0, 6).toUpperCase()}`,
        customerId: data.customerId || '',
        buyerId: data.buyerId || data.customerId || '',
        customerName: data.customerName || data.contactName || 'Corporate Buyer',
        customerEmail: data.customerEmail || data.contactEmail || '',
        total: typeof data.total === 'number' ? data.total : (data.totalAmount || 0),
        subtotal: typeof data.subtotal === 'number' ? data.subtotal : (data.total || 0),
        amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : (data.totalAmountPaid || 0),
        currency: data.currency || 'USD',
        paymentStatus: data.paymentStatus || 'pending',
        fulfillmentStatus: data.fulfillmentStatus || 'unfulfilled',
        status: data.status || 'open',
        productionUnlockedAt: data.productionUnlockedAt,
        paymentMethod: data.paymentMethod || 'Bank Wire / Escrow',
        items: Array.isArray(data.items) ? data.items : [],
        shippingAddress: data.shippingAddress || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return orders;
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    handleFirestoreError(error, OperationType.LIST, 'orders');
    return [];
  }
}

// ── 3. Fetch RFQ Threads (`rfq_threads` Firestore Collection) ──

export async function fetchRfqThreads(buyerId?: string): Promise<RfqThread[]> {
  try {
    const rfqCol = collection(db, 'rfq_threads');
    let q = query(rfqCol, limit(50));

    if (buyerId && buyerId.trim() !== '') {
      q = query(rfqCol, where('buyerId', '==', buyerId.trim()), limit(50));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[NexOS Firebase Sync]: No data found or connection issue.');
      return [];
    }

    const threads: RfqThread[] = [];
    snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      threads.push({
        id: docSnap.id,
        threadId: data.threadId || docSnap.id,
        buyerId: data.buyerId || '',
        buyerName: data.buyerName || 'Verified Procurement Partner',
        productId: data.productId || '',
        productTitle: data.productTitle || 'Custom Apparel RFQ',
        targetQuantity: typeof data.targetQuantity === 'number' ? data.targetQuantity : 100,
        targetPriceUsd: typeof data.targetPriceUsd === 'number' ? data.targetPriceUsd : undefined,
        status: data.status || 'SUBMITTED',
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return threads;
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    handleFirestoreError(error, OperationType.LIST, 'rfq_threads');
    return [];
  }
}

// ── 4. Fetch User Profile (`users` Firestore Collection) ──

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    if (!uid) return null;
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);

    if (!snapshot.exists()) {
      console.log('[NexOS Firebase Sync]: No data found or connection issue.');
      return null;
    }

    const data = snapshot.data();
    return {
      uid: snapshot.id,
      email: data.email || '',
      displayName: data.displayName || data.name || 'NexOS User',
      companyName: data.companyName || '',
      role: data.role || 'buyer',
      country: data.country || '',
      currency: data.currency || 'USD',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

// ── 5. Real-Time Listeners (Optional Live Subscriptions) ──

export function subscribeToLiveCatalog(callback: (products: Product[]) => void): Unsubscribe {
  try {
    const catalogCol = collection(db, 'federated_catalog');
    const q = query(catalogCol, limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }
        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          products.push({
            id: docSnap.id,
            sku: data.sku || `SKU-${docSnap.id.slice(0, 6).toUpperCase()}`,
            title: data.title || 'Untitled Atelier Item',
            handle: data.handle || '',
            description: data.description || '',
            category: data.category || 'Apparel & Leathercraft',
            origin: data.origin || 'shop.handsandhead.com',
            originDisplayName: data.originDisplayName || 'Hands & Head Atelier',
            status: data.status || 'ACTIVE',
            retailPrice: typeof data.retailPrice === 'number' ? data.retailPrice : (data.retailPriceUsd || 0),
            retailPriceUsd: typeof data.retailPriceUsd === 'number' ? data.retailPriceUsd : (data.retailPrice || 0),
            wholesalePrice: typeof data.wholesalePrice === 'number' ? data.wholesalePrice : undefined,
            wholesalePriceLadder: Array.isArray(data.wholesalePriceLadder) ? data.wholesalePriceLadder : [],
            moq: typeof data.moq === 'number' ? data.moq : 5,
            images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.thumbnailUrl ? [data.thumbnailUrl] : []),
            thumbnailUrl: data.thumbnailUrl || (Array.isArray(data.images) && data.images[0]) || '',
            materials: Array.isArray(data.materials) ? data.materials : [],
            tags: Array.isArray(data.tags) ? data.tags : [],
            inventoryCount: typeof data.inventoryCount === 'number' ? data.inventoryCount : (data.totalInventory || 0),
            inStock: typeof data.inStock === 'boolean' ? data.inStock : ((data.inventoryCount || data.totalInventory || 0) > 0),
            leadTimeDays: typeof data.leadTimeDays === 'number' ? data.leadTimeDays : 7,
            provenance: data.provenance || {},
            specifications: data.specifications || {},
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        callback(products);
      },
      (error) => {
        console.log('[NexOS Firebase Sync]: No data found or connection issue.');
        handleFirestoreError(error, OperationType.GET, 'federated_catalog');
        callback([]);
      }
    );
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    callback([]);
    return () => {};
  }
}

export function subscribeToBuyerOrders(
  buyerId: string | undefined,
  callback: (orders: Order[]) => void
): Unsubscribe {
  try {
    const ordersCol = collection(db, 'orders');
    const q = buyerId && buyerId.trim() !== ''
      ? query(ordersCol, where('customerId', '==', buyerId.trim()), limit(50))
      : query(ordersCol, limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }
        const orders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          orders.push({
            id: docSnap.id,
            orderNumber: data.orderNumber || `ORD-${docSnap.id.slice(0, 6).toUpperCase()}`,
            customerId: data.customerId || '',
            buyerId: data.buyerId || data.customerId || '',
            customerName: data.customerName || data.contactName || 'Corporate Buyer',
            customerEmail: data.customerEmail || data.contactEmail || '',
            total: typeof data.total === 'number' ? data.total : (data.totalAmount || 0),
            subtotal: typeof data.subtotal === 'number' ? data.subtotal : (data.total || 0),
            amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : (data.totalAmountPaid || 0),
            currency: data.currency || 'USD',
            paymentStatus: data.paymentStatus || 'pending',
            fulfillmentStatus: data.fulfillmentStatus || 'unfulfilled',
            status: data.status || 'open',
            productionUnlockedAt: data.productionUnlockedAt,
            paymentMethod: data.paymentMethod || 'Bank Wire / Escrow',
            items: Array.isArray(data.items) ? data.items : [],
            shippingAddress: data.shippingAddress || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        callback(orders);
      },
      (error) => {
        console.log('[NexOS Firebase Sync]: No data found or connection issue.');
        handleFirestoreError(error, OperationType.GET, 'orders');
        callback([]);
      }
    );
  } catch (error) {
    console.log('[NexOS Firebase Sync]: No data found or connection issue.');
    callback([]);
    return () => {};
  }
}
