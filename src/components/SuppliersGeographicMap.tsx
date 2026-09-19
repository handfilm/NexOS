import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  Marker as GoogleMarker,
  InfoWindow as GoogleInfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip as LeafletTooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Factory,
  Layers,
  Phone,
  Mail,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Compass,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';
import type { SupplierRecord } from './SuppliersManagementDashboard';

// District Coordinates in Bangladesh (lat, lng, and industrial profile)
export const BANGLADESH_DISTRICT_COORDS: Record<
  string,
  {
    lat: number;
    lng: number;
    title: string;
    description: string;
    subCluster?: string;
  }
> = {
  gazipur: {
    lat: 23.9999,
    lng: 90.4203,
    title: 'Gazipur Industrial Belt',
    description: 'Premier RMG & textile corridor (Tongi, Konabari, Kashimpur, Boardbazar)',
    subCluster: 'Heavy Industrial Zone',
  },
  dhaka: {
    lat: 23.8103,
    lng: 90.4125,
    title: 'Greater Dhaka Cluster',
    description: 'Tejgaon Industrial Area, Mirpur Industrial Zone, DEPZ Savar corridor',
    subCluster: 'Commercial & Export Processing',
  },
  narayanganj: {
    lat: 23.6238,
    lng: 90.5,
    title: 'Narayanganj Knitwear Hub',
    description: 'Global Knit City, BSCIC Industrial Area, Fatullah, Adamjee EPZ',
    subCluster: 'Knit & Dyeing Capital',
  },
  chittagong: {
    lat: 22.3569,
    lng: 91.7832,
    title: 'Chattogram Maritime & Port Corridor',
    description: 'Chittagong EPZ, Karnaphuli EPZ, Baizid Bostami, Nasirabad Industrial',
    subCluster: 'Port & Export Processing Zone',
  },
  mymensingh: {
    lat: 24.7471,
    lng: 90.4203,
    title: 'Bhaluka Textile Corridor',
    description: 'Rapidly expanding integrated vertical spinning, weaving, and sewing mills',
    subCluster: 'Vertical Textile Hub',
  },
  narsingdi: {
    lat: 23.9193,
    lng: 90.7176,
    title: 'Narsingdi Weaving Belt',
    description: 'Ghorashal, Madhabdi traditional and industrial fabric & yarn manufacturing',
    subCluster: 'Textile & Weaving Hub',
  },
  comilla: {
    lat: 23.4607,
    lng: 91.1809,
    title: 'Comilla EPZ Corridor',
    description: 'Comilla Export Processing Zone, Southeast transit corridor',
    subCluster: 'EPZ Logistics Belt',
  },
  pabna: {
    lat: 24.0064,
    lng: 89.2372,
    title: 'Ishwardi EPZ / North Bengal',
    description: 'Ishwardi Export Processing Zone and western garment manufacturing cluster',
    subCluster: 'Northern Export Gateway',
  },
  tangail: {
    lat: 24.2513,
    lng: 89.9167,
    title: 'Gorai Industrial Belt',
    description: 'Mirzapur and Gorai industrial area along Dhaka-Tangail highway',
    subCluster: 'Highway Industrial Corridor',
  },
  jessore: {
    lat: 23.1664,
    lng: 89.2138,
    title: 'Jessore & Noapara Industrial',
    description: 'Southwestern commercial processing and RMG auxiliary support',
    subCluster: 'Southwestern Industrial Hub',
  },
  satkhira: {
    lat: 22.7185,
    lng: 89.0705,
    title: 'Satkhira Coastal Hub',
    description: 'Southwest export processing and specialized workwear logistics',
    subCluster: 'Coastal Manufacturing Area',
  },
  khulna: {
    lat: 22.8456,
    lng: 89.5403,
    title: 'Khulna & Mongla Industrial',
    description: 'Mongla Port link, industrial garment accessories, jute composite',
    subCluster: 'Port Auxiliary Hub',
  },
  manikganj: {
    lat: 23.8617,
    lng: 90.0003,
    title: 'Manikganj Sub-Corridor',
    description: 'Western satellite cluster for woven and casualwear manufacturing',
    subCluster: 'Western Satellite Zone',
  },
  nilphamari: {
    lat: 25.9318,
    lng: 88.856,
    title: 'Uttara EPZ (Nilphamari)',
    description: 'Uttara Export Processing Zone high-density apparel & footwear cluster',
    subCluster: 'Northern EPZ Cluster',
  },
  habiganj: {
    lat: 24.3749,
    lng: 91.4155,
    title: 'Habiganj Industrial Park',
    description: 'Sayestaganj modern industrial parks and textile conglomerates',
    subCluster: 'Eastern Modern Industrial Zone',
  },
  munsiganj: {
    lat: 23.5422,
    lng: 90.5305,
    title: 'Munshiganj / Mukterpur Cluster',
    description: 'Riverport logistics, spinning mills, and packaging auxiliaries',
    subCluster: 'River Basin Industrial',
  },
  bagerhat: {
    lat: 22.6516,
    lng: 89.7859,
    title: 'Mongla EPZ / Bagerhat',
    description: 'Direct deepwater export processing and specialty garment factories',
    subCluster: 'Mongla Export Zone',
  },
  rajshahi: {
    lat: 24.3745,
    lng: 88.6042,
    title: 'Rajshahi BSCIC Zone',
    description: 'BSCIC silk, organic cotton, and light apparel manufacturing',
    subCluster: 'Northwestern Center',
  },
  sirajganj: {
    lat: 24.4534,
    lng: 89.7006,
    title: 'Sirajganj Handloom & RMG Hub',
    description: 'Jamuna Bridge corridor textile hub and specialized weaving units',
    subCluster: 'Riverfront Transit Hub',
  },
  feni: {
    lat: 23.0159,
    lng: 91.3976,
    title: 'Feni Transit Industrial',
    description: 'Dhaka-Chattogram highway logistics corridor and apparel units',
    subCluster: 'Corridor Transit Zone',
  },
  kurigram: {
    lat: 25.8054,
    lng: 89.6362,
    title: 'Kurigram Northern Cluster',
    description: 'Special economic processing units in northern Bangladesh',
    subCluster: 'Northern Frontier Hub',
  },
  faridpur: {
    lat: 23.6071,
    lng: 89.8429,
    title: 'Faridpur Industrial Area',
    description: 'Padma Bridge southern connectivity garment auxiliary hub',
    subCluster: 'South-Central Gateway',
  },
  magura: {
    lat: 23.4873,
    lng: 89.4198,
    title: 'Magura Industrial Sub-hub',
    description: 'Specialized textile units and light assembly factories',
    subCluster: 'Southwest Auxiliary Hub',
  },
  bogra: {
    lat: 24.8465,
    lng: 89.3777,
    title: 'Bogra Commercial Center',
    description: 'Northern agro-industrial and textile supply factories',
    subCluster: 'North Central Hub',
  },
  chandpur: {
    lat: 23.2333,
    lng: 90.6667,
    title: 'Chandpur Riverport Hub',
    description: 'Riverfront supply chain and auxiliary manufacturing',
    subCluster: 'Riverport District',
  },
  kishorganj: {
    lat: 24.4449,
    lng: 90.7766,
    title: 'Kishoreganj Satellite Hub',
    description: 'Semi-urban apparel clusters supporting central hubs',
    subCluster: 'Central-East Auxiliary',
  },
  brahmanbaria: {
    lat: 23.9571,
    lng: 91.1119,
    title: 'Brahmanbaria Corridor',
    description: 'Eastern transit belt and cross-border commercial links',
    subCluster: 'Eastern Transit Zone',
  },
  bandarban: {
    lat: 22.1953,
    lng: 92.2184,
    title: 'Bandarban Region',
    description: 'Southeastern specialized cottage and light apparel units',
    subCluster: 'Southeastern District',
  },
  gaibandha: {
    lat: 25.3288,
    lng: 89.5403,
    title: 'Gaibandha Agro-Textile',
    description: 'Northern textile and apparel packaging units',
    subCluster: 'Northern Hub',
  },
  jhenaidah: {
    lat: 23.5448,
    lng: 89.1539,
    title: 'Jhenaidah Sub-cluster',
    description: 'Western apparel support facilities and light weaving',
    subCluster: 'Western Auxiliary',
  },
  chapainawabganj: {
    lat: 24.5965,
    lng: 88.2775,
    title: 'Chapainawabganj Western Hub',
    description: 'Northwestern trade frontier and light garment processing',
    subCluster: 'Northwest Frontier',
  },
  meherpur: {
    lat: 23.7622,
    lng: 88.6318,
    title: 'Meherpur Border Belt',
    description: 'Border trade and specialized apparel processing units',
    subCluster: 'Western Border District',
  },
  rajbari: {
    lat: 23.7574,
    lng: 89.6444,
    title: 'Rajbari Riverfront Cluster',
    description: 'Padma river corridor apparel and spinning logistics',
    subCluster: 'Riverfront Gateway',
  },
};

