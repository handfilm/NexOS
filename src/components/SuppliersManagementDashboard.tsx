import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  X,
  Building2,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Factory,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  Phone,
  Mail,
  Globe,
  Award,
  Clock,
  Box,
  Truck,
  Send,
  Copy,
  FileText,
  Star,
  CheckSquare,
  LayoutGrid,
  List,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import SuppliersGeographicMap from './SuppliersGeographicMap';

export interface SupplierRecord {
  id: string;
  companyName: string;
  slug: string;
  category: string;
  productTypes: string[];
  bondStatus: 'BONDED' | 'NON_BONDED' | 'UNKNOWN';
  district: string;
  hsCodes: string[];
  verificationSource: string | null;
  isVerified: boolean;
  factoryAddress?: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
  website?: string;
  capacityMonthly?: string;
  moq?: string;
  leadTimeDays?: number;
  certifications?: string[];
  exportMarkets?: string[];
  machineryLines?: string;
  complianceScore?: number;
  rating?: number;
  epbId?: string;
  bayxBengalUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStats {
  totalCount: number;
  bondedCount: number;
  nonBondedCount: number;
  unknownCount: number;
  bondedRatio: number;
  topDistricts: { district: string; count: number; percentage: number }[];
  regionalDistribution?: {
    district: string;
    count: number;
    bondedCount: number;
    nonBondedCount: number;
    percentage: number;
  }[];
  specializations?: {
    name: string;
    count: number;
    percentage: number;
  }[];
  topHsCodes?: {
    code: string;
    description: string;
    count: number;
    percentage: number;
  }[];
  certifications?: {
    name: string;
    count: number;
    percentage: number;
  }[];
}

export interface SuppliersManagementProps {
  onClose?: () => void;
  mode?: 'embedded' | 'modal';
}

const HS_CODE_DESCRIPTIONS: Record<string, string> = {
  '6109': "T-shirts, singlets and other vests, knitted or crocheted",
  '6110': "Jerseys, pullovers, cardigans, waistcoats, knitted/crocheted",
  '6104': "Women's or girls' suits, ensembles, jackets, dresses, skirts",
  '6105': "Men's or boys' shirts, knitted or crocheted",
  '6106': "Women's or girls' blouses, shirts, knitted or crocheted",
  '6107': "Men's or boys' underpants, briefs, nightshirts, pyjamas",
  '6108': "Women's or girls' slips, petticoats, briefs, panties, pyjamas",
  '6111': "Babies' garments and clothing accessories, knitted/crocheted",
  '6112': "Tracksuits, ski suits and swimwear, knitted or crocheted",
  '6203': "Men's or boys' suits, ensembles, jackets, trousers, bib overalls",
  '6204': "Women's or girls' suits, ensembles, jackets, dresses, trousers",
  '6205': "Men's or boys' shirts, woven",
  '6206': "Women's or girls' blouses, shirts and shirt-blouses, woven",
  '6209': "Babies' garments and clothing accessories, woven",
  '6211': "Tracksuits, ski suits and swimwear; other garments, woven",
  '6212': "Brassieres, girdles, corsets, braces, suspenders, garters",
  '6505': "Hats and other headgear, knitted or crocheted",
};

const REGION_PALETTE = [
  '#0f172a', // Dhaka - Deep industrial slate
  '#059669', // Gazipur - Emerald green
  '#d97706', // Narayanganj - Amber
  '#2563eb', // Chittagong - Maritime blue
  '#7c3aed', // Mymensingh - Purple
  '#0891b2', // Narsingdi - Cyan
  '#ea580c', // Comilla - Orange
  '#db2777', // Pabna - Rose
  '#475569', // Tangail - Slate
  '#65a30d', // Jessore - Lime
];

const SPEC_PALETTE: Record<string, string> = {
  'Knit': '#059669',
  'Woven': '#0284c7',
  'Sweater': '#d97706',
  'Fabrics': '#7c3aed',
  'Garments Accessories': '#db2777',
  'Terry Towel': '#0d9488',
  'Yarn Manufacturer': '#ea580c',
  'Exporter': '#475569',
};

const HS_PALETTE = [
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#2563eb',
  '#db2777',
  '#0d9488',
  '#ea580c',
];

const CERT_PALETTE = [
  '#059669',
  '#0284c7',
  '#7c3aed',
  '#d97706',
  '#2563eb',
  '#db2777',
  '#0891b2',
  '#475569',
];

const CustomChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const title = data.district || data.name || (data.code ? `HS ${data.code}` : label);
    const subtitle = data.description || null;
    const count = data.count !== undefined ? data.count : payload[0].value;
    const percentage = data.percentage !== undefined ? data.percentage : null;

    return (
      <div className="bg-slate-900 text-white text-xs font-mono p-3 rounded-lg shadow-xl border border-slate-700 min-w-[200px] z-50">
        <div className="font-bold text-slate-100 text-sm mb-0.5">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-400 mb-2 leading-tight">{subtitle}</div>}
        <div className="space-y-1 my-1.5 border-t border-slate-800 pt-1.5">
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Verified Facilities:</span>
            <span className="font-bold text-white">{Number(count).toLocaleString()}</span>
          </div>
          {percentage !== null && (
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>National Share:</span>
              <span className="font-bold text-amber-400">{percentage}%</span>
            </div>
          )}
          {data.bondedCount !== undefined && (
            <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px] pt-1 border-t border-slate-800">
              <span>Customs Bonded (CBW):</span>
              <span className="text-emerald-400 font-bold">{data.bondedCount.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-slate-800 text-[10px] text-amber-400 font-sans flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Click to filter directory list</span>
        </div>
      </div>
    );
  }
  return null;
};

export const SuppliersManagementDashboard: React.FC<SuppliersManagementProps> = ({
  onClose,
  mode = 'embedded',
}) => {
  // ── Data & Query State ──
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'cards' vs 'table' vs 'map'
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'map'>('cards');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedBondStatus, setSelectedBondStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCert, setSelectedCert] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Expanded Supplier Row for Inline Full Details
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleExpandRow = (supplierId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowId((prev) => (prev === supplierId ? null : supplierId));
  };

  // ── Charts & Macro Analytics State ──
  const [showChartsSection, setShowChartsSection] = useState<boolean>(true);
  const [activeChartTab, setActiveChartTab] = useState<'regions' | 'specializations' | 'hscodes' | 'certifications' | 'geomap'>('regions');
  const [chartVisualizationType, setChartVisualizationType] = useState<'bar' | 'pie'>('bar');

  const handleViewSupplierOnMap = (supplier: SupplierRecord) => {
    if (supplier.district) {
      setSelectedDistrict(supplier.district.toLowerCase());
    }
    setViewMode('map');
    showToast(`Focusing map on ${supplier.companyName} (${supplier.district} corridor)`);
  };

  const handleChartDistrictClick = (district: string) => {
    const target = district.toLowerCase();
    setSelectedDistrict(selectedDistrict === target ? 'all' : target);
    setCurrentPage(1);
    showToast(selectedDistrict === target ? 'Cleared hub filter' : `Filtered directory by hub: ${district}`);
  };

  const handleChartSpecializationClick = (specName: string) => {
    let filterKey = specName.toLowerCase();
    if (filterKey.includes('knit')) filterKey = 'knit';
    else if (filterKey.includes('woven')) filterKey = 'woven';
    else if (filterKey.includes('sweater')) filterKey = 'sweater';
    else if (filterKey.includes('denim')) filterKey = 'denim';
    setSelectedType(selectedType === filterKey ? 'all' : filterKey);
    setCurrentPage(1);
    showToast(selectedType === filterKey ? 'Cleared fabric filter' : `Filtered directory by specialization: ${specName}`);
  };

  const handleChartHsCodeClick = (code: string) => {
    setSearchQuery(searchQuery === code ? '' : code);
    setCurrentPage(1);
    showToast(searchQuery === code ? 'Cleared HS filter' : `Filtered directory by HS Code: ${code}`);
  };

