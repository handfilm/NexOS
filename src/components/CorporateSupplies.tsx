import { db } from '../lib/firebase';
import React, { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ProductItem {
  id: string;
  sku: string;
  division: 'leatherware' | 'tech';
  name: string;
  tagline: string;
  description: string;
  material: string;
  hardware: string;
  origin: string;
  dimensions: string;
  weight: string;
  imageUrl: string;
  gallery: string[];
  swatches: { name: string; hex: string; desc: string }[];
  tierPricing: {
    minQty: number;
    priceUsd: number;
    priceBdt: number;
    label: string;
  }[];
  customizationOptions: string[];
  specs: { label: string; value: string }[];
}

export interface RFQLineItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  selectedSwatch: string;
  brandingType: 'blind_deboss' | 'gold_foil' | 'gunmetal_laser' | 'die_plate';
  packaging: 'eco_kraft' | 'luxury_rigid_box';
  customInitials?: string;
  unitPriceUsd: number;
  unitPriceBdt: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  division: string;
  address: string;
  contactPerson: string;
  role: string;
  email: string;
  phone: string;
  vatNumber: string;
  accountStatus: string;
  terms: string;
  preferredTier: string;
  deliveryDestination: string;
}

const CLIENT_PRESETS: ClientProfile[] = [
  {
    id: 'beximco',
    name: 'Beximco Pharmaceuticals Ltd.',
    division: 'Corporate Procurement & Executive Gifting Division',
    address: '19 Dhanmondi R/A, Road 7, Dhaka-1205 / Beximco Industrial Park, Tongi',
    contactPerson: 'Z. Al-Mamun, Head of Corporate Affairs',
    role: 'Chief Procurement Officer',
    email: 'procurement@beximco-pharma.com',
    phone: '+880 1711-894201',
    vatNumber: 'BIN: 000184912-0101 (Approved Tax Exempt B2B)',
    accountStatus: 'TIER-1 ENTERPRISE VERIFIED',
    terms: 'Net 30 Days / Corporate PO',
    preferredTier: 'Tier 3 (18% Enterprise Volume Discount)',
    deliveryDestination: 'Beximco Pharma HQ & Central Tongi Logistics Hub'
  },
  {
    id: 'square',
    name: 'Square Pharmaceuticals Ltd.',
    division: 'Strategic Sourcing & Doctor Relations',
    address: 'Square Centre, 48 Mohakhali C/A, Dhaka-1212',
    contactPerson: 'Tanvir Hossain, GM Procurement',
    role: 'General Manager Supply Chain',
    email: 't.hossain@squaregroup.com',
    phone: '+880 1713-092144',
    vatNumber: 'BIN: 000049218-0204',
    accountStatus: 'TIER-1 ENTERPRISE VERIFIED',
    terms: 'Net 45 Days',
    preferredTier: 'Tier 2 (12% Volume Discount)',
    deliveryDestination: 'Kalyanpur Distribution Hub'
  },
  {
    id: 'incepta',
    name: 'Incepta Pharmaceuticals Ltd.',
    division: 'Corporate Branding & Executive Board Desk',
    address: '40 Shahid Tajuddin Ahmed Sarani, Tejgaon I/A, Dhaka-1208',
    contactPerson: 'S. K. Majumder, Executive Director',
    role: 'Corporate Sourcing Lead',
    email: 'sourcing@inceptapharma.com',
    phone: '+880 1819-224590',
    vatNumber: 'BIN: 000192837-0102',
    accountStatus: 'ENTERPRISE CONTRACT ACTIVE',
    terms: 'Net 30 Days',
    preferredTier: 'Tier 3 (18% Volume Discount)',
    deliveryDestination: 'Dhamrai Plant & Tejgaon HQ'
  },
  {
    id: 'renata',
    name: 'Renata Limited',
    division: 'Corporate Communication & Medical Relations',
    address: 'Plot # 1, Milk Vita Road, Section-7, Mirpur, Dhaka-1216',
    contactPerson: 'Dr. Faisal Ahmed, Strategic Brand Officer',
    role: 'Head of Marketing & Relations',
    email: 'procurement@renata-ltd.com',
    phone: '+880 1730-019940',
    vatNumber: 'BIN: 000284711-0301',
    accountStatus: 'ENTERPRISE CONTRACT ACTIVE',
    terms: 'Net 30 Days',
    preferredTier: 'Tier 2 (12% Volume Discount)',
    deliveryDestination: 'Mirpur Corporate Complex'
  }
];