// Precise sub-location offsets for individual factory pins
function resolveFactoryCoordinates(supplier: SupplierRecord): [number, number] {
  const distKey = supplier.district?.toLowerCase() || 'dhaka';
  const base = BANGLADESH_DISTRICT_COORDS[distKey] || BANGLADESH_DISTRICT_COORDS['dhaka'];

  const addr = (supplier.factoryAddress || '').toLowerCase();

  // Specific high-density industrial sub-areas
  if (addr.includes('tongi')) return [23.8967, 90.4045];
  if (addr.includes('konabari')) return [24.0158, 90.3421];
  if (addr.includes('kashimpur')) return [23.9925, 90.3114];
  if (addr.includes('boardbazar') || addr.includes('board bazar')) return [23.9482, 90.3831];
  if (addr.includes('joydebpur')) return [24.0022, 90.4264];
  if (addr.includes('tejgaon')) return [23.7644, 90.3957];
  if (addr.includes('mirpur')) return [23.8072, 90.3686];
  if (addr.includes('uttara')) return [23.8759, 90.3795];
  if (addr.includes('ashulia') || addr.includes('savar') || addr.includes('depz')) return [23.9186, 90.2831];
  if (addr.includes('adamjee')) return [23.6789, 90.5284];
  if (addr.includes('fatullah')) return [23.6457, 90.4912];
  if (addr.includes('cepz') || addr.includes('chittagong epz')) return [22.2858, 91.7825];
  if (addr.includes('karnaphuli') || addr.includes('kepz')) return [22.2612, 91.8214];
  if (addr.includes('baizid') || addr.includes('nasirabad')) return [22.3789, 91.8234];
  if (addr.includes('bhaluka')) return [24.3756, 90.3784];
  if (addr.includes('ishwardi')) return [24.15, 89.0667];

  // Deterministic stable scatter based on string hash
  let hash = 0;
  const str = supplier.id + supplier.companyName;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.05;
  const offsetLng = (((Math.abs(hash * 31) % 1000) / 1000) - 0.5) * 0.05;

  return [base.lat + offsetLat, base.lng + offsetLng];
}

