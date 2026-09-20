import React, { useState, useEffect, useCallback } from 'react';
import { fetchLiveCatalog, Product } from '../services/nexusApi';
import {
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Package,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Tag,
  AlertCircle
} from 'lucide-react';

export interface CatalogGridProps {
  initialCategory?: string;
  onSelectProduct?: (product: Product) => void;
  className?: string;
}

export const CatalogGrid: React.FC<CatalogGridProps> = ({
  initialCategory = 'ALL',
  onSelectProduct,
  className = '',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setSyncError(null);
    try {
      const items = await fetchLiveCatalog({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        limitCount: 48,
      });
      // Guarantees products is strictly an array and never undefined
      setProducts(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('[CatalogGrid] Failed to hydrate catalog:', err);
      setSyncError('Live sync unavailable. Displaying empty ledger.');
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCatalog();
  };

  // Safe client-side search filtering over verified array
  const filteredProducts = products.filter((item) => {
    if (!item) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (item.title || '').toLowerCase().includes(q);
    const skuMatch = (item.sku || '').toLowerCase().includes(q);
    const catMatch = (item.category || '').toLowerCase().includes(q);
    const matMatch = (item.materials || []).some((m) => (m || '').toLowerCase().includes(q));
    return titleMatch || skuMatch || catMatch || matMatch;
  });

  const categories = [
    'ALL',
    'Leather Goods',
    'Apparel & Streetwear',
    'Bespoke Tailoring',
    'Denim & Twill',
    'Corporate Merchandise',
  ];

  return (
    <div className={`catalog-grid-root font-mono text-zinc-100 ${className}`}>
      {/* ── Top Bar / Controls ── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e0e0e]/80 p-4 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>NexOS Federated Catalog · Firestore Verified</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Live Global B2B Catalog
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time multi-brand procurement ledger with direct Dhaka atelier MOQ and wholesale tiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, SKU, material..."
              className="w-full bg-zinc-900/90 text-xs text-zinc-200 pl-8 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-amber-400/60 transition-colors"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/80 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            title="Refresh from Firebase Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'bg-[#121212] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Error Notification Banner ── */}
      {syncError && (
        <div className="mb-6 p-3 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* ── LOADING STATE: Obsidian Glassmorphic Skeleton Loader ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="bg-[#121212]/50 animate-pulse border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between h-[360px] backdrop-blur-md shadow-lg"
            >
              <div>
                {/* Image Placeholder */}
                <div className="w-full h-44 bg-zinc-900/80 rounded-lg mb-3 flex items-center justify-center">
                  <Package className="w-8 h-8 text-zinc-800 opacity-40" />
                </div>
                {/* Title & SKU Skeleton lines */}
                <div className="h-4 bg-zinc-800/80 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-900/90 rounded w-1/2 mb-3"></div>
                {/* Tags Skeleton */}
                <div className="flex gap-2 mb-3">
                  <div className="h-4 bg-zinc-900 rounded w-14"></div>
                  <div className="h-4 bg-zinc-900 rounded w-16"></div>
                </div>
              </div>
              {/* Bottom Price & Button Skeleton */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                <div className="h-5 bg-zinc-800/70 rounded w-20"></div>
                <div className="h-8 bg-zinc-900 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* ── BRUTALIST EMPTY STATE ── */
        <div className="p-12 text-center bg-[#0d0d0d] border border-zinc-800/90 rounded-2xl max-w-xl mx-auto my-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 mx-auto flex items-center justify-center mb-4 text-amber-400">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">
            No Active Products in Federated Ledger
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
            The live Firestore collection <code className="text-amber-400">federated_catalog</code> currently contains zero active items for the selected criteria, or connection was reset.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
                loadCatalog();
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-transform active:scale-95 shadow-md"
            >
              Reset Filters &amp; Reload
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              Sync Firestore
            </button>
          </div>
        </div>
      ) : (
        /* ── LIVE PRODUCT CARDS GRID ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const hasWholesale = Array.isArray(product.wholesalePriceLadder) && product.wholesalePriceLadder.length > 0;
            const primaryWholesaleTier = hasWholesale ? product.wholesalePriceLadder?.[0] : undefined;

            return (
              <div
                key={product.id}
                className="group relative bg-[#0f0f0f] hover:bg-[#141414] border border-zinc-800 hover:border-amber-400/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.7)]"
              >
                {/* ── Card Media & Badges ── */}
                <div className="relative w-full h-52 bg-zinc-950 overflow-hidden">
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback placeholder on broken image
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 p-4">
                      <Package className="w-10 h-10 mb-2 opacity-50" />
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-600">
                        Atelier Spec Asset
                      </span>
                    </div>
                  )}

                  {/* Top Origin & Status Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/80 text-amber-300 border border-amber-400/30 rounded backdrop-blur-md">
                      {product.originDisplayName || 'Atelier Direct'}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded backdrop-blur-md ${
                        product.inStock
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                          : 'bg-zinc-900/90 text-zinc-400 border border-zinc-700/40'
                      }`}
                    >
                      {product.inStock ? 'In Stock' : 'On Order'}
                    </span>
                  </div>

                  {/* MOQ Pill */}
                  <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-black/80 text-zinc-300 border border-zinc-700/60 rounded backdrop-blur-md">
                      MOQ: {product.moq || 1} units
                    </span>
                  </div>
                </div>

                {/* ── Card Content ── */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span className="uppercase tracking-wider truncate font-semibold">
                        {product.category || 'Atelier'}
                      </span>
                      <span className="font-mono text-zinc-400">{product.sku}</span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1 mb-1.5">
                      {product.title}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                      {product.description || 'Authentic export-grade craftsmanship with verified provenance and audited supply chain.'}
                    </p>

                    {/* Materials & Specs Chips */}
                    {Array.isArray(product.materials) && product.materials.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.materials.slice(0, 3).map((mat, mIdx) => (
                          <span
                            key={mIdx}
                            className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 rounded"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Pricing & CTA ── */}
                  <div className="pt-3 border-t border-zinc-850">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                          B2B Wholesale
                        </div>
                        <div className="text-base font-bold text-amber-400 font-mono">
                          ${primaryWholesaleTier?.unitPriceUsd ?? product.wholesalePrice ?? product.retailPrice}
                          <span className="text-xs font-normal text-zinc-500 ml-1">/ unit</span>
                        </div>
                      </div>

                      {product.retailPrice > 0 && (
                        <div className="text-right">
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
                            Retail MSRP
                          </div>
                          <div className="text-xs text-zinc-400 line-through font-mono">
                            ${product.retailPrice}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onSelectProduct && onSelectProduct(product)}
                        className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded border border-zinc-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => {
                          if (typeof (window as any).openTechPackPOEngine === 'function') {
                            (window as any).openTechPackPOEngine({
                              productId: product.id,
                              productTitle: product.title,
                              sku: product.sku,
                              moq: product.moq
                            });
                          } else if (onSelectProduct) {
                            onSelectProduct(product);
                          }
                        }}
                        className="w-full py-1.5 px-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>RFQ</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CatalogGrid;