const CATALOG_PRODUCTS: ProductItem[] = [
  // ── Division 1: Handcrafted Full-Grain Leatherware ──
  {
    id: 'prod-folio-01',
    sku: 'HH-B2B-EF09',
    division: 'leatherware',
    name: 'The Executive Compendium & 14" Laptop Folio',
    tagline: 'Full-Grain Veg-Tan Cowhide · Fits 14" MacBook / A4 Legal Pad',
    description: 'Precision hand-crafted executive compendium cut from 1.6-1.8mm vegetable-tanned pull-up cowhide. Features dedicated sleeve for 14" ultrabooks, dual pen slots, RFID-shielded card sheath, and legal notepad channel.',
    material: 'Full-Grain Veg-Tan Cowhide (1.6-1.8mm Grade-A)',
    hardware: 'Matte Gunmetal YKK Excella & Solid Brass Snaps',
    origin: 'H&H Savar Leather Cluster Tannery, Dhaka',
    dimensions: '355mm x 260mm x 25mm (W x H x D)',
    weight: '580g (Solid construction)',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Aniline Deep Black' },
      { name: 'Havane Cognac', hex: '#78350f', desc: 'Warm Caramel Pull-Up' },
      { name: 'Saddle Tan', hex: '#92400e', desc: 'Natural Veg-Tan Patina' },
      { name: 'British Racing Green', hex: '#064e3b', desc: 'Deep Forest Matte' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 38, priceBdt: 4560, label: '50-199 pcs (Standard)' },
      { minQty: 200, priceUsd: 31, priceBdt: 3720, label: '200-499 pcs (Tier-2)' },
      { minQty: 500, priceUsd: 25, priceBdt: 3000, label: '500+ pcs (Enterprise VIP)' }
    ],
    customizationOptions: ['Blind Deep Deboss', '24K Gold Foil Stamping', 'Custom Client Die Plate', 'Recipient Initials'],
    specs: [
      { label: 'Leather Thickness', value: '1.6mm - 1.8mm (Heavy Gauge)' },
      { label: 'Stitch Pitch', value: '3.38mm French Pricking Stitch' },
      { label: 'Edge Finish', value: 'Triple Beeswax Burnish' },
      { label: 'Device Clearance', value: 'Up to 14.2" (MacBook Pro 14 / Dell XPS)' }
    ]
  },
  {
    id: 'prod-deskmat-02',
    sku: 'HH-B2B-DP03',
    division: 'leatherware',
    name: 'Architectural Minimalist Desk Mat (800x400mm)',
    tagline: '2.4mm Tuscan Bridle Leather · Suede Underlay · Brass Pen Channel',
    description: 'Substantial desk mat engineered for C-suite executive workspaces. Crafted from 2.4mm heavyweight bridle leather with water-repellent wax buffing and anti-slip suede underlay. Built to age gracefully over decades.',
    material: '2.4mm Tuscan Bridle Oil Leather & Suede Base',
    hardware: 'Solid Milled Brass Pen Rest Notch',
    origin: 'H&H Savar Tannery / Hand Finished in Dhaka',
    dimensions: '800mm x 400mm x 3.5mm total thickness',
    weight: '720g',
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Aniline Deep Black' },
      { name: 'Havane Cognac', hex: '#78350f', desc: 'Warm Caramel Pull-Up' },
      { name: 'Oxblood Burgundy', hex: '#4c0519', desc: 'Rich Vintage Claret' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 34, priceBdt: 4080, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 28, priceBdt: 3360, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 22, priceBdt: 2640, label: '500+ pcs' }
    ],
    customizationOptions: ['Lower-Right Subtle Logo Deboss', 'Contrast Perimeter Stitching', 'Custom Cut Sizes'],
    specs: [
      { label: 'Surface Coating', value: 'Water & Spill Resistant Carnauba Wax' },
      { label: 'Mouse Tracking', value: 'Optical & Laser Precision Sensor Verified' },
      { label: 'Underlay', value: 'Anti-Slip Genuine Split Suede' },
      { label: 'Corner Radius', value: 'R12 Industrial Precision Curve' }
    ]
  },
  {
    id: 'prod-passport-03',
    sku: 'HH-B2B-TO14',
    division: 'leatherware',
    name: 'Executive Passport & International Travel Wallet',
    tagline: 'Pull-Up Cowhide · Chèvre Lining · Dual Currency & Boarding Pass',
    description: 'Designed for international pharmaceutical delegates and overseas summit attendees. Accommodates dual passports, boarding passes, currency bills, micro SIM ejector tool, and 6 credit/membership cards with RFID shielding.',
    material: 'Pull-up Cowhide Outer with French Chèvre Goat Lining',
    hardware: 'Gunmetal Concealed Magnetic Snaps',
    origin: 'H&H Dhaka Atelier',
    dimensions: '215mm x 120mm x 14mm',
    weight: '165g',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Sleek Executive Black' },
      { name: 'Havane Cognac', hex: '#78350f', desc: 'Aviation Heritage Brown' },
      { name: 'Saddle Tan', hex: '#92400e', desc: 'Warm Classic Tan' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 29, priceBdt: 3480, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 24, priceBdt: 2880, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 19, priceBdt: 2280, label: '500+ pcs' }
    ],
    customizationOptions: ['Interior Gold Foil Stamp', 'Exterior Blind Deboss', 'Bespoke Travel Box Packaging'],
    specs: [
      { label: 'Passport Slots', value: 'Dual (Fits Bangladesh / EU / US Passports)' },
      { label: 'Security', value: 'Full RFID 13.56 MHz Blocking Interlining' },
      { label: 'Lining', value: 'Ultra-thin Chèvre Moroccan Leather' }
    ]
  },
  {
    id: 'prod-lanyard-04',
    sku: 'HH-B2B-CS02',
    division: 'leatherware',
    name: 'Dual-Sided RFID ID Badge Holder & Braided Lanyard',
    tagline: '1.0mm Milled Calfskin · Stainless Steel Swivel Clasp',
    description: 'Elevated corporate identification system for pharmaceutical conferences, corporate headquarters, and factory audits. Double-sided with clear ID acetate window and two backup keycard slots.',
    material: 'Full-Grain Milled Calfskin & Braided Leather Cord',
    hardware: 'Solid Stainless Steel 360° Swivel Lobster Clip',
    origin: 'H&H Dhaka Atelier',
    dimensions: '110mm x 72mm x 4mm (Cord length: 460mm)',
    weight: '45g',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Formal Black' },
      { name: 'Havane Cognac', hex: '#78350f', desc: 'Corporate Brown' },
      { name: 'Navy Blue', hex: '#1e3a8a', desc: 'Executive Blue' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 14, priceBdt: 1680, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 11, priceBdt: 1320, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 8.5, priceBdt: 1020, label: '500+ pcs' }
    ],
    customizationOptions: ['Back Badge Logo Hot Stamping', 'Custom Pantone Leather Dyeing (>300 pcs)'],
    specs: [
      { label: 'Windows', value: 'High-clarity Anti-Glare Acetate' },
      { label: 'Cord Pull', value: 'Reinforced 18kg Breaking Strength Cord' }
    ]
  },
  {
    id: 'prod-duffle-05',
    sku: 'HH-B2B-DF07',
    division: 'leatherware',
    name: 'The Apothecary Doctor\'s Weekend Leather Duffle',
    tagline: 'VIP Enterprise Gift · 2.2mm Pull-Up Leather · Brass Frame Opening',
    description: 'Prestigious physician & executive presentation luggage. Classic structured doctor-bag hinge frame that stays open for effortless packing, reinforced riveted corners, and trolley-sleeve for airport mobility.',
    material: '2.2mm Heavy Pull-Up Cowhide & 12oz Heavy Twill Lining',
    hardware: 'Solid Brass Buckles, Rivets & Dual YKK #10 Excella Zippers',
    origin: 'Master Craftsman Workshop, Dhaka',
    dimensions: '520mm x 290mm x 280mm (Cabin Approved 42L)',
    weight: '1,850g',
    imageUrl: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Havane Cognac', hex: '#78350f', desc: 'Rich Oil Pull-Up' },
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Monochrome Midnight' }
    ],
    tierPricing: [
      { minQty: 25, priceUsd: 95, priceBdt: 11400, label: '25-99 pcs' },
      { minQty: 100, priceUsd: 78, priceBdt: 9360, label: '100-249 pcs' },
      { minQty: 250, priceUsd: 65, priceBdt: 7800, label: '250+ pcs' }
    ],
    customizationOptions: ['Bespoke Monogram Luggage Tag Included', 'Solid Brass Logo Plaque', 'Luxury Dust Bag'],
    specs: [
      { label: 'Capacity', value: '42 Liters (Compliant with IATA Carry-On)' },
      { label: 'Hardware', value: '100% Solid Cast Brass (Nickel-Free)' }
    ]
  },
  {
    id: 'prod-tray-06',
    sku: 'HH-B2B-VT05',
    division: 'leatherware',
    name: 'Artisanal Snap Valet Tray & Desk Catchall',
    tagline: 'Heavy Veg-Tan Leather · Solid Brass Fasteners · Flat Pack for Travel',
    description: 'An elegant desktop sanctuary for smartwatches, keys, cuff links, and executive pens. Packs completely flat for travel, snapping into a rigid tray via four heavy solid brass corner snaps.',
    material: '2.0mm Firm Veg-Tan Cowhide',
    hardware: 'Heavy Solid Brass Spring Snaps',
    origin: 'H&H Dhaka Workshop',
    dimensions: '220mm x 220mm flat / 170mm x 170mm x 40mm formed',
    weight: '140g',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Saddle Tan', hex: '#92400e', desc: 'Classic Warm Tan' },
      { name: 'Obsidian Noir', hex: '#18181b', desc: 'Architectural Black' },
      { name: 'British Racing Green', hex: '#064e3b', desc: 'Hunter Forest Green' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 18, priceBdt: 2160, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 14, priceBdt: 1680, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 11, priceBdt: 1320, label: '500+ pcs' }
    ],
    customizationOptions: ['Center Crest Debossing', 'Gold Hot-Foil Stamping', 'Individual Initials'],
    specs: [
      { label: 'Corner Snaps', value: 'Heavy Duty 15mm Brass Snaps' },
      { label: 'Forming Rigidity', value: 'Self-supporting without synthetic stiffeners' }
    ]
  },

  // ── Division 2: Tech, Hardware & Executive Desk Accessories ──
  {
    id: 'prod-charger-07',
    sku: 'HH-B2B-TC01',
    division: 'tech',
    name: 'MagSafe & Qi 15W Fast Wireless Leather Charging Pad',
    tagline: 'CNC Milled Aerospace Aluminum · Hand-Fitted Veg-Tan Leather Face',
    description: 'Industrial minimalism meets organic warmth. Billet aluminum unibody with chamfered diamond-cut perimeter and inlaid genuine leather charging pad. Intelligent Qi 2.0 temperature modulation.',
    material: '6063 Aluminum Unibody & 1.2mm Aniline Leather Inlay',
    hardware: 'Braided 1.5m USB-C Cable with Leather Cable Organizer',
    origin: 'Precision CNC Machined & Leather Assembled in Dhaka',
    dimensions: '100mm diameter x 8mm thickness',
    weight: '190g (Weighted Anti-Slip Base)',
    imageUrl: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Matte Space Gray / Noir', hex: '#18181b', desc: 'Gunmetal Anodized' },
      { name: 'Anodized Silver / Tan', hex: '#92400e', desc: 'Silver Frame + Tan Leather' },
      { name: 'Stealth Black / Cognac', hex: '#78350f', desc: 'Deep Black + Cognac' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 36, priceBdt: 4320, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 29, priceBdt: 3480, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 23, priceBdt: 2760, label: '500+ pcs' }
    ],
    customizationOptions: ['Laser Engraved Aluminum Ring', 'Leather Face Heat Deboss', 'Bespoke Rigid Gift Box'],
    specs: [
      { label: 'Output', value: '15W Fast Qi / 7.5W Apple MagSafe Certified' },
      { label: 'Safety', value: 'FOD (Foreign Object Detection) & Overheat Cutoff' },
      { label: 'Base', value: 'Silicone High-Friction Desktop Footing' }
    ]
  },
  {
    id: 'prod-flask-08',
    sku: 'HH-B2B-TF08',
    division: 'tech',
    name: 'Matte Black Thermal Insulated Flask with Leather Sleeve',
    tagline: '18/8 Double-Wall Steel (550ml) · Detachable Hand-Stitched Leather Cuff',
    description: 'Engineered for executive daily hydration and clinical ward visits. High-vacuum insulated stainless body keeps drinks cold for 24 hours or steaming hot for 12 hours. Features removable vegetable-tanned leather grip sleeve.',
    material: 'Pro-Grade 18/8 Stainless Steel & Veg-Tan Pull-Up Leather',
    hardware: 'Leak-Proof Magnetic Cap & Powder-Coated Body',
    origin: 'Flask Certified OEM / Leather Cuff Crafted in Dhaka',
    dimensions: '72mm diameter x 240mm height (550ml / 19oz)',
    weight: '340g',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Matte Black / Cognac Cuff', hex: '#78350f', desc: 'Tactical Matte Black' },
      { name: 'Matte Black / Noir Cuff', hex: '#18181b', desc: 'Monochrome Black' },
      { name: 'Gunmetal / Olive Cuff', hex: '#064e3b', desc: 'Military Olive' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 24, priceBdt: 2880, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 19, priceBdt: 2280, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 15, priceBdt: 1800, label: '500+ pcs' }
    ],
    customizationOptions: ['Laser Engraved Steel Body', 'Leather Cuff Blind Deboss', 'Individual Physician Names'],
    specs: [
      { label: 'Insulation', value: '24h Cold / 12h Hot Dual Vacuum' },
      { label: 'Coating', value: 'Zero-Condensation Textured Powder Coat' }
    ]
  },
  {
    id: 'prod-penrest-09',
    sku: 'HH-B2B-PR04',
    division: 'tech',
    name: 'Solid Brushed Brass Billet & Leather Pen Rest',
    tagline: '340g Solid Brass Bar · Oiled Leather Inset Cradle · 3 Instrument Slots',
    description: 'Architectural desk monument for fountain pens and executive stylus instruments. Milled from a single piece of solid jeweler\'s brass with satin wire-brushed finish and hand-fitted saddle leather bed.',
    material: 'Solid H59 Architectural Brass & Wax-Treated Leather',
    hardware: 'Raw Brushed Brass (Develops Natural Golden Patina)',
    origin: 'CNC Machined & Hand Finished in Dhaka',
    dimensions: '160mm x 45mm x 18mm',
    weight: '340g (Substantial anti-slip desk anchor)',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Natural Brass / Noir', hex: '#18181b', desc: 'Golden Brass + Black Inset' },
      { name: 'Natural Brass / Cognac', hex: '#78350f', desc: 'Golden Brass + Cognac Inset' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 22, priceBdt: 2640, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 17, priceBdt: 2040, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 13.5, priceBdt: 1620, label: '500+ pcs' }
    ],
    customizationOptions: ['Laser Serialized Numbering', 'Front Chamfer Laser Engraving', 'Leather Bed Blind Stamp'],
    specs: [
      { label: 'Weight & Feel', value: '340 grams Heavy Solid Brass' },
      { label: 'Capacity', value: 'Triple Contoured Pen Channels' }
    ]
  },
  {
    id: 'prod-powerbank-10',
    sku: 'HH-B2B-PB06',
    division: 'tech',
    name: 'Ultra-Slim 10,000mAh PD Powerbank in Tailored Leather Sleeve',
    tagline: '22.5W Fast Power Delivery · Dual USB-C · Hand-Stitched Leather Case',
    description: 'Reliable mobile energy for executive travel and hospital site inspections. Aircraft-safe lithium-polymer battery encased in matte titanium-grey housing, accompanied by bespoke hand-stitched leather protective sleeve.',
    material: 'Polymer Battery in Anodized Shell + 1.4mm Pull-Up Leather Pouch',
    hardware: 'Gold Plated Connectors & Dual-Way PD Type-C',
    origin: 'Electronics Assembled & Leather Sleeve Handcrafted in Dhaka',
    dimensions: '142mm x 68mm x 14mm',
    weight: '215g',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Gunmetal / Obsidian Pouch', hex: '#18181b', desc: 'Titanium Grey Shell' },
      { name: 'Gunmetal / Cognac Pouch', hex: '#78350f', desc: 'Warm Heritage Leather' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 32, priceBdt: 3840, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 26, priceBdt: 3120, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 20.5, priceBdt: 2460, label: '500+ pcs' }
    ],
    customizationOptions: ['Debossed Corporate Insignia on Sleeve', 'LED Battery Indicator Laser Etch'],
    specs: [
      { label: 'Capacity', value: '10,000 mAh (37Wh Airline Approved)' },
      { label: 'Protocols', value: 'QC 4.0 / USB-PD 3.0 (22.5W Max)' }
    ]
  },
  {
    id: 'prod-carabiner-11',
    sku: 'HH-B2B-KC09',
    division: 'tech',
    name: 'Titanium Grade 5 & Leather Loop Key Organizer',
    tagline: 'Ultralight Grade 5 Ti Carabiner · Veg-Tan Loop · Brass Key Shackle',
    description: 'Tactile minimalist key EDC. Milled from Grade 5 titanium billet with integrated bottle opener and pry notch, paired with an interchangeable full-grain leather strap and solid brass threaded key screw.',
    material: 'Grade 5 Aerospace Titanium (Ti-6Al-4V) & Veg-Tan Cowhide',
    hardware: 'Solid Brass Threaded Chicago Screw & Dual Flat Rings',
    origin: 'Dhaka CNC Precision Workshop',
    dimensions: '82mm x 32mm x 8mm',
    weight: '38g',
    imageUrl: 'https://images.unsplash.com/photo-1582845512747-e42001c95638?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1582845512747-e42001c95638?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Stonewash Ti / Noir Loop', hex: '#18181b', desc: 'Matte Grey Titanium' },
      { name: 'Stonewash Ti / Cognac Loop', hex: '#78350f', desc: 'Titanium + Tan' }
    ],
    tierPricing: [
      { minQty: 50, priceUsd: 16, priceBdt: 1920, label: '50-199 pcs' },
      { minQty: 200, priceUsd: 12.5, priceBdt: 1500, label: '200-499 pcs' },
      { minQty: 500, priceUsd: 9.5, priceBdt: 1140, label: '500+ pcs' }
    ],
    customizationOptions: ['Laser Engraved Corporate Logo on Titanium', 'Debossed Monogram on Leather Loop'],
    specs: [
      { label: 'Tensile Strength', value: 'Grade 5 High-Yield Titanium' },
      { label: 'Key Capacity', value: 'Up to 6 keys securely anchored' }
    ]
  },
  {
    id: 'prod-hamper-12',
    sku: 'HH-B2B-GS01',
    division: 'tech',
    name: 'The Sovereign Executive Corporate Hamper Box',
    tagline: 'VIP Gift Set: Folio + Wireless Charger + Thermal Flask + Cardholder',
    description: 'The definitive corporate gift suite created for pharmaceutical boards, international key opinion leaders (KOLs), and annual general meetings. Packaged in a bespoke matte black magnetic presentation box with custom client gold foil crest.',
    material: 'Multi-Item Luxury Leather & Anodized Tech Suite',
    hardware: 'Magnetic Rigid Gift Box with Velvet-Lined High-Density EVA Foam',
    origin: 'Curated & Hand-Assembled in H&H Dhaka Studio',
    dimensions: '420mm x 320mm x 90mm Presentation Case',
    weight: '2,200g Complete Suite',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80'
    ],
    swatches: [
      { name: 'Midnight Noir Edition', hex: '#18181b', desc: 'All Black Luxury Suite' },
      { name: 'Bespoke Cognac Heritage', hex: '#78350f', desc: 'Vintage Warm Caramel Suite' }
    ],
    tierPricing: [
      { minQty: 25, priceUsd: 115, priceBdt: 13800, label: '25-99 sets' },
      { minQty: 100, priceUsd: 92, priceBdt: 11040, label: '100-249 sets' },
      { minQty: 250, priceUsd: 79, priceBdt: 9480, label: '250+ sets' }
    ],
    customizationOptions: [
      'Outer Lid 24K Gold Foil Hot Stamped Logo',
      'Personalized Welcome Letter Card on Cotton Paper',
      'Wax-Sealed Custom Ribbon'
    ],
    specs: [
      { label: 'Suite Inclusions', value: '4 Signature Pieces + Gift Box Packaging' },
      { label: 'Box Construction', value: '1800 GSM Ultra-Rigid Grayboard with Matte Laminate' }
    ]
  }
];