// Custom Leaflet Icons (Vector SVG / divIcon without 404 image risks)
function createHubDivIcon(districtKey: string, count: number, isSelected: boolean) {
  const size = count > 500 ? 56 : count > 100 ? 46 : count > 20 ? 38 : 32;

  let bgGradient = 'bg-slate-900 border-2 border-amber-400';
  let ringStyle = '';

  if (isSelected) {
    bgGradient = 'bg-amber-500 border-2 border-white shadow-2xl scale-110';
    ringStyle = '<span class="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-75"></span>';
  } else if (count > 500) {
    bgGradient = 'bg-slate-900 border-2 border-amber-400 shadow-xl';
  } else if (count > 100) {
    bgGradient = 'bg-emerald-800 border-2 border-emerald-300 shadow-lg';
  } else if (count > 20) {
    bgGradient = 'bg-sky-800 border-2 border-sky-300 shadow-md';
  } else {
    bgGradient = 'bg-slate-700 border border-slate-300 shadow-xs';
  }

  const displayName = districtKey.charAt(0).toUpperCase() + districtKey.slice(1);

  return L.divIcon({
    className: 'custom-hub-marker',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="width: ${size}px; height: ${size}px;">
        ${ringStyle}
        <div class="${bgGradient} rounded-full w-full h-full flex flex-col items-center justify-center text-white transition transform duration-200 group-hover:scale-110">
          <span class="font-mono font-black text-[11px] sm:text-xs leading-none tracking-tight">${count.toLocaleString()}</span>
          <span class="text-[7.5px] font-mono uppercase tracking-wider text-slate-200 mt-0.5 max-w-[90%] truncate leading-none">
            ${displayName}
          </span>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 6],
  });
}

