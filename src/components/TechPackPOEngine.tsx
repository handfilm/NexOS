import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { normalizeBangladeshPhone, parseBangladeshPhone, PhoneParseResult } from '../utils/phoneNormalizer';
import { VoicePOIngestion, ExtractedPOSpec } from './VoicePOIngestion';

export type ApparelCategory = 'Leather Jacket' | 'Heavy Hoodie' | 'Graphic Tee' | 'Modular Bag';

export interface SizingRatio {
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
}

export interface CustomerOption {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  country?: string;
  totalSpent?: number;
}

export interface TechPackPOEngineProps {
  isOpen?: boolean;
  onClose?: () => void;
  preSelectedCustomer?: {
    id?: string;
    name?: string;
    companyName?: string;
    phone?: string;
    email?: string;
  } | null;
  onSuccess?: (specOrder: any) => void;
  mode?: 'embedded' | 'drawer' | 'modal';
  initialPOSpec?: ExtractedPOSpec | null;
}

interface CategoryConfig {
  defaultPriceBDT: number;
  defaultPriceUSD: number;
  materials: string[];
  liningsOrRib: { label: string; options: string[] };
  hardwareOrTrims: string[];
  defaultStyleName: string;
}

const CATEGORY_CONFIGS: Record<ApparelCategory, CategoryConfig> = {
  'Leather Jacket': {
    defaultPriceBDT: 8500,
    defaultPriceUSD: 72,
    defaultStyleName: 'Artisanal Cafe Racer Leather Jacket (Ref: HH-JKT-01)',
    materials: [
      'Full-Grain Cowhide 1.2-1.4mm (Aniline Pull-Up)',
      'Vegetable-Tanned Sheepskin 0.9-1.1mm (Supple Drape)',
      'Top-Grain Buffed Nubuck 1.2-1.3mm (Matte Suede Hand)',
      'Heavy Horsehide Steer 1.4-1.6mm (Vintage Patina)'
    ],
    liningsOrRib: {
      label: 'Lining Spec',
      options: [
        'Custom Jacquard Bemberg Twill (Breathable)',
        '220 GSM Quilted Thermal Cotton (Insulated)',
        'Heavyweight Sherpa Fleece Lining',
        '100% Cotton Poplin Minimalist Lining'
      ]
    },
    hardwareOrTrims: [
      'YKK #8 Heavy Antiqued Brass Main + #5 Pocket Zips',
      'Matte Gunmetal Industrial Zippers + Spring Snaps',
      'Polished Silver YKK Zips + Stainless Steel Rivets',
      'Tonal Enamelled Black Hardware + Heavy Buckles'
    ]
  },
  'Heavy Hoodie': {
    defaultPriceBDT: 2400,
    defaultPriceUSD: 21,
    defaultStyleName: 'Heavyweight Boxy Drop-Shoulder Hoodie 450 GSM',
    materials: [
      '450 GSM Loopback Dense Fleece (100% Combed Cotton)',
      '380 GSM Heavy French Terry (Dense Compact Weave)',
      '500 GSM Double-Face Ultra-Heavy Luxury Cotton',
      '320 GSM Vintage Acid-Washed Slub Fleece'
    ],
    liningsOrRib: {
      label: 'Ribbing Spec',
      options: [
        '2x2 450 GSM Heavy Spandex Rib (Anti-Sag Waist & Cuffs)',
        '1x1 380 GSM High-Density Tonal Cotton Rib',
        'Raw Distressed Edge Hems (Unribbed Atelier Silhouette)'
      ]
    },
    hardwareOrTrims: [
      '1.4m Braided Tubular Cotton Cord + Matte Steel Aglets',
      'Heavy Flat Woven Drawstring + Punched Eyelets',
      'Kangaroo Pocket with Bartack Stitch Reinforcements',
      'Custom Antique Nickel Aglets with H&H Engraving'
    ]
  },
  'Graphic Tee': {
    defaultPriceBDT: 1400,
    defaultPriceUSD: 12,
    defaultStyleName: 'Oversized Vintage Wash Graphic Tee 260 GSM',
    materials: [
      '260 GSM Heavyweight Vintage Acid-Washed Combed Cotton',
      '240 GSM Combed Compact Cotton (Luxury Streetwear Hand)',
      '280 GSM Dense Interlock Jersey (Architectural Silhouette)',
      '210 GSM Organic Slub Cotton (Artisanal Textured Weave)'
    ],
    liningsOrRib: {
      label: 'Collar Spec',
      options: [
        '1x1 320 GSM Reinforced Stay-Flat Collar Rib (2.5cm)',
        'Double-Needle Bound Collar with Internal Herringbone Tape',
        'Raw Distressed Micro-Cut Collar Trim'
      ]
    },
    hardwareOrTrims: [
      'High-Density Screenprint (Plastisol + Matte Seal)',
      'Water-Based Discharge Pigment (Ultra-Soft Hand Feel)',
      'Puff Ink 3D Foam Print + Tonal Back Neck Embroidery',
      'Tonal Minimalist Chest Embroidery (12,000 Stitches)'
    ]
  },
  'Modular Bag': {
    defaultPriceBDT: 4800,
    defaultPriceUSD: 42,
    defaultStyleName: 'Modular Tactical Sling / Crossbody Carry System',
    materials: [
      'Full-Grain Veg-Tanned Steerhide 1.8-2.0mm + Brass Hardware',
      '1000D Ballistic Cordura Nylon + Full-Grain Steerhide Trim',
      '16oz Heavy Waxed Canvas + Harness Leather Straps',
      'Technical Ripstop Composite + Aniline Leather Accents'
    ],
    liningsOrRib: {
      label: 'Interior & Padding',
      options: [
        '3mm High-Density EVA Closed-Cell Foam + 210D Ripstop Lining',
        'Heavy Quilted Microfiber Protective Tech Partition',
        'Raw Unlined Suede Interior with Bound Seams'
      ]
    },
    hardwareOrTrims: [
      '38mm Mil-Spec Nylon Webbing + Quick-Release Cobra Buckles',
      'YKK AquaGuard Waterproof Zippers + Matte Black Zinc D-Rings',
      'Solid Cast Brass Roller Buckles + Copper Rivets',
      'Fidlock V-Buckle Magnetic Fasteners'
    ]
  }
};

const COLORWAY_PRESETS = [
  { name: 'Onyx Black', hex: '#0a0a0a' },
  { name: 'Distressed Espresso', hex: '#3e2723' },
  { name: 'Bone White / Chalk', hex: '#e8e8e3' },
  { name: 'Oxblood / Burgundy', hex: '#4a151b' },
  { name: 'Sage / Washed Olive', hex: '#3b4d3c' },
  { name: 'Charcoal Slate', hex: '#27272a' },
  { name: 'Tan Suede', hex: '#b08968' }
];

