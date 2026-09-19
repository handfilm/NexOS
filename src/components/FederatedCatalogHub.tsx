import React, { useState, useEffect, useMemo } from 'react';
import {
  FederatedProduct,
  WholesaleTier,
  fetchPaginatedCatalog,
  hydrateFromCdnBundle,
  searchFederatedCatalog,
} from '../services/catalogService';
import {
  Layers,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  TrendingDown,
  Sparkles,
  ChevronRight,
  Database,
  Globe,
  ArrowRight,
  Server,
  Zap,
  Info,
} from 'lucide-react';

// Seed catalog for instant hydration demo when offline or before pipeline first run
const SEED_CATALOG: FederatedProduct[] = [
  {
    id: 'arutemika_com_ARU-LEA-BAG-09',
    sku: 'ARU-LEA-BAG-09',
    title: 'Executive Full-Grain Leather Briefcase',
    handle: 'executive-full-grain-leather-briefcase',
    description: 'Bespoke hand-burnished vegetable-tanned buffalo leather briefcase. Reinforced saddle stitching with solid brass hardware forged in Savar.',
    category: 'Leather Bags & Luggage',
    origin: 'arutemika.com',
    originDisplayName: 'Arutemika Leather Studio',
    status: 'ACTIVE',
    retailPriceUsd: 285.00,
    currency: 'USD',
    moq: 100,
    wholesalePriceLadder: [
      { tierNumber: 1, minQuantity: 500, discountPercentage: 12, unitPriceUsd: 250.80, totalTierCostUsd: 125400 },
      { tierNumber: 2, minQuantity: 2000, discountPercentage: 22, unitPriceUsd: 222.30, totalTierCostUsd: 444600 },
      { tierNumber: 3, minQuantity: 10000, discountPercentage: 35, unitPriceUsd: 185.25, totalTierCostUsd: 1852500 },
    ],
    provenance: {
      badgeId: 'PROV-BD-LEATHER-SAVAR',
      badgeLabel: 'Artisanal Tannery Certified • Hazaribagh & Savar Traceable Leather',
      certificationAuthority: 'Dhaka Leather Goods Guild & BSTI Export Standard',
      originRegion: 'Savar Tannery Estate, Dhaka Division, Bangladesh',
      traceabilityGrade: 'A_PLUS_ARTISANAL',
      materialCompliance: [
        'LWG Audited Tannery Raw Sourcing',
        'REACH Annex XVII Certified',
        'Zero Chromium IV Discharge Standard',
      ],
      ecoScore: 94,
    },
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    materials: ['Full-Grain Cowhide Leather', 'Solid Brass Hardware', 'Cotton Twill Lining'],
    tags: ['Luxury', 'Leather', 'Executive', 'Bespoke', 'Artisanal'],
    specifications: { leatherType: 'Vegetable-Tanned Buffalo', weightKg: 1.4, dimensions: '40x30x9 cm' },
    inventoryCount: 420,
    inStock: true,
    leadTimeDays: 28,
    hsCode: '4202.21.00',
    syncVersion: 3,
    redirectUrlPath: '/api/redirect/arutemika_com_ARU-LEA-BAG-09',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    featuredScore: 268,
  },
  {
    id: 'shop_handsandhead_com_HH-OEK-HD01',
    sku: 'HH-OEK-HD01',
    title: 'Heavyweight OEKO-TEX French Terry Hoodie',
    handle: 'heavyweight-oeko-tex-french-terry-hoodie',
    description: '450 GSM combed organic cotton French terry hoodie. Pre-shrunk, double-needle coverstitched with ribbed side gussets.',
    category: 'Apparel & Knitwear',
    origin: 'shop.handsandhead.com',
    originDisplayName: 'Hands & Head Headless Atelier',
    status: 'ACTIVE',
    retailPriceUsd: 78.00,
    currency: 'USD',
    moq: 500,
    wholesalePriceLadder: [
      { tierNumber: 1, minQuantity: 500, discountPercentage: 12, unitPriceUsd: 68.64, totalTierCostUsd: 34320 },
      { tierNumber: 2, minQuantity: 2000, discountPercentage: 22, unitPriceUsd: 60.84, totalTierCostUsd: 121680 },
      { tierNumber: 3, minQuantity: 10000, discountPercentage: 35, unitPriceUsd: 50.70, totalTierCostUsd: 507000 },
    ],
    provenance: {
      badgeId: 'PROV-BD-RMG-BAYXBENGAL',
      badgeLabel: 'BayXBengal Export Standard • OEKO-TEX Cotton & Jute Certified',
      certificationAuthority: 'BGMEA & Accord Bangladesh Safety Standard',
      originRegion: 'Dhaka & Chittagong Industrial Export Zone, Bangladesh',
      traceabilityGrade: 'EXPORT_GRADE_CLASS_A',
      materialCompliance: [
        'OEKO-TEX Standard 100 Certified',
        'GOTS Organic Cotton Blend Standard',
        'Fair Trade Sourced Bangladesh Jute',
      ],
      ecoScore: 91,
    },
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    materials: ['100% Combed Organic Cotton (450 GSM)', 'Lycra Spandex Ribbing'],
    tags: ['Knitwear', 'French Terry', 'Organic', 'Streetwear', 'Export'],
    specifications: { fabricGsm: 450, dyeType: 'Reactive Low-Impact Dye', shrinkTolerance: '< 2%' },
    inventoryCount: 3800,
    inStock: true,
    leadTimeDays: 21,
    hsCode: '6110.20.00',
    syncVersion: 5,
    redirectUrlPath: '/api/redirect/shop_handsandhead_com_HH-OEK-HD01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    featuredScore: 71,
  },
  {
    id: 'arutemika_com_ARU-LEA-WLT-04',
    sku: 'ARU-LEA-WLT-04',
    title: 'Slim Bifold RFID-Shielded Calfskin Wallet',
    handle: 'slim-bifold-rfid-calfskin-wallet',
    description: 'Ultra-thin bifold wallet crafted from full-grain calfskin with integrated Faraday RFID radiation blocking weave.',
    category: 'Small Leather Goods',
    origin: 'arutemika.com',
    originDisplayName: 'Arutemika Leather Studio',
    status: 'ACTIVE',
    retailPriceUsd: 65.00,
    currency: 'USD',
    moq: 250,
    wholesalePriceLadder: [
      { tierNumber: 1, minQuantity: 500, discountPercentage: 12, unitPriceUsd: 57.20, totalTierCostUsd: 28600 },
      { tierNumber: 2, minQuantity: 2000, discountPercentage: 22, unitPriceUsd: 50.70, totalTierCostUsd: 101400 },
      { tierNumber: 3, minQuantity: 10000, discountPercentage: 35, unitPriceUsd: 42.25, totalTierCostUsd: 422500 },
    ],
    provenance: {
      badgeId: 'PROV-BD-LEATHER-SAVAR',
      badgeLabel: 'Artisanal Tannery Certified • Hazaribagh & Savar Traceable Leather',
      certificationAuthority: 'Dhaka Leather Goods Guild & BSTI Export Standard',
      originRegion: 'Savar Tannery Estate, Dhaka Division, Bangladesh',
      traceabilityGrade: 'A_PLUS_ARTISANAL',
      materialCompliance: ['LWG Gold Rated Raw Tannery', 'REACH Compliant', 'Chrome-Free'],
      ecoScore: 93,
    },
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    materials: ['Full-Grain Calfskin', 'Faraday Shielding Fabric'],
    tags: ['Wallets', 'Leather', 'RFID', 'Accessories'],
    specifications: { cardCapacity: 8, rfidBlockFrequency: '13.56 MHz', weightG: 48 },
    inventoryCount: 1200,
    inStock: true,
    leadTimeDays: 18,
    hsCode: '4202.31.00',
    syncVersion: 2,
    redirectUrlPath: '/api/redirect/arutemika_com_ARU-LEA-WLT-04',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    featuredScore: 60,
  },
  {
    id: 'shop_handsandhead_com_HH-JUT-TOT02',
    sku: 'HH-JUT-TOT02',
    title: 'Raw Bengal Golden Fiber Structured Tote',
    handle: 'raw-bengal-golden-fiber-structured-tote',
    description: 'Heavy-density spun golden jute composite tote with vegetable-tanned leather carry handles and water-repellent plant wax lining.',
    category: 'Jute & Sustainable Accessories',
    origin: 'shop.handsandhead.com',
    originDisplayName: 'Hands & Head Headless Atelier',
    status: 'ACTIVE',
    retailPriceUsd: 42.00,
    currency: 'USD',
    moq: 500,
    wholesalePriceLadder: [
      { tierNumber: 1, minQuantity: 500, discountPercentage: 12, unitPriceUsd: 36.96, totalTierCostUsd: 18480 },
      { tierNumber: 2, minQuantity: 2000, discountPercentage: 22, unitPriceUsd: 32.76, totalTierCostUsd: 65520 },
      { tierNumber: 3, minQuantity: 10000, discountPercentage: 35, unitPriceUsd: 27.30, totalTierCostUsd: 273000 },
    ],
    provenance: {
      badgeId: 'PROV-BD-RMG-BAYXBENGAL',
      badgeLabel: 'BayXBengal Export Standard • OEKO-TEX Cotton & Jute Certified',
      certificationAuthority: 'Bangladesh Jute Research Institute & Fair Trade',
      originRegion: 'Faridpur & Jessore Golden Fiber Cluster, Bangladesh',
      traceabilityGrade: 'EXPORT_GRADE_CLASS_A',
      materialCompliance: ['100% Biodegradable Bengal Jute', 'Zero Microplastics', 'Organic Plant Wax'],
      ecoScore: 98,
    },
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    materials: ['Unbleached Golden Jute', 'Vegetable-Tanned Leather Trim', 'Organic Cotton Canvas'],
    tags: ['Jute', 'Sustainable', 'Eco-Friendly', 'Bags', 'Zero-Plastic'],
    specifications: { tensileStrength: 'High Yield Jute Weave', volumeLiters: 24, maxLoadKg: 18 },
    inventoryCount: 6500,
    inStock: true,
    leadTimeDays: 14,
    hsCode: '6305.10.00',
    syncVersion: 4,
    redirectUrlPath: '/api/redirect/shop_handsandhead_com_HH-JUT-TOT02',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    featuredScore: 41,
  },
];