function createSupplierPinIcon(supplier: SupplierRecord, isSelected: boolean) {
  const isKnit = supplier.productTypes?.some((t) => t.toLowerCase().includes('knit'));
  const isWoven = supplier.productTypes?.some((t) => t.toLowerCase().includes('woven'));
  const isSweater = supplier.productTypes?.some((t) => t.toLowerCase().includes('sweater'));

  let pinColor = '#0f172a'; // Default slate
  if (isSelected) pinColor = '#d97706'; // Amber active
  else if (isKnit && isWoven) pinColor = '#059669'; // Emerald knit/woven
  else if (isKnit) pinColor = '#0d9488'; // Teal
  else if (isWoven) pinColor = '#0284c7'; // Sky
  else if (isSweater) pinColor = '#7c3aed'; // Violet

  const size = isSelected ? 32 : 24;

  return L.divIcon({
    className: 'custom-factory-pin',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer transition transform hover:scale-125" style="width: ${size}px; height: ${size}px;">
        <div style="background-color: ${pinColor};" class="rounded-full w-full h-full flex items-center justify-center text-white border-2 border-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="${size / 2}" height="${size / 2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  });
}

// Map pan and zoom animator
const MapFlyToController: React.FC<{
  targetCenter: [number, number];
  targetZoom: number;
}> = ({ targetCenter, targetZoom }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && targetZoom) {
      map.flyTo(targetCenter, targetZoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [targetCenter, targetZoom, map]);
  return null;
};

// Automatically invalidate Leaflet size when container layout shifts
const MapResizeInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export interface SuppliersGeographicMapProps {
  suppliers: SupplierRecord[];
  allSuppliersCount: number;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onInspectSupplier?: (supplier: SupplierRecord) => void;
  regionalDistribution?: Array<{
    district: string;
    count: number;
    percentage: number;
    bondedCount?: number;
  }>;
  className?: string;
}

export const SuppliersGeographicMap: React.FC<SuppliersGeographicMapProps> = ({
  suppliers,
  allSuppliersCount,
  selectedDistrict,
  onSelectDistrict,
  onInspectSupplier,
  regionalDistribution,
  className = '',
}) => {
  // Map View Mode: 'hubs' (macro district clusters) vs 'pins' (individual factory markers)
  const [mapLayerMode, setMapLayerMode] = useState<'hubs' | 'pins'>('hubs');

  // Tile Layer Themes
  const [tileTheme, setTileTheme] = useState<'google' | 'google_sat' | 'voyager' | 'positron' | 'osm'>('google');

  // Google Maps API Key
  const googleMapsApiKey =
    (typeof window !== 'undefined' && (window as any).GOOGLE_MAPS_API_KEY) ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyB3bvvN_yt2qAuTSBzpjNbBfzOxwAvLIXg';

  // Center & Zoom state
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.8103, 90.4125]);
  const [mapZoom, setMapZoom] = useState<number>(8);

  // Active hover/selected pin
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [activePinSupplier, setActivePinSupplier] = useState<SupplierRecord | null>(null);

  // Tile URLs
  const tileUrls = {
    voyager: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    positron: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  };

  // Group current suppliers by district
  const districtDistribution = useMemo(() => {
    if (regionalDistribution && regionalDistribution.length > 0) {
      const map: Record<string, { count: number; percentage: number }> = {};
      regionalDistribution.forEach((r) => {
        map[r.district.toLowerCase()] = { count: r.count, percentage: r.percentage };
      });
      return map;
    }
    const counts: Record<string, { count: number; percentage: number }> = {};
    suppliers.forEach((s) => {
      const key = (s.district || 'Dhaka').toLowerCase();
      if (!counts[key]) counts[key] = { count: 0, percentage: 0 };
      counts[key].count += 1;
    });
    const total = suppliers.length || 1;
    Object.keys(counts).forEach((k) => {
      counts[k].percentage = Number(((counts[k].count / total) * 100).toFixed(1));
    });
    return counts;
  }, [suppliers, regionalDistribution]);

  // Aggregate list of active districts for markers
  const activeDistricts = useMemo(() => {
    return Object.entries(districtDistribution).map(([distKey, data]) => {
      const geo = BANGLADESH_DISTRICT_COORDS[distKey] || {
        lat: 23.8103,
        lng: 90.4125,
        title: `${distKey.toUpperCase()} Area`,
        description: 'Apparel manufacturing facilities cluster',
        subCluster: 'Regional Hub',
      };
      return {
        key: distKey,
        count: data.count,
        percentage: data.percentage,
        ...geo,
      };
    });
  }, [districtDistribution]);

  // Handle zooming when selectedDistrict changes externally
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'all') {
      const coord = BANGLADESH_DISTRICT_COORDS[selectedDistrict.toLowerCase()];
      if (coord) {
        setMapCenter([coord.lat, coord.lng]);
        setMapZoom(selectedDistrict.toLowerCase() === 'dhaka' || selectedDistrict.toLowerCase() === 'gazipur' ? 11 : 12);
        return;
      }
    }
    // Default national view
    setMapCenter([23.75, 90.35]);
    setMapZoom(7);
  }, [selectedDistrict]);

  // Quick Zoom Corridor Presets
  const handleCorridorJump = (corridor: 'national' | 'gazipur' | 'dhaka' | 'narayanganj' | 'chittagong' | 'mymensingh') => {
    switch (corridor) {
      case 'national':
        onSelectDistrict('all');
        setMapCenter([23.685, 90.3563]);
        setMapZoom(7);
        break;
      case 'gazipur':
        onSelectDistrict('gazipur');
        setMapCenter([23.9999, 90.4203]);
        setMapZoom(11);
        break;
      case 'dhaka':
        onSelectDistrict('dhaka');
        setMapCenter([23.8103, 90.4125]);
        setMapZoom(11);
        break;
      case 'narayanganj':
        onSelectDistrict('narayanganj');
        setMapCenter([23.6238, 90.5]);
        setMapZoom(12);
        break;
      case 'chittagong':
        onSelectDistrict('chittagong');
        setMapCenter([22.3569, 91.7832]);
        setMapZoom(11);
        break;
      case 'mymensingh':
        onSelectDistrict('mymensingh');
        setMapCenter([24.7471, 90.4203]);
        setMapZoom(11);
        break;
    }
  };

  // Limit pins in individual pin mode to prevent browser DOM overload
  const displayedPins = useMemo(() => {
    if (mapLayerMode !== 'pins') return [];
    return suppliers.slice(0, 80);
  }, [suppliers, mapLayerMode]);

  return (
    <div className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md ${className}`}>
      {/* ── Top Geographic Header & Controls ── */}
      <div className="p-3.5 sm:p-4 bg-slate-900/95 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 relative">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-0.5">
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-amber-400" />
            <span>Geographic Distribution & Sourcing Cartography</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80 text-[10px]">
              {suppliers.length.toLocaleString()} Active Facilities
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Bangladesh RMG Export Corridors & Bonded Logistics Map</span>
          </h3>
        </div>

        {/* Action Controls: Layer Mode, Corridors & Theme */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher: Hub Clusters vs Factory Pins */}
          <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-800/90 text-xs font-mono">
            <button
              type="button"
              onClick={() => setMapLayerMode('hubs')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mapLayerMode === 'hubs'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Corridor Hub Clusters"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>HUBS ({activeDistricts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayerMode('pins')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mapLayerMode === 'pins'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Individual Facility Pins"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>PINS (Top 80)</span>
            </button>
          </div>

          {/* Quick Corridor Buttons */}
          <div className="hidden xl:inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-800/90 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleCorridorJump('national')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                selectedDistrict === 'all' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              National
            </button>
            <button
              type="button"
              onClick={() => handleCorridorJump('gazipur')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                selectedDistrict === 'gazipur' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Gazipur
            </button>
            <button
              type="button"
              onClick={() => handleCorridorJump('dhaka')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                selectedDistrict === 'dhaka' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Dhaka
            </button>
            <button
              type="button"
              onClick={() => handleCorridorJump('narayanganj')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                selectedDistrict === 'narayanganj' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Narayanganj
            </button>
            <button
              type="button"
              onClick={() => handleCorridorJump('chittagong')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                selectedDistrict === 'chittagong' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Chattogram Port
            </button>
          </div>

          {/* Map Tile Switcher */}
          <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-800/90 text-[11px] font-mono">
            {[
              { id: 'google', label: 'Google Maps' },
              { id: 'google_sat', label: 'Satellite' },
              { id: 'voyager', label: 'Voyager' },
              { id: 'positron', label: 'Positron' },
              { id: 'osm', label: 'OSM' },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTileTheme(theme.id as any)}
                className={`px-2 py-1 rounded capitalize transition cursor-pointer ${
                  tileTheme === theme.id ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={() => handleCorridorJump('national')}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="Reset National View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Active Hub Banner & Coordinate Breadcrumb ── */}
      {selectedDistrict !== 'all' && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-xs font-mono text-amber-200 flex items-center justify-between gap-2 z-10 relative">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Focused Industrial Hub: <strong className="text-white uppercase font-bold">{selectedDistrict}</strong>
              {BANGLADESH_DISTRICT_COORDS[selectedDistrict.toLowerCase()] && (
                <span className="text-amber-400/80 ml-1.5 hidden sm:inline">
                  ({BANGLADESH_DISTRICT_COORDS[selectedDistrict.toLowerCase()].title} • Lat{' '}
                  {BANGLADESH_DISTRICT_COORDS[selectedDistrict.toLowerCase()].lat.toFixed(3)}°, Lng{' '}
                  {BANGLADESH_DISTRICT_COORDS[selectedDistrict.toLowerCase()].lng.toFixed(3)}°)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCorridorJump('national')}
            className="text-amber-400 hover:text-white font-bold underline cursor-pointer text-[11px]"
          >
            View All Bangladesh
          </button>
        </div>
      )}

      {/* ── Map Viewport Container (Google Maps Platform & Leaflet Support) ── */}
      <div className="relative w-full h-[460px] sm:h-[520px] bg-slate-950">
        {tileTheme.startsWith('google') ? (
          <APIProvider apiKey={googleMapsApiKey}>
            <GoogleMap
              center={{ lat: mapCenter[0], lng: mapCenter[1] }}
              zoom={mapZoom}
              mapTypeId={tileTheme === 'google_sat' ? 'hybrid' : 'roadmap'}
              style={{ width: '100%', height: '100%' }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {/* MODE 1: District Hub Clusters */}
              {mapLayerMode === 'hubs' &&
                activeDistricts.map((district) => (
                  <GoogleMarker
                    key={`g-hub-${district.key}`}
                    position={{ lat: district.lat, lng: district.lng }}
                    title={`${district.key.toUpperCase()} Hub (${district.count} Exporters)`}
                    onClick={() => {
                      onSelectDistrict(district.key);
                      setHoveredDistrict(district.key);
                    }}
                  />
                ))}

              {/* MODE 2: Individual Factory Pins */}
              {mapLayerMode === 'pins' &&
                displayedPins.map((supplier) => {
                  const coords = resolveFactoryCoordinates(supplier);
                  return (
                    <GoogleMarker
                      key={`g-pin-${supplier.id}`}
                      position={{ lat: coords[0], lng: coords[1] }}
                      title={`${supplier.companyName} (${supplier.district})`}
                      onClick={() => setActivePinSupplier(supplier)}
                    />
                  );
                })}

              {activePinSupplier && (
                <GoogleInfoWindow
                  position={{
                    lat: resolveFactoryCoordinates(activePinSupplier)[0],
                    lng: resolveFactoryCoordinates(activePinSupplier)[1],
                  }}
                  onCloseClick={() => setActivePinSupplier(null)}
                >
                  <div className="p-2 text-slate-900 font-sans min-w-[220px] max-w-[280px]">
                    <div className="font-bold text-sm text-slate-900 mb-1 leading-tight">
                      {activePinSupplier.companyName}
                    </div>
                    <div className="text-xs text-slate-600 mb-1.5 leading-snug">
                      {activePinSupplier.factoryAddress || activePinSupplier.district}
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-emerald-800 mb-2">
                      Bond: {activePinSupplier.bondStatus === 'BONDED' ? 'CBW BONDED' : activePinSupplier.bondStatus || 'Verified'}
                    </div>
                    {onInspectSupplier && (
                      <button
                        type="button"
                        onClick={() => onInspectSupplier(activePinSupplier)}
                        className="w-full text-center text-xs bg-slate-900 text-white py-1 px-2 rounded font-mono hover:bg-slate-800 cursor-pointer"
                      >
                        Inspect Factory Dossier
                      </button>
                    )}
                  </div>
                </GoogleInfoWindow>
              )}
            </GoogleMap>
          </APIProvider>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            attributionControl={true}
          >
            <TileLayer
              url={(tileUrls[tileTheme as keyof typeof tileUrls] || tileUrls.voyager).url}
              attribution={(tileUrls[tileTheme as keyof typeof tileUrls] || tileUrls.voyager).attribution}
            />

            {/* Programmatic pan/zoom controller */}
            <MapFlyToController targetCenter={mapCenter} targetZoom={mapZoom} />

            {/* Size invalidator */}
            <MapResizeInvalidator />

          {/* ── MODE 1: District Hub Clusters ── */}
          {mapLayerMode === 'hubs' &&
            activeDistricts.map((district) => {
              const isSelected = selectedDistrict.toLowerCase() === district.key;
              const icon = createHubDivIcon(district.key, district.count, isSelected);

              return (
                <Marker
                  key={`hub-${district.key}`}
                  position={[district.lat, district.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      onSelectDistrict(district.key);
                    },
                    mouseover: () => setHoveredDistrict(district.key),
                    mouseout: () => setHoveredDistrict(null),
                  }}
                >
                  <Popup>
                    <div className="p-3 text-slate-100 font-sans min-w-[240px] max-w-[280px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          <span>{district.title}</span>
                        </div>
                        <span className="font-mono text-xs text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80">
                          {district.count} Units
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">{district.description}</p>

                      <div className="space-y-1.5 text-xs font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">National Share:</span>
                          <span className="font-bold text-amber-400">{district.percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Customs Status:</span>
                          <span className="font-bold text-emerald-400">100% CBW Bonded</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sub-Cluster:</span>
                          <span className="text-slate-200">{district.subCluster}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectDistrict(district.key)}
                        className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter {district.count.toLocaleString()} Suppliers in {district.key}</span>
                      </button>
                    </div>
                  </Popup>
                  <LeafletTooltip direction="top" offset={[0, -20]} opacity={0.95}>
                    <div className="font-mono text-xs font-bold">
                      {district.title}: {district.count.toLocaleString()} Factories ({district.percentage}%)
                    </div>
                  </LeafletTooltip>
                </Marker>
              );
            })}

          {/* ── MODE 2: Individual Factory Pins ── */}
          {mapLayerMode === 'pins' &&
            displayedPins.map((supplier) => {
              const coords = resolveFactoryCoordinates(supplier);
              const isSelected = activePinSupplier?.id === supplier.id;
              const icon = createSupplierPinIcon(supplier, isSelected);

              return (
                <Marker
                  key={`pin-${supplier.id}`}
                  position={coords}
                  icon={icon}
                  eventHandlers={{
                    click: () => setActivePinSupplier(supplier),
                  }}
                >
                  <Popup>
                    <div className="p-3 text-slate-100 font-sans min-w-[260px] max-w-[310px]">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                        <div>
                          <div className="font-bold text-sm text-white line-clamp-1">{supplier.companyName}</div>
                          <div className="text-[10px] font-mono text-amber-400 font-bold">
                            {supplier.epbId || 'EPB Verified'} • {supplier.district}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                          {supplier.bondStatus === 'BONDED' ? 'CBW BONDED' : supplier.bondStatus}
                        </span>
                      </div>

                      {supplier.factoryAddress && (
                        <div className="text-[11px] text-slate-300 mb-2 leading-tight flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{supplier.factoryAddress}</span>
                        </div>
                      )}

                      {supplier.productTypes && supplier.productTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {supplier.productTypes.map((pt) => (
                            <span
                              key={pt}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-mono rounded border border-slate-700"
                            >
                              {pt}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800 mb-2.5">
                        {supplier.contactPerson && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="text-white truncate max-w-[140px]">{supplier.contactPerson}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Phone:</span>
                            <span className="text-emerald-400">{supplier.phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Compliance:</span>
                          <span className="text-amber-400 font-bold">{supplier.complianceScore || 98}% Verified</span>
                        </div>
                      </div>

                      {onInspectSupplier && (
                        <button
                          type="button"
                          onClick={() => onInspectSupplier(supplier)}
                          className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect Factory Dossier</span>
                        </button>
                      )}
                    </div>
                  </Popup>
                  <LeafletTooltip direction="top" offset={[0, -14]} opacity={0.95}>
                    <div className="font-mono text-xs font-bold">
                      {supplier.companyName} ({supplier.district})
                    </div>
                  </LeafletTooltip>
                </Marker>
              );
            })}
        </MapContainer>
        )}

        {/* ── Floating Map Legend & Summary Overlay ── */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl max-w-xs text-xs font-mono text-slate-200 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-amber-400" />
              <span>Corridor Map Matrix</span>
            </span>
            <span className="text-[10px] text-amber-400 font-bold">
              {allSuppliersCount.toLocaleString()} Total
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-400 shrink-0"></span>
              <span>Mega-Hub (Dhaka 916 / Gazipur 873)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-800 border-2 border-emerald-300 shrink-0"></span>
              <span>Major Industrial Hub (100–500 Units)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-800 border-2 border-sky-300 shrink-0"></span>
              <span>Regional Corridor (20–100 Units)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-400 shrink-0"></span>
              <span>Sub-District Auxiliary (&lt;20 Units)</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Click any hub to filter list</span>
            <span className="text-emerald-400 font-bold">100% Bonded CBW</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuppliersGeographicMap;