export const TechPackPOEngine: React.FC<TechPackPOEngineProps> = ({
  isOpen = true,
  onClose,
  preSelectedCustomer = null,
  onSuccess,
  mode = 'embedded',
  initialPOSpec = null
}) => {
  // ── 1. Buyer & Customer Linker State ──
  const [buyerMode, setBuyerMode] = useState<'existing' | 'quick'>('existing');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerList, setCustomerList] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Quick custom buyer fields
  const [quickName, setQuickName] = useState<string>('');
  const [quickCompany, setQuickCompany] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('+88017');
  const [quickEmail, setQuickEmail] = useState<string>('');

  // ── 2. Parametric Calculator Spec State ──
  const [category, setCategory] = useState<ApparelCategory>('Leather Jacket');
  const [styleName, setStyleName] = useState<string>(CATEGORY_CONFIGS['Leather Jacket'].defaultStyleName);
  const [sizing, setSizing] = useState<SizingRatio>({ s: 15, m: 35, l: 45, xl: 30, xxl: 15 });
  const [material, setMaterial] = useState<string>(CATEGORY_CONFIGS['Leather Jacket'].materials[0]);
  const [liningOrRib, setLiningOrRib] = useState<string>(CATEGORY_CONFIGS['Leather Jacket'].liningsOrRib.options[0]);
  const [hardware, setHardware] = useState<string>(CATEGORY_CONFIGS['Leather Jacket'].hardwareOrTrims[0]);
  const [selectedColorways, setSelectedColorways] = useState<string[]>(['Onyx Black']);
  const [customColorInput, setCustomColorInput] = useState<string>('');

  // Commercials & Terms
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [unitPrice, setUnitPrice] = useState<number>(CATEGORY_CONFIGS['Leather Jacket'].defaultPriceBDT);
  const [paymentTerms, setPaymentTerms] = useState<string>('50% Advance via TT / 50% Pre-Dispatch Inspection');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('FOB Chattogram Sea Port / DAC Air Cargo Terminal');
  const [notes, setNotes] = useState<string>('Industrial tech pack quotation. Fabric batch reserves held for 7 days upon buyer confirmation.');

  // PO Identification & Revision
  const [poNumber, setPoNumber] = useState<string>(() => `HH-PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [revision, setRevision] = useState<string>('01-PROD');

  // Action status states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);
  const [lastCommittedPO, setLastCommittedPO] = useState<any | null>(null);
  const [showVoiceIngestion, setShowVoiceIngestion] = useState<boolean>(false);

  // ── Handler for Voice PO Ingestion ──
  const handleVoiceSpecExtracted = (spec: ExtractedPOSpec) => {
    // 1. Map category to supported options
    const catLower = (spec.category || '').toLowerCase();
    let targetCat: ApparelCategory = 'Leather Jacket';
    if (catLower.includes('hoodie') || catLower.includes('fleece') || catLower.includes('terry') || catLower.includes('sweat')) {
      targetCat = 'Heavy Hoodie';
    } else if (catLower.includes('tee') || catLower.includes('t-shirt') || catLower.includes('jersey')) {
      targetCat = 'Graphic Tee';
    } else if (catLower.includes('bag') || catLower.includes('sling') || catLower.includes('cordura') || catLower.includes('pack')) {
      targetCat = 'Modular Bag';
    } else if (catLower.includes('jacket') || catLower.includes('leather')) {
      targetCat = 'Leather Jacket';
    }
    setCategory(targetCat);

    // Apply category defaults
    const cfg = CATEGORY_CONFIGS[targetCat];
    if (cfg) {
      if (spec.fabric && spec.fabric.trim()) {
        setMaterial(spec.fabric);
      } else {
        setMaterial(cfg.materials?.[0] || 'Full-Grain Cowhide 1.2-1.4mm (Aniline Pull-Up)');
      }
      const liningChoice = cfg.liningsOrRib?.options?.[0] || (cfg as any).liningOrRib?.[0] || '';
      if (liningChoice) setLiningOrRib(liningChoice);
      if (cfg.hardwareOrTrims?.[0]) setHardware(cfg.hardwareOrTrims[0]);
      if (currency === 'BDT') {
        setUnitPrice(spec.targetUnitPrice && spec.targetUnitPrice > 0 ? spec.targetUnitPrice : cfg.defaultPriceBDT);
      } else {
        setUnitPrice(spec.targetUnitPrice && spec.targetUnitPrice > 0 ? spec.targetUnitPrice : cfg.defaultPriceUSD);
      }
    }

    // 2. Sizing matrix
    if (spec.sizeRatios) {
      setSizing({
        s: Number(spec.sizeRatios.S) || 0,
        m: Number(spec.sizeRatios.M) || 0,
        l: Number(spec.sizeRatios.L) || 0,
        xl: Number(spec.sizeRatios.XL) || 0,
        xxl: Number(spec.sizeRatios.XXL) || 0
      });
    }

    // 3. Currency
    if (spec.currency === 'USD' || spec.currency === 'BDT') {
      setCurrency(spec.currency);
    }

    // 4. Colorways
    if (spec.colorways && spec.colorways.length > 0) {
      setSelectedColorways(spec.colorways);
    }

    // 5. Notes / Specs
    const voiceNote = `[Voice Ingestion]: Intent: ${spec.buyerIntent}. Fabric: ${spec.fabric}${spec.gsm ? ` (${spec.gsm} GSM)` : ''}. Lead: ${spec.deliveryDeadline || 'Standard'}.`;
    setNotes(prev => prev ? `${prev} | ${voiceNote}` : voiceNote);

    setSaveMessage(`✓ Tech Pack PO specs populated from Voice Ingestion! (${spec.totalQuantity} PCS ${targetCat})`);
    setShowVoiceIngestion(false);
    setTimeout(() => setSaveMessage(null), 6000);
  };

  // ── Load preSelectedCustomer ──
  useEffect(() => {
    if (preSelectedCustomer) {
      const canonical = normalizeBangladeshPhone(preSelectedCustomer.phone);
      const cust: CustomerOption = {
        id: preSelectedCustomer.id || `cust-${Date.now()}`,
        name: preSelectedCustomer.name || 'Buyer',
        companyName: preSelectedCustomer.companyName || preSelectedCustomer.name,
        phone: canonical || preSelectedCustomer.phone || '',
        email: preSelectedCustomer.email || ''
      };
      setSelectedCustomer(cust);
      setCustomerSearch(cust.name);
    }
  }, [preSelectedCustomer]);

  useEffect(() => {
    if (initialPOSpec) {
      handleVoiceSpecExtracted(initialPOSpec);
    }
  }, [initialPOSpec]);

  // ── Update defaults when Category changes ──
  const handleCategoryChange = (newCategory: ApparelCategory) => {
    setCategory(newCategory);
    const cfg = CATEGORY_CONFIGS[newCategory];
    setStyleName(cfg.defaultStyleName);
    setMaterial(cfg.materials[0]);
    setLiningOrRib(cfg.liningsOrRib.options[0]);
    setHardware(cfg.hardwareOrTrims[0]);
    setUnitPrice(currency === 'BDT' ? cfg.defaultPriceBDT : cfg.defaultPriceUSD);
  };

  // ── Currency toggle adjustment ──
  const handleCurrencyToggle = (newCurr: 'BDT' | 'USD') => {
    if (newCurr === currency) return;
    setCurrency(newCurr);
    const cfg = CATEGORY_CONFIGS[category];
    if (newCurr === 'USD') {
      const converted = Math.round(unitPrice / 118) || cfg.defaultPriceUSD;
      setUnitPrice(converted);
    } else {
      const converted = Math.round(unitPrice * 118) || cfg.defaultPriceBDT;
      setUnitPrice(converted);
    }
  };

  // ── Fetch Customers from Firestore / Server Cache ──
  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const db = getFirestore();
        const snap = await getDocs(query(collection(db, 'customers'), orderBy('updatedAt', 'desc'), limit(50)));
        if (isMounted && snap && !snap.empty) {
          const list: CustomerOption[] = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || data.companyName || 'Buyer',
              companyName: data.companyName || data.name || '',
              phone: normalizeBangladeshPhone(data.phone || data.mobile || data.canonicalPhone),
              email: data.email || '',
              country: data.country || 'BD',
              totalSpent: Number(data.totalSpent || 0)
            };
          });
          setCustomerList(list);
          if (!selectedCustomer && !preSelectedCustomer && list.length > 0) {
            setSelectedCustomer(list[0]);
          }
          setLoadingCustomers(false);
          return;
        }
      } catch (e) {
        console.warn('[TechPackPOEngine] Firestore query fallback to /api/customers:', e);
      }

      // Fallback to Express backend /api/customers
      try {
        const res = await fetch('/api/customers?limit=50');
        const json = await res.json();
        if (isMounted && json.ok && Array.isArray(json.items)) {
          const list: CustomerOption[] = json.items.map((data: any) => ({
            id: data.id,
            name: data.name || data.companyName || 'Buyer',
            companyName: data.companyName || data.name || '',
            phone: normalizeBangladeshPhone(data.phone || data.canonicalPhone),
            email: data.email || '',
            country: data.country || 'BD',
            totalSpent: Number(data.totalSpent || 0)
          }));
          setCustomerList(list);
          if (!selectedCustomer && !preSelectedCustomer && list.length > 0) {
            setSelectedCustomer(list[0]);
          }
        }
      } catch (apiErr) {
        console.warn('[TechPackPOEngine] Backend customer fetch error:', apiErr);
      } finally {
        if (isMounted) setLoadingCustomers(false);
      }
    }

    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered customer search list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerList.slice(0, 10);
    const q = customerSearch.toLowerCase().trim();
    return customerList.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customerList, customerSearch]);

  // Quick Phone Validation
  const quickPhoneResult: PhoneParseResult = useMemo(() => {
    return parseBangladeshPhone(quickPhone);
  }, [quickPhone]);

  // Resolved active buyer info
  const activeBuyer = useMemo(() => {
    if (buyerMode === 'existing' && selectedCustomer) {
      return {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        companyName: selectedCustomer.companyName || selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email || 'buyer@domain.com',
        country: selectedCustomer.country || 'BD',
        isExisting: true
      };
    }
    const cleanPhone = quickPhoneResult.normalizedPhone || quickPhone.trim();
    return {
      id: `lead-${Date.now().toString(36)}`,
      name: quickName.trim() || 'Custom Client / Buyer',
      companyName: quickCompany.trim() || quickName.trim() || 'Private Atelier Client',
      phone: cleanPhone,
      email: quickEmail.trim() || 'buyer@client.com',
      country: 'BD',
      isExisting: false
    };
  }, [buyerMode, selectedCustomer, quickName, quickCompany, quickPhone, quickEmail, quickPhoneResult]);

  // ── Sizing Helpers & Presets ──
  const totalQuantity = useMemo(() => {
    return Math.max(0, (sizing.s || 0) + (sizing.m || 0) + (sizing.l || 0) + (sizing.xl || 0) + (sizing.xxl || 0));
  }, [sizing]);

  const handleSizeChange = (sizeKey: keyof SizingRatio, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSizing(prev => ({ ...prev, [sizeKey]: num }));
  };

  const applySizingPreset = (preset: 'streetwear' | 'standard' | 'large' | 'even' | 'clear') => {
    switch (preset) {
      case 'streetwear':
        setSizing({ s: 15, m: 35, l: 45, xl: 30, xxl: 15 }); // 140 pcs
        break;
      case 'standard':
        setSizing({ s: 20, m: 40, l: 50, xl: 30, xxl: 10 }); // 150 pcs
        break;
      case 'large':
        setSizing({ s: 10, m: 30, l: 45, xl: 40, xxl: 25 }); // 150 pcs
        break;
      case 'even':
        setSizing({ s: 20, m: 20, l: 20, xl: 20, xxl: 20 }); // 100 pcs
        break;
      case 'clear':
        setSizing({ s: 0, m: 0, l: 0, xl: 0, xxl: 0 });
        break;
    }
  };

  // ── Colorway Management ──
  const toggleColorway = (colorName: string) => {
    if (selectedColorways.includes(colorName)) {
      if (selectedColorways.length === 1) return; // keep at least one
      setSelectedColorways(selectedColorways.filter(c => c !== colorName));
    } else {
      setSelectedColorways([...selectedColorways, colorName]);
    }
  };

  const addCustomColorway = () => {
    const trimmed = customColorInput.trim();
    if (!trimmed) return;
    if (!selectedColorways.includes(trimmed)) {
      setSelectedColorways([...selectedColorways, trimmed]);
    }
    setCustomColorInput('');
  };

  // ── Real-Time Parametric Calculations ──
  // 1. Total Order Value
  const totalOrderValue = useMemo(() => {
    return totalQuantity * unitPrice;
  }, [totalQuantity, unitPrice]);

  // 2. Fabric / Material Consumption Breakdown
  const consumption = useMemo(() => {
    const units = totalQuantity;
    if (category === 'Leather Jacket') {
      const avgSqFtPerUnit = 38.0;
      const cuttingWastePercent = 15; // 15% hide grading & shape variance
      const netSqFt = units * avgSqFtPerUnit;
      const grossSqFt = Math.round(netSqFt * (1 + cuttingWastePercent / 100) * 10) / 10;
      const liningMeters = Math.round(units * 2.10 * 1.05 * 10) / 10; // 5% shrinkage buffer
      return {
        primaryName: 'Full-Grain Leather',
        primaryQty: `${grossSqFt.toLocaleString()} sq. ft`,
        primaryDetails: `Net: ${netSqFt.toLocaleString()} sq. ft + 15% hide contour allowance (~${Math.ceil(grossSqFt / 45)} cowhide skins)`,
        secondaryName: 'Lining Twill (58")',
        secondaryQty: `${liningMeters} meters`,
        hardwareTally: `${units}x #8 Main Zippers · ${units * 3}x #5 Pocket Zips · ${units * 4}x Heavy Snaps`,
        formulaDesc: 'Formula: Units × 38 sq. ft × 1.15 cutting factor + 2.1m lining/pc'
      };
    }

    if (category === 'Heavy Hoodie') {
      const avgKgPerUnit = 0.85; // 450 GSM fleece body + hood
      const ribKgPerUnit = 0.15; // 2x2 spandex rib
      const netFleeceKg = units * avgKgPerUnit;
      const grossFleeceKg = Math.round(netFleeceKg * 1.06 * 10) / 10; // 6% cutting allowance
      const grossRibKg = Math.round(units * ribKgPerUnit * 1.05 * 10) / 10;
      const cordMeters = Math.round(units * 1.4 * 10) / 10;
      return {
        primaryName: 'Combed Knit Fleece',
        primaryQty: `${grossFleeceKg.toLocaleString()} kg`,
        primaryDetails: `Net: ${netFleeceKg.toFixed(1)} kg + 6% cutting allowance (~${Math.ceil(grossFleeceKg / 25)} fabric rolls)`,
        secondaryName: '2x2 Spandex Heavy Rib',
        secondaryQty: `${grossRibKg} kg`,
        hardwareTally: `${cordMeters}m Tubular Drawcord · ${units * 2}x Engraved Aglets · Kangaroo Bar-tacks`,
        formulaDesc: 'Formula: Units × 0.85 kg fleece (1.06 factor) + 0.15 kg ribbing/pc'
      };
    }

    if (category === 'Graphic Tee') {
      const avgKgPerUnit = 0.38; // 260 GSM single jersey
      const collarKgPerUnit = 0.05;
      const netFabricKg = units * avgKgPerUnit;
      const grossFabricKg = Math.round(netFabricKg * 1.05 * 10) / 10;
      const grossCollarKg = Math.round(units * collarKgPerUnit * 1.05 * 10) / 10;
      const inkGrams = units * 25; // 25g ink/print
      return {
        primaryName: 'Combed Compact Jersey',
        primaryQty: `${grossFabricKg.toLocaleString()} kg`,
        primaryDetails: `Net: ${netFabricKg.toFixed(1)} kg + 5% cutting allowance (~${Math.ceil(grossFabricKg / 22)} knit rolls)`,
        secondaryName: '1x1 Collar Ribbing',
        secondaryQty: `${grossCollarKg} kg`,
        hardwareTally: `${(inkGrams / 1000).toFixed(1)} kg Plastisol/Water-based pigment · Woven Atelier Label`,
        formulaDesc: 'Formula: Units × 0.38 kg single jersey (1.05 factor) + 0.05 kg collar rib/pc'
      };
    }

    // Modular Bag
    const avgLeatherSqFt = 16.0;
    const grossLeather = Math.round(units * avgLeatherSqFt * 1.12 * 10) / 10;
    const webbingMeters = Math.round(units * 2.80 * 10) / 10;
    const evaFoamM2 = Math.round(units * 0.60 * 10) / 10;
    return {
      primaryName: 'Steerhide / Cordura',
      primaryQty: `${grossLeather.toLocaleString()} sq. ft / ${(units * 1.3).toFixed(1)}m Cordura`,
      primaryDetails: `Reinforced body + 3mm EVA padding (${evaFoamM2} m²)`,
      secondaryName: '38mm Mil-Spec Webbing',
      secondaryQty: `${webbingMeters} meters`,
      hardwareTally: `${units * 2}x Quick-Release Cobra Buckles · ${units}x YKK AquaGuard · ${units * 4}x D-Rings`,
      formulaDesc: 'Formula: Units × 16 sq. ft leather + 2.8m webbing + 0.6m² EVA foam/pc'
    };
  }, [category, totalQuantity]);

  // 3. Production Lead Time Calculation based on volume tier
  const leadTime = useMemo(() => {
    const units = totalQuantity;
    let tierName = 'Tier 1: Atelier Micro-Batch';
    let sourcingDays = 4;
    let cuttingSamplingDays = 3;
    let assemblyDays = 4;
    let finishingQcDays = 3;

    if (units <= 0) {
      return {
        tierName: 'Standby (0 Units)',
        totalWorkingDays: 0,
        calendarDays: 0,
        estimatedShipDate: 'Enter Sizing',
        breakdown: 'Awaiting size quantity entry'
      };
    }

    if (units < 50) {
      tierName = 'Tier 1: Rapid Atelier Micro-Batch';
      sourcingDays = category === 'Leather Jacket' ? 5 : 4;
      cuttingSamplingDays = 3;
      assemblyDays = category === 'Leather Jacket' ? 6 : 4;
      finishingQcDays = 3;
    } else if (units < 200) {
      tierName = 'Tier 2: Mid-Scale Production Run';
      sourcingDays = category === 'Leather Jacket' ? 8 : 6;
      cuttingSamplingDays = 4;
      assemblyDays = category === 'Leather Jacket' ? 10 : 7;
      finishingQcDays = 4;
    } else if (units < 500) {
      tierName = 'Tier 3: Bulk Industrial Export Run';
      sourcingDays = category === 'Leather Jacket' ? 14 : 10;
      cuttingSamplingDays = 5;
      assemblyDays = category === 'Leather Jacket' ? 14 : 10;
      finishingQcDays = 5;
    } else {
      tierName = 'Tier 4: Enterprise Export Matrix';
      sourcingDays = category === 'Leather Jacket' ? 20 : 15;
      cuttingSamplingDays = 7;
      assemblyDays = category === 'Leather Jacket' ? 20 : 16;
      finishingQcDays = 7;
    }

    const totalWorkingDays = sourcingDays + cuttingSamplingDays + assemblyDays + finishingQcDays;

    // Estimate completion date (adding 1.4 calendar days per working day to skip weekends)
    const calendarDays = Math.ceil(totalWorkingDays * 1.4);
    const shipDate = new Date();
    shipDate.setDate(shipDate.getDate() + calendarDays);
    const dateStr = shipDate.toISOString().split('T')[0];

    return {
      tierName,
      totalWorkingDays,
      calendarDays,
      estimatedShipDate: dateStr,
      breakdown: `Sourcing: ${sourcingDays}d · Cutting: ${cuttingSamplingDays}d · Stitching: ${assemblyDays}d · QC/Pack: ${finishingQcDays}d`
    };
  }, [totalQuantity, category]);

  // ── 3. High-Contrast Monospace Digital Spec Sheet ──
  const formattedSpecText = useMemo(() => {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const subdivider = '────────────────────────────────────────────────────────────────────';
    const currSym = currency === 'BDT' ? '৳' : '$';

    return [
      divider,
      '           HANDS & HEAD ATELIER · INDUSTRIAL TECH PACK & FACTORY PO',
      divider,
      `PO NUMBER   : ${poNumber} | REVISION: ${revision}`,
      `DATE ISSUED : ${new Date().toISOString().split('T')[0]} | STATUS: FACTORY SPEC CONFIRMED`,
      `BUYER / CO. : ${activeBuyer.companyName} (${activeBuyer.name})`,
      `CONTACT NO. : ${activeBuyer.phone || 'N/A'} | EMAIL: ${activeBuyer.email}`,
      `DESTINATION : ${deliveryTerms}`,
      `COMM. TERMS : ${paymentTerms}`,
      subdivider,
      'PRODUCT CONFIGURATION & TECH SPECIFICATION:',
      `  • CATEGORY     : ${category.toUpperCase()}`,
      `  • STYLE REF    : ${styleName}`,
      `  • PRIMARY MAT. : ${material}`,
      `  • LINING / RIB : ${liningOrRib}`,
      `  • HARDWARE     : ${hardware}`,
      `  • COLORWAYS    : ${selectedColorways.join(' / ')}`,
      subdivider,
      'SIZING BREAKDOWN MATRIX (RATIO & PIECES):',
      `  [S: ${sizing.s} pcs]  [M: ${sizing.m} pcs]  [L: ${sizing.l} pcs]  [XL: ${sizing.xl} pcs]  [XXL: ${sizing.xxl} pcs]`,
      `  TOTAL ORDER QUANTITY : ${totalQuantity} UNITS`,
      subdivider,
      'ESTIMATED MATERIAL & FABRIC CONSUMPTION:',
      `  • ${consumption.primaryName.padEnd(14, ' ')} : ${consumption.primaryQty} (${consumption.primaryDetails})`,
      `  • ${consumption.secondaryName.padEnd(14, ' ')} : ${consumption.secondaryQty}`,
      `  • TRIMS & H/W  : ${consumption.hardwareTally}`,
      `  • FORMULA NOTE : ${consumption.formulaDesc}`,
      subdivider,
      'COMMERCIALS & FINANCIAL SUMMARY:',
      `  • UNIT FOB     : ${currSym}${unitPrice.toLocaleString()} ${currency}`,
      `  • TOTAL VALUE  : ${currSym}${totalOrderValue.toLocaleString()} ${currency}`,
      `  • QUALITY SLA  : AQL 1.5 Industrial Garment Quality Audit Standard`,
      `  • PROD. WINDOW : ${leadTime.totalWorkingDays} Working Days (~${leadTime.calendarDays} calendar days)`,
      `  • EST. DISPATCH: ${leadTime.estimatedShipDate} (${leadTime.tierName})`,
      subdivider,
      `OPERATOR MEMO: ${notes}`,
      divider,
      'HANDS & HEAD ATELIER · DHAKA INDUSTRIAL CLUSTER · EXPORT COMPLIANT'
    ].join('\n');
  }, [
    poNumber,
    revision,
    activeBuyer,
    deliveryTerms,
    paymentTerms,
    category,
    styleName,
    material,
    liningOrRib,
    hardware,
    selectedColorways,
    sizing,
    totalQuantity,
    consumption,
    currency,
    unitPrice,
    totalOrderValue,
    leadTime,
    notes
  ]);

  // ── 4. WhatsApp Summary Text ──
  const whatsAppSummaryText = useMemo(() => {
    const currSym = currency === 'BDT' ? '৳' : '$';
    return (
      `*HANDS & HEAD ATELIER · FACTORY TECH PACK PO*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*PO ID:* ${poNumber} (Rev: ${revision})\n` +
      `*Buyer:* ${activeBuyer.name} · ${activeBuyer.companyName}\n` +
      `*Category:* ${category}\n` +
      `*Style:* ${styleName}\n` +
      `*Material:* ${material}\n` +
      `*Colorway(s):* ${selectedColorways.join(', ')}\n` +
      `\n` +
      `*SIZING RATIO (${totalQuantity} UNITS TOTAL):*\n` +
      `• S: ${sizing.s} | M: ${sizing.m} | L: ${sizing.l} | XL: ${sizing.xl} | XXL: ${sizing.xxl}\n` +
      `\n` +
      `*COMMERCIAL FINANCIALS:*\n` +
      `• Unit FOB: ${currSym}${unitPrice.toLocaleString()} ${currency}\n` +
      `• *Total Order Value: ${currSym}${totalOrderValue.toLocaleString()} ${currency}*\n` +
      `• Lead Time: ${leadTime.totalWorkingDays} Working Days (Est. Ship: ${leadTime.estimatedShipDate})\n` +
      `• Terms: ${paymentTerms}\n` +
      `• Port: ${deliveryTerms}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Please reply "CONFIRMED" to book mill rolls and lock pattern cutting schedule._`
    );
  }, [
    poNumber,
    revision,
    activeBuyer,
    category,
    styleName,
    material,
    selectedColorways,
    totalQuantity,
    sizing,
    currency,
    unitPrice,
    totalOrderValue,
    leadTime,
    paymentTerms,
    deliveryTerms
  ]);

  // ── Action 1: Save Spec to Firestore & Customer Timeline ──
  const handleSaveSpecToFirestore = async () => {
    if (totalQuantity <= 0) {
      alert('Please enter at least 1 unit in the sizing matrix before saving spec.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage('Saving Tech Pack PO to Firestore & Customer Timeline…');

    const timestamp = new Date().toISOString();
    const specRecord = {
      id: poNumber,
      poNumber,
      revision,
      buyerId: activeBuyer.id,
      buyerName: activeBuyer.name,
      buyerCompany: activeBuyer.companyName,
      buyerPhone: activeBuyer.phone,
      buyerEmail: activeBuyer.email,
      category,
      styleName,
      material,
      liningOrRib,
      hardware,
      colorways: selectedColorways,
      sizing,
      totalQuantity,
      currency,
      unitPrice,
      totalOrderValue,
      consumption,
      leadTime,
      paymentTerms,
      deliveryTerms,
      notes,
      specSheetText: formattedSpecText,
      status: 'pending_factory_confirmation',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let firestoreSaved = false;

    // 1. Write to Firestore collection `factory_orders`
    try {
      const db = getFirestore();
      const poDocRef = doc(db, 'factory_orders', poNumber);
      await setDoc(poDocRef, specRecord);
      firestoreSaved = true;

      // 2. Append note to Customer's timeline in Firestore if valid customer ID exists
      if (activeBuyer.id && activeBuyer.isExisting) {
        try {
          const custRef = doc(db, 'customers', activeBuyer.id);
          const timelineMemo = {
            id: `po-${Date.now()}`,
            text: `📋 Factory Tech Pack PO Generated: ${poNumber} · ${category} (${totalQuantity} pcs) — ${currency === 'BDT' ? '৳' : '$'}${totalOrderValue.toLocaleString()}`,
            type: 'techpack_po',
            by: 'Nexus Operator',
            createdAt: timestamp,
            at: timestamp,
            poNumber,
            total: totalOrderValue
          };
          await updateDoc(custRef, {
            notes: arrayUnion(timelineMemo),
            lastOrderAt: timestamp,
            updatedAt: timestamp
          });
        } catch (custUpdateErr) {
          console.warn('[TechPackPOEngine] Non-fatal customer timeline append notice:', custUpdateErr);
        }
      }
    } catch (fsErr: any) {
      console.warn('[TechPackPOEngine] Direct Firestore save notice, attempting backend sync:', fsErr);
    }

    // 3. Guaranteed Server-Side persistence fallback via Express `/api/factory-orders`
    try {
      const res = await fetch('/api/factory-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specRecord)
      });
      if (res.ok) {
        firestoreSaved = true;
      }
    } catch (apiErr) {
      console.warn('[TechPackPOEngine] Server API sync error:', apiErr);
    }

    setIsSaving(false);
    if (firestoreSaved) {
      setSaveSuccess(true);
      setLastCommittedPO(specRecord);
      setSaveMessage(`✓ Spec ${poNumber} successfully saved to factory_orders & attributed to buyer!`);
      if (onSuccess) onSuccess(specRecord);
    } else {
      setSaveSuccess(false);
      setSaveMessage('Notice: Spec saved locally. Check network connection for cloud sync.');
    }
  };

  const setSaveError = (err: string | null) => {
    if (err) setSaveMessage(err);
  };

  // ── Action 2: Dispatch to WhatsApp ──
  const handleDispatchWhatsApp = useCallback(() => {
    const rawDigits = (activeBuyer.phone || '').replace(/[^0-9]/g, '');
    if (!rawDigits || rawDigits.length < 8) {
      alert('Please provide a valid buyer mobile number (+88017...) to dispatch WhatsApp tech pack.');
      return;
    }
    const cleanNumber = rawDigits.startsWith('880') ? rawDigits : rawDigits.startsWith('0') ? '88' + rawDigits : rawDigits;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(whatsAppSummaryText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [activeBuyer.phone, whatsAppSummaryText]);

  // ── Action 3: Copy Raw Spec ──
  const handleCopyRawSpec = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formattedSpecText).then(() => {
        setCopiedSpec(true);
        setTimeout(() => setCopiedSpec(false), 3000);
      });
    }
  }, [formattedSpecText]);

  if (!isOpen) return null;

  return (
    <div className={`tech-pack-po-engine font-mono text-[#1e293b] ${mode === 'modal' ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto' : 'w-full'}`}>
      <div className={`w-full max-w-7xl bg-white/90 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[4px_4px_24px_rgba(166,180,200,0.3),-4px_-4px_24px_#ffffff] overflow-hidden flex flex-col ${mode === 'modal' ? 'max-h-[92vh]' : 'my-4'}`}>
        
        {/* ── Top Header Bar ── */}
        <div className="p-4 bg-white/95 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#c81d11] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[#1e293b] font-bold text-sm tracking-wider uppercase">
                  TECH PACK &amp; FACTORY PO ENGINE
                </h2>
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                  {poNumber}
                </span>
                <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  REV: {revision}
                </span>
              </div>
              <p className="text-[#64748b] text-xs mt-0.5 font-sans">
                Parametric Apparel &amp; Outerwear Spec Calculator · Export Factory Grade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVoiceIngestion(!showVoiceIngestion)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                showVoiceIngestion
                  ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-[#b45309] hover:border-amber-500 shadow-xs'
              }`}
              title="Record or Upload Spoken Voice PO Instructions via Gemini Flash"
            >
              <span>🎙️</span>
              <span>{showVoiceIngestion ? 'HIDE VOICE DOCK' : 'VOICE PO INGESTION'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPoNumber(`HH-PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-300 text-[#475569] hover:text-[#1e293b] px-3 py-1.5 rounded-xl transition-all shadow-xs"
              title="Generate new PO reference code"
            >
              🔄 New PO ID
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#64748b] hover:text-[#1e293b] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl text-xs transition-all font-semibold"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* ── Voice PO Ingestion Dock (Toggleable) ── */}
        {showVoiceIngestion && (
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 transition-all">
            <VoicePOIngestion
              onSpecExtracted={handleVoiceSpecExtracted}
              onCancel={() => setShowVoiceIngestion(false)}
            />
          </div>
        )}

        {/* ── Status Banner (if any) ── */}
        {saveMessage && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${saveSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="flex items-center gap-2">
              <span>{saveSuccess ? '✓' : 'ℹ'}</span>
              <span>{saveMessage}</span>
            </div>
            <button
              onClick={() => setSaveMessage(null)}
              className="text-[#64748b] hover:text-[#1e293b] text-xs px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Main Engine Body: 2-Column Responsive Layout ── */}
        <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          
          {/* ════════ LEFT COLUMN: Inputs & Parametric Calculator (7 Cols) ════════ */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ── MODULE 1: CUSTOMER LINKER ── */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#b45309] text-sm">👤</span>
                  <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">
                    1. Customer Linker (Firestore Database)
                  </span>
                </div>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBuyerMode('existing')}
                    className={`px-2.5 py-1 rounded-md transition-all ${buyerMode === 'existing' ? 'bg-[#c81d11] text-white font-bold shadow-xs' : 'text-[#64748b] hover:text-[#1e293b]'}`}
                  >
                    Search Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyerMode('quick')}
                    className={`px-2.5 py-1 rounded-md transition-all ${buyerMode === 'quick' ? 'bg-[#c81d11] text-white font-bold shadow-xs' : 'text-[#64748b] hover:text-[#1e293b]'}`}
                  >
                    Quick Custom Buyer
                  </button>
                </div>
              </div>

              {buyerMode === 'existing' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search existing customer by Name, Company, Phone (+880...), or Email…"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-xs"
                    />
                    {loadingCustomers && (
                      <span className="absolute right-3 top-2 text-[10px] text-[#64748b] animate-pulse">
                        Loading…
                      </span>
                    )}
                  </div>

                  {filteredCustomers.length > 0 && !selectedCustomer && (
                    <div className="max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm">
                      {filteredCustomers.map(cust => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearch(cust.name);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-[#1e293b]">{cust.name}</span>
                            {cust.companyName && (
                              <span className="text-[#64748b] text-[11px] ml-2">({cust.companyName})</span>
                            )}
                            <div className="text-[10px] text-[#94a3b8]">{cust.phone || 'No phone'} · {cust.email || 'No email'}</div>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-mono font-bold">
                            ৳{(cust.totalSpent || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                          <span>✓ {selectedCustomer.name}</span>
                          {selectedCustomer.companyName && (
                            <span className="text-[#475569] text-[11px]">[{selectedCustomer.companyName}]</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748b] flex items-center gap-3">
                          <span>📱 {selectedCustomer.phone || 'No canonical phone'}</span>
                          <span>✉️ {selectedCustomer.email || 'No email'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-[11px] text-[#64748b] hover:text-[#1e293b] bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-xs"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-[#64748b] block mb-1">Buyer / Contact Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahat Chowdhury"
                      value={quickName}
                      onChange={e => setQuickName(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#64748b] block mb-1">Brand / Company Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Apparel Group"
                      value={quickCompany}
                      onChange={e => setQuickCompany(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-[#64748b]">Canonical BD Mobile (+88017...)</label>
                      {quickPhoneResult.carrierName && (
                        <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 rounded font-bold">
                          {quickPhoneResult.carrierName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="+88017XXXXXXXX"
                      value={quickPhone}
                      onChange={e => setQuickPhone(e.target.value)}
                      className={`w-full bg-slate-50/80 border rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none shadow-xs ${quickPhoneResult.isValid ? 'border-emerald-500' : 'border-slate-200 focus:border-[#d4af37]'}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#64748b] block mb-1">Buyer Email</label>
                    <input
                      type="email"
                      placeholder="buyer@domain.com"
                      value={quickEmail}
                      onChange={e => setQuickEmail(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── MODULE 2: PARAMETRIC APPAREL & OUTERWEAR CALCULATOR ── */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#b45309] text-sm">📐</span>
                  <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">
                    2. Parametric Apparel &amp; Outerwear Calculator
                  </span>
                </div>
                <span className="text-[11px] text-[#64748b]">
                  Formula Engine Active
                </span>
              </div>

              {/* Category & Style Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">Apparel &amp; Gear Category</label>
                  <select
                    value={category}
                    onChange={e => handleCategoryChange(e.target.value as ApparelCategory)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1e293b] font-bold focus:outline-none focus:border-[#d4af37] shadow-xs"
                  >
                    <option value="Leather Jacket">🧥 Leather Jacket (Artisanal Outerwear)</option>
                    <option value="Heavy Hoodie">👕 Heavy Hoodie (450 GSM Fleece)</option>
                    <option value="Graphic Tee">👕 Graphic Tee (260 GSM Combed Cotton)</option>
                    <option value="Modular Bag">🎒 Modular Bag (Steerhide / Cordura)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">Style Reference / Model Name</label>
                  <input
                    type="text"
                    value={styleName}
                    onChange={e => setStyleName(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#d4af37] shadow-xs font-medium"
                  />
                </div>
              </div>

              {/* Sizing Ratio Matrix with Real-Time Total Tally */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    Sizing Ratio Breakdown (Pieces)
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[#64748b]">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applySizingPreset('streetwear')}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 text-[#475569] rounded hover:text-[#1e293b] shadow-xs"
                    >
                      Streetwear
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizingPreset('standard')}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 text-[#475569] rounded hover:text-[#1e293b] shadow-xs"
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizingPreset('large')}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 text-[#475569] rounded hover:text-[#1e293b] shadow-xs"
                    >
                      Large-Heavy
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizingPreset('clear')}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 text-red-600 rounded hover:text-red-700 shadow-xs"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1">
                  {(['s', 'm', 'l', 'xl', 'xxl'] as const).map(sz => {
                    const count = sizing[sz] || 0;
                    const pct = totalQuantity > 0 ? ((count / totalQuantity) * 100).toFixed(0) : '0';
                    return (
                      <div key={sz} className="flex flex-col items-center bg-white border border-slate-200 p-2 rounded-xl shadow-xs">
                        <span className="text-[11px] font-bold text-[#b45309] uppercase">{sz}</span>
                        <input
                          type="number"
                          min="0"
                          value={sizing[sz] || ''}
                          onChange={e => handleSizeChange(sz, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-center font-bold text-xs text-[#1e293b] rounded my-1 py-1 focus:outline-none focus:border-[#d4af37]"
                        />
                        <span className="text-[9px] text-[#94a3b8]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2 px-1">
                  <span className="text-xs text-[#64748b]">Total Order Units:</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {totalQuantity.toLocaleString()} PIECES
                  </span>
                </div>
              </div>

              {/* Material, GSM, Lining & Hardware Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">
                    {category === 'Leather Jacket' ? 'Leather Hide Grade' : category === 'Modular Bag' ? 'Body Material Spec' : 'Fabric Basis & GSM'}
                  </label>
                  <select
                    value={material}
                    onChange={e => setMaterial(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#d4af37] shadow-xs"
                  >
                    {CATEGORY_CONFIGS[category].materials.map((mat, idx) => (
                      <option key={idx} value={mat}>{mat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">
                    {CATEGORY_CONFIGS[category].liningsOrRib.label}
                  </label>
                  <select
                    value={liningOrRib}
                    onChange={e => setLiningOrRib(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#d4af37] shadow-xs"
                  >
                    {CATEGORY_CONFIGS[category].liningsOrRib.options.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#64748b] block mb-1">Hardware, Trims &amp; Finish</label>
                  <select
                    value={hardware}
                    onChange={e => setHardware(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#d4af37] shadow-xs"
                  >
                    {CATEGORY_CONFIGS[category].hardwareOrTrims.map((hw, idx) => (
                      <option key={idx} value={hw}>{hw}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Colorways Selection */}
              <div>
                <label className="text-[11px] text-[#64748b] block mb-1.5">Colorways (Multi-Select or Custom)</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLORWAY_PRESETS.map(c => {
                    const isSelected = selectedColorways.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleColorway(c.name)}
                        className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${isSelected ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-[#64748b] hover:text-[#1e293b]'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Enter custom Pantone / Dye shade…"
                    value={customColorInput}
                    onChange={e => setCustomColorInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColorway(); } }}
                    className="flex-1 bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={addCustomColorway}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] hover:text-[#1e293b] px-3 py-1 rounded-xl text-xs shadow-xs font-semibold"
                  >
                    + Add Shade
                  </button>
                </div>
              </div>

              {/* Commercials: Target FOB Unit Price */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">Currency</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleCurrencyToggle('BDT')}
                      className={`flex-1 py-1.5 font-bold transition-all ${currency === 'BDT' ? 'bg-[#c81d11] text-white' : 'bg-white text-[#64748b]'}`}
                    >
                      BDT (৳)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCurrencyToggle('USD')}
                      className={`flex-1 py-1.5 font-bold transition-all ${currency === 'USD' ? 'bg-[#c81d11] text-white' : 'bg-white text-[#64748b]'}`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">Target FOB Unit Price</label>
                  <input
                    type="number"
                    min="1"
                    value={unitPrice}
                    onChange={e => setUnitPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#1e293b] font-bold focus:outline-none focus:border-[#d4af37] font-mono shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#64748b] block mb-1">Total Order Value</label>
                  <div className="text-sm font-bold text-emerald-700 font-mono bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                    {currency === 'BDT' ? '৳' : '$'}{totalOrderValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* ── MODULE 3: ON-THE-FLY AUTO-CALCULATIONS ── */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider flex items-center gap-2">
                  <span className="text-[#b45309]">⚡</span>
                  Auto-Calculations: Material Consumption &amp; Lead Time
                </span>
                <span className="text-[10px] text-[#64748b]">Standard Garment Formulas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Consumption Box */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-[#b45309] uppercase">
                    Fabric / Material Consumption
                  </div>
                  <div className="text-xs text-[#1e293b]">
                    <span className="text-[#64748b]">Primary:</span> <b className="text-[#1e293b] font-mono">{consumption.primaryQty}</b>
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    {consumption.primaryDetails}
                  </div>
                  <div className="text-xs text-[#1e293b] border-t border-slate-200 pt-1.5">
                    <span className="text-[#64748b]">Secondary / Rib:</span> <b className="text-[#1e293b] font-mono">{consumption.secondaryQty}</b>
                  </div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">
                    {consumption.formulaDesc}
                  </div>
                </div>

                {/* Lead Time Box */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase flex items-center justify-between">
                    <span>Lead Time &amp; Factory SLA</span>
                    <span className="text-[10px] text-[#64748b]">AQL 1.5 Standard</span>
                  </div>
                  <div className="text-xs text-[#1e293b]">
                    <span className="text-[#64748b]">Prod. Window:</span> <b className="text-emerald-800 font-mono">{leadTime.totalWorkingDays} Working Days</b>
                  </div>
                  <div className="text-xs text-[#1e293b]">
                    <span className="text-[#64748b]">Est. Ship Date:</span> <b className="text-[#1e293b] font-mono">{leadTime.estimatedShipDate}</b>
                  </div>
                  <div className="text-[11px] text-[#64748b] border-t border-slate-200 pt-1.5">
                    {leadTime.tierName}
                  </div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">
                    {leadTime.breakdown}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ════════ RIGHT COLUMN: Monospace Factory-Ready PO Preview & Actions (5 Cols) ════════ */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            
            {/* Header of Preview */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 text-xs">●</span>
                <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">
                  Live Factory-Ready Spec Preview
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyRawSpec}
                className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-[#475569] hover:text-[#1e293b] px-2.5 py-1 rounded-xl transition-all shadow-xs font-semibold"
              >
                {copiedSpec ? '✓ Copied' : '📋 Copy Text'}
              </button>
            </div>

            {/* Monospace Spec Sheet Box */}
            <div className="relative flex-1 bg-[#18181b] border border-slate-700/60 rounded-2xl p-3.5 font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre leading-relaxed select-text shadow-inner max-h-[520px]">
              {formattedSpecText}
            </div>

            {/* Terms & Notes Editor */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-xs shadow-xs">
              <div>
                <label className="text-[11px] text-[#64748b] block mb-1">Payment &amp; Commercial Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[#1e293b] text-xs focus:outline-none focus:border-[#d4af37] shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748b] block mb-1">Delivery / Port of Departure</label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={e => setDeliveryTerms(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[#1e293b] text-xs focus:outline-none focus:border-[#d4af37] shadow-xs"
                />
              </div>
            </div>

            {/* ── OUTPUT ACTIONS ── */}
            <div className="bg-white/85 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
                Output Actions &amp; Dispatch Hub
              </span>

              {/* Action 1: Save Spec to Firestore */}
              <button
                type="button"
                onClick={handleSaveSpecToFirestore}
                disabled={isSaving}
                className="w-full bg-[#c81d11] hover:bg-[#a3160c] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>{isSaving ? '⏳' : '💾'}</span>
                <span>{isSaving ? 'Writing to Firestore…' : 'SAVE SPEC TO FIRESTORE'}</span>
              </button>

              {/* Action 2: Dispatch to WhatsApp */}
              <button
                type="button"
                onClick={handleDispatchWhatsApp}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>📲</span>
                <span>DISPATCH TO WHATSAPP (1-CLICK CONFIRMATION)</span>
              </button>

              {/* Action 3: Copy Raw Spec */}
              <button
                type="button"
                onClick={handleCopyRawSpec}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-[#1e293b] font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{copiedSpec ? '✓' : '📄'}</span>
                <span>{copiedSpec ? 'SPEC COPIED TO CLIPBOARD' : 'COPY RAW SPEC'}</span>
              </button>

              {/* Action 4: Dispatch via Logistics & COD Settlement Hub */}
              <button
                type="button"
                onClick={() => {
                  const currentSpecData = {
                    id: poNumber,
                    poNumber,
                    buyerName: activeBuyer.name || 'Valued Buyer',
                    buyerPhone: activeBuyer.phone || '',
                    companyName: activeBuyer.companyName || '',
                    deliveryAddress: activeBuyer.address || 'Dhaka, Bangladesh',
                    styleName: styleName || category,
                    category,
                    quantity: totalQuantity,
                    unitFobPrice: unitPrice,
                    currency,
                    orderTotal: totalOrderValue,
                    weightKg: totalEstimatedWeightKg,
                    advancePct: 50,
                    advanceRequired: Math.round((totalOrderValue * 50) / 100),
                    advancePaid: 0,
                    balanceDue: totalOrderValue,
                    codAmount: totalOrderValue,
                    notes: `Fabric/Leather: ${fabricLeatherType} | Color: ${colorway} | PO: ${poNumber}`
                  };
                  if (typeof (window as any).openLogisticsSettlementHub === 'function') {
                    (window as any).openLogisticsSettlementHub(currentSpecData);
                  } else {
                    window.dispatchEvent(new CustomEvent('nexus:open-logistics', { detail: { order: currentSpecData } }));
                  }
                }}
                className="w-full bg-[#FF4400] hover:bg-[#E03A00] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>🚚</span>
                <span>LOGISTICS &amp; COD SETTLEMENT DOCK →</span>
              </button>

              {/* Action 5: Track in Factory Floor & SLA Monitor */}
              <button
                type="button"
                onClick={() => {
                  if (typeof (window as any).openFactorySlaFloorTracker === 'function') {
                    (window as any).openFactorySlaFloorTracker(poNumber);
                  } else {
                    window.dispatchEvent(new CustomEvent('nexus:open-factory-sla', { detail: { poNumber } }));
                  }
                }}
                className="w-full bg-[#12141A] hover:bg-[#1E222B] border border-[#1E222B] text-[#E2E8F0] font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>🏭</span>
                <span>FACTORY FLOOR &amp; SLA TRACKER →</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default TechPackPOEngine;
