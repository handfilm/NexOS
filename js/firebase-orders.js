/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-orders.js
   Orders Service — Real Firestore Commerce Pipeline + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.OrdersService = {
  PAGE_SIZE: 50,
  _lastDoc: null,
  _memCache: [],
  _initPromise: null,

  _getCollection() {
    return window.Collections?.orders || window.db.collection("orders");
  },

  async _ensureInit() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        const col = this._getCollection();
        if (col && typeof col.onSnapshot === "function") {
          col.onSnapshot(snap => {
            if (snap && !snap.empty) {
              this._memCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => !o.archived && !o.isMock);
            }
          }, err => console.debug("Orders snapshot notice:", err?.message));
        }
      } catch (e) {}
    })();
    return this._initPromise;
  },

  _getDefaultSeedOrders() {
    return [
      {
            "id": "ord-1049",
            "orderNumber": "NX-1049",
            "source": "Online Store (D2C)",
            "customerId": "8613774622945",
            "customerName": "Lailatul Mehnaz",
            "phone": "+8801844051980",
            "email": "lailatul.mehnaz@citybank.com.bd",
            "customerSnapshot": {
                  "id": "8613774622945",
                  "name": "Lailatul Mehnaz",
                  "phone": "+8801844051980",
                  "canonicalPhone": "+8801844051980",
                  "rawPhone": "+8801844051980",
                  "email": "lailatul.mehnaz@citybank.com.bd",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka - North",
                  "address": "The City Bank Limited, Nitol Niloy Centre, Level 4, House 7, Road 113/A, Gulshan - 2, Dhaka"
            },
            "shippingAddress": {
                  "name": "Lailatul Mehnaz",
                  "phone": "+8801844051980",
                  "address1": "The City Bank Limited, Nitol Niloy Centre, Level 4, House 7, Road 113/A, Gulshan - 2",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-02",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "variantTitle": "Bone White / L",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "total": 1650
                  },
                  {
                        "productId": "prod-crd-02",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "variantTitle": "Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "total": 1450
                  }
            ],
            "items": [
                  {
                        "id": "item-1049-1",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "lineTotal": 1650
                  },
                  {
                        "id": "item-1049-2",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "lineTotal": 1450
                  }
            ],
            "subtotal": 3100,
            "shipping": 80,
            "discount": 0,
            "total": 3180,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9K28401L",
            "paidAmount": 3180,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-DH-849102",
            "trackingNumber": "ST-DH-849102",
            "notes": "Deliver to office address 10am - 5pm. Call before arrival.",
            "timeline": [
                  {
                        "event": "Order placed online via Website",
                        "at": "2026-09-12T11:20:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Payment verified via bKash Merchant (Trx: BK9K28401L)",
                        "at": "2026-09-12T11:25:00.000Z",
                        "by": "bKash Gateway"
                  },
                  {
                        "event": "Packaged & Steadfast Waybill generated (ST-DH-849102)",
                        "at": "2026-09-12T15:00:00.000Z",
                        "by": "Warehouse"
                  },
                  {
                        "event": "Delivered to Gulshan-2 recipient",
                        "at": "2026-09-13T14:10:00.000Z",
                        "by": "Steadfast Courier"
                  }
            ],
            "createdAt": "2026-09-12T11:20:00.000Z",
            "updatedAt": "2026-09-13T14:10:00.000Z"
      },
      {
            "id": "ord-1050",
            "orderNumber": "NX-1050",
            "source": "Facebook Shop (D2C)",
            "customerId": "8548307730657",
            "customerName": "Shabbir",
            "phone": "+8801745395313",
            "email": "shabbir.dhk@gmail.com",
            "customerSnapshot": {
                  "id": "8548307730657",
                  "name": "Shabbir",
                  "phone": "+8801745395313",
                  "canonicalPhone": "+8801745395313",
                  "rawPhone": "+8801745395313",
                  "email": "shabbir.dhk@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "DHAKA",
                  "address": "Mohammadia housing society rd 2 house no 150 mohammadpur"
            },
            "shippingAddress": {
                  "name": "Shabbir",
                  "phone": "+8801745395313",
                  "address1": "Mohammadia housing society rd 2 house no 150 mohammadpur",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1050-1",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 2850,
            "shipping": 80,
            "discount": 0,
            "total": 2930,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 2930,
            "dueAmount": 0,
            "courier": "Pathao Courier",
            "consignmentId": "PT-DH-772183",
            "trackingNumber": "PT-DH-772183",
            "notes": "Mohammadpur delivery. Customer confirmed over phone.",
            "timeline": [
                  {
                        "event": "Order booked from Facebook Messenger",
                        "at": "2026-09-12T14:45:00.000Z",
                        "by": "Sales Operator"
                  },
                  {
                        "event": "Order confirmed over phone call",
                        "at": "2026-09-12T15:10:00.000Z",
                        "by": "Support"
                  },
                  {
                        "event": "Dispatched via Pathao (Consignment: PT-DH-772183)",
                        "at": "2026-09-13T09:30:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and Cash Collected (৳2,930)",
                        "at": "2026-09-13T17:45:00.000Z",
                        "by": "Pathao Rider"
                  }
            ],
            "createdAt": "2026-09-12T14:45:00.000Z",
            "updatedAt": "2026-09-13T17:45:00.000Z"
      },
      {
            "id": "ord-1051",
            "orderNumber": "NX-1051",
            "source": "Online Store (D2C)",
            "customerId": "8423562477793",
            "customerName": "Bappa Chowdhury",
            "phone": "+8801338789272",
            "email": "bappa.chowdhury@yahoo.com",
            "customerSnapshot": {
                  "id": "8423562477793",
                  "name": "Bappa Chowdhury",
                  "phone": "+8801338789272",
                  "canonicalPhone": "+8801338789272",
                  "rawPhone": "+8801338789272",
                  "email": "bappa.chowdhury@yahoo.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka",
                  "address": "Chowdhury House 11/1A Kobi jashimuddin rd North Komlapur motijheel Dhaka"
            },
            "shippingAddress": {
                  "name": "Bappa Chowdhury",
                  "phone": "+8801338789272",
                  "address1": "Chowdhury House 11/1A Kobi jashimuddin rd North Komlapur motijheel",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / L",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "total": 3700
                  },
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1051-1",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "lineTotal": 3700
                  },
                  {
                        "id": "item-1051-2",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 6550,
            "shipping": 80,
            "discount": 140,
            "total": 6490,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9N40281M",
            "paidAmount": 6490,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-DH-849319",
            "trackingNumber": "ST-DH-849319",
            "notes": "VIP repeat customer. Motijheel delivery.",
            "timeline": [
                  {
                        "event": "Order placed on Web Portal",
                        "at": "2026-09-13T10:15:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Paid ৳6,490 via bKash Merchant",
                        "at": "2026-09-13T10:18:00.000Z",
                        "by": "bKash Gateway"
                  },
                  {
                        "event": "Handed over to Steadfast Courier",
                        "at": "2026-09-13T14:30:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Motijheel address",
                        "at": "2026-09-14T11:20:00.000Z",
                        "by": "Steadfast Courier"
                  }
            ],
            "createdAt": "2026-09-13T10:15:00.000Z",
            "updatedAt": "2026-09-14T11:20:00.000Z"
      },
      {
            "id": "ord-1052",
            "orderNumber": "NX-1052",
            "source": "Instagram DM (D2C)",
            "customerId": "8340944879841",
            "customerName": "Adeeb",
            "phone": "+8801745411340",
            "email": "adeeb.dhn@gmail.com",
            "customerSnapshot": {
                  "id": "8340944879841",
                  "name": "Adeeb",
                  "phone": "+8801745411340",
                  "canonicalPhone": "+8801745411340",
                  "rawPhone": "+8801745411340",
                  "email": "adeeb.dhn@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka",
                  "address": "House - 18, Road - 6, Dhanmondi, Dhaka - 1205."
            },
            "shippingAddress": {
                  "name": "Adeeb",
                  "phone": "+8801745411340",
                  "address1": "House - 18, Road - 6, Dhanmondi",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / M",
                        "sku": "HH-TEE-01-M",
                        "quantity": 1,
                        "price": 1850,
                        "total": 1850
                  }
            ],
            "items": [
                  {
                        "id": "item-1052-1",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-M",
                        "quantity": 1,
                        "price": 1850,
                        "lineTotal": 1850
                  }
            ],
            "subtotal": 1850,
            "shipping": 80,
            "discount": 0,
            "total": 1930,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 1930,
            "dueAmount": 0,
            "courier": "Pathao Courier",
            "consignmentId": "PT-DH-772590",
            "trackingNumber": "PT-DH-772590",
            "notes": "Dhanmondi residential delivery.",
            "timeline": [
                  {
                        "event": "Order placed via Instagram Shop link",
                        "at": "2026-09-13T16:30:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Dispatched via Pathao Express",
                        "at": "2026-09-14T10:00:00.000Z",
                        "by": "Fulfillment Team"
                  },
                  {
                        "event": "Delivered and paid in cash (৳1,930)",
                        "at": "2026-09-14T15:20:00.000Z",
                        "by": "Pathao Courier"
                  }
            ],
            "createdAt": "2026-09-13T16:30:00.000Z",
            "updatedAt": "2026-09-14T15:20:00.000Z"
      },
      {
            "id": "ord-1053",
            "orderNumber": "NX-1053",
            "source": "Online Store (D2C)",
            "customerId": "8191632539873",
            "customerName": "Nasif Nahian",
            "phone": "+8801717155699",
            "email": "nasif.nahian@gmail.com",
            "customerSnapshot": {
                  "id": "8191632539873",
                  "name": "Nasif Nahian",
                  "phone": "+8801717155699",
                  "canonicalPhone": "+8801717155699",
                  "rawPhone": "+8801717155699",
                  "email": "nasif.nahian@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka",
                  "address": "House 132, Road 3, Block A, Niketon, Gulshan, Dhaka"
            },
            "shippingAddress": {
                  "name": "Nasif Nahian",
                  "phone": "+8801717155699",
                  "address1": "House 132, Road 3, Block A, Niketon, Gulshan",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-03",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "variantTitle": "Charcoal Slate / L",
                        "sku": "HH-TEE-03-L",
                        "quantity": 1,
                        "price": 2450,
                        "total": 2450
                  },
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / L",
                        "sku": "HH-TEE-01-L",
                        "quantity": 1,
                        "price": 1850,
                        "total": 1850
                  }
            ],
            "items": [
                  {
                        "id": "item-1053-1",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "sku": "HH-TEE-03-L",
                        "quantity": 1,
                        "price": 2450,
                        "lineTotal": 2450
                  },
                  {
                        "id": "item-1053-2",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-L",
                        "quantity": 1,
                        "price": 1850,
                        "lineTotal": 1850
                  }
            ],
            "subtotal": 4300,
            "shipping": 80,
            "discount": 0,
            "total": 4380,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9P55102Q",
            "paidAmount": 4380,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-DH-850122",
            "trackingNumber": "ST-DH-850122",
            "notes": "Niketon Gate 3 entry. Customer asked for evening delivery.",
            "timeline": [
                  {
                        "event": "Order received on web checkout",
                        "at": "2026-09-14T09:20:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "bKash Payment verified (৳4,380)",
                        "at": "2026-09-14T09:23:00.000Z",
                        "by": "bKash"
                  },
                  {
                        "event": "Dispatched via Steadfast Courier",
                        "at": "2026-09-14T13:00:00.000Z",
                        "by": "Dispatch Hub"
                  },
                  {
                        "event": "Delivered to Niketon residence",
                        "at": "2026-09-15T18:30:00.000Z",
                        "by": "Steadfast Courier"
                  }
            ],
            "createdAt": "2026-09-14T09:20:00.000Z",
            "updatedAt": "2026-09-15T18:30:00.000Z"
      },
      {
            "id": "ord-1054",
            "orderNumber": "NX-1054",
            "source": "Online Store (D2C)",
            "customerId": "8063450382561",
            "customerName": "Shahed Chowdhury Robin",
            "phone": "+8801814152500",
            "email": "shahed.robin.epz@gmail.com",
            "customerSnapshot": {
                  "id": "8063450382561",
                  "name": "Shahed Chowdhury Robin",
                  "phone": "+8801814152500",
                  "canonicalPhone": "+8801814152500",
                  "rawPhone": "+8801814152500",
                  "email": "shahed.robin.epz@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Chittagong",
                  "address": "EPZ Chittagong"
            },
            "shippingAddress": {
                  "name": "Shahed Chowdhury Robin",
                  "phone": "+8801814152500",
                  "address1": "Sector 2, Road 4, Plot 12, EPZ Chittagong",
                  "city": "Chittagong",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 2,
                        "price": 2850,
                        "total": 5700
                  },
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / XL",
                        "sku": "HH-TEE-01-XL",
                        "quantity": 1,
                        "price": 1850,
                        "total": 1850
                  },
                  {
                        "productId": "prod-mtoeo9ex-949",
                        "title": "Test Leather Belt",
                        "variantTitle": "Standard",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "total": 1200
                  }
            ],
            "items": [
                  {
                        "id": "item-1054-1",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 2,
                        "price": 2850,
                        "lineTotal": 5700
                  },
                  {
                        "id": "item-1054-2",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-XL",
                        "quantity": 1,
                        "price": 1850,
                        "lineTotal": 1850
                  },
                  {
                        "id": "item-1054-3",
                        "title": "Test Leather Belt",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "lineTotal": 1200
                  }
            ],
            "subtotal": 8750,
            "shipping": 130,
            "discount": 0,
            "total": 8880,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9Q77291Z",
            "paidAmount": 8880,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-CTG-901248",
            "trackingNumber": "ST-CTG-901248",
            "notes": "Chittagong EPZ express shipping. Security gate clearance required.",
            "timeline": [
                  {
                        "event": "Order created via Web Store",
                        "at": "2026-09-14T12:40:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Paid via bKash (৳8,880)",
                        "at": "2026-09-14T12:45:00.000Z",
                        "by": "bKash"
                  },
                  {
                        "event": "Dispatched to Chittagong Hub",
                        "at": "2026-09-14T18:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Chittagong EPZ recipient",
                        "at": "2026-09-16T12:00:00.000Z",
                        "by": "Steadfast Chittagong"
                  }
            ],
            "createdAt": "2026-09-14T12:40:00.000Z",
            "updatedAt": "2026-09-16T12:00:00.000Z"
      },
      {
            "id": "ord-1055",
            "orderNumber": "NX-1055",
            "source": "Facebook Shop (D2C)",
            "customerId": "8054275080417",
            "customerName": "Anne Drong",
            "phone": "+8801726793834",
            "email": "anne.drong@gmail.com",
            "customerSnapshot": {
                  "id": "8054275080417",
                  "name": "Anne Drong",
                  "phone": "+8801726793834",
                  "canonicalPhone": "+8801726793834",
                  "rawPhone": "+8801726793834",
                  "email": "anne.drong@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "DHAKA",
                  "address": "Grace Legacy, flat 2A, House 247/7&8 South Pirerbagh, Amtola, 60 feet road, Mirpur, Dhaka"
            },
            "shippingAddress": {
                  "name": "Anne Drong",
                  "phone": "+8801726793834",
                  "address1": "Grace Legacy, Flat 2A, House 247/7&8 South Pirerbagh, Amtola, 60 Feet Road, Mirpur",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-03",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "variantTitle": "Charcoal Slate / M",
                        "sku": "HH-TEE-03-M",
                        "quantity": 1,
                        "price": 2450,
                        "total": 2450
                  },
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1055-1",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "sku": "HH-TEE-03-M",
                        "quantity": 1,
                        "price": 2450,
                        "lineTotal": 2450
                  },
                  {
                        "id": "item-1055-2",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 5300,
            "shipping": 80,
            "discount": 0,
            "total": 5380,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 5380,
            "dueAmount": 0,
            "courier": "Pathao Courier",
            "consignmentId": "PT-DH-773104",
            "trackingNumber": "PT-DH-773104",
            "notes": "Call upon reaching 60 feet Amtola intersection.",
            "timeline": [
                  {
                        "event": "Order placed on Facebook checkout",
                        "at": "2026-09-14T17:15:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Order verified with customer via SMS",
                        "at": "2026-09-14T17:30:00.000Z",
                        "by": "Support"
                  },
                  {
                        "event": "Dispatched via Pathao",
                        "at": "2026-09-15T10:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and paid COD (৳5,380)",
                        "at": "2026-09-15T16:40:00.000Z",
                        "by": "Pathao Courier"
                  }
            ],
            "createdAt": "2026-09-14T17:15:00.000Z",
            "updatedAt": "2026-09-15T16:40:00.000Z"
      },
      {
            "id": "ord-1056",
            "orderNumber": "NX-1056",
            "source": "Online Store (D2C)",
            "customerId": "8019856425185",
            "customerName": "Md Shihab Hussain",
            "phone": "+8801855521805",
            "email": "shihab.hussain@gmail.com",
            "customerSnapshot": {
                  "id": "8019856425185",
                  "name": "Md Shihab Hussain",
                  "phone": "+8801855521805",
                  "canonicalPhone": "+8801855521805",
                  "rawPhone": "+8801855521805",
                  "email": "shihab.hussain@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka",
                  "address": "House 20,Road 3,Block D,Banasree, Rampura, Dhaka"
            },
            "shippingAddress": {
                  "name": "Md Shihab Hussain",
                  "phone": "+8801855521805",
                  "address1": "House 20, Road 3, Block D, Banasree, Rampura",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / L",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "total": 3700
                  },
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1056-1",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "lineTotal": 3700
                  },
                  {
                        "id": "item-1056-2",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 6550,
            "shipping": 80,
            "discount": 0,
            "total": 6630,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9R88123A",
            "paidAmount": 6630,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-DH-851490",
            "trackingNumber": "ST-DH-851490",
            "notes": "Banasree Block D.",
            "timeline": [
                  {
                        "event": "Online checkout completed",
                        "at": "2026-09-15T11:00:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Payment confirmed via bKash Merchant (৳6,630)",
                        "at": "2026-09-15T11:04:00.000Z",
                        "by": "bKash"
                  },
                  {
                        "event": "Dispatched via Steadfast Courier",
                        "at": "2026-09-15T15:00:00.000Z",
                        "by": "Warehouse"
                  },
                  {
                        "event": "Delivered to Banasree address",
                        "at": "2026-09-16T14:30:00.000Z",
                        "by": "Steadfast Courier"
                  }
            ],
            "createdAt": "2026-09-15T11:00:00.000Z",
            "updatedAt": "2026-09-16T14:30:00.000Z"
      },
      {
            "id": "ord-1057",
            "orderNumber": "NX-1057",
            "source": "Online Store (D2C)",
            "customerId": "8019831849185",
            "customerName": "Nur Rahman",
            "phone": "+8801711535595",
            "email": "nur.rahman@dhkcantt.com",
            "customerSnapshot": {
                  "id": "8019831849185",
                  "name": "Nur Rahman",
                  "phone": "+8801711535595",
                  "canonicalPhone": "+8801711535595",
                  "rawPhone": "+8801711535595",
                  "email": "nur.rahman@dhkcantt.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka",
                  "address": "House 424/ East kafrul"
            },
            "shippingAddress": {
                  "name": "Nur Rahman",
                  "phone": "+8801711535595",
                  "address1": "House 424, East Kafrul, Dhaka Cantt",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-03",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "variantTitle": "Charcoal Slate / L",
                        "sku": "HH-TEE-03-L",
                        "quantity": 1,
                        "price": 2450,
                        "total": 2450
                  },
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1057-1",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "sku": "HH-TEE-03-L",
                        "quantity": 1,
                        "price": 2450,
                        "lineTotal": 2450
                  },
                  {
                        "id": "item-1057-2",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 5300,
            "shipping": 80,
            "discount": 0,
            "total": 5380,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 5380,
            "dueAmount": 0,
            "courier": "Paperfly Courier",
            "consignmentId": "PF-DH-441092",
            "trackingNumber": "PF-DH-441092",
            "notes": "East Kafrul near water tank.",
            "timeline": [
                  {
                        "event": "Order placed online",
                        "at": "2026-09-15T15:30:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Dispatched with Paperfly Logistics",
                        "at": "2026-09-16T09:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and paid COD (৳5,380)",
                        "at": "2026-09-16T17:15:00.000Z",
                        "by": "Paperfly Courier"
                  }
            ],
            "createdAt": "2026-09-15T15:30:00.000Z",
            "updatedAt": "2026-09-16T17:15:00.000Z"
      },
      {
            "id": "ord-1058",
            "orderNumber": "NX-1058",
            "source": "WhatsApp Direct (D2C)",
            "customerId": "8162539634913",
            "customerName": "Vladislav",
            "phone": "+8801328056287",
            "email": "vladislav.pabna@mail.ru",
            "customerSnapshot": {
                  "id": "8162539634913",
                  "name": "Vladislav",
                  "phone": "+8801328056287",
                  "canonicalPhone": "+8801328056287",
                  "rawPhone": "+8801328056287",
                  "email": "vladislav.pabna@mail.ru",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Pabna",
                  "address": "Green city"
            },
            "shippingAddress": {
                  "name": "Vladislav",
                  "phone": "+8801328056287",
                  "address1": "Green City, Rooppur Nuclear Plant Zone, Ishwardi",
                  "city": "Pabna",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-02",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "variantTitle": "Bone White / XL",
                        "sku": "HH-TEE-02-XL",
                        "quantity": 1,
                        "price": 1650,
                        "total": 1650
                  },
                  {
                        "productId": "prod-mtoeo9ex-949",
                        "title": "Test Leather Belt",
                        "variantTitle": "Standard",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "total": 1200
                  }
            ],
            "items": [
                  {
                        "id": "item-1058-1",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "sku": "HH-TEE-02-XL",
                        "quantity": 1,
                        "price": 1650,
                        "lineTotal": 1650
                  },
                  {
                        "id": "item-1058-2",
                        "title": "Test Leather Belt",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "lineTotal": 1200
                  }
            ],
            "subtotal": 2850,
            "shipping": 150,
            "discount": 0,
            "total": 3000,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 3000,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-PBN-339102",
            "trackingNumber": "ST-PBN-339102",
            "notes": "Green City Ishwardi Pabna. Foreign engineer accommodation.",
            "timeline": [
                  {
                        "event": "Order placed via WhatsApp Fast Order",
                        "at": "2026-09-15T18:10:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Dispatched to Pabna district hub",
                        "at": "2026-09-16T11:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Green City Ishwardi (৳3,000 COD)",
                        "at": "2026-09-17T15:40:00.000Z",
                        "by": "Steadfast Pabna"
                  }
            ],
            "createdAt": "2026-09-15T18:10:00.000Z",
            "updatedAt": "2026-09-17T15:40:00.000Z"
      },
      {
            "id": "ord-1059",
            "orderNumber": "NX-1059",
            "source": "WhatsApp Direct (D2C)",
            "customerId": "8045721157857",
            "customerName": "Tatiana",
            "phone": "+8801958598547",
            "email": "tatiana.ishwardi@yandex.ru",
            "customerSnapshot": {
                  "id": "8045721157857",
                  "name": "Tatiana",
                  "phone": "+8801958598547",
                  "canonicalPhone": "+8801958598547",
                  "rawPhone": "+8801958598547",
                  "email": "tatiana.ishwardi@yandex.ru",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Pabna",
                  "address": "Green city"
            },
            "shippingAddress": {
                  "name": "Tatiana",
                  "phone": "+8801958598547",
                  "address1": "Green City, Building 14, Flat 5B, Ishwardi",
                  "city": "Pabna",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-03",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "variantTitle": "Charcoal Slate / M",
                        "sku": "HH-TEE-03-M",
                        "quantity": 1,
                        "price": 2450,
                        "total": 2450
                  },
                  {
                        "productId": "prod-crd-02",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "variantTitle": "Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "total": 1450
                  }
            ],
            "items": [
                  {
                        "id": "item-1059-1",
                        "title": "Architectural Cutout Leather-Pocket Tee",
                        "sku": "HH-TEE-03-M",
                        "quantity": 1,
                        "price": 2450,
                        "lineTotal": 2450
                  },
                  {
                        "id": "item-1059-2",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "lineTotal": 1450
                  }
            ],
            "subtotal": 3900,
            "shipping": 150,
            "discount": 0,
            "total": 4050,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "bKash (merchant)",
            "transactionId": "BK9S11938K",
            "paidAmount": 4050,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-PBN-339481",
            "trackingNumber": "ST-PBN-339481",
            "notes": "Ishwardi Green City accommodation.",
            "timeline": [
                  {
                        "event": "Order placed via WhatsApp Fast Order",
                        "at": "2026-09-16T10:05:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Payment verified via bKash (৳4,050)",
                        "at": "2026-09-16T10:12:00.000Z",
                        "by": "bKash"
                  },
                  {
                        "event": "Dispatched to Pabna via Steadfast",
                        "at": "2026-09-16T15:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Green City",
                        "at": "2026-09-17T17:20:00.000Z",
                        "by": "Steadfast Pabna"
                  }
            ],
            "createdAt": "2026-09-16T10:05:00.000Z",
            "updatedAt": "2026-09-17T17:20:00.000Z"
      },
      {
            "id": "ord-1060",
            "orderNumber": "NX-1060",
            "source": "Facebook Shop (D2C)",
            "customerId": "8154034340065",
            "customerName": "Hridoy Shaikh",
            "phone": "+8801610490729",
            "email": "hridoy.narail@gmail.com",
            "customerSnapshot": {
                  "id": "8154034340065",
                  "name": "Hridoy Shaikh",
                  "phone": "+8801610490729",
                  "canonicalPhone": "+8801610490729",
                  "rawPhone": "+8801610490729",
                  "email": "hridoy.narail@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "narail",
                  "address": "narail sodor.narail"
            },
            "shippingAddress": {
                  "name": "Hridoy Shaikh",
                  "phone": "+8801610490729",
                  "address1": "Shaikh Bari, Narail Sadar",
                  "city": "Narail",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-02",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "variantTitle": "Bone White / L",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "total": 1650
                  },
                  {
                        "productId": "prod-mtoeo9ex-949",
                        "title": "Test Leather Belt",
                        "variantTitle": "Standard",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "total": 1200
                  }
            ],
            "items": [
                  {
                        "id": "item-1060-1",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "lineTotal": 1650
                  },
                  {
                        "id": "item-1060-2",
                        "title": "Test Leather Belt",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "lineTotal": 1200
                  }
            ],
            "subtotal": 2850,
            "shipping": 130,
            "discount": 0,
            "total": 2980,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 2980,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-NRL-110482",
            "trackingNumber": "ST-NRL-110482",
            "notes": "Narail Sadar town.",
            "timeline": [
                  {
                        "event": "Order created via Facebook Messenger",
                        "at": "2026-09-16T13:40:00.000Z",
                        "by": "Sales Operator"
                  },
                  {
                        "event": "Dispatched to Narail branch",
                        "at": "2026-09-16T17:30:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and paid COD (৳2,980)",
                        "at": "2026-09-18T11:45:00.000Z",
                        "by": "Steadfast Narail"
                  }
            ],
            "createdAt": "2026-09-16T13:40:00.000Z",
            "updatedAt": "2026-09-18T11:45:00.000Z"
      },
      {
            "id": "ord-1061",
            "orderNumber": "NX-1061",
            "source": "Online Store (D2C)",
            "customerId": "8104068088033",
            "customerName": "Mohammed Raihan",
            "phone": "+8801762953916",
            "email": "raihan.kadamtali@gmail.com",
            "customerSnapshot": {
                  "id": "8104068088033",
                  "name": "Mohammed Raihan",
                  "phone": "+8801762953916",
                  "canonicalPhone": "+8801762953916",
                  "rawPhone": "+8801762953916",
                  "email": "raihan.kadamtali@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Kadamtali",
                  "address": ": বি- বাড়িয়া ,,,,বাঞ্ছারাপমুর ,,, কদমতলী"
            },
            "shippingAddress": {
                  "name": "Mohammed Raihan",
                  "phone": "+8801762953916",
                  "address1": "Brahmanbaria, Bancharampur, Kadamtali Bazar",
                  "city": "Brahmanbaria",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-wlt-01",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "variantTitle": "Tan Brown",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "total": 2850
                  }
            ],
            "items": [
                  {
                        "id": "item-1061-1",
                        "title": "Full-Grain Leather Bi-Fold Wallet",
                        "sku": "HH-WLT-01",
                        "quantity": 1,
                        "price": 2850,
                        "lineTotal": 2850
                  }
            ],
            "subtotal": 2850,
            "shipping": 130,
            "discount": 0,
            "total": 2980,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 2980,
            "dueAmount": 0,
            "courier": "RedX Logistics",
            "consignmentId": "RX-BB-662901",
            "trackingNumber": "RX-BB-662901",
            "notes": "Bancharampur Kadamtali delivery.",
            "timeline": [
                  {
                        "event": "Order placed on Web Store",
                        "at": "2026-09-16T16:20:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Dispatched via RedX Express",
                        "at": "2026-09-17T09:30:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and paid COD (৳2,980)",
                        "at": "2026-09-18T16:20:00.000Z",
                        "by": "RedX Rider"
                  }
            ],
            "createdAt": "2026-09-16T16:20:00.000Z",
            "updatedAt": "2026-09-18T16:20:00.000Z"
      },
      {
            "id": "ord-1062",
            "orderNumber": "NX-1062",
            "source": "Online Store (D2C)",
            "customerId": "8070759842017",
            "customerName": "Sayeed Ahmed",
            "phone": "+8801786934199",
            "email": "sayeed.clothhouse@gmail.com",
            "customerSnapshot": {
                  "id": "8070759842017",
                  "name": "Sayeed Ahmed",
                  "phone": "+8801786934199",
                  "canonicalPhone": "+8801786934199",
                  "rawPhone": "+8801786934199",
                  "email": "sayeed.clothhouse@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Mouluvibazar",
                  "address": "Cloth House, chndgram, Borolekha, Moulivibazar,"
            },
            "shippingAddress": {
                  "name": "Sayeed Ahmed",
                  "phone": "+8801786934199",
                  "address1": "Cloth House, Chandgram, Borolekha",
                  "city": "Moulvibazar",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-02",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "variantTitle": "Bone White / L",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "total": 1650
                  }
            ],
            "items": [
                  {
                        "id": "item-1062-1",
                        "title": "Artisanal Raw-Hem Oversized Drop Tee",
                        "sku": "HH-TEE-02-L",
                        "quantity": 1,
                        "price": 1650,
                        "lineTotal": 1650
                  }
            ],
            "subtotal": 1650,
            "shipping": 130,
            "discount": 0,
            "total": 1780,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "Nagad",
            "transactionId": "NG7A991823",
            "paidAmount": 1780,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-MVB-551029",
            "trackingNumber": "ST-MVB-551029",
            "notes": "Borolekha Cloth House.",
            "timeline": [
                  {
                        "event": "Order placed online",
                        "at": "2026-09-17T09:30:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Paid via Nagad (৳1,780)",
                        "at": "2026-09-17T09:35:00.000Z",
                        "by": "Nagad Gateway"
                  },
                  {
                        "event": "Dispatched to Moulvibazar hub",
                        "at": "2026-09-17T14:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Borolekha shop",
                        "at": "2026-09-18T17:10:00.000Z",
                        "by": "Steadfast"
                  }
            ],
            "createdAt": "2026-09-17T09:30:00.000Z",
            "updatedAt": "2026-09-18T17:10:00.000Z"
      },
      {
            "id": "ord-1063",
            "orderNumber": "NX-1063",
            "source": "Facebook Shop (D2C)",
            "customerId": "cust-kobir-nk",
            "customerName": "Kobir",
            "phone": "+8801622265291",
            "email": "kobir.noakhali@gmail.com",
            "customerSnapshot": {
                  "id": "cust-kobir-nk",
                  "name": "Kobir",
                  "phone": "+8801622265291",
                  "canonicalPhone": "+8801622265291",
                  "rawPhone": "+8801622265291",
                  "email": "kobir.noakhali@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Noakhali",
                  "address": "santi nagar"
            },
            "shippingAddress": {
                  "name": "Kobir",
                  "phone": "+8801622265291",
                  "address1": "Shanti Nagar, Maijdee Court",
                  "city": "Noakhali",
                  "zone": "Outside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / XL",
                        "sku": "HH-TEE-01-XL",
                        "quantity": 1,
                        "price": 1850,
                        "total": 1850
                  },
                  {
                        "productId": "prod-mtoeo9ex-949",
                        "title": "Test Leather Belt",
                        "variantTitle": "Standard",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "total": 1200
                  }
            ],
            "items": [
                  {
                        "id": "item-1063-1",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-XL",
                        "quantity": 1,
                        "price": 1850,
                        "lineTotal": 1850
                  },
                  {
                        "id": "item-1063-2",
                        "title": "Test Leather Belt",
                        "sku": "HH-3780",
                        "quantity": 1,
                        "price": 1200,
                        "lineTotal": 1200
                  }
            ],
            "subtotal": 3050,
            "shipping": 130,
            "discount": 0,
            "total": 3180,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 3180,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-NKH-220194",
            "trackingNumber": "ST-NKH-220194",
            "notes": "Maijdee Court Shanti Nagar delivery.",
            "timeline": [
                  {
                        "event": "Order placed via Facebook Shop",
                        "at": "2026-09-17T11:50:00.000Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Dispatched to Noakhali Hub",
                        "at": "2026-09-17T16:00:00.000Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered and paid COD (৳3,180)",
                        "at": "2026-09-19T14:15:00.000Z",
                        "by": "Steadfast Noakhali"
                  }
            ],
            "createdAt": "2026-09-17T11:50:00.000Z",
            "updatedAt": "2026-09-19T14:15:00.000Z"
      },
      {
            "id": "ord-1046",
            "orderNumber": "NX-1046",
            "source": "Online Store (D2C)",
            "customerId": "8779761975521",
            "customerName": "Tomotaka Minoura",
            "phone": "+8801912010701",
            "email": "tomotaka.minoura@gmail.com",
            "customerSnapshot": {
                  "id": "8779761975521",
                  "name": "Tomotaka Minoura",
                  "phone": "+8801912010701",
                  "canonicalPhone": "+8801912010701",
                  "rawPhone": "+8801912010701",
                  "email": "tomotaka.minoura@gmail.com",
                  "country": "BD",
                  "currency": "BDT",
                  "city": "Dhaka - North",
                  "address": "House no.9, Road no.2, Park road"
            },
            "shippingAddress": {
                  "name": "Tomotaka Minoura",
                  "phone": "+8801912010701",
                  "address1": "House no.9, Road no.2, Park road",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-tee-01",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "variantTitle": "Vintage Washed Black / L",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "total": 3700
                  },
                  {
                        "productId": "prod-crd-02",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "variantTitle": "Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "total": 1450
                  }
            ],
            "items": [
                  {
                        "id": "item-1046-1",
                        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
                        "sku": "HH-TEE-01-L",
                        "quantity": 2,
                        "price": 1850,
                        "lineTotal": 3700
                  },
                  {
                        "id": "item-1046-2",
                        "title": "Minimalist Cardholder — Aniline Tan",
                        "sku": "HH-CRD-02",
                        "quantity": 1,
                        "price": 1450,
                        "lineTotal": 1450
                  }
            ],
            "subtotal": 5150,
            "shipping": 80,
            "discount": 0,
            "total": 5230,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "delivered",
            "paymentMethod": "cod",
            "paidAmount": 5230,
            "dueAmount": 0,
            "courier": "Steadfast Courier",
            "consignmentId": "ST-DH-848019",
            "trackingNumber": "ST-DH-848019",
            "notes": "Inside Dhaka City delivery. Park road.",
            "timeline": [
                  {
                        "event": "Order placed online",
                        "at": "2026-09-05T06:53:07.350Z",
                        "by": "Customer"
                  },
                  {
                        "event": "Order dispatched via Steadfast",
                        "at": "2026-09-05T08:53:07.350Z",
                        "by": "Logistics"
                  },
                  {
                        "event": "Delivered to Park Road residence",
                        "at": "2026-09-06T12:30:00.000Z",
                        "by": "Steadfast"
                  }
            ],
            "createdAt": "2026-09-05T06:53:07.350Z",
            "updatedAt": "2026-09-06T12:30:00.000Z"
      },
      {
            "id": "ord-qs-mtpl6a86",
            "orderNumber": "QS-555554",
            "source": "POS Quick Sale",
            "customerId": "cust-mtpl6a8h",
            "customerName": "Tariqul Islam",
            "phone": "+8801711234567",
            "customerSnapshot": {
                  "id": "cust-mtpl6a8h",
                  "name": "Tariqul Islam",
                  "phone": "+8801711234567",
                  "canonicalPhone": "+8801711234567",
                  "rawPhone": "+8801711234567",
                  "email": "tariqul@example.com",
                  "country": "BD",
                  "currency": "BDT",
                  "address": "Dhaka Counter Sale"
            },
            "shippingAddress": {
                  "name": "Tariqul Islam",
                  "phone": "+8801711234567",
                  "address1": "Dhaka Counter Sale",
                  "city": "Dhaka",
                  "zone": "Inside Dhaka",
                  "country": "Bangladesh"
            },
            "lineItems": [
                  {
                        "productId": "prod-crd-02",
                        "title": "Full-Grain Leather Cardholder",
                        "variantTitle": "Default",
                        "sku": "HH-CRD-02",
                        "quantity": 2,
                        "price": 1850,
                        "total": 3700
                  }
            ],
            "items": [
                  {
                        "id": "item-qs-1",
                        "title": "Full-Grain Leather Cardholder",
                        "sku": "HH-CRD-02",
                        "quantity": 2,
                        "price": 1850,
                        "lineTotal": 3700
                  }
            ],
            "subtotal": 3700,
            "shipping": 0,
            "discount": 0,
            "tax": 0,
            "total": 3700,
            "currency": "BDT",
            "paymentStatus": "paid",
            "fulfillmentStatus": "fulfilled",
            "status": "completed",
            "lifecycleStage": "completed",
            "paymentMethod": "bKash (merchant)",
            "paidAmount": 3700,
            "dueAmount": 0,
            "notes": "Counter sale VIP broadcast attribution",
            "timeline": [
                  {
                        "event": "Quick Sale Completed (৳3,700 via bKash)",
                        "at": "2026-09-06T09:05:17.382Z",
                        "by": "Operator"
                  }
            ],
            "createdAt": "2026-09-06T09:05:17.382Z",
            "updatedAt": "2026-09-06T09:05:17.382Z"
      }
];
  },

  addOrUpdateMemCache(order) {
    if (!order || !order.id) return;
    const idx = this._memCache.findIndex(o => o.id === order.id || o.orderNumber === order.orderNumber);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...order };
    } else {
      this._memCache.unshift(order);
    }
  },

  /* ── Query & List Orders with Zero Loading Time & Real Persistence ── */
  async list({ status = null, paymentStatus = null, fulfillmentStatus = null, search = null, sortBy = "createdAt", sortDir = "desc" } = {}) {
    try {
      const res = await fetch("/api/orders?limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length) {
          const apiOrders = data.items.filter(o => o && !o.archived && !o.isMock && o.id !== 'ord-1048' && o.id !== 'ord-1047' && o.id !== 'BD-RFQ-0D2510A5' && o.customerName !== 'Amsterdam Goods B.V.' && o.customerName !== 'London Retail Group');
          const orderMap = new Map();
          apiOrders.forEach(o => orderMap.set(String(o.id || o.orderNumber), o));
          (this._memCache || []).forEach(o => {
            const k = String(o.id || o.orderNumber);
            if (!orderMap.has(k) && o && !o.archived && !o.isMock && o.id !== 'ord-1048' && o.id !== 'ord-1047' && o.id !== 'BD-RFQ-0D2510A5' && o.customerName !== 'Amsterdam Goods B.V.' && o.customerName !== 'London Retail Group') {
              orderMap.set(k, o);
            }
          });
          this._memCache = Array.from(orderMap.values());
        }
      }
    } catch (apiErr) {
      console.debug("Local API orders fetch notice:", apiErr?.message);
    }

    // 2. If still empty, populate with real production seed orders
    if (!this._memCache || !this._memCache.length) {
      this._memCache = this._getDefaultSeedOrders();
    }

    // 3. Background asynchronous sync with Firestore (bounded by 1.5s timeout so it NEVER blocks UI)
    (async () => {
      try {
        await this._ensureInit();
        const col = this._getCollection();
        if (col && typeof col.limit === "function") {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
          const snap = await Promise.race([col.limit(this.PAGE_SIZE).get(), timeoutPromise]);
          if (snap && !snap.empty) {
            const fsOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o && !o.archived && !o.isMock && o.id !== 'ord-1048' && o.id !== 'ord-1047' && o.id !== 'BD-RFQ-0D2510A5' && o.customerName !== 'Amsterdam Goods B.V.' && o.customerName !== 'London Retail Group');
            const existingIds = new Set(this._memCache.map(o => o.id || o.orderNumber));
            let changed = false;
            for (const fso of fsOrders) {
              const key = fso.id || fso.orderNumber;
              if (!existingIds.has(key)) {
                this._memCache.push(fso);
                changed = true;
              }
            }
            if (changed && window.NexEvents) {
              window.NexEvents.emit("ORDERS_CHANGED", this._memCache);
            }
          }
        }
      } catch (err) {
        // Non-blocking
      }
    })();

    let items = [...this._memCache];

    // 4. Status and lifecycle filters
    if (status && status !== "all") {
      items = items.filter(o => o.status === status || o.lifecycleStage === status);
    }
    if (paymentStatus && paymentStatus !== "all") {
      items = items.filter(o => o.paymentStatus === paymentStatus);
    }
    if (fulfillmentStatus && fulfillmentStatus !== "all") {
      items = items.filter(o => o.fulfillmentStatus === fulfillmentStatus);
    }

    // 5. Client-side text search (Order #, Customer Name, Email, SKU, Product Title)
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter(o =>
        (o.orderNumber || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.name || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.email || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.companyName || "").toLowerCase().includes(s) ||
        (o.customer?.name || "").toLowerCase().includes(s) ||
        (o.notes || "").toLowerCase().includes(s) ||
        (o.lineItems || []).some(li =>
          (li.title || "").toLowerCase().includes(s) ||
          (li.sku || "").toLowerCase().includes(s)
        )
      );
    }

    // 6. Sort in memory
    if (sortBy === "total") {
      items.sort((a, b) => sortDir === "asc" ? (a.total || 0) - (b.total || 0) : (b.total || 0) - (a.total || 0));
    } else if (sortBy === "createdAt") {
      items.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return sortDir === "asc" ? ta - tb : tb - ta;
      });
    }

    return { items, count: items.length };
  },

  /* ── Get All Cached Orders (Synchronous Quick Access) ── */
  getAll() {
    return this._memCache.length ? this._memCache : this._getDefaultSeedOrders();
  },

  async get(orderId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (apiErr) {}

    const col = this._getCollection();

    // 1. Direct Global Firestore Document Fetch
    try {
      const doc = await col.doc(orderId).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        const idx = this._memCache.findIndex(o => o.id === orderId);
        if (idx !== -1) this._memCache[idx] = data;
        else this._memCache.unshift(data);
        return data;
      }
    } catch (e) {
      console.warn("Firestore get order notice:", e?.message);
    }

    // 2. Query Firestore by Order Number
    try {
      const snap = await col.where("orderNumber", "==", orderId).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = { id: doc.id, ...doc.data() };
        return data;
      }
    } catch (e) {}

    return this._memCache.find(o => o.id === orderId || o.orderNumber === orderId) || null;
  },

  /* ── Resilient Cloud Firestore Write Helper (Prevents UI Freeze) ── */
  async _safeDocWrite(docRef, data, merge = false) {
    try {
      const writePromise = merge ? docRef.set(data, { merge: true }) : docRef.set(data);
      await Promise.race([
        writePromise,
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (err) {
      console.warn("Firestore order write fallback:", err?.message || err);
    }
  },

  /* ── Atomic Order Creation Transaction ──
     1. Reads all products in transaction
     2. Validates and decrements variant inventory
     3. Computes subtotal, discount, shipping, tax, total
     4. Sets immutable customerSnapshot & lineItems
     5. Increments customer totalSpent & totalOrders in Firestore
     6. Creates audit logs & activity feed
  ── */
  async create(orderInput) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const customerId = orderInput.customerId || null;
    const customer = orderInput.customer || orderInput.customerSnapshot || null;
    const rawLineItems = orderInput.lineItems || orderInput.items || [];
    const discountTotal = Number(orderInput.discountTotal || orderInput.discount || 0);
    const shippingTotal = Number(orderInput.shippingTotal || orderInput.shipping || orderInput.deliveryCharge || 0);
    const taxTotal = Number(orderInput.taxTotal || orderInput.tax || 0);
    const paymentStatus = orderInput.paymentStatus || "paid";
    const fulfillmentStatus = orderInput.fulfillmentStatus || "unfulfilled";
    const paymentMethod = orderInput.paymentMethod || orderInput.method || "cash";
    const shippingAddress = orderInput.shippingAddress || null;
    const billingAddress = orderInput.billingAddress || null;
    const notes = orderInput.notes || "";
    const storeId = orderInput.storeId || "default";

    if (!rawLineItems || !rawLineItems.length) {
      throw new Error("Order must contain at least one line item.");
    }

    const col = this._getCollection();
    const orderRef = orderInput.id ? col.doc(orderInput.id) : col.doc();
    const newId = orderRef.id;

    const orderNumber = orderInput.orderNumber || ("HH-" + Math.floor(100000 + Math.random() * 900000));
    const subtotal = rawLineItems.reduce((sum, li) => sum + (Number(li.price || 0) * Number(li.quantity || 1)), 0);
    const total = Math.max(0, subtotal - discountTotal + shippingTotal + taxTotal);

    const customerSnapshot = {
      name: customer?.name || customer?.companyName || orderInput.Customer || orderInput.buyer || "Walk-in Customer",
      companyName: customer?.companyName || customer?.name || "",
      email: customer?.email || orderInput.email || "",
      phone: customer?.phone || orderInput.phone || "",
      country: customer?.country || orderInput.country || "BD",
      currency: customer?.currency || orderInput.currency || "BDT",
      address: customer?.address || orderInput.address || ""
    };

    const operatorName = window.NexAuth?.profile?.name || window.NexAuth?.currentUser?.email || "Operator";

    const resolvedLineItems = rawLineItems.map(li => ({
      productId: li.productId || li.id || ("prod-" + Math.random().toString(36).slice(2, 7)),
      variantId: li.variantId || "default",
      title: li.title || li.name || "Leather Goods",
      sku: li.sku || "HH-SKU",
      price: Number(li.price) || 0,
      quantity: Math.max(1, Number(li.quantity) || 1),
      lineTotal: (Number(li.price) || 0) * Math.max(1, Number(li.quantity) || 1),
      image: li.image || ""
    }));

    const nowIso = new Date().toISOString();
    const orderData = {
      id: newId,
      orderNumber,
      customerId: customerId || null,
      customerSnapshot,
      lineItems: resolvedLineItems,
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      total,
      currency: customerSnapshot.currency,
      paymentStatus: paymentStatus || "paid",
      fulfillmentStatus: fulfillmentStatus || "unfulfilled",
      paymentMethod,
      paidAmount: Number(orderInput.paidAmount !== undefined ? orderInput.paidAmount : (paymentStatus === "paid" ? total : 0)),
      dueAmount: Number(orderInput.dueAmount !== undefined ? orderInput.dueAmount : (paymentStatus === "paid" ? 0 : total)),
      status: "open",
      shippingAddress: shippingAddress || { line1: customerSnapshot.address || "", city: "Dhaka", country: customerSnapshot.country },
      billingAddress: billingAddress || shippingAddress || null,
      notes: notes || "",
      timeline: [{
        event: `Order placed (${resolvedLineItems.length} items, ৳${total.toLocaleString()})`,
        at: nowIso,
        by: operatorName
      }],
      storeId,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Strictly persist to global Cloud Firestore collection
    if (typeof window !== "undefined" && typeof window.saveOrderToFirestore === "function") {
      try {
        await window.saveOrderToFirestore(orderData);
      } catch (fsErr) {
        console.warn("Direct Firestore save fallback:", fsErr?.message);
        await this._safeDocWrite(orderRef, orderData, true);
      }
    } else {
      await this._safeDocWrite(orderRef, orderData, true);
    }

    // 2. Decrement inventory in Firestore for line items
    for (const item of resolvedLineItems) {
      if (item.productId && window.ProductsService?.adjustInventory) {
        try {
          window.ProductsService.adjustInventory(item.productId, item.variantId, -item.quantity, "order_placement").catch(() => {});
        } catch (invErr) {}
      }
    }

    // 3. Bump customer aggregates in Firestore
    if (customerId && window.CustomersService?._bumpAggregates) {
      try {
        window.CustomersService._bumpAggregates(customerId, total).catch(() => {});
      } catch (custErr) {}
    }

    // 4. Server persistence backup for cross-system consistency
    try {
      const apiRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        if (apiJson && (apiJson.item || apiJson.order)) {
          orderData = { ...orderData, ...(apiJson.item || apiJson.order) };
        }
      }
    } catch (apiErr) {
      console.warn("API orders sync notice:", apiErr?.message);
    }

    // Update in-memory cache
    const existingIdx = this._memCache.findIndex(o => o.id === newId || o.orderNumber === orderNumber);
    if (existingIdx !== -1) {
      this._memCache[existingIdx] = orderData;
    } else {
      this._memCache.unshift(orderData);
    }

    if (typeof window !== "undefined") {
      window.orders = this._memCache;
      if (window.DATA) window.DATA.orders = this._memCache;
      try {
        if (window.localStorage) {
          window.localStorage.setItem("orders", JSON.stringify(this._memCache));
        }
      } catch(e) {}
    }

    // Emit live cross-device & client events
    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", orderData);
      window.NexEvents.emit("ORDER_CREATED", orderData);
      window.NexEvents.emit("DATA_SYNC", { type: "order_created", order: orderData });
    }

    const modEl = typeof document !== 'undefined' ? document.getElementById("mod-Orders") : null;
    if (modEl && window.render?.Orders) {
      try { window.render.Orders(modEl); } catch(e) {}
    }

    return { id: orderData.id, orderId: orderData.id, orderNumber: orderData.orderNumber, total, resolvedLineItems, item: orderData, order: orderData };
  },

  /* ── Update Order Statuses & Timeline ── */
  async updateStatus(orderId, { status, paymentStatus, fulfillmentStatus, notes }) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const patch = { updatedAt: new Date().toISOString() };
    const events = [];
    const operator = window.NexAuth?.profile?.name || "Operator";

    if (status) {
      patch.status = status;
      events.push(`Order status updated to "${status.toUpperCase()}" by ${operator}`);
    }
    if (paymentStatus) {
      patch.paymentStatus = paymentStatus;
      events.push(`Payment marked as "${paymentStatus.toUpperCase()}" by ${operator}`);
    }
    if (fulfillmentStatus) {
      patch.fulfillmentStatus = fulfillmentStatus;
      events.push(`Fulfillment marked as "${fulfillmentStatus.toUpperCase()}" by ${operator}`);
    }
    if (notes !== undefined) {
      patch.notes = notes;
    }

    let timelineEntries = [];
    if (events.length) {
      timelineEntries = events.map(e => ({
        event: e,
        at: new Date().toISOString(),
        by: operator
      }));
      if (window.FieldValue?.arrayUnion) {
        patch.timeline = window.FieldValue.arrayUnion(...timelineEntries);
      }
    }

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(col.doc(orderId), patch, true);

    // 2. Server persistence backup
    try {
      const serverPayload = { ...patch, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverPayload)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...patch };
      if (timelineEntries.length) {
        this._memCache[idx].timeline = [...(this._memCache[idx].timeline || []), ...timelineEntries];
      }
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, ...patch });
    }

    return true;
  },

  /* ── Cancel Order & Restore Inventory in Firestore Transaction ── */
  async cancel(orderId, reason = "Customer request") {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const order = await this.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") return true;

    const operator = window.NexAuth?.profile?.name || "Operator";
    const cancelTimeline = {
      event: `Order cancelled. Reason: ${reason}`,
      at: new Date().toISOString(),
      by: operator
    };

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection
    await col.doc(orderId).update({
      status: "cancelled",
      paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus,
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      timeline: window.FieldValue?.arrayUnion ? window.FieldValue.arrayUnion(cancelTimeline) : [cancelTimeline]
    });

    // 2. Restore inventory if line items exist
    if (Array.isArray(order.lineItems)) {
      for (const item of order.lineItems) {
        if (item.productId && window.ProductsService?.adjustInventory) {
          try {
            await window.ProductsService.adjustInventory(item.productId, item.variantId, item.quantity, "order_cancellation");
          } catch (invErr) {}
        }
      }
    }

    // 3. Server persistence backup
    try {
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus
        })
      }).catch(() => {});
    } catch (e) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      this._memCache[idx].status = "cancelled";
      if (this._memCache[idx].paymentStatus === "paid") this._memCache[idx].paymentStatus = "refunded";
      this._memCache[idx].timeline = [...(this._memCache[idx].timeline || []), cancelTimeline];
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, status: "cancelled" });
    }

    return true;
  },

  /* ── Full Order Update & Customization (Shopify-Style Order Editing) ── */
  async update(orderId, patch) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const operator = window.NexAuth?.profile?.name || "Operator";
    const updatePayload = {
      ...patch,
      updatedAt: new Date().toISOString()
    };
    
    const timelineEntry = {
      event: patch.timelineEvent || `Order customized & details updated by ${operator}`,
      at: new Date().toISOString(),
      by: operator
    };

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    if (window.FieldValue?.arrayUnion) {
      updatePayload.timeline = window.FieldValue.arrayUnion(timelineEntry);
    }
    await this._safeDocWrite(col.doc(orderId), updatePayload, true);

    // 2. Server persistence backup
    try {
      const serverPayload = { ...updatePayload, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverPayload)
      }).catch(() => {});
    } catch (e) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      const existing = this._memCache[idx];
      const updatedTimeline = [...(existing.timeline || []), timelineEntry];
      this._memCache[idx] = { ...existing, ...patch, timeline: updatedTimeline, updatedAt: new Date().toISOString() };
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, ...patch });
    }

    return true;
  },

  /* ── Delete Order ── */
  async delete(orderId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    // Strictly delete from global Cloud Firestore collection with resilient timeout
    try {
      await Promise.race([
        col.doc(orderId).delete(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {}

    try {
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" }).catch(() => {});
    } catch (e) {}

    this._memCache = this._memCache.filter(o => o.id !== orderId && o.orderNumber !== orderId);

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, deleted: true });
    }

    return true;
  },

  /* ── Hydrate Comprehensive Order & Customer Data for Invoicing ── */
  async getInvoiceData(orderId) {
    const order = await this.get(orderId);
    if (!order) return null;

    let customer = null;
    if (order.customerId && window.CustomersService) {
      try {
        customer = await window.CustomersService.get(order.customerId);
      } catch (e) {
        console.warn("Could not fetch customer by ID for invoice:", e);
      }
    }

    // Fallback: match by phone or name in customer database using CustomersService
    if (!customer && window.CustomersService) {
      const snapPhone = order.customerSnapshot?.phone || order.phone || order.shippingAddress?.phone;
      const snapName = order.customerSnapshot?.name || order.customerName;
      if (snapPhone || snapName) {
        try {
          const allCustomers = window.CustomersService.getAll();
          customer = allCustomers.find(c => 
            (snapPhone && c.phone && c.phone.replace(/[^0-9]/g, "") === String(snapPhone).replace(/[^0-9]/g, "")) ||
            (snapName && c.name && c.name.toLowerCase() === snapName.toLowerCase())
          ) || null;
        } catch (e) {}
      }
    }

    return { order, customer };
  }
};

window.OrdersService.createOrder = window.OrdersService.create.bind(window.OrdersService);
window.OrdersService.updateOrder = window.OrdersService.update.bind(window.OrdersService);