export const CorporateSupplies: React.FC = () => {
  // Client selection state
  const [selectedClient, setSelectedClient] = useState<ClientProfile>(CLIENT_PRESETS[0]);
  const [currency, setCurrency] = useState<'USD' | 'BDT'>('USD');
  const [activeDivision, setActiveDivision] = useState<'all' | 'leatherware' | 'tech'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Product for Spec Inspection Drawer
  const [inspectingProduct, setInspectingProduct] = useState<ProductItem | null>(null);
  const [inspectSwatch, setInspectSwatch] = useState<string>('');
  const [inspectBranding, setInspectBranding] = useState<'blind_deboss' | 'gold_foil' | 'gunmetal_laser' | 'die_plate'>('blind_deboss');
  const [inspectPackaging, setInspectPackaging] = useState<'eco_kraft' | 'luxury_rigid_box'>('luxury_rigid_box');
  const [inspectQty, setInspectQty] = useState<number>(100);

  // RFQ Line Items Cart
  const [rfqItems, setRfqItems] = useState<RFQLineItem[]>([
    {
      productId: CATALOG_PRODUCTS[0].id,
      name: CATALOG_PRODUCTS[0].name,
      sku: CATALOG_PRODUCTS[0].sku,
      quantity: 100,
      selectedSwatch: CATALOG_PRODUCTS[0].swatches[0].name,
      brandingType: 'blind_deboss',
      packaging: 'luxury_rigid_box',
      unitPriceUsd: 38,
      unitPriceBdt: 4560
    },
    {
      productId: CATALOG_PRODUCTS[6].id,
      name: CATALOG_PRODUCTS[6].name,
      sku: CATALOG_PRODUCTS[6].sku,
      quantity: 100,
      selectedSwatch: CATALOG_PRODUCTS[6].swatches[0].name,
      brandingType: 'gunmetal_laser',
      packaging: 'luxury_rigid_box',
      unitPriceUsd: 36,
      unitPriceBdt: 4320
    }
  ]);

  // RFQ Add-ons & options state
  const [includeDiePlate, setIncludeDiePlate] = useState<boolean>(true);
  const [includeLuxuryBox, setIncludeLuxuryBox] = useState<boolean>(true);
  const [includePersonalization, setIncludePersonalization] = useState<boolean>(false);
  const [includeHoloSeal, setIncludeHoloSeal] = useState<boolean>(true);

  // UI state
  const [isRfqDrawerOpen, setIsRfqDrawerOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Helper Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync inspect product initial swatch
  useEffect(() => {
    if (inspectingProduct) {
      setInspectSwatch(inspectingProduct.swatches[0]?.name || '');
      setInspectQty(100);
    }
  }, [inspectingProduct]);

  // Compute unit price for a given product & quantity
  const getProductUnitPrice = (product: ProductItem, qty: number) => {
    const tier = [...product.tierPricing]
      .reverse()
      .find((t) => qty >= t.minQty) || product.tierPricing[0];
    return {
      usd: tier.priceUsd,
      bdt: tier.priceBdt
    };
  };

  // Update item in RFQ
  const updateRfqItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setRfqItems((prev) => prev.filter((item) => item.productId !== productId));
      showToast('Item removed from Quotation.');
      return;
    }
    const product = CATALOG_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const unitPrice = getProductUnitPrice(product, newQty);

    setRfqItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQty,
            unitPriceUsd: unitPrice.usd,
            unitPriceBdt: unitPrice.bdt
          };
        }
        return item;
      })
    );
  };

  // Add or update item from Catalog or Inspect Drawer
  const addProductToRfq = (
    product: ProductItem,
    qty: number = 50,
    swatchName?: string,
    branding?: 'blind_deboss' | 'gold_foil' | 'gunmetal_laser' | 'die_plate',
    packaging?: 'eco_kraft' | 'luxury_rigid_box'
  ) => {
    const existingIndex = rfqItems.findIndex((item) => item.productId === product.id);
    const chosenSwatch = swatchName || product.swatches[0]?.name || 'Standard';
    const chosenBranding = branding || 'blind_deboss';
    const chosenPackaging = packaging || 'luxury_rigid_box';

    if (existingIndex >= 0) {
      const current = rfqItems[existingIndex];
      const newQty = current.quantity + qty;
      const unitPrice = getProductUnitPrice(product, newQty);
      setRfqItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: newQty,
                selectedSwatch: chosenSwatch,
                brandingType: chosenBranding,
                packaging: chosenPackaging,
                unitPriceUsd: unitPrice.usd,
                unitPriceBdt: unitPrice.bdt
              }
            : item
        )
      );
      showToast(`Updated ${product.name} quantity to ${newQty} units`);
    } else {
      const unitPrice = getProductUnitPrice(product, qty);
      setRfqItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: qty,
          selectedSwatch: chosenSwatch,
          brandingType: chosenBranding,
          packaging: chosenPackaging,
          unitPriceUsd: unitPrice.usd,
          unitPriceBdt: unitPrice.bdt
        }
      ]);
      showToast(`Added ${product.name} (${qty} pcs) to RFQ`);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return CATALOG_PRODUCTS.filter((p) => {
      const matchesDivision = activeDivision === 'all' || p.division === activeDivision;
      const matchesQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDivision && matchesQuery;
    });
  }, [activeDivision, searchQuery]);

  // Aggregate RFQ totals calculation
  const totals = useMemo(() => {
    const totalUnits = rfqItems.reduce((acc, item) => acc + item.quantity, 0);

    let baseSubtotalUsd = 0;
    let baseSubtotalBdt = 0;

    rfqItems.forEach((item) => {
      baseSubtotalUsd += item.unitPriceUsd * item.quantity;
      baseSubtotalBdt += item.unitPriceBdt * item.quantity;
    });

    // Tier Volume Discount
    let volumeDiscountRate = 0;
    if (totalUnits >= 500) volumeDiscountRate = 0.18; // Tier 3
    else if (totalUnits >= 250) volumeDiscountRate = 0.12; // Tier 2
    else if (totalUnits >= 100) volumeDiscountRate = 0.05; // Tier 1

    const discountUsd = baseSubtotalUsd * volumeDiscountRate;
    const discountBdt = baseSubtotalBdt * volumeDiscountRate;

    // Add-on fees
    const diePlateFeeUsd = includeDiePlate ? (totalUnits >= 150 ? 0 : 45) : 0;
    const diePlateFeeBdt = includeDiePlate ? (totalUnits >= 150 ? 0 : 5400) : 0;

    const luxuryBoxFeeUsd = includeLuxuryBox ? totalUnits * 4.5 : 0;
    const luxuryBoxFeeBdt = includeLuxuryBox ? totalUnits * 540 : 0;

    const personalizationFeeUsd = includePersonalization ? totalUnits * 2.0 : 0;
    const personalizationFeeBdt = includePersonalization ? totalUnits * 240 : 0;

    const holoSealFeeUsd = includeHoloSeal ? totalUnits * 0.5 : 0;
    const holoSealFeeBdt = includeHoloSeal ? totalUnits * 60 : 0;

    const grandTotalUsd =
      baseSubtotalUsd -
      discountUsd +
      diePlateFeeUsd +
      luxuryBoxFeeUsd +
      personalizationFeeUsd +
      holoSealFeeUsd;

    const grandTotalBdt =
      baseSubtotalBdt -
      discountBdt +
      diePlateFeeBdt +
      luxuryBoxFeeBdt +
      personalizationFeeBdt +
      holoSealFeeBdt;

    // Lead Time estimation
    let leadTimeDays = '10 - 12 Working Days';
    if (totalUnits > 500) leadTimeDays = '18 - 22 Working Days';
    else if (totalUnits > 200) leadTimeDays = '14 - 16 Working Days';

    return {
      totalUnits,
      baseSubtotalUsd,
      baseSubtotalBdt,
      volumeDiscountRate,
      discountUsd,
      discountBdt,
      diePlateFeeUsd,
      diePlateFeeBdt,
      luxuryBoxFeeUsd,
      luxuryBoxFeeBdt,
      personalizationFeeUsd,
      personalizationFeeBdt,
      holoSealFeeUsd,
      holoSealFeeBdt,
      grandTotalUsd,
      grandTotalBdt,
      leadTimeDays
    };
  }, [rfqItems, includeDiePlate, includeLuxuryBox, includePersonalization, includeHoloSeal]);

  // Format money helper
  const fmt = (valUsd: number, valBdt: number) => {
    if (currency === 'USD') {
      return `$${valUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `৳${valBdt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Dispatch / Push directly to Tech-Pack PO Engine
  const pushToTechPackEngine = () => {
    const primaryItem = rfqItems[0];
    if (!primaryItem) {
      showToast('Add at least one product to push to factory PO.');
      return;
    }

    const customerPayload = {
      name: selectedClient.name,
      companyName: selectedClient.name,
      phone: selectedClient.phone,
      email: selectedClient.email,
      address: selectedClient.address,
      taxId: selectedClient.vatNumber
    };

    const specPayload = {
      category: 'Leather Goods' as any,
      poNumber: `HH-B2B-${selectedClient.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      fabric: `${primaryItem.name} — ${primaryItem.selectedSwatch}`,
      colorway: primaryItem.selectedSwatch,
      totalQuantity: totals.totalUnits,
      deliveryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientName: selectedClient.name,
      contactPerson: selectedClient.contactPerson,
      pricingFOB: currency === 'USD' ? `$${totals.grandTotalUsd.toFixed(2)}` : `৳${totals.grandTotalBdt}`,
      notes: `Enterprise B2B Quotation for ${selectedClient.name}. Total: ${totals.totalUnits} pcs. Branding: ${primaryItem.brandingType.toUpperCase()}. Packaging: ${primaryItem.packaging}.`
    };

    if (typeof (window as any).openTechPackPOEngine === 'function') {
      (window as any).openTechPackPOEngine(customerPayload);
      showToast(`Routed enterprise spec to Tech-Pack PO Engine for ${selectedClient.name}`);
    } else {
      window.dispatchEvent(
        new CustomEvent('nexus:open-techpack', {
          detail: { customer: customerPayload, spec: specPayload }
        })
      );
      showToast(`Tech-Pack PO launched with ${selectedClient.name} parameters`);
    }
  };

  // Copy WhatsApp / Email Pitch Memo
  const copyPitchText = () => {
    const quoteNum = `HH-RFQ-${selectedClient.id.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const pitch = `*HANDS & HEAD · ENTERPRISE QUOTATION SPECIFICATION*
Ref: ${quoteNum}
Client: *${selectedClient.name}*
Attention: ${selectedClient.contactPerson} (${selectedClient.role})
Delivery Destination: ${selectedClient.deliveryDestination}
Terms: ${selectedClient.terms} | Status: ${selectedClient.accountStatus}

*ITEMIZED PROCUREMENT MATRIX:*
${rfqItems
  .map(
    (it, idx) =>
      `${idx + 1}. *${it.name}* (${it.sku})
   • Quantity: ${it.quantity} units
   • Finish/Swatch: ${it.selectedSwatch}
   • Branding Spec: ${it.brandingType.replace('_', ' ').toUpperCase()}
   • Packaging: ${it.packaging.replace('_', ' ').toUpperCase()}
   • Unit Price: ${currency === 'USD' ? `$${it.unitPriceUsd}` : `৳${it.unitPriceBdt}`}
   • Subtotal: ${currency === 'USD' ? `$${(it.unitPriceUsd * it.quantity).toLocaleString()}` : `৳${(it.unitPriceBdt * it.quantity).toLocaleString()}`}`
  )
  .join('\n\n')}

*COMMERCIAL SUMMARY:*
• Total Units: ${totals.totalUnits} pcs
• Gross Subtotal: ${fmt(totals.baseSubtotalUsd, totals.baseSubtotalBdt)}
• Enterprise Discount (${(totals.volumeDiscountRate * 100).toFixed(0)}%): -${fmt(totals.discountUsd, totals.discountBdt)}
• Custom Brass Deboss Die: ${totals.diePlateFeeUsd === 0 ? 'COMPLIMENTARY (>150 pcs)' : fmt(totals.diePlateFeeUsd, totals.diePlateFeeBdt)}
• Rigid Magnetic Presentation Gift Boxes: ${fmt(totals.luxuryBoxFeeUsd, totals.luxuryBoxFeeBdt)}
• Tamper-Proof Hologram Seal: ${fmt(totals.holoSealFeeUsd, totals.holoSealFeeBdt)}
---------------------------------------------
*NET AUTHORIZED TOTAL: ${fmt(totals.grandTotalUsd, totals.grandTotalBdt)}*
---------------------------------------------
• Estimated Production Lead Time: ${totals.leadTimeDays}
• Payment Route: Corporate Bank Wire / LC (Net 30 Days)
• Quality Assurance: ISO-9001 / Zero-defect 100% Inspection Guarantee

Prepared by: K. Rahman, Corporate Enterprise Desk
Hands & Head Bangladesh · corporate@handsandhead.com`;

    navigator.clipboard.writeText(pitch).then(() => {
      showToast('Copied B2B WhatsApp / Email Pitch Memo to clipboard!');
    });
  };

  // Save Quotation to Firebase & LocalStorage
  const saveQuotationDraft = async () => {
    setIsSaving(true);
    const quoteRecord = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      contactPerson: selectedClient.contactPerson,
      date: new Date().toISOString(),
      items: rfqItems,
      totals,
      currency,
      options: {
        includeDiePlate,
        includeLuxuryBox,
        includePersonalization,
        includeHoloSeal
      }
    };

    try {
      localStorage.setItem('hh_last_b2b_rfq', JSON.stringify(quoteRecord));

      // db imported from lib/firebase
      await addDoc(collection(db, 'corporate_quotations'), {
        ...quoteRecord,
        createdAt: Timestamp.now()
      });
      showToast('Quotation securely recorded in Cloud Database & Local Storage.');
    } catch (err) {
      console.warn('Fallback to local storage only:', err);
      showToast('Quotation saved locally in browser storage.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="corporate-supplies-root w-full min-h-screen bg-[#ebf1f8]/60 text-[#1e293b] font-sans antialiased selection:bg-[#d4af37] selection:text-black">
      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[10005] bg-white/95 backdrop-blur-xl border border-[#d4af37]/60 text-[#1e293b] text-xs px-5 py-2.5 rounded-xl shadow-2xl font-mono flex items-center gap-3 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-800 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ── White Glassmorphic Master Header & Client Switcher ── */}
      <header className="border-b border-white/80 bg-white/85 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_20px_rgba(166,180,200,0.25)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title & Division Branding */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#b45309] border border-[#d4af37]/35 rounded-full">
                  B2B Executive Supplies
                </span>
                <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                  Pharma &amp; Enterprise Procurement Division
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1e293b] uppercase font-sans">
                Corporate Supplies &amp; Gifting Portfolio
              </h1>
              <p className="text-xs text-[#64748b] mt-0.5">
                Bespoke full-grain leatherware, executive tech instruments, and high-volume pharmaceutical gifting suites.
              </p>
            </div>

            {/* Client Profile Selector & Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Client Switcher Dropdown */}
              <div className="flex items-center bg-white/80 border border-slate-200/80 rounded-xl p-1 shadow-sm">
                <span className="text-[11px] font-mono text-[#64748b] px-2 font-semibold">CLIENT:</span>
                <select
                  value={selectedClient.id}
                  onChange={(e) => {
                    const found = CLIENT_PRESETS.find((c) => c.id === e.target.value);
                    if (found) {
                      setSelectedClient(found);
                      showToast(`Switched active enterprise client to ${found.name}`);
                    }
                  }}
                  className="bg-white text-[#1e293b] text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer focus:border-[#d4af37]"
                >
                  {CLIENT_PRESETS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Toggle */}
              <div className="inline-flex rounded-xl border border-slate-200/80 bg-white/80 p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                    currency === 'USD' ? 'bg-[#d4af37] text-white shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('BDT')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                    currency === 'BDT' ? 'bg-[#d4af37] text-white shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'
                  }`}
                >
                  BDT (৳)
                </button>
              </div>

              {/* RFQ Drawer Trigger Button */}
              <button
                type="button"
                onClick={() => setIsRfqDrawerOpen(true)}
                className="relative px-4 py-2 bg-[#d4af37] hover:bg-[#b45309] text-white font-mono font-bold text-xs rounded-xl transition-all shadow-[0_4px_16px_rgba(212,175,55,0.4)] flex items-center gap-2 cursor-pointer"
              >
                <span>⚡ RFQ QUOTATION DOCK</span>
                <span className="bg-black/80 text-[#fef08a] text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                  {totals.totalUnits} pcs
                </span>
              </button>
            </div>
          </div>

          {/* Enterprise Client Profile Telemetry Banner */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px] font-mono">
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Account Status</span>
              <span className="text-[#10b981] font-bold truncate block">{selectedClient.accountStatus}</span>
            </div>
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Procurement Terms</span>
              <span className="text-[#1e293b] font-bold truncate block">{selectedClient.terms}</span>
            </div>
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Volume Discount Tier</span>
              <span className="text-[#b45309] font-bold truncate block">
                Tier 3 Active (18% Off @ 500+)
              </span>
            </div>
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Delivery Target</span>
              <span className="text-[#334155] truncate block" title={selectedClient.deliveryDestination}>
                {selectedClient.deliveryDestination.split('&')[0]}
              </span>
            </div>
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Lead Time Forecast</span>
              <span className="text-[#1e293b] font-bold truncate block">{totals.leadTimeDays}</span>
            </div>
            <div className="bg-white/75 backdrop-blur-md border border-white/90 p-2.5 rounded-xl shadow-[2px_2px_8px_rgba(166,180,200,0.25),-2px_-2px_8px_#ffffff]">
              <span className="text-[#64748b] block text-[9px] uppercase tracking-wider">Client Officer</span>
              <span className="text-[#334155] truncate block" title={selectedClient.contactPerson}>
                {selectedClient.contactPerson.split(',')[0]}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sub-Nav Filters & Search Bar ── */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Division Matrix Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveDivision('all')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                activeDivision === 'all'
                  ? 'bg-white text-[#1e293b] border-white shadow-sm'
                  : 'bg-white/60 text-[#64748b] border-white/80 hover:text-[#1e293b]'
              }`}
            >
              ALL ITEMS (12)
            </button>
            <button
              type="button"
              onClick={() => setActiveDivision('leatherware')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                activeDivision === 'leatherware'
                  ? 'bg-[#d4af37] text-white border-[#d4af37] shadow-sm'
                  : 'bg-white/60 text-[#64748b] border-white/80 hover:text-[#1e293b]'
              }`}
            >
              💼 LEATHERWARE COMPENDIUMS (6)
            </button>
            <button
              type="button"
              onClick={() => setActiveDivision('tech')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                activeDivision === 'tech'
                  ? 'bg-[#d4af37] text-white border-[#d4af37] shadow-sm'
                  : 'bg-white/60 text-[#64748b] border-white/80 hover:text-[#1e293b]'
              }`}
            >
              ⚡ TECH, DESK &amp; GIFT SETS (6)
            </button>
          </div>

          {/* Search Box & Pitch Quick Trigger */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search specs, SKU, materials…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={copyPitchText}
              className="px-3 py-1.5 bg-white/85 hover:bg-white text-[#b45309] border border-white/90 hover:border-[#d4af37] text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Copy formatted WhatsApp pitch note"
            >
              <span>💬</span>
              <span className="hidden sm:inline">PITCH TEXT</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-white/85 hover:bg-white text-[#1e293b] border border-white/90 hover:border-slate-300 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Preview Printable Enterprise Quotation"
            >
              <span>📄</span>
              <span className="hidden sm:inline">PDF QUOTATION</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Catalog Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {filteredProducts.length === 0 ? (
          <div className="py-24 text-center border border-white/90 rounded-2xl bg-white/80 backdrop-blur-xl shadow-sm">
            <p className="font-mono text-[#64748b] text-sm">NO PRODUCTS MATCHED FILTER</p>
            <button
              onClick={() => {
                setActiveDivision('all');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 bg-white text-[#1e293b] border border-slate-200 rounded-xl text-xs font-mono hover:border-[#d4af37] shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const inCartItem = rfqItems.find((it) => it.productId === product.id);
              const currentQty = inCartItem?.quantity || 50;
              const unitPrice = getProductUnitPrice(product, currentQty);

              return (
                <article
                  key={product.id}
                  className="group bg-white/80 backdrop-blur-xl border border-white/90 hover:border-[#d4af37]/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 shadow-[4px_4px_20px_rgba(166,180,200,0.3),-4px_-4px_20px_#ffffff] hover:shadow-[6px_6px_25px_rgba(166,180,200,0.45),-6px_-6px_25px_#ffffff]"
                >
                  {/* Visual Header / Editorial Image */}
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setInspectingProduct(product)}>
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                    {/* SKU & Category Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/75 backdrop-blur text-white border border-white/20 rounded-lg">
                        {product.sku}
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#d4af37] text-white rounded-lg uppercase shadow-sm">
                        {product.division === 'leatherware' ? 'Fine Leather' : 'Tech / Desk'}
                      </span>
                    </div>

                    {/* Click To Inspect Hint */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingProduct(product);
                      }}
                      className="absolute bottom-3 right-3 px-2.5 py-1 text-[10px] font-mono font-bold bg-white/90 backdrop-blur hover:bg-[#d4af37] text-[#1e293b] hover:text-white border border-white/90 rounded-lg transition-all shadow-sm"
                    >
                      INSPECT SPECS ↗
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => setInspectingProduct(product)}
                        className="text-base font-bold text-[#1e293b] group-hover:text-[#b45309] transition-colors cursor-pointer leading-snug"
                      >
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                        {product.tagline}
                      </p>

                      {/* Technical Spec Pills */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 text-[#334155] rounded-md">
                          {product.dimensions}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 text-[#64748b] rounded-md">
                          {product.weight}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 text-[#64748b] rounded-md">
                          MOQ 50 pcs
                        </span>
                      </div>

                      {/* Swatch Preview Dots */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">Swatches:</span>
                        <div className="flex items-center gap-1.5">
                          {product.swatches.map((s) => (
                            <span
                              key={s.name}
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shadow-xs"
                              style={{ backgroundColor: s.hex }}
                              title={`${s.name} — ${s.desc}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Volume Pricing Matrix Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
                        <div className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest mb-1.5">
                          Enterprise Volume Tiers
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center font-mono">
                          {product.tierPricing.map((tier) => {
                            const isCurrent = currentQty >= tier.minQty;
                            return (
                              <div
                                key={tier.minQty}
                                className={`p-1.5 rounded-lg border text-[10px] ${
                                  isCurrent
                                    ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#b45309] font-bold shadow-xs'
                                    : 'border-slate-200/80 bg-white text-[#64748b]'
                                }`}
                              >
                                <span className="block text-[8px] text-[#94a3b8] uppercase">{tier.minQty}+ pcs</span>
                                <span className="font-bold text-[#b45309]">
                                  {currency === 'USD' ? `$${tier.priceUsd}` : `৳${tier.priceBdt}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-mono text-[#64748b] uppercase block">Est. Unit Price</span>
                        <span className="text-base font-extrabold font-mono text-[#1e293b]">
                          {currency === 'USD' ? `$${unitPrice.usd}` : `৳${unitPrice.bdt}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {inCartItem ? (
                          <div className="flex items-center border border-[#d4af37] rounded-xl bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => updateRfqItemQty(product.id, inCartItem.quantity - 25)}
                              className="px-2 py-1 text-xs text-[#64748b] hover:text-[#1e293b] font-mono"
                              title="Decrease 25 pcs"
                            >
                              -
                            </button>
                            <span className="px-2 py-1 text-xs font-mono font-bold text-[#b45309]">
                              {inCartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRfqItemQty(product.id, inCartItem.quantity + 25)}
                              className="px-2 py-1 text-xs text-[#64748b] hover:text-[#1e293b] font-mono"
                              title="Increase 25 pcs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addProductToRfq(product, 50)}
                            className="px-3 py-1.5 bg-[#d4af37] hover:bg-[#b45309] text-white rounded-xl font-mono font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <span>+ ADD TO RFQ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Spec Inspection Drawer (Side Panel) ── */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-[10002] flex justify-end bg-black/40 backdrop-blur-md transition-opacity">
          <div
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-l border-white/90 h-full overflow-y-auto flex flex-col shadow-[0_0_60px_rgba(166,180,200,0.4)] text-[#1e293b]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#d4af37] text-white rounded-md">
                    {inspectingProduct.sku}
                  </span>
                  <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Technical Specifications
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#1e293b] leading-tight">{inspectingProduct.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProduct(null)}
                className="p-2 text-[#64748b] hover:text-[#1e293b] rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Product Hero Media */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100 shadow-sm">
                <img
                  src={inspectingProduct.imageUrl}
                  alt={inspectingProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overview & Description */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#64748b] mb-2 font-bold">Overview</h4>
                <p className="text-sm text-[#334155] leading-relaxed">{inspectingProduct.description}</p>
              </div>

              {/* Leather Color / Finish Swatch Selector */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#64748b] mb-2 font-bold">
                  Select Leather Swatch / Anodized Finish
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {inspectingProduct.swatches.map((sw) => (
                    <div
                      key={sw.name}
                      onClick={() => setInspectSwatch(sw.name)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                        inspectSwatch === sw.name
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#b45309] shadow-sm font-semibold'
                          : 'border-slate-200 bg-white/80 text-[#475569] hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-slate-300 shrink-0 shadow-xs"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <div>
                        <span className="block text-xs font-bold text-[#1e293b]">{sw.name}</span>
                        <span className="block text-[10px] text-[#64748b]">{sw.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branding Imprint Customization */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#64748b] mb-2 font-bold">
                  Corporate Imprint &amp; Embossing Method
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { id: 'blind_deboss', label: 'Blind Heat Deboss', sub: 'Subtle Matte Texture' },
                    { id: 'gold_foil', label: '24K Gold Foil Stamp', sub: 'High-Luster Luxury' },
                    { id: 'gunmetal_laser', label: 'Gunmetal Laser Etch', sub: 'Precision Permanent' },
                    { id: 'die_plate', label: 'Custom Client Die Plate', sub: 'Beximco Crest Tooling' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setInspectBranding(b.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        inspectBranding === b.id
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#b45309] font-bold shadow-xs'
                          : 'border-slate-200 bg-white/80 text-[#475569] hover:text-[#1e293b]'
                      }`}
                    >
                      <span className="block font-bold">{b.label}</span>
                      <span className="block text-[10px] text-[#64748b]">{b.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Packaging Tiers */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#64748b] mb-2 font-bold">
                  Presentation Packaging
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setInspectPackaging('luxury_rigid_box')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inspectPackaging === 'luxury_rigid_box'
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#b45309] font-bold shadow-xs'
                        : 'border-slate-200 bg-white/80 text-[#475569]'
                    }`}
                  >
                    <span className="block font-bold">Rigid Magnetic Gift Box</span>
                    <span className="block text-[10px] text-[#64748b]">+$4.50 / Velvet EVA Lining</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectPackaging('eco_kraft')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inspectPackaging === 'eco_kraft'
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#b45309] font-bold shadow-xs'
                        : 'border-slate-200 bg-white/80 text-[#475569]'
                    }`}
                  >
                    <span className="block font-bold">Standard Eco-Kraft Sleeve</span>
                    <span className="block text-[10px] text-[#64748b]">Included in Base Price</span>
                  </button>
                </div>
              </div>

              {/* Architectural Technical Specs Table */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#64748b] mb-2 font-bold">
                  Engineering Architecture
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white/90 divide-y divide-slate-100 text-xs font-mono shadow-xs">
                  <div className="p-2.5 flex justify-between">
                    <span className="text-[#64748b]">Material Composition</span>
                    <span className="text-[#1e293b] font-semibold text-right">{inspectingProduct.material}</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-[#64748b]">Hardware Grade</span>
                    <span className="text-[#1e293b] font-semibold text-right">{inspectingProduct.hardware}</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-[#64748b]">Manufacturing Provenance</span>
                    <span className="text-[#1e293b] font-semibold text-right">{inspectingProduct.origin}</span>
                  </div>
                  {inspectingProduct.specs.map((sp) => (
                    <div key={sp.label} className="p-2.5 flex justify-between">
                      <span className="text-[#64748b]">{sp.label}</span>
                      <span className="text-[#1e293b] font-semibold text-right">{sp.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper for Drawer */}
              <div className="bg-white/90 p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-mono text-[#1e293b] block font-bold">PROCUREMENT QUANTITY</span>
                    <span className="text-[10px] font-mono text-[#64748b]">Minimum 50 units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[50, 100, 200, 500].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setInspectQty(q)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${
                          inspectQty === q
                            ? 'bg-[#d4af37] text-white border-[#d4af37] shadow-sm'
                            : 'bg-slate-100 text-[#475569] border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono text-[#64748b] block">TIER UNIT RATE</span>
                    <span className="text-lg font-bold font-mono text-[#b45309]">
                      {currency === 'USD'
                        ? `$${getProductUnitPrice(inspectingProduct, inspectQty).usd}`
                        : `৳${getProductUnitPrice(inspectingProduct, inspectQty).bdt}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      addProductToRfq(
                        inspectingProduct,
                        inspectQty,
                        inspectSwatch,
                        inspectBranding,
                        inspectPackaging
                      );
                      setInspectingProduct(null);
                      setIsRfqDrawerOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b45309] text-white font-mono font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    ADD {inspectQty} UNITS TO RFQ →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Docked RFQ Calculator & Quotation Dashboard (Drawer / Bottom Split) ── */}
      {isRfqDrawerOpen && (
        <div className="fixed inset-0 z-[10003] flex justify-end bg-black/40 backdrop-blur-md transition-opacity">
          <div
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-l border-white/90 h-full overflow-y-auto flex flex-col shadow-[0_0_60px_rgba(166,180,200,0.4)] text-[#1e293b]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* RFQ Header */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#b45309]">
                    Enterprise Quotation Engine
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#1e293b] uppercase font-mono">
                  RFQ Matrix: {selectedClient.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRfqDrawerOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-100 border border-slate-200 text-[#475569] hover:text-[#1e293b] hover:bg-slate-200 transition-all"
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>

            {/* RFQ Items Ledger */}
            <div className="p-6 space-y-6 flex-1">
              {rfqItems.length === 0 ? (
                <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white/80 backdrop-blur shadow-xs">
                  <p className="font-mono text-[#64748b] text-sm">Quotation is empty.</p>
                  <p className="font-mono text-[#94a3b8] text-xs mt-1">Select items from the catalog above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] uppercase tracking-wider px-1">
                    <span>Line Item &amp; Customization</span>
                    <span>Quantity &amp; Subtotal</span>
                  </div>

                  {rfqItems.map((item) => (
                    <div
                      key={item.productId}
                      className="bg-white/90 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono bg-slate-100 text-[#475569] border border-slate-200 px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <span className="text-xs font-bold text-[#1e293b]">{item.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#64748b] mt-1.5">
                          <span className="text-[#b45309] font-medium">Finish: {item.selectedSwatch}</span>
                          <span>•</span>
                          <span>Branding: {item.brandingType.replace('_', ' ').toUpperCase()}</span>
                          <span>•</span>
                          <span>Box: {item.packaging.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateRfqItemQty(item.productId, item.quantity - 25)}
                            className="px-2.5 py-1 text-xs text-[#64748b] hover:text-[#1e293b] font-mono"
                          >
                            -
                          </button>
                          <span className="px-2 py-1 text-xs font-mono font-bold text-[#1e293b]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateRfqItemQty(item.productId, item.quantity + 25)}
                            className="px-2.5 py-1 text-xs text-[#64748b] hover:text-[#1e293b] font-mono"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right font-mono min-w-[90px]">
                          <span className="text-[10px] text-[#94a3b8] block">
                            @{currency === 'USD' ? `$${item.unitPriceUsd}` : `৳${item.unitPriceBdt}`}
                          </span>
                          <span className="text-xs font-bold text-[#b45309]">
                            {currency === 'USD'
                              ? `$${(item.unitPriceUsd * item.quantity).toLocaleString()}`
                              : `৳${(item.unitPriceBdt * item.quantity).toLocaleString()}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => updateRfqItemQty(item.productId, 0)}
                          className="text-slate-400 hover:text-red-500 text-xs px-1 transition-colors"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add-Ons & Enterprise Options */}
              <div className="bg-white/90 border border-slate-200 rounded-xl p-4 space-y-3 font-mono shadow-xs">
                <div className="text-xs font-bold text-[#1e293b] uppercase tracking-wider border-b border-slate-100 pb-2">
                  Enterprise Add-Ons &amp; Tooling Options
                </div>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeDiePlate}
                      onChange={(e) => setIncludeDiePlate(e.target.checked)}
                      className="accent-[#d4af37]"
                    />
                    <span className="text-[#334155]">Custom Brass Debossing Die Plate</span>
                  </div>
                  <span className="text-[#b45309] font-bold">
                    {totals.totalUnits >= 150 ? 'FREE (>150 pcs)' : currency === 'USD' ? '$45' : '৳5,400'}
                  </span>
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeLuxuryBox}
                      onChange={(e) => setIncludeLuxuryBox(e.target.checked)}
                      className="accent-[#d4af37]"
                    />
                    <span className="text-[#334155]">Rigid Magnetic Presentation Gift Box</span>
                  </div>
                  <span className="text-[#64748b]">
                    +{currency === 'USD' ? '$4.50' : '৳540'} / unit
                  </span>
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includePersonalization}
                      onChange={(e) => setIncludePersonalization(e.target.checked)}
                      className="accent-[#d4af37]"
                    />
                    <span className="text-[#334155]">Recipient Individual Monogramming</span>
                  </div>
                  <span className="text-[#64748b]">
                    +{currency === 'USD' ? '$2.00' : '৳240'} / unit
                  </span>
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeHoloSeal}
                      onChange={(e) => setIncludeHoloSeal(e.target.checked)}
                      className="accent-[#d4af37]"
                    />
                    <span className="text-[#334155]">Anti-Tamper Holographic Security Seal</span>
                  </div>
                  <span className="text-[#64748b]">
                    +{currency === 'USD' ? '$0.50' : '৳60'} / unit
                  </span>
                </label>
              </div>

              {/* Quotation Financial Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono space-y-2.5 shadow-xs">
                <div className="flex justify-between text-xs text-[#64748b]">
                  <span>Gross Item Subtotal ({totals.totalUnits} units)</span>
                  <span>{fmt(totals.baseSubtotalUsd, totals.baseSubtotalBdt)}</span>
                </div>

                {totals.volumeDiscountRate > 0 && (
                  <div className="flex justify-between text-xs text-[#10b981] font-semibold">
                    <span>Volume Discount Tier ({(totals.volumeDiscountRate * 100).toFixed(0)}%)</span>
                    <span>-{fmt(totals.discountUsd, totals.discountBdt)}</span>
                  </div>
                )}

                {includeDiePlate && (
                  <div className="flex justify-between text-xs text-[#64748b]">
                    <span>Brass Deboss Die Plate Tooling</span>
                    <span>
                      {totals.diePlateFeeUsd === 0
                        ? 'COMPLIMENTARY'
                        : fmt(totals.diePlateFeeUsd, totals.diePlateFeeBdt)}
                    </span>
                  </div>
                )}

                {includeLuxuryBox && (
                  <div className="flex justify-between text-xs text-[#64748b]">
                    <span>Rigid Magnetic Gift Boxes</span>
                    <span>+{fmt(totals.luxuryBoxFeeUsd, totals.luxuryBoxFeeBdt)}</span>
                  </div>
                )}

                {includePersonalization && (
                  <div className="flex justify-between text-xs text-[#64748b]">
                    <span>Individual Monogram Personalization</span>
                    <span>+{fmt(totals.personalizationFeeUsd, totals.personalizationFeeBdt)}</span>
                  </div>
                )}

                {includeHoloSeal && (
                  <div className="flex justify-between text-xs text-[#64748b]">
                    <span>Tamper-Proof Hologram Seal</span>
                    <span>+{fmt(totals.holoSealFeeUsd, totals.holoSealFeeBdt)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-[#1e293b] block">NET ENTERPRISE QUOTATION</span>
                    <span className="text-[10px] text-[#64748b]">VAT &amp; Domestic Transport Included</span>
                  </div>
                  <span className="text-2xl font-black text-[#b45309]">
                    {fmt(totals.grandTotalUsd, totals.grandTotalBdt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Dock */}
            <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#1e293b] border border-slate-300 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>📄</span>
                  <span>PREVIEW PDF QUOTATION</span>
                </button>

                <button
                  type="button"
                  onClick={copyPitchText}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#b45309] border border-[#d4af37]/50 hover:border-[#d4af37] rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>💬</span>
                  <span>COPY WHATSAPP PITCH</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={saveQuotationDraft}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#334155] border border-slate-200 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>{isSaving ? 'SAVING…' : 'SAVE RFQ DRAFT'}</span>
                </button>

                <button
                  type="button"
                  onClick={pushToTechPackEngine}
                  className="px-4 py-2.5 bg-[#d4af37] hover:bg-[#b45309] text-white font-mono font-extrabold text-xs rounded-xl transition-all shadow-[0_4px_16px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🏭</span>
                  <span>PUSH TO FACTORY PO →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Official Printable / PDF Enterprise Quotation Modal ── */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[10004] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div
            className="w-full max-w-4xl bg-[#fdfdfd] text-[#121214] rounded-lg shadow-2xl p-6 sm:p-10 font-sans my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-zinc-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#121214] text-white rounded">
                  B2B COMMERCIAL DOCUMENT
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Ready for Executive Procurement Sign-off
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#121214] hover:bg-zinc-800 text-white font-mono font-bold text-xs rounded transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ PRINT / SAVE AS PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-mono text-xs rounded"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Official Quotation Document Content */}
            <div className="quotation-print-container">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-black">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-black uppercase">
                    HANDS &amp; HEAD
                  </h2>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">
                    B2B Leather Manufacturing &amp; Industrial Corporate Supplies Division
                  </p>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">
                    Savar Leather Industrial Park / Tejgaon Commercial Area, Dhaka, Bangladesh
                  </p>
                  <p className="text-xs text-zinc-600 font-mono">
                    corporate@handsandhead.com · www.handsandhead.com · BIN: 002941849-0101
                  </p>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs text-zinc-500 uppercase block font-semibold">Official Quotation</span>
                  <span className="text-lg font-extrabold block text-black">
                    HH-RFQ-{selectedClient.id.toUpperCase()}-{new Date().getFullYear()}
                  </span>
                  <span className="text-xs text-zinc-600 block mt-1">
                    Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-zinc-600 block">
                    Validity: 30 Calendar Days
                  </span>
                </div>
              </div>

              {/* Client & Commercial Details */}
              <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-zinc-100/70 border border-zinc-200 rounded font-mono text-xs">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block font-bold text-[10px] mb-1">
                    Bill &amp; Consign To:
                  </span>
                  <strong className="text-sm text-black block">{selectedClient.name}</strong>
                  <p className="text-zinc-700 mt-1">{selectedClient.division}</p>
                  <p className="text-zinc-700">{selectedClient.address}</p>
                  <p className="text-zinc-700 mt-1">
                    Attn: {selectedClient.contactPerson} ({selectedClient.role})
                  </p>
                  <p className="text-zinc-700">{selectedClient.phone} · {selectedClient.email}</p>
                  <p className="text-zinc-600 mt-1">{selectedClient.vatNumber}</p>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-zinc-500 uppercase tracking-wider block font-bold text-[10px] mb-1">
                    Procurement Terms:
                  </span>
                  <p className="text-zinc-800">
                    <span className="text-zinc-500">Payment Terms:</span> <strong>{selectedClient.terms}</strong>
                  </p>
                  <p className="text-zinc-800">
                    <span className="text-zinc-500">Delivery Destination:</span> <strong>{selectedClient.deliveryDestination}</strong>
                  </p>
                  <p className="text-zinc-800">
                    <span className="text-zinc-500">Production Lead Time:</span> <strong>{totals.leadTimeDays}</strong>
                  </p>
                  <p className="text-zinc-800">
                    <span className="text-zinc-500">Currency of Settlement:</span> <strong>{currency}</strong>
                  </p>
                </div>
              </div>

              {/* Quotation Items Table */}
              <div className="border border-black overflow-hidden mb-6">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead className="bg-black text-white uppercase text-[10px]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Item SKU &amp; Description</th>
                      <th className="p-3">Finish &amp; Specs</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {rfqItems.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-zinc-50">
                        <td className="p-3 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <strong className="block text-black">{item.name}</strong>
                          <span className="text-[10px] text-zinc-500">SKU: {item.sku}</span>
                        </td>
                        <td className="p-3 text-zinc-700">
                          <div>Swatch: {item.selectedSwatch}</div>
                          <div className="text-[10px] text-zinc-500">
                            Imprint: {item.brandingType.replace('_', ' ').toUpperCase()} | Box: {item.packaging.replace('_', ' ').toUpperCase()}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold">{item.quantity}</td>
                        <td className="p-3 text-right">
                          {currency === 'USD' ? `$${item.unitPriceUsd}` : `৳${item.unitPriceBdt}`}
                        </td>
                        <td className="p-3 text-right font-bold text-black">
                          {currency === 'USD'
                            ? `$${(item.unitPriceUsd * item.quantity).toLocaleString()}`
                            : `৳${(item.unitPriceBdt * item.quantity).toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex justify-end mb-8 font-mono text-xs">
                <div className="w-full sm:w-80 space-y-1.5">
                  <div className="flex justify-between text-zinc-600">
                    <span>Gross Subtotal ({totals.totalUnits} units):</span>
                    <span>{fmt(totals.baseSubtotalUsd, totals.baseSubtotalBdt)}</span>
                  </div>
                  {totals.volumeDiscountRate > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Enterprise Discount ({(totals.volumeDiscountRate * 100).toFixed(0)}%):</span>
                      <span>-{fmt(totals.discountUsd, totals.discountBdt)}</span>
                    </div>
                  )}
                  {includeDiePlate && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Custom Deboss Die Plate:</span>
                      <span>{totals.diePlateFeeUsd === 0 ? 'COMPLIMENTARY' : fmt(totals.diePlateFeeUsd, totals.diePlateFeeBdt)}</span>
                    </div>
                  )}
                  {includeLuxuryBox && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Rigid Magnetic Gift Boxes:</span>
                      <span>+{fmt(totals.luxuryBoxFeeUsd, totals.luxuryBoxFeeBdt)}</span>
                    </div>
                  )}
                  {includePersonalization && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Recipient Monogramming:</span>
                      <span>+{fmt(totals.personalizationFeeUsd, totals.personalizationFeeBdt)}</span>
                    </div>
                  )}
                  {includeHoloSeal && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Holographic Security Seals:</span>
                      <span>+{fmt(totals.holoSealFeeUsd, totals.holoSealFeeBdt)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t-2 border-black flex justify-between font-extrabold text-sm text-black">
                    <span>TOTAL PAYABLE:</span>
                    <span>{fmt(totals.grandTotalUsd, totals.grandTotalBdt)}</span>
                  </div>
                </div>
              </div>

              {/* Banking & Signature Footer */}
              <div className="pt-6 border-t border-zinc-300 grid grid-cols-2 gap-8 font-mono text-[11px]">
                <div>
                  <span className="font-bold text-black uppercase block mb-1">Commercial Terms &amp; Settlement:</span>
                  <p className="text-zinc-600">1. Prices inclusive of factory production, master packaging and transport to site.</p>
                  <p className="text-zinc-600">2. Settlement via Corporate Bank Wire or LC within agreed Net terms.</p>
                  <p className="text-zinc-600">3. 100% Quality inspection warranty with free unit replacements for any defect.</p>
                </div>

                <div className="flex flex-col justify-end items-end text-right">
                  <div className="w-48 border-b border-black pb-1 mb-1 font-bold text-black">
                    K. Rahman
                  </div>
                  <span className="text-zinc-500 text-[10px]">Authorized Signature</span>
                  <span className="text-zinc-500 text-[10px]">Hands &amp; Head Corporate Operations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporateSupplies;