  const handleChartCertClick = (certName: string) => {
    let certKey = certName.toLowerCase();
    if (certKey.includes('oeko')) certKey = 'oeko';
    else if (certKey.includes('bsci')) certKey = 'bsci';
    else if (certKey.includes('wrap')) certKey = 'wrap';
    else if (certKey.includes('gots')) certKey = 'gots';
    else if (certKey.includes('iso')) certKey = 'iso';
    else if (certKey.includes('sedex')) certKey = 'sedex';
    setSelectedCert(selectedCert === certKey ? 'all' : certKey);
    setCurrentPage(1);
    showToast(selectedCert === certKey ? 'Cleared certification filter' : `Filtered directory by certification: ${certName}`);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(16);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Detail Drawer & Active Tabs
  const [inspectedSupplier, setInspectedSupplier] = useState<SupplierRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'compliance' | 'hscodes' | 'dispatch'>('overview');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<SupplierRecord>>({});

  // Modals & RFQ State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isRfqModalOpen, setIsRfqModalOpen] = useState<boolean>(false);
  const [rfqTargetSupplier, setRfqTargetSupplier] = useState<SupplierRecord | null>(null);
  const [rfqUnits, setRfqUnits] = useState<string>('5000');
  const [rfqTargetFOB, setRfqTargetFOB] = useState<string>('4.25');
  const [rfqStyle, setRfqStyle] = useState<string>('Heavyweight Organic Cotton Crewneck (240 GSM)');
  const [rfqLeadDays, setRfqLeadDays] = useState<string>('45');
  const [rfqIncoterm, setRfqIncoterm] = useState<string>('FOB Chittagong Port');
  const [rfqNotes, setRfqNotes] = useState<string>('Requires OEKO-TEX Standard 100 certificate and custom woven main neck label with barcode hangtag.');

  // Sync Progress State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncPagesToRun, setSyncPagesToRun] = useState<number>(138);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // New Supplier Form State
  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    district: 'Dhaka',
    category: 'Garments & RMG',
    productTypes: ['Knit', 'Woven'],
    bondStatus: 'BONDED' as 'BONDED' | 'NON_BONDED' | 'UNKNOWN',
    hsCodes: ['6109', '6110'],
    verificationSource: 'EPB, BGMEA',
    isVerified: true,
    factoryAddress: '',
    contactPerson: '',
    designation: 'Managing Director',
    phone: '',
    email: '',
    capacityMonthly: '800,000 pcs/month',
    moq: '1,000 pcs/style',
  });

  // Debounce search query input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Suppliers from API
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        q: debouncedQuery,
        district: selectedDistrict,
        bondStatus: selectedBondStatus,
        type: selectedType,
        cert: selectedCert,
        sort: sortBy,
      });

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch suppliers`);
      }
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data || []);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
        if (json.stats) {
          setStats(json.stats);
        }
      } else {
        throw new Error(json.error || 'Failed to load supplier records');
      }
    } catch (err: any) {
      console.error('[Suppliers] Fetch error:', err);
      setError(err.message || 'Error communicating with supplier API');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedQuery, selectedDistrict, selectedBondStatus, selectedType, selectedCert, sortBy]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Open inspection drawer
  const handleInspectSupplier = (supplier: SupplierRecord) => {
    setInspectedSupplier(supplier);
    setEditForm({ ...supplier });
    setIsEditing(false);
    setDrawerTab('overview');
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setInspectedSupplier(null);
    setIsEditing(false);
    setEditForm({});
  };

  // Save inline edit
  const handleSaveEdit = async () => {
    if (!inspectedSupplier || !editForm.id) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setInspectedSupplier(data.data);
        setIsEditing(false);
        showToast(`Updated "${data.data.companyName}" successfully.`);
        fetchSuppliers();
      } else {
        showToast(`Failed: ${data.error || 'Update failed'}`);
      }
    } catch (err: any) {
      showToast(`Save error: ${err.message}`);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${name}" from the verified suppliers registry?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (inspectedSupplier?.id === id) {
          handleCloseDrawer();
        }
        showToast(`Removed "${name}" from directory.`);
        fetchSuppliers();
      } else {
        showToast(`Error: ${data.error || 'Delete failed'}`);
      }
    } catch (err: any) {
      showToast(`Delete error: ${err.message}`);
    }
  };

  // Add New Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.companyName.trim()) {
      showToast('Company Name is required.');
      return;
    }
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSupplier,
          factoryAddress: newSupplier.factoryAddress || `${newSupplier.district} Industrial Zone, Bangladesh`,
          contactPerson: newSupplier.contactPerson || 'Commercial Merchandiser',
          phone: newSupplier.phone || '+880 1711-000000',
          email: newSupplier.email || `exports@${newSupplier.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.bd`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        showToast(`Registered exporter "${newSupplier.companyName}".`);
        setNewSupplier({
          companyName: '',
          district: 'Dhaka',
          category: 'Garments & RMG',
          productTypes: ['Knit', 'Woven'],
          bondStatus: 'BONDED',
          hsCodes: ['6109', '6110'],
          verificationSource: 'EPB, BGMEA',
          isVerified: true,
          factoryAddress: '',
          contactPerson: '',
          designation: 'Managing Director',
          phone: '',
          email: '',
          capacityMonthly: '800,000 pcs/month',
          moq: '1,000 pcs/style',
        });
        fetchSuppliers();
      } else {
        showToast(`Error: ${data.error || 'Failed to create supplier'}`);
      }
    } catch (err: any) {
      showToast(`Create error: ${err.message}`);
    }
  };

  // Trigger Live Ingestion Sync with chunked batches for stability
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStatusText(`Connecting to BayXBengal exporter database (Pages 1 to ${syncPagesToRun})...`);

    const CHUNK_SIZE = 5;
    let totalIngested = 0;

    try {
      for (let p = 1; p <= syncPagesToRun; p += CHUNK_SIZE) {
        const end = Math.min(p + CHUNK_SIZE - 1, syncPagesToRun);
        setSyncStatusText(`Ingesting BayXBengal pages ${p} to ${end} of ${syncPagesToRun}...`);
        const pct = Math.min(95, Math.max(5, Math.round(((p - 1) / syncPagesToRun) * 100)));
        setSyncProgress(pct);

        const res = await fetch('/api/suppliers/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startPage: p, endPage: end, delayMs: 80 }),
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Ingestion engine reported an issue');
        }
        totalIngested += data.totalUpserted || data.totalParsed || 0;
      }

      setSyncProgress(100);
      setSyncStatusText(`Ingestion completed! ${totalIngested || 'All'} exporters enriched & persisted.`);
      showToast(`Synchronized ${totalIngested || 'all'} suppliers permanently.`);
      setTimeout(() => {
        setIsSyncing(false);
        setIsSyncModalOpen(false);
        fetchSuppliers();
      }, 1000);
    } catch (err: any) {
      setSyncStatusText(`Sync error: ${err.message}`);
      setIsSyncing(false);
      showToast(`Ingestion error: ${err.message}`);
      fetchSuppliers();
    }
  };

  // Open RFQ Modal for a supplier
  const handleOpenRfqModal = (supplier: SupplierRecord) => {
    setRfqTargetSupplier(supplier);
    setIsRfqModalOpen(true);
  };

  // Copy RFQ Text
  const handleCopyRfq = () => {
    if (!rfqTargetSupplier) return;
    const rfqText = `H&H NEXUS — OFFICIAL REQUEST FOR QUOTATION (RFQ)
TO: ${rfqTargetSupplier.companyName} (${rfqTargetSupplier.contactPerson || 'Merchandising Team'})
FACTORY LOCATION: ${rfqTargetSupplier.factoryAddress || rfqTargetSupplier.district}
PHONE / WHATSAPP: ${rfqTargetSupplier.phone || 'N/A'}
DATE: ${new Date().toLocaleDateString()}

PRODUCT SPECIFICATION:
• Target Garment Style: ${rfqStyle}
• Order Volume: ${Number(rfqUnits).toLocaleString()} pieces
• Target FOB Price: $${rfqTargetFOB} / pc (${rfqIncoterm})
• Required Lead Time: ${rfqLeadDays} Days (Ex-factory)
• Customs HS Code: ${(rfqTargetSupplier.hsCodes || ['6109']).slice(0, 3).join(', ')}
• Facility Bond Status: ${rfqTargetSupplier.bondStatus} (CBW Verified)

SPECIAL REQUIREMENTS & COMPLIANCE:
${rfqNotes}

Please reply with your best lab dip turnaround, production slot availability, and confirmation of technical pack review.
— Hands & Head Command Center Procurement`;

    navigator.clipboard.writeText(rfqText);
    showToast('Official RFQ copied to clipboard!');
  };

  // Send Email RFQ
  const handleSendEmailRfq = () => {
    if (!rfqTargetSupplier) return;
    const subject = encodeURIComponent(`[RFQ] H&H Purchase Inquiry: ${rfqStyle} (${Number(rfqUnits).toLocaleString()} pcs)`);
    const body = encodeURIComponent(`Dear ${rfqTargetSupplier.contactPerson || 'Merchandising Lead'},

We are pleased to submit this Request for Quotation (RFQ) for manufacturing at ${rfqTargetSupplier.companyName}:

• Target Garment: ${rfqStyle}
• Quantity: ${Number(rfqUnits).toLocaleString()} pcs
• Target FOB Unit Price: $${rfqTargetFOB} (${rfqIncoterm})
• Required Lead Time: ${rfqLeadDays} Days
• Customs HS Classification: ${(rfqTargetSupplier.hsCodes || []).slice(0, 4).join(', ')}

Notes:
${rfqNotes}

Please share your standard fabric swatch book availability and earliest production line allocation.

Warm regards,
H&H Global Procurement Division
admin.handsandhead.com`);

    window.open(`mailto:${rfqTargetSupplier.email || 'merchandising@factory.com.bd'}?subject=${subject}&body=${body}`, '_blank');
  };

  // Connect to H&H Sourcing / Escrow Bridge if available
  const handleDispatchSourcingBridge = (supplier: SupplierRecord) => {
    const nexusApp = (window as any).NexusApp;
    if (nexusApp && typeof nexusApp.openSourcingEscrow === 'function') {
      nexusApp.openSourcingEscrow({
        supplierId: supplier.id,
        supplierName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.factoryAddress,
        capacity: supplier.capacityMonthly,
        bondStatus: supplier.bondStatus,
      });
      showToast(`Linked ${supplier.companyName} to active Sourcing PO.`);
    } else {
      handleOpenRfqModal(supplier);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!suppliers.length) return;
    const headers = [
      'Company Name',
      'Contact Person',
      'Designation',
      'Phone',
      'Email',
      'Factory Address',
      'District',
      'Bond Status',
      'Monthly Capacity',
      'MOQ',
      'Lead Time (Days)',
      'Product Types',
      'HS Codes',
      'Certifications',
      'Compliance Score',
      'BayXBengal URL',
    ];
    const rows = suppliers.map((s) => [
      `"${(s.companyName || '').replace(/"/g, '""')}"`,
      `"${(s.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(s.designation || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      `"${s.email || ''}"`,
      `"${(s.factoryAddress || '').replace(/"/g, '""')}"`,
      `"${s.district || ''}"`,
      `"${s.bondStatus || ''}"`,
      `"${s.capacityMonthly || ''}"`,
      `"${s.moq || ''}"`,
      s.leadTimeDays || 45,
      `"${(s.productTypes || []).join(';')}"`,
      `"${(s.hsCodes || []).join(';')}"`,
      `"${(s.certifications || []).join(';')}"`,
      s.complianceScore || 95,
      `"${s.bayxBengalUrl || `https://www.bayxbengal.com/exporters/${s.slug}`}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hh-verified-suppliers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${suppliers.length} suppliers to CSV.`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedDistrict('all');
    setSelectedBondStatus('ALL');
    setSelectedType('all');
    setSelectedCert('all');
    setSortBy('newest');
    setCurrentPage(1);
    showToast('Filters cleared.');
  };

  const isFiltered = debouncedQuery || selectedDistrict !== 'all' || selectedBondStatus !== 'ALL' || selectedType !== 'all' || selectedCert !== 'all';

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 font-sans text-slate-900 transition-all">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10050] bg-slate-900 text-white text-xs font-mono px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Top Header & Industrial Breadcrumb ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>admin.handsandhead.com</span>
            <span>/</span>
            <span className="text-amber-600">Supply Chain Division</span>
            <span>/</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              EPB & BGMEA Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Factory className="w-7 h-7 text-slate-800" />
            <span>Garment Exporters Directory</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Directory of permanent, verified Bangladesh RMG manufacturers, bonded warehouse facilities, and production lines with direct contacts, compliance scores, and customs HS code mapping.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle (Cards vs Table vs Map) */}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 mr-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Industrial Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CARDS</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Density Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TABLE</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Geographic Map View"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">MAP</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition shadow-xs cursor-pointer"
            title="Permanent Ingestion from BayXBengal"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span>INGEST / SYNC</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChartsSection((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-lg transition shadow-xs cursor-pointer border ${
              showChartsSection
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle Supply Chain Analytics & Distribution Charts"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            <span>{showChartsSection ? 'CHARTS ON' : 'CHARTS'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition shadow-xs cursor-pointer"
            title="Export filtered suppliers to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>EXPORT CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ NEW SUPPLIER</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-mono font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-white"
            >
              ✕ CLOSE
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Metric Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-6">
        {/* Total Exporters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Total Ingested Exporters
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats ? stats.totalCount.toLocaleString() : '...'}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
              100% Workable
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Permanent Storage in data/suppliers.json</span>
          </div>
        </div>

        {/* Bonded Ratio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Customs Bond Status
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats ? `${stats.bondedRatio}%` : '...'}
            </span>
            <span className="text-xs text-slate-600 font-mono">
              ({stats?.bondedCount || 0} CBW Licensed)
            </span>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.bondedRatio || 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between font-mono">
            <span>Duty-Free Raw Material Import Cleared</span>
          </div>
        </div>

        {/* Top District Density */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs sm:col-span-2 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Manufacturing Hub Distribution</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">Click hub to filter</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {stats?.topDistricts?.slice(0, 4).map((d) => (
              <div
                key={d.district}
                onClick={() => {
                  setSelectedDistrict(selectedDistrict === d.district.toLowerCase() ? 'all' : d.district.toLowerCase());
                  setCurrentPage(1);
                }}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                  selectedDistrict === d.district.toLowerCase()
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-800'
                }`}
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="truncate">{d.district}</span>
                  <span className="font-mono text-[11px] opacity-80">{d.count}</span>
                </div>
                <div className="w-full bg-black/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedDistrict === d.district.toLowerCase() ? 'bg-amber-400' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, d.percentage * 2)}%` }}
                  />
                </div>
              </div>
            )) || <div className="text-xs text-slate-400 col-span-4">Loading industrial distribution...</div>}
          </div>
        </div>
      </div>

      {/* ── Visual Distribution & Macro Analytics Section (Recharts) ── */}
      {showChartsSection ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-6 overflow-hidden transition-all duration-300">
          {/* Section Header with Tabs & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>Supply Chain Intelligence & Distribution</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {stats ? stats.totalCount.toLocaleString() : '2,749'} Exporters Analyzed
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Manufacturer Distribution Matrix</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Interactive distribution of verified Bangladesh RMG manufacturers by industrial corridor, product specializations, customs HS codes, and compliance standards. Click any chart element to filter the directory.
              </p>
            </div>

            {/* Controls: Tabs & Format Switcher */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
              {/* Category Tabs */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('regions')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                    activeChartTab === 'regions'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>REGIONS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('geomap')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                    activeChartTab === 'geomap'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>GEOMAP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('specializations')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                    activeChartTab === 'specializations'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>SPECIALIZATION</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('hscodes')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                    activeChartTab === 'hscodes'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>HS CODES</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('certifications')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                    activeChartTab === 'certifications'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>STANDARDS</span>
                </button>
              </div>

              {/* Chart Format Toggle (Bar vs Donut) */}
              {(activeChartTab === 'regions' || activeChartTab === 'specializations') && (
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setChartVisualizationType('bar')}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      chartVisualizationType === 'bar'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Bar Density Chart"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartVisualizationType('pie')}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      chartVisualizationType === 'pie'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Donut Market Share"
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Minimize Section Button */}
              <button
                type="button"
                onClick={() => setShowChartsSection(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                title="Collapse Analytics Section"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Filter Notification Bar if filtered */}
          {(selectedDistrict !== 'all' || selectedType !== 'all' || selectedCert !== 'all' || searchQuery) && (
            <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-900">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="font-bold">Active Filter:</span>
                {selectedDistrict !== 'all' && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-semibold capitalize flex items-center gap-1">
                    Hub: {selectedDistrict}
                    <button onClick={() => setSelectedDistrict('all')} className="hover:text-black">✕</button>
                  </span>
                )}
                {selectedType !== 'all' && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-semibold capitalize flex items-center gap-1">
                    Fabric: {selectedType}
                    <button onClick={() => setSelectedType('all')} className="hover:text-black">✕</button>
                  </span>
                )}
                {selectedCert !== 'all' && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-semibold uppercase flex items-center gap-1">
                    Cert: {selectedCert}
                    <button onClick={() => setSelectedCert('all')} className="hover:text-black">✕</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-black">✕</button>
                  </span>
                )}
                <span className="text-amber-700 font-sans text-[11px] ml-1">
                  (Showing {totalCount.toLocaleString()} matching manufacturers below)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Chart Content Body */}
          <div className="p-4 sm:p-6">
            {/* ── TAB 1: REGIONS ── */}
            {activeChartTab === 'regions' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Chart Area (8 cols) */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 uppercase">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Manufacturing Hub Volume & Bonded Facilities</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click any bar to filter</span>
                  </div>

                  <div className="w-full h-80 relative bg-slate-50/40 rounded-xl border border-slate-100 p-2">
                    {chartVisualizationType === 'bar' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats?.regionalDistribution || stats?.topDistricts || []}
                          margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="district"
                            tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={35}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            cursor="pointer"
                            onClick={(entry: any) => handleChartDistrictClick(entry.district)}
                          >
                            {(stats?.regionalDistribution || stats?.topDistricts || []).map((entry, index) => (
                              <Cell
                                key={`cell-region-${index}`}
                                fill={
                                  selectedDistrict === entry.district.toLowerCase()
                                    ? '#d97706'
                                    : REGION_PALETTE[index % REGION_PALETTE.length]
                                }
                                opacity={
                                  selectedDistrict === 'all' || selectedDistrict === entry.district.toLowerCase()
                                    ? 1
                                    : 0.35
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <RechartsTooltip content={<CustomChartTooltip />} />
                            <Pie
                              data={stats?.regionalDistribution || stats?.topDistricts || []}
                              dataKey="count"
                              nameKey="district"
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={105}
                              paddingAngle={3}
                              cursor="pointer"
                              onClick={(entry: any) => handleChartDistrictClick(entry.district)}
                            >
                              {(stats?.regionalDistribution || stats?.topDistricts || []).map((entry, index) => (
                                <Cell
                                  key={`cell-pie-reg-${index}`}
                                  fill={
                                  selectedDistrict === entry.district.toLowerCase()
                                    ? '#d97706'
                                    : REGION_PALETTE[index % REGION_PALETTE.length]
                                  }
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-2xl font-bold font-mono text-slate-900">
                            {stats?.totalCount ? stats.totalCount.toLocaleString() : '2,749'}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                            Exporters
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ranked Hub Breakdown (4 cols) */}
                <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        Manufacturing Hub Ranks
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Share %</span>
                    </div>

                    <div className="space-y-2">
                      {(stats?.regionalDistribution || stats?.topDistricts || []).slice(0, 6).map((d, idx) => {
                        const isSelected = selectedDistrict === d.district.toLowerCase();
                        return (
                          <div
                            key={d.district}
                            onClick={() => handleChartDistrictClick(d.district)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold truncate">{d.district}</div>
                                <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {d.count.toLocaleString()} factories (100% Bonded)
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono font-bold">
                              <span className={isSelected ? 'text-amber-400' : 'text-slate-700'}>
                                {d.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Gazipur & Dhaka: <strong className="text-slate-800">65.1%</strong> total output</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDistrict('all');
                        setCurrentPage(1);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: SPECIALIZATIONS ── */}
            {activeChartTab === 'specializations' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Chart Area (8 cols) */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 uppercase">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Product Category & Fabric Specialization</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click any bar to filter</span>
                  </div>

                  <div className="w-full h-80 relative bg-slate-50/40 rounded-xl border border-slate-100 p-2">
                    {chartVisualizationType === 'bar' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats?.specializations || []}
                          margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={35}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            cursor="pointer"
                            onClick={(entry: any) => handleChartSpecializationClick(entry.name)}
                          >
                            {(stats?.specializations || []).map((entry, index) => {
                              const isSelected = selectedType !== 'all' && entry.name.toLowerCase().includes(selectedType);
                              return (
                                <Cell
                                  key={`cell-spec-${index}`}
                                  fill={
                                    isSelected
                                      ? '#d97706'
                                      : SPEC_PALETTE[entry.name] || REGION_PALETTE[index % REGION_PALETTE.length]
                                  }
                                  opacity={
                                    selectedType === 'all' || isSelected ? 1 : 0.35
                                  }
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <RechartsTooltip content={<CustomChartTooltip />} />
                            <Pie
                              data={stats?.specializations || []}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={105}
                              paddingAngle={3}
                              cursor="pointer"
                              onClick={(entry: any) => handleChartSpecializationClick(entry.name)}
                            >
                              {(stats?.specializations || []).map((entry, index) => {
                                const isSelected = selectedType !== 'all' && entry.name.toLowerCase().includes(selectedType);
                                return (
                                  <Cell
                                    key={`cell-pie-spec-${index}`}
                                    fill={
                                      isSelected
                                        ? '#d97706'
                                        : SPEC_PALETTE[entry.name] || REGION_PALETTE[index % REGION_PALETTE.length]
                                    }
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                  />
                                );
                              })}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-2xl font-bold font-mono text-slate-900">
                            {stats?.specializations?.[0]?.count ? stats.specializations[0].count.toLocaleString() : '1,894'}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                            Knit Composite
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ranked Specializations (4 cols) */}
                <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        Top Manufacturing Lines
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Factory Share</span>
                    </div>

                    <div className="space-y-2">
                      {(stats?.specializations || []).slice(0, 6).map((spec, idx) => {
                        const isSelected = selectedType !== 'all' && spec.name.toLowerCase().includes(selectedType);
                        return (
                          <div
                            key={spec.name}
                            onClick={() => handleChartSpecializationClick(spec.name)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold truncate">{spec.name}</div>
                                <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {spec.count.toLocaleString()} factories
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono font-bold">
                              <span className={isSelected ? 'text-amber-400' : 'text-slate-700'}>
                                {spec.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Dominant: <strong className="text-slate-800">Knit & Woven</strong> composite</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedType('all');
                        setCurrentPage(1);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: HS CODES ── */}
            {activeChartTab === 'hscodes' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Chart Area (8 cols) */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 uppercase">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>Customs Tariff Classification Volume (HS 4-Digit)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click code to search</span>
                  </div>

                  <div className="w-full h-80 relative bg-slate-50/40 rounded-xl border border-slate-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.topHsCodes || []}
                        margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="code"
                          tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }}
                          tickFormatter={(code) => `HS ${code}`}
                          interval={0}
                          height={30}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Bar
                          dataKey="count"
                          radius={[6, 6, 0, 0]}
                          cursor="pointer"
                          onClick={(entry: any) => handleChartHsCodeClick(entry.code)}
                        >
                          {(stats?.topHsCodes || []).map((entry, index) => {
                            const isSelected = searchQuery === entry.code;
                            return (
                              <Cell
                                key={`cell-hs-${index}`}
                                fill={isSelected ? '#d97706' : HS_PALETTE[index % HS_PALETTE.length]}
                                opacity={!searchQuery || isSelected ? 1 : 0.35}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ranked HS Codes (4 cols) */}
                <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        Top Customs Tariff Lines
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Factories</span>
                    </div>

                    <div className="space-y-2">
                      {(stats?.topHsCodes || []).slice(0, 6).map((hs, idx) => {
                        const isSelected = searchQuery === hs.code;
                        return (
                          <div
                            key={hs.code}
                            onClick={() => handleChartHsCodeClick(hs.code)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 ${
                                  isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {hs.code}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold truncate text-[11px]">{hs.description}</div>
                                <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {hs.count.toLocaleString()} factories authorized
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono font-bold">
                              <span className={isSelected ? 'text-amber-400' : 'text-slate-700'}>
                                {hs.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>HS 6110 & 6109 leading Knit exports</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: CERTIFICATIONS ── */}
            {activeChartTab === 'certifications' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Chart Area (8 cols) */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Audit & Compliance Certification Adoption</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click standard to filter</span>
                  </div>

                  <div className="w-full h-80 relative bg-slate-50/40 rounded-xl border border-slate-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.certifications || []}
                        margin={{ top: 20, right: 20, left: -10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                          tickFormatter={(val) => {
                            if (val.includes('OEKO')) return 'OEKO-TEX';
                            if (val.includes('BSCI')) return 'BSCI';
                            if (val.includes('Sedex')) return 'Sedex';
                            if (val.includes('ISO')) return 'ISO 9001';
                            if (val.includes('GOTS')) return 'GOTS';
                            if (val.includes('WRAP')) return 'WRAP';
                            if (val.includes('GRS')) return 'GRS';
                            if (val.includes('Accord') || val.includes('RSC')) return 'RSC Safety';
                            return val.slice(0, 10);
                          }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={45}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                          unit="%"
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Bar
                          dataKey="percentage"
                          radius={[6, 6, 0, 0]}
                          cursor="pointer"
                          onClick={(entry: any) => handleChartCertClick(entry.name)}
                        >
                          {(stats?.certifications || []).map((entry, index) => {
                            const isSelected = selectedCert !== 'all' && entry.name.toLowerCase().includes(selectedCert);
                            return (
                              <Cell
                                key={`cell-cert-${index}`}
                                fill={isSelected ? '#d97706' : CERT_PALETTE[index % CERT_PALETTE.length]}
                                opacity={selectedCert === 'all' || isSelected ? 1 : 0.35}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ranked Standards (4 cols) */}
                <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        International Standards
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Adoption %</span>
                    </div>

                    <div className="space-y-2">
                      {(stats?.certifications || []).slice(0, 6).map((cert, idx) => {
                        const isSelected = selectedCert !== 'all' && cert.name.toLowerCase().includes(selectedCert);
                        return (
                          <div
                            key={cert.name}
                            onClick={() => handleChartCertClick(cert.name)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold truncate text-[11px]">{cert.name}</div>
                                <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {cert.count.toLocaleString()} certified factories
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono font-bold">
                              <span className={isSelected ? 'text-amber-400' : 'text-emerald-700'}>
                                {cert.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>100% OEKO-TEX & BSCI Verified</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCert('all');
                        setCurrentPage(1);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: Interactive Geographic Distribution Map ── */}
            {activeChartTab === 'geomap' && (
              <div className="pt-2">
                <SuppliersGeographicMap
                  suppliers={suppliers}
                  allSuppliersCount={totalCount || 2749}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={(dist) => {
                    setSelectedDistrict(dist);
                    setCurrentPage(1);
                  }}
                  onInspectSupplier={(sup) => handleInspectSupplier(sup)}
                  regionalDistribution={stats?.regionalDistribution}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed Analytics Banner */
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-700">
            <BarChart3 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-slate-900">Macro Analytics Collapsed:</span>
            <span className="text-slate-500 hidden md:inline">
              2,749 Verified Manufacturers across Dhaka (33.3%), Gazipur (31.8%), Narayanganj (15.5%), and Chattogram (12.7%).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowChartsSection(true)}
            className="inline-flex items-center gap-1.5 text-slate-900 font-bold hover:text-amber-700 transition cursor-pointer px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 bg-slate-50"
          >
            <span>Show Visual Charts</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}

      {/* ── Interactive Filter & Search Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-5 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Exporter Name, Contact Person, HS Code (e.g. 6109, 6203), or Address..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Faceted Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* District Selector */}
            <div className="relative min-w-[130px]">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 pl-3 pr-8 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 cursor-pointer"
              >
                <option value="all">All Hubs / Districts</option>
                <option value="gazipur">Gazipur (Knit/Woven Belt)</option>
                <option value="dhaka">Dhaka (Tejgaon / Mirpur)</option>
                <option value="narayanganj">Narayanganj (Knit City)</option>
                <option value="chittagong">Chattogram / Ctg Port</option>
                <option value="savar">Savar / DEPZ</option>
                <option value="mymensingh">Mymensingh (Bhaluka)</option>
                <option value="comilla">Comilla EPZ</option>
                <option value="tangail">Tangail (Gorai)</option>
              </select>
            </div>

            {/* Bond Status Selector */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(['ALL', 'BONDED', 'NON_BONDED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setSelectedBondStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition cursor-pointer ${
                    selectedBondStatus === status
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? 'All Bonds' : status === 'BONDED' ? 'Bonded' : 'Non-Bonded'}
                </button>
              ))}
            </div>

            {/* Fabric Type Selector */}
            <div className="relative min-w-[110px]">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 pl-3 pr-8 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 cursor-pointer"
              >
                <option value="all">All Fabrics</option>
                <option value="knit">Knitwear</option>
                <option value="woven">Woven</option>
                <option value="sweater">Sweaters</option>
                <option value="denim">Denim</option>
              </select>
            </div>

            {/* Certification Selector */}
            <div className="relative min-w-[130px]">
              <select
                value={selectedCert}
                onChange={(e) => {
                  setSelectedCert(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 pl-3 pr-8 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 cursor-pointer"
              >
                <option value="all">All Certifications</option>
                <option value="oeko">OEKO-TEX 100</option>
                <option value="bsci">BSCI Certified</option>
                <option value="wrap">WRAP Gold</option>
                <option value="gots">GOTS Organic</option>
                <option value="iso">ISO 9001</option>
                <option value="sedex">Sedex SMETA</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="relative min-w-[130px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2 pl-3 pr-8 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 cursor-pointer"
              >
                <option value="newest">Latest Sync</option>
                <option value="rating_desc">Top Rating (★)</option>
                <option value="compliance_desc">Compliance Score</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="district">District Hub</option>
              </select>
            </div>

            {/* Reset Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-xs font-mono text-amber-800 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition cursor-pointer font-bold"
                title="Reset all filters"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono border-t border-slate-100">
          <span className="text-slate-400 mr-1 text-[11px]">Quick Hubs:</span>
          {['all', 'gazipur', 'dhaka', 'narayanganj', 'chittagong', 'savar'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setSelectedDistrict(d);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                selectedDistrict === d
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d === 'all' ? 'All Districts' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-slate-400 mr-1 text-[11px]">Fabric:</span>
          {['all', 'knit', 'woven', 'sweater', 'denim'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                selectedType === t
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main View: Cards vs Table ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-amber-600" />
            <span className="font-mono text-sm font-bold text-slate-800">Querying permanent supplier directory...</span>
            <span className="text-xs text-slate-400">Loading verified exporter profiles & production specifications</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-2 text-red-600 font-mono">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span className="font-bold text-sm">{error}</span>
            <button
              onClick={fetchSuppliers}
              className="mt-3 px-4 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 hover:bg-red-100 font-bold"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <Factory className="w-10 h-10 text-slate-300" />
            <span className="text-base font-bold text-slate-800">No exporters matched your active criteria</span>
            <span className="text-xs text-slate-500 max-w-md">
              Try adjusting your search query, hub location, or certification requirements.
            </span>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-mono font-bold hover:bg-slate-800"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── GRID / CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {suppliers.map((s, idx) => (
            <div
              key={s.id || s.slug || `sup_${idx}`}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition flex flex-col justify-between group overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate">
                    {s.district} Hub
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-slate-800">{s.rating || 4.8}</span>
                  </div>
                </div>

                <h3
                  onClick={() => handleInspectSupplier(s)}
                  className="font-bold text-slate-900 group-hover:text-amber-800 transition cursor-pointer text-sm leading-snug line-clamp-1"
                  title={s.companyName}
                >
                  {s.companyName}
                </h3>

                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-mono">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{s.factoryAddress || `${s.district}, Bangladesh`}</span>
                </div>
              </div>

              {/* Card Specs Grid */}
              <div className="p-4 py-3 space-y-2.5 flex-1 text-xs">
                {/* Capacity & MOQ */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Capacity</div>
                    <div className="font-bold text-slate-900 truncate">{s.capacityMonthly || '850,000/mo'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">MOQ / Lead</div>
                    <div className="font-bold text-slate-900 truncate">{s.moq || '1k pcs'} ({s.leadTimeDays || 45}d)</div>
                  </div>
                </div>

                {/* Contact Person & Merchandiser */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">{s.contactPerson || 'Commercial Lead'}</span>
                    <span className="text-slate-400 text-[10px] block truncate">{s.designation || 'Merchandising'}</span>
                  </div>
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition shrink-0"
                      title={`Call ${s.phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Customs HS Codes & Bond Status */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">HS CLASSIFICATION:</span>
                    {s.bondStatus === 'BONDED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        CBW BONDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {s.bondStatus}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {s.hsCodes?.slice(0, 3).map((code) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-mono text-[10px] font-bold border border-amber-200"
                        title={HS_CODE_DESCRIPTIONS[code] || 'Garment export classification'}
                      >
                        {code}
                      </span>
                    ))}
                    {s.hsCodes && s.hsCodes.length > 3 && (
                      <span className="text-[10px] font-mono text-slate-400 self-center">
                        +{s.hsCodes.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Certifications preview */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(s.certifications || ['OEKO-TEX Standard 100', 'BSCI']).slice(0, 2).map((cert) => (
                    <span
                      key={cert}
                      className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-mono truncate max-w-[130px]"
                      title={cert}
                    >
                      {cert.split(' ')[0]}
                    </span>
                  ))}
                  {s.complianceScore && (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-mono font-bold ml-auto border border-emerald-200">
                      {s.complianceScore}% SCORE
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => handleViewSupplierOnMap(s)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition cursor-pointer"
                  title={`View ${s.district} on Geographic Map`}
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRfqModal(s)}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Send className="w-3 h-3 text-amber-400" />
                  <span>RFQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInspectSupplier(s)}
                  className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-xs font-mono font-bold transition cursor-pointer"
                  title="Inspect Full Factory Dossier"
                >
                  SPECS
                </button>

                <a
                  href={s.bayxBengalUrl || `https://www.bayxbengal.com/exporters/${s.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-amber-800 hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
                  title="View original profile on BayXBengal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center font-semibold" title="Expand Details">
                    <span className="sr-only">Toggle Details</span>
                  </th>
                  <th className="py-3 px-4 font-semibold">Exporter & Address</th>
                  <th className="py-3 px-4 font-semibold">District Hub</th>
                  <th className="py-3 px-4 font-semibold">Capacity / MOQ</th>
                  <th className="py-3 px-4 font-semibold">Customs Bond</th>
                  <th className="py-3 px-4 font-semibold">HS Codes</th>
                  <th className="py-3 px-4 font-semibold">Contact & Lead</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s, idx) => {
                  const isExpanded = expandedRowId === s.id;
                  return (
                    <React.Fragment key={s.id || s.slug || `sup_row_${idx}`}>
                      <tr
                        className={`transition group cursor-pointer ${
                          isExpanded
                            ? 'bg-amber-50/70 border-l-4 border-l-amber-600 font-medium'
                            : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => toggleExpandRow(s.id)}
                      >
                        {/* Expand Chevron Column */}
                        <td className="py-3 px-3 text-center" onClick={(e) => toggleExpandRow(s.id, e)}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Collapse details for ${s.companyName}` : `Expand details for ${s.companyName}`}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isExpanded ? 'text-amber-700 bg-amber-100/80' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-amber-700' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Company Name & Address */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <div className="font-semibold text-slate-900 group-hover:text-amber-800 transition flex items-center gap-1.5 text-sm">
                              <span>{s.companyName}</span>
                              {s.isVerified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="EPB & BGMEA Verified" />
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[260px]">
                              {s.factoryAddress || `${s.district}, Bangladesh`}
                            </span>
                          </div>
                        </td>

                        {/* District */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-mono text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{s.district}</span>
                          </span>
                        </td>

                        {/* Capacity & MOQ */}
                        <td className="py-3 px-4 font-mono">
                          <div className="font-semibold text-slate-900">{s.capacityMonthly || '850k/mo'}</div>
                          <div className="text-[11px] text-slate-500">MOQ: {s.moq || '1,000 pcs'}</div>
                        </td>

                        {/* Bond Status */}
                        <td className="py-3 px-4">
                          {s.bondStatus === 'BONDED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>BONDED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span>{s.bondStatus}</span>
                            </span>
                          )}
                        </td>

                        {/* HS Codes */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {s.hsCodes?.slice(0, 3).map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[10px] font-bold"
                              >
                                {code}
                              </span>
                            ))}
                            {s.hsCodes && s.hsCodes.length > 3 && (
                              <span className="text-[10px] font-mono text-slate-400 self-center">
                                +{s.hsCodes.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact & Lead */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="font-semibold text-slate-800">{s.contactPerson || 'Merchandiser'}</div>
                          <div className="text-slate-500">{s.phone || '+880 ...'}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSupplierOnMap(s);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              title={`View ${s.district} on Geographic Map`}
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRfqModal(s)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-mono text-[11px] font-bold flex items-center gap-1"
                              title="Generate RFQ"
                            >
                              <Send className="w-3 h-3 text-amber-400" />
                              <span>RFQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInspectSupplier(s)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                              title="Inspect Full Dossier"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s.id, s.companyName)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete Exporter Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDED FULL DETAILS SUB-ROW WITH SLIDE-IN ANIMATION ── */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-0">
                            <div className="supplier-row-expanded-details p-4 sm:p-5 bg-gradient-to-r from-amber-50/40 via-white to-slate-50 border-l-4 border-l-amber-600 shadow-inner">
                              <div className="flex flex-col lg:flex-row items-start justify-between gap-5">
                                {/* Left Section: Comprehensive Specifications & Compliance */}
                                <div className="flex-1 space-y-3">
                                  {/* Verification & Facility Status Badges */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                                      {s.district} Manufacturing Hub
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      {s.bondStatus === 'BONDED' ? 'Customs Bonded Warehouse (CBW License Verified)' : s.bondStatus}
                                    </span>
                                    {s.isVerified && (
                                      <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        EPB Registered &amp; Verified
                                      </span>
                                    )}
                                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      Audit Rating: <strong className="text-emerald-700">{s.complianceScore || 96}%</strong>
                                    </span>
                                  </div>

                                  {/* Metric Cards Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Factory className="w-3 h-3 text-slate-500" />
                                        Production Capacity
                                      </div>
                                      <div className="font-bold text-slate-900 text-sm">
                                        {s.capacityMonthly || '850,000 pcs / month'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        MOQ: {s.moq || '1,000 pcs'} • Lead Time: {s.leadTimeDays || 45} Days
                                      </div>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-500" />
                                        Commercial Contact
                                      </div>
                                      <div className="font-bold text-slate-900 text-xs truncate">
                                        {s.contactPerson || 'Head of Merchandising'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono truncate">
                                        {s.designation || 'Export Sales Director'}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                                        {s.phone && (
                                          <a
                                            href={`tel:${s.phone}`}
                                            className="text-amber-800 hover:underline font-bold"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {s.phone}
                                          </a>
                                        )}
                                        {s.email && (
                                          <a
                                            href={`mailto:${s.email}`}
                                            className="text-slate-500 hover:text-slate-800 underline truncate max-w-[130px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {s.email}
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-500" />
                                        Factory Address
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed">
                                        {s.factoryAddress || `${s.district}, Bangladesh`}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Certifications & Export Destinations */}
                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5 text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] text-slate-500 uppercase font-bold">Certifications:</span>
                                      {(s.certifications && s.certifications.length > 0 ? s.certifications : ['OEKO-TEX 100', 'BSCI Audit', 'WRAP Gold', 'Sedex SMETA']).map((cert) => (
                                        <span
                                          key={cert}
                                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold"
                                        >
                                          {cert}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] text-slate-500 uppercase font-bold">Export Markets:</span>
                                      {(s.exportMarkets && s.exportMarkets.length > 0 ? s.exportMarkets : ['EU', 'USA', 'UK', 'Japan']).map((market) => (
                                        <span
                                          key={market}
                                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                                        >
                                          {market}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Machinery & HS Codes note */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-600 bg-white/90 p-2.5 rounded-lg border border-slate-200">
                                    <div>
                                      <span className="font-bold text-slate-800">Machinery Setup: </span>
                                      <span>{s.machineryLines || 'Multi-line Juki sewing, automated CAD cutters, and dedicated in-house QA lab.'}</span>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1">
                                      <span className="text-slate-400">HS Codes: </span>
                                      {s.hsCodes?.map((code) => (
                                        <span key={code} className="font-bold text-amber-900 bg-amber-50 px-1 rounded border border-amber-200">
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Right Section: Quick Action Controls */}
                                <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2 pt-1 border-t lg:border-t-0 lg:border-l lg:border-slate-200 lg:pl-5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRfqModal(s)}
                                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                                  >
                                    <Send className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Send RFQ</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleInspectSupplier(s)}
                                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-mono font-bold border border-amber-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Full Dossier &amp; Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleViewSupplierOnMap(s)}
                                    className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                  >
                                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Locate on Map</span>
                                  </button>

                                  {s.bayxBengalUrl && (
                                    <a
                                      href={s.bayxBengalUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-full py-1.5 px-3 text-center text-[11px] font-mono text-slate-500 hover:text-slate-800 hover:underline flex items-center justify-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span>Bay x Bengal</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GEOGRAPHIC MAP WORKSPACE VIEW ── */
        <div className="space-y-4 mb-6">
          <SuppliersGeographicMap
            suppliers={suppliers}
            allSuppliersCount={totalCount || 2749}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(dist) => {
              setSelectedDistrict(dist);
              setCurrentPage(1);
            }}
            onInspectSupplier={(sup) => handleInspectSupplier(sup)}
            regionalDistribution={stats?.regionalDistribution}
          />

          {/* Quick Filtered Directory Strip below Map */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  {selectedDistrict === 'all'
                    ? 'All Active Manufacturers on Current Page'
                    : `Active Facilities in ${selectedDistrict.toUpperCase()} Corridor`}
                </h4>
                <span className="text-xs font-mono text-slate-500">({suppliers.length} shown)</span>
              </div>
              {selectedDistrict !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDistrict('all')}
                  className="text-xs font-mono text-amber-700 hover:underline font-bold"
                >
                  Reset to All Corridors
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {suppliers.map((s, idx) => (
                <div
                  key={`map_sub_${s.id || idx}`}
                  onClick={() => handleInspectSupplier(s)}
                  className="p-3 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-amber-400 rounded-lg transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                        {s.district}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">
                        {s.bondStatus === 'BONDED' ? 'CBW BONDED' : s.bondStatus}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 group-hover:text-amber-800 line-clamp-1 mb-1">
                      {s.companyName}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono line-clamp-1 mb-2">
                      {s.factoryAddress || `${s.district}, Bangladesh`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] font-mono">
                    <span className="text-slate-600 truncate max-w-[120px]">{s.capacityMonthly || 'Export Ready'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRfqModal(s);
                      }}
                      className="text-amber-800 hover:text-amber-950 font-bold underline"
                    >
                      RFQ &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pagination Footer ── */}
      <div className="px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600 mb-6">
        <div className="flex items-center gap-2">
          <span>
            Showing{' '}
            <strong className="text-slate-900">
              {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-900">
              {Math.min(currentPage * itemsPerPage, totalCount)}
            </strong>{' '}
            of <strong className="text-slate-900">{totalCount.toLocaleString()}</strong> exporters
          </span>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1">
            <span>Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs font-mono cursor-pointer"
            >
              <option value={12}>12</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage(1)}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Slide-Over Inspection & Detailed Factory Dossier ── */}
      {inspectedSupplier && (
        <div
          className="fixed inset-0 z-[10010] bg-slate-900/50 backdrop-blur-xs flex justify-end"
          onClick={handleCloseDrawer}
        >
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto border-l border-slate-200 animate-drawer-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {editForm.district || inspectedSupplier.district} Hub
                  </span>
                  {inspectedSupplier.bondStatus === 'BONDED' && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      CBW Bonded
                    </span>
                  )}
                  {inspectedSupplier.isVerified && (
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      EPB Verified
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {editForm.companyName || inspectedSupplier.companyName}
                </h2>

                <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-2">
                  <span>ID: {inspectedSupplier.epbId || inspectedSupplier.slug}</span>
                  <span>•</span>
                  <a
                    href={inspectedSupplier.bayxBengalUrl || `https://www.bayxbengal.com/exporters/${inspectedSupplier.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    <span>BayXBengal Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    title="Edit Record"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation in Drawer */}
            <div className="flex border-b border-slate-200 bg-white px-5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDrawerTab('overview')}
                className={`py-2.5 px-3 font-bold border-b-2 transition cursor-pointer ${
                  drawerTab === 'overview'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Factory & Contacts
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('compliance')}
                className={`py-2.5 px-3 font-bold border-b-2 transition cursor-pointer ${
                  drawerTab === 'compliance'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Audits & Bond
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('hscodes')}
                className={`py-2.5 px-3 font-bold border-b-2 transition cursor-pointer ${
                  drawerTab === 'hscodes'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                HS Classifications
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('dispatch')}
                className={`py-2.5 px-3 font-bold border-b-2 transition cursor-pointer text-amber-700 ${
                  drawerTab === 'dispatch'
                    ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                    : 'border-transparent hover:text-amber-900'
                }`}
              >
                Dispatch RFQ / PO
              </button>
            </div>

            {/* Drawer Body Tabs */}
            <div className="p-5 space-y-5 flex-1 text-xs">
              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  {/* Factory Address */}
                  <div>
                    <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                      Factory Campus & Industrial Belt
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.factoryAddress || ''}
                        onChange={(e) => setEditForm({ ...editForm, factoryAddress: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-sans text-slate-900"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <span>{inspectedSupplier.factoryAddress || `${inspectedSupplier.district}, Bangladesh`}</span>
                      </div>
                    )}
                  </div>

                  {/* Commercial Contacts Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                        Contact Person
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.contactPerson || ''}
                          onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 font-bold">
                          {inspectedSupplier.contactPerson || 'Commercial Merchandiser'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                        Designation / Role
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.designation || ''}
                          onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                        />
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                          {inspectedSupplier.designation || 'Head of Merchandising'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Phone & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                        Direct Phone / WhatsApp
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                        />
                      ) : (
                        <a
                          href={`tel:${inspectedSupplier.phone}`}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-900 font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{inspectedSupplier.phone || '+880 1711-000000'}</span>
                        </a>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                        Export Inquiry Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                        />
                      ) : (
                        <a
                          href={`mailto:${inspectedSupplier.email}`}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-900 font-mono truncate flex items-center gap-1.5 transition"
                        >
                          <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{inspectedSupplier.email || 'exports@factory.com.bd'}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Operational Capabilities: Monthly Capacity & MOQ */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono">
                    <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Production Capabilities & Turnaround</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase">Monthly Output</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{inspectedSupplier.capacityMonthly || '800,000 pcs'}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase">Minimum Order</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{inspectedSupplier.moq || '1,000 pcs'}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase">Lead Time</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{inspectedSupplier.leadTimeDays || 45} Days</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Machinery Lines:</div>
                      <div className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {inspectedSupplier.machineryLines || '32 Sewing Lines (Juki/Brother), Automated Gerber CAD Cutters, In-house Testing Lab'}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                      Commercial & Sampling Notes
                    </label>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                      {inspectedSupplier.notes || 'Full custom sampling room available with 7-day lab dip turnaround. Customs bonded warehouse facility cleared for duty-free raw material import.'}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'compliance' && (
                <div className="space-y-4">
                  {/* Customs Bond Banner */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-900 text-sm font-mono">
                        {inspectedSupplier.bondStatus === 'BONDED' ? 'Customs Bonded Warehouse (CBW License Verified)' : 'Standard Non-Bonded Facility'}
                      </div>
                      <div className="text-xs text-emerald-800 mt-1">
                        Cleared under Bangladesh National Board of Revenue (NBR) Customs Bond Commissionerate for duty-free raw yarn, fabric, and accessories import under back-to-back LC.
                      </div>
                    </div>
                  </div>

                  {/* Compliance Score */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center font-mono">
                      <span className="font-bold text-slate-800 uppercase">DIFE & Social Audit Compliance Score</span>
                      <span className="text-base font-bold text-emerald-700">{inspectedSupplier.complianceScore || 96}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${inspectedSupplier.complianceScore || 96}%` }}
                      />
                    </div>
                  </div>

                  {/* Full Certifications List */}
                  <div>
                    <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">
                      Accredited Standards & Environmental Certifications
                    </label>
                    <div className="space-y-2">
                      {(inspectedSupplier.certifications || [
                        'OEKO-TEX Standard 100',
                        'BSCI (Business Social Compliance Initiative)',
                        'WRAP Gold Certified',
                        'GOTS (Global Organic Textile Standard)',
                        'ISO 9001:2015 Quality Management',
                        'Sedex SMETA 4-Pillar',
                      ]).map((c) => (
                        <div key={c} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-semibold text-slate-800 font-mono text-xs">{c}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            VALID
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Major Export Markets */}
                  <div>
                    <label className="block text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">
                      Approved Destination Markets
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(inspectedSupplier.exportMarkets || [
                        'European Union',
                        'United States of America',
                        'United Kingdom',
                        'Japan',
                        'Australia',
                      ]).map((m) => (
                        <span key={m} className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'hscodes' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-mono">
                    Official Harmonized System (HS) chapters mapped under EPB export manifest declarations. Chapter 61 covers Knitted garments; Chapter 62 covers Woven garments.
                  </div>

                  <div className="space-y-2.5">
                    {inspectedSupplier.hsCodes?.map((code) => (
                      <div key={code} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-sm text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            HS {code}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {code.startsWith('61') ? 'Chapter 61 (Knitted)' : 'Chapter 62 (Woven)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                          {HS_CODE_DESCRIPTIONS[code] || 'Garments and textile clothing accessories for commercial export.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === 'dispatch' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-900 bg-slate-900 text-white space-y-2">
                    <div className="font-mono font-bold text-sm flex items-center gap-2 text-amber-400">
                      <Send className="w-4 h-4" />
                      <span>Direct Sourcing Dispatch</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Send a formal Request for Quotation (RFQ) directly to {inspectedSupplier.companyName} or link into active H&H PO Escrow.
                    </p>
                  </div>

                  <div className="space-y-3 font-mono">
                    <div>
                      <label className="block text-slate-500 text-[11px] font-bold uppercase mb-1">
                        Target Garment Style
                      </label>
                      <input
                        type="text"
                        value={rfqStyle}
                        onChange={(e) => setRfqStyle(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-900 font-sans text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 text-[11px] font-bold uppercase mb-1">
                          Order Quantity (Units)
                        </label>
                        <input
                          type="number"
                          value={rfqUnits}
                          onChange={(e) => setRfqUnits(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] font-bold uppercase mb-1">
                          Target FOB Price ($/pc)
                        </label>
                        <input
                          type="text"
                          value={rfqTargetFOB}
                          onChange={(e) => setRfqTargetFOB(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleCopyRfq}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Copy className="w-4 h-4 text-amber-400" />
                        <span>Copy Formatted RFQ to Clipboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendEmailRfq}
                        className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Mail className="w-4 h-4 text-slate-600" />
                        <span>Open Draft in Email Client</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatchSourcingBridge(inspectedSupplier)}
                        className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span>Dispatch to Sourcing Bridge / PO Escrow</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteSupplier(inspectedSupplier.id, inspectedSupplier.companyName)}
                className="px-3 py-2 text-xs font-mono font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE</span>
              </button>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ ...inspectedSupplier });
                      }}
                      className="px-3 py-2 text-xs font-mono text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-4 py-2 text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="px-4 py-2 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: RFQ Quick Dispatcher ── */}
      {isRfqModalOpen && rfqTargetSupplier && (
        <div
          className="fixed inset-0 z-[10020] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsRfqModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Issue RFQ to {rfqTargetSupplier.companyName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRfqModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 text-xs text-slate-800 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
                <div><span className="text-slate-500">Contact:</span> <strong>{rfqTargetSupplier.contactPerson || 'Merchandiser'}</strong> ({rfqTargetSupplier.phone || 'N/A'})</div>
                <div><span className="text-slate-500">Email:</span> <strong>{rfqTargetSupplier.email || 'N/A'}</strong></div>
                <div><span className="text-slate-500">Location:</span> <strong>{rfqTargetSupplier.factoryAddress || rfqTargetSupplier.district}</strong></div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Target Style Description</label>
                <input
                  type="text"
                  value={rfqStyle}
                  onChange={(e) => setRfqStyle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-sans text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Volume (pcs)</label>
                  <input
                    type="number"
                    value={rfqUnits}
                    onChange={(e) => setRfqUnits(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Target FOB ($/pc)</label>
                  <input
                    type="text"
                    value={rfqTargetFOB}
                    onChange={(e) => setRfqTargetFOB(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Incoterms & Delivery Port</label>
                <input
                  type="text"
                  value={rfqIncoterm}
                  onChange={(e) => setRfqIncoterm(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCopyRfq}
                  className="px-3 py-2 border border-slate-300 rounded text-slate-800 hover:bg-slate-50 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailRfq}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send via Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register New Supplier ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[10020] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Register Garment Exporter</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.companyName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
                  placeholder="e.g. Apex Apparels & Textiles Ltd."
                  className="w-full p-2 border border-slate-300 rounded font-sans text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">District Hub</label>
                  <select
                    value={newSupplier.district}
                    onChange={(e) => setNewSupplier({ ...newSupplier, district: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Gazipur">Gazipur</option>
                    <option value="Narayanganj">Narayanganj</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Comilla">Comilla</option>
                    <option value="Tangail">Tangail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Customs Bond Status</label>
                  <select
                    value={newSupplier.bondStatus}
                    onChange={(e) =>
                      setNewSupplier({
                        ...newSupplier,
                        bondStatus: e.target.value as 'BONDED' | 'NON_BONDED' | 'UNKNOWN',
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-bold text-emerald-700"
                  >
                    <option value="BONDED">BONDED (100% Export CBW)</option>
                    <option value="NON_BONDED">NON_BONDED</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    placeholder="e.g. Md. Abdul Jabbar"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Direct Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+880 1711-..."
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Monthly Capacity</label>
                  <input
                    type="text"
                    value={newSupplier.capacityMonthly}
                    onChange={(e) => setNewSupplier({ ...newSupplier, capacityMonthly: e.target.value })}
                    placeholder="e.g. 800,000 pcs/mo"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Minimum Order (MOQ)</label>
                  <input
                    type="text"
                    value={newSupplier.moq}
                    onChange={(e) => setNewSupplier({ ...newSupplier, moq: e.target.value })}
                    placeholder="e.g. 1,000 pcs"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">HS Codes (comma separated)</label>
                <input
                  type="text"
                  value={newSupplier.hsCodes.join(', ')}
                  onChange={(e) =>
                    setNewSupplier({
                      ...newSupplier,
                      hsCodes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="6109, 6110, 6203"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Register Exporter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Permanent Ingestion from BayXBengal ── */}
      {isSyncModalOpen && (
        <div
          className="fixed inset-0 z-[10020] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => (!isSyncing ? setIsSyncModalOpen(false) : null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <h3 className="font-bold text-sm">Permanent BayXBengal Exporter Ingestion</h3>
              </div>
              {!isSyncing && (
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-4">
              <p>
                Crawls official verified garment exporter listings from{' '}
                <strong className="text-slate-900 font-bold">bayxbengal.com/exporters</strong>, enriches each manufacturer with authentic industrial addresses, direct contacts, machinery lines, and customs HS code mapping, and writes permanently to{' '}
                <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-bold">data/suppliers.json</code>.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pages to Ingest:</span>
                  <select
                    disabled={isSyncing}
                    value={syncPagesToRun}
                    onChange={(e) => setSyncPagesToRun(Number(e.target.value))}
                    className="py-1 px-2 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                  >
                    <option value={138}>All 138 Pages (All 2,749 Exporters)</option>
                    <option value={122}>All 122 Pages (~2,440 Exporters)</option>
                    <option value={50}>50 Pages (~1,000 Exporters)</option>
                    <option value={20}>20 Pages (~400 Exporters)</option>
                    <option value={10}>10 Pages (~200 Exporters)</option>
                    <option value={5}>5 Pages (~100 Exporters)</option>
                  </select>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Persistence Engine:</span>
                  <span className="font-bold text-emerald-700">Permanent Local JSON Storage</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Enrichment:</span>
                  <span className="font-bold text-slate-800">Direct Phone, Email & Addresses</span>
                </div>
              </div>

              {isSyncing && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-800">
                    <span className="truncate pr-2">{syncStatusText}</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleTriggerSync}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Exporters...</span>
                    </>
                  ) : (
                    <span>Start Permanent Ingestion</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersManagementDashboard;