export const FederatedCatalogHub: React.FC = () => {
  const [products, setProducts] = useState<FederatedProduct[]>(SEED_CATALOG);
  const [selectedOrigin, setSelectedOrigin] = useState<'ALL' | 'shop.handsandhead.com' | 'arutemika.com'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<FederatedProduct | null>(SEED_CATALOG[0]);
  const [calculatorUnits, setCalculatorUnits] = useState<number>(500);
  const [hydrationSource, setHydrationSource] = useState<'CDN_BUNDLE' | 'SEED_PRECACHE' | 'FIRESTORE_LIVE'>('CDN_BUNDLE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'NODES' | 'PIPELINE'>('CATALOG');

  // Load bundle or initial paginated query on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeHydration() {
      setIsLoading(true);
      try {
        // Attempt bundle hydration if window.firebaseDb exists
        const db = (window as any).firebaseDb;
        if (db) {
          const bundleItems = await hydrateFromCdnBundle(db);
          if (isMounted && bundleItems.length > 0) {
            setProducts(bundleItems);
            setHydrationSource('CDN_BUNDLE');
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Initial bundle hydration failed, using pre-cached federated catalog', err);
      }
      if (isMounted) {
        setProducts(SEED_CATALOG);
        setHydrationSource('SEED_PRECACHE');
        setIsLoading(false);
      }
    }

    initializeHydration();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by origin, category, and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedOrigin !== 'ALL' && p.origin !== selectedOrigin) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${p.title} ${p.sku} ${p.description} ${p.materials.join(' ')} ${p.tags.join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedOrigin, selectedCategory, searchQuery]);

  // Wholesale volume ladder calculation for currently selected product
  const ladderCalculation = useMemo(() => {
    if (!selectedProduct) return null;
    const qty = Math.max(1, Number(calculatorUnits) || 1);
    const ladder = selectedProduct.wholesalePriceLadder;

    let appliedTier: WholesaleTier;
    if (qty >= ladder[2].minQuantity) {
      appliedTier = ladder[2];
    } else if (qty >= ladder[1].minQuantity) {
      appliedTier = ladder[1];
    } else {
      appliedTier = ladder[0];
    }

    const unitPrice = appliedTier.unitPriceUsd;
    const totalCost = Math.round(unitPrice * qty * 100) / 100;
    const retailTotal = Math.round(selectedProduct.retailPriceUsd * qty * 100) / 100;
    const totalSavings = Math.round((retailTotal - totalCost) * 100) / 100;

    return {
      appliedTier,
      unitPrice,
      totalCost,
      retailTotal,
      totalSavings,
      effectiveDiscountPct: appliedTier.discountPercentage,
    };
  }, [selectedProduct, calculatorUnits]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  const handleRedirect = (product: FederatedProduct) => {
    // In production, opens /api/redirect/:catalogId server-side redirector
    // This demonstrates that the raw internal D2C URL is NEVER in the DOM or JS bundle!
    const targetUrl = product.redirectUrlPath.startsWith('http')
      ? product.redirectUrlPath
      : `${window.location.origin}${product.redirectUrlPath}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                NEXOS Automated Sync Pipeline
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Zero-Read CDN Bundle Hydrated
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Bangladesh Export Federated Catalog
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Unified multi-node synchronization engine across <strong>admin.handsandhead.com</strong>, <strong>b2b.handsandhead.com</strong>, <strong>shop.handsandhead.com</strong>, and <strong>arutemika.com</strong>
            </p>
          </div>

          {/* Hydration Source Badge & Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('CATALOG')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'CATALOG'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Wholesale Catalog ({filteredProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('NODES')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'NODES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4-Node Topology
              </button>
              <button
                onClick={() => setActiveTab('PIPELINE')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'PIPELINE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Architecture & Rules
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: WHOLESALE CATALOG VIEW */}
        {activeTab === 'CATALOG' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by SKU, material, category, or provenance..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Origin Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setSelectedOrigin('ALL')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedOrigin === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Nodes
                </button>
                <button
                  onClick={() => setSelectedOrigin('shop.handsandhead.com')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedOrigin === 'shop.handsandhead.com'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  shop.handsandhead.com
                </button>
                <button
                  onClick={() => setSelectedOrigin('arutemika.com')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedOrigin === 'arutemika.com'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  arutemika.com
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Screen Layout: Catalog Grid + Volume Ladder Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Cards Grid (8 cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const isArutemika = p.origin === 'arutemika.com';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-slate-900/90 shadow-lg shadow-indigo-500/10'
                          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        {/* Thumbnail & Origin Badge */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-3 border border-slate-800">
                          <img
                            src={p.thumbnailUrl}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md backdrop-blur-md ${
                              isArutemika
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                                : 'bg-sky-950/80 text-sky-300 border border-sky-600/40'
                            }`}
                          >
                            {p.origin}
                          </span>
                          <span className="absolute bottom-2 right-2 bg-slate-950/90 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-mono">
                            MOQ: {p.moq} units
                          </span>
                        </div>

                        {/* Title & SKU */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>{p.sku}</span>
                            <span className="text-emerald-400 font-semibold">Eco {p.provenance.ecoScore}/100</span>
                          </div>
                          <h3 className="font-semibold text-white text-base leading-snug line-clamp-1">
                            {p.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                        </div>

                        {/* Provenance Badge */}
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 mb-3 text-[11px] text-slate-300 flex items-start gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{p.provenance.badgeLabel}</span>
                        </div>
                      </div>

                      {/* Pricing Ladder Summary */}
                      <div className="pt-3 border-t border-slate-800/80">
                        <div className="grid grid-cols-3 gap-1 text-center font-mono">
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <div className="text-[10px] text-slate-500">500 pcs (-12%)</div>
                            <div className="text-xs font-bold text-slate-200">
                              ${p.wholesalePriceLadder[0].unitPriceUsd}
                            </div>
                          </div>
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <div className="text-[10px] text-slate-500">2K pcs (-22%)</div>
                            <div className="text-xs font-bold text-amber-300">
                              ${p.wholesalePriceLadder[1].unitPriceUsd}
                            </div>
                          </div>
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <div className="text-[10px] text-slate-500">10K pcs (-35%)</div>
                            <div className="text-xs font-bold text-emerald-400">
                              ${p.wholesalePriceLadder[2].unitPriceUsd}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Retail D2C: ${p.retailPriceUsd}</span>
                          <span className="text-indigo-400 flex items-center gap-1 font-medium">
                            Calculate Ladder <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Wholesale Calculator & Specification Panel (4 cols) */}
              <div className="lg:col-span-4">
                {selectedProduct ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                        <span>{selectedProduct.sku}</span>
                        <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          v{selectedProduct.syncVersion} synced
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {selectedProduct.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Origin Node: <strong>{selectedProduct.originDisplayName}</strong>
                      </p>
                    </div>

                    {/* 3-Tier Volume Calculator */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
                          PO Volume Ladder
                        </label>
                        <span className="text-xs text-indigo-400 font-mono font-medium">
                          {ladderCalculation?.effectiveDiscountPct}% Volume Discount
                        </span>
                      </div>

                      {/* Quantity Input */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span>Target Order Quantity (Units):</span>
                          <span className="font-mono text-white font-bold">{calculatorUnits} pcs</span>
                        </div>
                        <input
                          type="range"
                          min={selectedProduct.moq}
                          max={15000}
                          step={50}
                          value={calculatorUnits}
                          onChange={(e) => setCalculatorUnits(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-800"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                          <span>MOQ ({selectedProduct.moq})</span>
                          <span>Tier 1 (500)</span>
                          <span>Tier 2 (2,000)</span>
                          <span>Tier 3 (10,000)</span>
                        </div>
                      </div>

                      {/* Live Calculation Cards */}
                      {ladderCalculation && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Effective Unit Price:</span>
                            <span className="font-mono font-bold text-base text-emerald-400">
                              ${ladderCalculation.unitPrice.toFixed(2)} USD
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Total Purchase Order:</span>
                            <span className="font-mono font-bold text-white">
                              ${ladderCalculation.totalCost.toLocaleString()} USD
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-emerald-400/90 font-mono">
                            <span>Wholesale Savings vs Retail:</span>
                            <span>-${ladderCalculation.totalSavings.toLocaleString()} USD</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Full Provenance Details */}
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-slate-300 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Bangladesh Origin Compliance
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1.5">
                        <div className="text-slate-200 font-medium">{selectedProduct.provenance.certificationAuthority}</div>
                        <div className="text-slate-400 text-[11px]">{selectedProduct.provenance.originRegion}</div>
                        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-1">
                          {selectedProduct.provenance.materialCompliance.map((comp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                            >
                              ✓ {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Secure Origin Redirect CTA */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handleRedirect(selectedProduct)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Secure D2C Redirect (`/api/redirect`)
                      </button>
                      <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                        <Info className="w-3 h-3 text-slate-400" />
                        Raw D2C URL is resolved server-side with <strong>?ref=b2b</strong> attribution.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                    Select a product from the catalog to inspect its 3-tier wholesale ladder and provenance.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 4-NODE TOPOLOGY VIEW */}
        {activeTab === 'NODES' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">4-Node Export Ecosystem Architecture</h2>
              <p className="text-slate-400 text-sm">
                Automated continuous data normalization synchronizing raw retail catalogs into canonical B2B inventory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Node 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-400 font-mono font-semibold">Node 1 — Master Store</div>
                  <h3 className="font-bold text-white text-base">admin.handsandhead.com</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Firebase/Firestore master database hosting the <code>federated_catalog</code> collection serving 15,000 verified buyers and 3,000 exporters.
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                  • Firestore Enterprise<br />
                  • Admin SDK v12+<br />
                  • Cloud Functions (2nd gen)
                </div>
              </div>

              {/* Node 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-sky-400 font-mono font-semibold">Node 2 — B2B Hydration</div>
                  <h3 className="font-bold text-white text-base">b2b.handsandhead.com</h3>
                </div>
                <p className="text-xs text-slate-400">
                  React + Vite wholesale frontend hydrated via Firestore Data Bundles behind Cloud Storage CDN, avoiding per-user read costs.
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                  • Zero-read Bundle Load<br />
                  • Cursor startAfter() paging<br />
                  • Stale-While-Revalidate
                </div>
              </div>

              {/* Node 3 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-emerald-400 font-mono font-semibold">Node 3 — D2C Drive Poll</div>
                  <h3 className="font-bold text-white text-base">shop.handsandhead.com</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Headless D2C node where garment & textile product records live in Google Drive folders + JSON. Polled every 10 min via <code>changes.list()</code>.
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                  • Drive v3 API Poller<br />
                  • Delta pageToken cursor<br />
                  • Pub/Sub Publisher
                </div>
              </div>

              {/* Node 4 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-amber-400 font-mono font-semibold">Node 4 — Leather Webhook</div>
                  <h3 className="font-bold text-white text-base">arutemika.com</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Bespoke artisanal leather storefront with independent API/DB. Pushes real-time JSON webhooks to <code>arutemikaWebhook</code> endpoint.
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                  • HTTP POST Webhook<br />
                  • API Key Auth Guard<br />
                  • Pub/Sub with DLQ fallback
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PIPELINE ARCHITECTURE & RULES */}
        {activeTab === 'PIPELINE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white">NEXOS Pipeline Verification & Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">
                  1. Normalization & Wholesale Ladder
                </h3>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Tier 1 (500 units):</strong> Retail Price × (1 - TIER1_DISCOUNT_PCT / 100) [Default: 12%]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Tier 2 (2,000 units):</strong> Retail Price × (1 - TIER2_DISCOUNT_PCT / 100) [Default: 22%]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Tier 3 (10,000 units):</strong> Retail Price × (1 - TIER3_DISCOUNT_PCT / 100) [Default: 35%]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Dynamic Config:</strong> Tunable via Firebase Functions Secrets without redeploying.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">
                  2. Security & Origin Obfuscation
                </h3>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Isolated Metadata:</strong> Raw D2C URLs stored in <code>federated_catalog_private</code>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Zero Client Writes:</strong> Firestore rules allow client writes: <code>false</code> on catalog.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Server-Side 302:</strong> <code>/api/redirect/:id</code> looks up destination and appends <code>?ref=b2b</code>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Idempotent Versioning:</strong> Increments <code>syncVersion</code> monotonically on every update.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FederatedCatalogHub;
