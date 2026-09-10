import React, { useState, useEffect, useCallback } from 'react';
import TechPackPOEngine from './components/TechPackPOEngine';
import VoicePOIngestion from './components/VoicePOIngestion';
import CorporateSupplies from './components/CorporateSupplies';
import LogisticsSettlementHub from './components/LogisticsSettlementHub';
import FactorySlaFloorTracker from './components/FactorySlaFloorTracker';
import AgentAutonomousFleet from './components/AgentAutonomousFleet';
import { B2BDealEngine } from './components/B2BDealEngine';
import ProductionFloorAndSettlementBridge from './components/ProductionFloorAndSettlementBridge';
import VaultAndReorderEngine from './components/VaultAndReorderEngine';
import EnterpriseSourcingAndFactoryEscrow from './components/EnterpriseSourcingAndFactoryEscrow';
import { ExtractedPOSpec } from './components/VoicePOIngestion';
import {
  ensureFirestoreSeeded,
  subscribeToCustomers,
  subscribeToProducts,
  subscribeToOrders,
  saveProduct,
  saveOrder,
  saveCustomer,
  ProductRecord,
  OrderRecord,
  CustomerRecord
} from './lib/persistence';

export interface AppProps {
  className?: string;
  initialRoute?: string;
}

export const App: React.FC<AppProps> = ({ className = '', initialRoute = 'DEFAULT' }) => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (initialRoute && initialRoute !== 'DEFAULT') return initialRoute;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#/', '').replace('#', '').toUpperCase();
      if (hash === 'VOICEINGEST' || hash === 'VOICE_INGEST' || hash === 'VOICE') return 'VOICEINGEST';
      if (hash === 'TECHPACK' || hash === 'TECHPACKPO' || hash === 'TECHPACK_PO') return 'TECHPACK';
      if (hash === 'CORPORATESUPPLIES' || hash === 'CORPORATE_SUPPLIES' || hash === 'CORPORATE') return 'CORPORATESUPPLIES';
      if (hash === 'LOGISTICS' || hash === 'LOGISTICS_HUB' || hash === 'SETTLEMENT' || hash === 'LOGISTICSSETTLEMENTHUB') return 'LOGISTICS';
      if (hash === 'FACTORYSLA' || hash === 'FACTORY_SLA' || hash === 'FLOOR_TRACKER' || hash === 'SLA' || hash === 'FACTORY') return 'FACTORYSLA';
      if (hash === 'AGENT_ORCHESTRATION' || hash === 'AGENTAUTONOMOUSFLEET' || hash === 'AGENT_FLEET' || hash === 'FLEET') return 'AGENT_ORCHESTRATION';
      if (hash === 'B2B' || hash === 'B2BDEAL' || hash === 'B2B_DEAL' || hash === 'DEALS') return 'B2B';
      if (hash === 'FLOOR_BRIDGE' || hash === 'PRODUCTION_FLOOR' || hash === 'FLOORBRIDGE') return 'FLOOR_BRIDGE';
      if (hash === 'VAULT' || hash === 'VAULT_REORDER' || hash === 'REORDER_VAULT') return 'VAULT';
      if (hash === 'SOURCING_ESCROW' || hash === 'SOURCING' || hash === 'ESCROW' || hash === 'ENTERPRISESOURCING') return 'SOURCING_ESCROW';
    }
    return 'DEFAULT';
  });

  // Modal / Drawer States
  const [isTechPackOpen, setIsTechPackOpen] = useState<boolean>(false);
  const [isVoiceIngestOpen, setIsVoiceIngestOpen] = useState<boolean>(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState<boolean>(false);
  const [isFactorySlaOpen, setIsFactorySlaOpen] = useState<boolean>(false);
  const [isAgentFleetOpen, setIsAgentFleetOpen] = useState<boolean>(false);
  const [isB2BDealOpen, setIsB2BDealOpen] = useState<boolean>(false);
  const [isFloorBridgeOpen, setIsFloorBridgeOpen] = useState<boolean>(false);
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [isSourcingEscrowOpen, setIsSourcingEscrowOpen] = useState<boolean>(false);

  // Selection parameters
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<any | null>(null);
  const [preSelectedLogisticsOrder, setPreSelectedLogisticsOrder] = useState<any | null>(null);
  const [preSelectedSlaPo, setPreSelectedSlaPo] = useState<string | null>(null);
  const [preSelectedEscrowPo, setPreSelectedEscrowPo] = useState<string | null>(null);
  const [lastExtractedSpec, setLastExtractedSpec] = useState<ExtractedPOSpec | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // ── Firestore Real-Time Persistence State ──
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<'INITIALIZING' | 'CONNECTED' | 'SYNCED'>('INITIALIZING');

  // Mount real-time Firestore synchronization
  useEffect(() => {
    // 1. Check and seed initial customer records if database is fresh
    const inMemoryCustomers =
      (window as any).PERMANENT_SEEDED_CUSTOMERS ||
      (window as any).DATA?.customers ||
      (window as any).customers ||
      [];
    ensureFirestoreSeeded(inMemoryCustomers).catch(err => {
      console.warn('[App Persistence] Auto-seed check notice:', err);
    });

    // 2. Real-time onSnapshot Streams
    const unsubCustomers = subscribeToCustomers(
      (list) => {
        setCustomers(list);
        if (typeof window !== 'undefined') {
          (window as any).customers = list;
          if ((window as any).DATA) (window as any).DATA.customers = list;
        }
        setSyncStatus('SYNCED');
      },
      (err) => console.warn('[App Persistence] Customer stream notice:', err)
    );

    const unsubProducts = subscribeToProducts(
      (list) => {
        setProducts(list);
        if (typeof window !== 'undefined') {
          (window as any).products = list;
          if ((window as any).DATA) (window as any).DATA.products = list;
        }
      },
      (err) => console.warn('[App Persistence] Product stream notice:', err)
    );

    const unsubOrders = subscribeToOrders(
      (list) => {
        setOrders(list);
        if (typeof window !== 'undefined') {
          (window as any).orders = list;
          if ((window as any).DATA) (window as any).DATA.orders = list;
        }
      },
      (err) => console.warn('[App Persistence] Order stream notice:', err)
    );

    // 3. Custom event hooks for global persistence calls
    const handleSaveProduct = async (e: any) => {
      if (e.detail?.product) {
        try {
          await saveProduct(e.detail.product);
        } catch (err) {
          console.warn('[App] saveProduct error:', err);
        }
      }
    };

    const handleSaveOrder = async (e: any) => {
      if (e.detail?.order) {
        try {
          await saveOrder(e.detail.order);
        } catch (err) {
          console.warn('[App] saveOrder error:', err);
        }
      }
    };

    const handleSaveCustomer = async (e: any) => {
      if (e.detail?.customer) {
        try {
          await saveCustomer(e.detail.customer);
        } catch (err) {
          console.warn('[App] saveCustomer error:', err);
        }
      }
    };

    window.addEventListener('nexus:save-product', handleSaveProduct);
    window.addEventListener('nexus:save-order', handleSaveOrder);
    window.addEventListener('nexus:save-customer', handleSaveCustomer);

    return () => {
      unsubCustomers();
      unsubProducts();
      unsubOrders();
      window.removeEventListener('nexus:save-product', handleSaveProduct);
      window.removeEventListener('nexus:save-order', handleSaveOrder);
      window.removeEventListener('nexus:save-customer', handleSaveCustomer);
    };
  }, []);

  // Handlers for Opening/Closing Modules
  const openTechPack = useCallback((customer?: any) => {
    if (customer) setPreSelectedCustomer(customer);
    setIsTechPackOpen(true);
    setIsVoiceIngestOpen(false);
    setIsLogisticsOpen(false);
    setIsFactorySlaOpen(false);
  }, []);

  const closeTechPack = useCallback(() => {
    setIsTechPackOpen(false);
    setPreSelectedCustomer(null);
  }, []);

  const openVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(true);
    setIsTechPackOpen(false);
    setIsLogisticsOpen(false);
    setIsFactorySlaOpen(false);
  }, []);

  const closeVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(false);
  }, []);

  const openLogistics = useCallback((order?: any) => {
    if (order) setPreSelectedLogisticsOrder(order);
    setIsLogisticsOpen(true);
    setIsTechPackOpen(false);
    setIsVoiceIngestOpen(false);
    setIsFactorySlaOpen(false);
  }, []);

  const closeLogistics = useCallback(() => {
    setIsLogisticsOpen(false);
    setPreSelectedLogisticsOrder(null);
  }, []);

  const openFactorySla = useCallback((poNumber?: string) => {
    if (poNumber) setPreSelectedSlaPo(poNumber);
    setIsFactorySlaOpen(true);
    setIsTechPackOpen(false);
    setIsVoiceIngestOpen(false);
    setIsLogisticsOpen(false);
  }, []);

  const closeFactorySla = useCallback(() => {
    setIsFactorySlaOpen(false);
    setPreSelectedSlaPo(null);
  }, []);

  const openB2BDeal = useCallback(() => {
    setIsB2BDealOpen(true);
  }, []);

  const closeB2BDeal = useCallback(() => {
    setIsB2BDealOpen(false);
  }, []);

  const openFloorBridge = useCallback(() => {
    setIsFloorBridgeOpen(true);
  }, []);

  const closeFloorBridge = useCallback(() => {
    setIsFloorBridgeOpen(false);
  }, []);

  const openVault = useCallback(() => {
    setIsVaultOpen(true);
  }, []);

  const closeVault = useCallback(() => {
    setIsVaultOpen(false);
  }, []);

  const openSourcingEscrow = useCallback((poNumber?: string) => {
    if (poNumber) setPreSelectedEscrowPo(poNumber);
    setIsSourcingEscrowOpen(true);
  }, []);

  const closeSourcingEscrow = useCallback(() => {
    setIsSourcingEscrowOpen(false);
    setPreSelectedEscrowPo(null);
  }, []);

  const handleVoiceSpecExtracted = useCallback((spec: ExtractedPOSpec) => {
    setLastExtractedSpec(spec);
    setIsVoiceIngestOpen(false);
    setIsTechPackOpen(true);

    const msg = `Voice PO Spec Extracted: ${spec.category || 'Apparel'} (${spec.totalQuantity || 0} pcs, ${spec.fabric || 'Custom Fabric'}) routed to Tech-Pack PO Engine`;
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 6000);

    if (typeof (window as any).toast === 'function') {
      (window as any).toast(msg, 'ok');
    }
  }, []);

  // Global window listeners & hash routing bridges
  useEffect(() => {
    (window as any).openTechPackPOEngine = (cust?: any) => openTechPack(cust);
    (window as any).closeTechPackPOEngine = () => closeTechPack();
    (window as any).openVoicePOIngestion = () => openVoiceIngest();
    (window as any).closeVoicePOIngestion = () => closeVoiceIngest();
    (window as any).openLogisticsSettlementHub = (order?: any) => openLogistics(order);
    (window as any).closeLogisticsSettlementHub = () => closeLogistics();
    (window as any).openFactorySlaFloorTracker = (poNumber?: string) => openFactorySla(poNumber);
    (window as any).closeFactorySlaFloorTracker = () => closeFactorySla();
    (window as any).openB2BDealEngine = () => openB2BDeal();
    (window as any).openProductionFloorBridge = () => openFloorBridge();
    (window as any).openVaultReorderEngine = () => openVault();
    (window as any).openSourcingEscrow = (po?: string) => openSourcingEscrow(po);

    (window as any).NexusApp = {
      openTechPack,
      closeTechPack,
      openVoiceIngest,
      closeVoiceIngest,
      openLogistics,
      closeLogistics,
      openFactorySla,
      closeFactorySla,
      openB2BDeal,
      closeB2BDeal,
      openFloorBridge,
      closeFloorBridge,
      openVault,
      closeVault,
      openSourcingEscrow,
      closeSourcingEscrow,
      saveProduct,
      saveOrder,
      saveCustomer,
      navigate: (route: string) => setCurrentRoute(route),
      getState: () => ({
        isTechPackOpen,
        isVoiceIngestOpen,
        isLogisticsOpen,
        isFactorySlaOpen,
        isB2BDealOpen,
        isFloorBridgeOpen,
        isVaultOpen,
        isSourcingEscrowOpen,
        currentRoute,
        lastExtractedSpec,
        customersCount: customers.length,
        productsCount: products.length,
        ordersCount: orders.length
      })
    };

    const handleOpenTechPackEvent = (e: any) => openTechPack(e.detail?.customer);
    const handleOpenVoiceEvent = () => openVoiceIngest();
    const handleOpenCorporateEvent = () => setCurrentRoute('CORPORATESUPPLIES');
    const handleOpenLogisticsEvent = (e: any) => openLogistics(e.detail?.order || e.detail);
    const handleOpenFactorySlaEvent = (e: any) => {
      const poNum = e.detail?.poNumber || e.detail?.id || e.detail;
      openFactorySla(typeof poNum === 'string' ? poNum : undefined);
    };
    const handleOpenB2BEvent = () => openB2BDeal();
    const handleOpenFloorBridgeEvent = () => openFloorBridge();
    const handleOpenVaultEvent = () => openVault();
    const handleOpenSourcingEscrowEvent = (e: any) => {
      const poNum = e.detail?.poNumber || e.detail?.id || e.detail;
      openSourcingEscrow(typeof poNum === 'string' ? poNum : undefined);
    };

    const handleNavigateEvent = (e: any) => {
      const target = (e.detail?.route || e.detail || '').toString().toUpperCase();
      if (target) setCurrentRoute(target);
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').toUpperCase();
      if (hash === 'VOICEINGEST' || hash === 'VOICE_INGEST' || hash === 'VOICE') {
        setCurrentRoute('VOICEINGEST');
      } else if (hash === 'TECHPACK' || hash === 'TECHPACKPO' || hash === 'TECHPACK_PO') {
        setCurrentRoute('TECHPACK');
      } else if (hash === 'CORPORATESUPPLIES' || hash === 'CORPORATE_SUPPLIES' || hash === 'CORPORATE') {
        setCurrentRoute('CORPORATESUPPLIES');
      } else if (hash === 'LOGISTICS' || hash === 'LOGISTICS_HUB' || hash === 'SETTLEMENT' || hash === 'LOGISTICSSETTLEMENTHUB') {
        setCurrentRoute('LOGISTICS');
      } else if (hash === 'FACTORYSLA' || hash === 'FACTORY_SLA' || hash === 'FLOOR_TRACKER' || hash === 'SLA' || hash === 'FACTORY') {
        setCurrentRoute('FACTORYSLA');
      } else if (hash === 'B2B' || hash === 'B2BDEAL' || hash === 'B2B_DEAL' || hash === 'DEALS') {
        setCurrentRoute('B2B');
      } else if (hash === 'FLOOR_BRIDGE' || hash === 'PRODUCTION_FLOOR' || hash === 'FLOORBRIDGE') {
        setCurrentRoute('FLOOR_BRIDGE');
      } else if (hash === 'VAULT' || hash === 'VAULT_REORDER' || hash === 'REORDER_VAULT') {
        setCurrentRoute('VAULT');
      } else if (hash === 'SOURCING_ESCROW' || hash === 'SOURCING' || hash === 'ESCROW' || hash === 'ENTERPRISESOURCING') {
        setCurrentRoute('SOURCING_ESCROW');
      }
    };

    window.addEventListener('nexus:open-techpack', handleOpenTechPackEvent);
    window.addEventListener('nexus:open-voice', handleOpenVoiceEvent);
    window.addEventListener('nexus:open-corporate-supplies', handleOpenCorporateEvent);
    window.addEventListener('nexus:open-logistics', handleOpenLogisticsEvent);
    window.addEventListener('nexus:open-factory-sla', handleOpenFactorySlaEvent);
    window.addEventListener('nexus:open-b2b-deal-engine', handleOpenB2BEvent);
    window.addEventListener('nexus:open-floor-bridge', handleOpenFloorBridgeEvent);
    window.addEventListener('nexus:open-vault', handleOpenVaultEvent);
    window.addEventListener('nexus:open-vault-reorder', handleOpenVaultEvent);
    window.addEventListener('nexus:open-sourcing-escrow', handleOpenSourcingEscrowEvent);
    window.addEventListener('nexus:navigate', handleNavigateEvent);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('nexus:open-techpack', handleOpenTechPackEvent);
      window.removeEventListener('nexus:open-voice', handleOpenVoiceEvent);
      window.removeEventListener('nexus:open-corporate-supplies', handleOpenCorporateEvent);
      window.removeEventListener('nexus:open-logistics', handleOpenLogisticsEvent);
      window.removeEventListener('nexus:open-factory-sla', handleOpenFactorySlaEvent);
      window.removeEventListener('nexus:open-b2b-deal-engine', handleOpenB2BEvent);
      window.removeEventListener('nexus:open-floor-bridge', handleOpenFloorBridgeEvent);
      window.removeEventListener('nexus:open-vault', handleOpenVaultEvent);
      window.removeEventListener('nexus:open-vault-reorder', handleOpenVaultEvent);
      window.removeEventListener('nexus:open-sourcing-escrow', handleOpenSourcingEscrowEvent);
      window.removeEventListener('nexus:navigate', handleNavigateEvent);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [openTechPack, closeTechPack, openVoiceIngest, closeVoiceIngest, openLogistics, closeLogistics, openFactorySla, closeFactorySla, openB2BDeal, closeB2BDeal, openFloorBridge, closeFloorBridge, openVault, closeVault, openSourcingEscrow, closeSourcingEscrow, isTechPackOpen, isVoiceIngestOpen, isLogisticsOpen, isFactorySlaOpen, isB2BDealOpen, isFloorBridgeOpen, isVaultOpen, isSourcingEscrowOpen, currentRoute, lastExtractedSpec, customers, products, orders]);

  // View switch/case rendering
  const renderCurrentView = () => {
    switch (currentRoute.toUpperCase()) {
      case 'VOICEINGEST':
      case 'VOICE_INGEST':
      case 'VOICE':
      case 'VOICEPOINGESTION':
      case 'VOICE_PO_INGEST':
      case 'VOICEINGESTION':
        return (
          <div className="voice-ingest-router-view p-4 sm:p-6 max-w-5xl mx-auto font-mono text-[#1e293b] bg-white/85 backdrop-blur-xl rounded-2xl border border-white/90 my-4 shadow-[4px_4px_20px_rgba(166,180,200,0.35),-4px_-4px_20px_#ffffff]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">
                  Audio Procurement Intelligence · Gemini Flash
                </div>
                <h2 className="text-xl font-bold text-[#1e293b]">Voice PO Ingestion &amp; Audio AI Dock</h2>
                <p className="text-xs text-[#64748b] mt-1">
                  Record voice commands or drop buyer audio notes to extract apparel specs directly into production POs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('TECHPACK')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-[#d97706] hover:bg-[#b45309] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('DEFAULT')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-white/90 hover:bg-white border border-slate-200 text-[#475569] hover:text-[#1e293b] transition-all cursor-pointer shadow-sm"
                >
                  ✕ CLOSE VIEW
                </button>
              </div>
            </div>
            <VoicePOIngestion
              onSpecExtracted={handleVoiceSpecExtracted}
              onCancel={() => setCurrentRoute('DEFAULT')}
              autoPopulateOnReady={true}
            />
          </div>
        );

      case 'TECHPACK':
      case 'TECHPACKPO':
      case 'TECHPACK_PO':
      case 'TECH_PACK':
      case 'TECHPACKPOENGINE':
      case 'TECH_PACK_PO':
        return (
          <div className="techpack-router-view p-3 max-w-7xl mx-auto my-4">
            <TechPackPOEngine
              isOpen={true}
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
              preSelectedCustomer={preSelectedCustomer}
              initialPOSpec={lastExtractedSpec || undefined}
              onSuccess={(specOrder) => {
                const successMsg = `PO ${specOrder?.poNumber || 'Order'} saved to factory ledger & queue!`;
                setToastNotification(successMsg);
                if (typeof (window as any).toast === 'function') {
                  (window as any).toast(successMsg, 'ok');
                }
              }}
            />
          </div>
        );

      case 'CORPORATESUPPLIES':
      case 'CORPORATE_SUPPLIES':
      case 'CORPORATE':
      case 'CORPORATESUPPLY':
        return (
          <div className="corporate-router-view w-full">
            <CorporateSupplies />
          </div>
        );

      case 'LOGISTICS':
      case 'LOGISTICS_HUB':
      case 'LOGISTICSSETTLEMENTHUB':
      case 'LOGISTICS_SETTLEMENT':
      case 'SETTLEMENT':
        return (
          <div className="logistics-router-view max-w-7xl mx-auto my-4">
            <LogisticsSettlementHub
              initialOrder={preSelectedLogisticsOrder}
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      case 'FACTORYSLA':
      case 'FACTORY_SLA':
      case 'FACTORY':
      case 'FACTORY_FLOOR':
      case 'FLOOR_TRACKER':
      case 'FACTORYSLAFLOORTRACKER':
      case 'SLA':
        return (
          <div className="factory-sla-router-view max-w-7xl mx-auto my-4">
            <FactorySlaFloorTracker
              initialPoNumber={preSelectedSlaPo || undefined}
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      case 'B2B':
      case 'B2BDEAL':
      case 'B2B_DEAL':
      case 'DEALS':
        return (
          <div className="b2b-deal-router-view max-w-7xl mx-auto my-4">
            <B2BDealEngine
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      case 'FLOOR_BRIDGE':
      case 'PRODUCTION_FLOOR':
      case 'FLOORBRIDGE':
        return (
          <div className="floor-bridge-router-view max-w-7xl mx-auto my-4">
            <ProductionFloorAndSettlementBridge
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      case 'VAULT':
      case 'VAULT_REORDER':
      case 'REORDER_VAULT':
        return (
          <div className="vault-router-view max-w-7xl mx-auto my-4">
            <VaultAndReorderEngine
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      case 'SOURCING_ESCROW':
      case 'SOURCING':
      case 'ESCROW':
      case 'ENTERPRISESOURCING':
        return (
          <div className="sourcing-escrow-router-view max-w-7xl mx-auto my-4">
            <EnterpriseSourcingAndFactoryEscrow
              mode="embedded"
              initialContractPo={preSelectedEscrowPo || undefined}
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`nexus-react-system ${className}`}>
      {/* ── Toast Notification Banner ── */}
      {toastNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[10001] max-w-lg w-11/12 bg-white/95 backdrop-blur-xl border border-amber-500/60 text-[#1e293b] text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center justify-between gap-3 font-mono animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚡</span>
            <span>{toastNotification}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Router Active View Switch/Case ── */}
      {renderCurrentView()}

      {/* ── Tech Pack PO Engine (Modal Mode) ── */}
      {isTechPackOpen && (
        <TechPackPOEngine
          isOpen={isTechPackOpen}
          onClose={closeTechPack}
          preSelectedCustomer={preSelectedCustomer}
          mode="modal"
          initialPOSpec={lastExtractedSpec || undefined}
          onSuccess={(specOrder) => {
            const successMsg = `PO ${specOrder?.poNumber || 'Order'} saved to factory ledger & queue!`;
            setToastNotification(successMsg);
            if (typeof (window as any).toast === 'function') {
              (window as any).toast(successMsg, 'ok');
            }
          }}
        />
      )}

      {/* ── Voice PO Ingestion Modal / Drawer ── */}
      {isVoiceIngestOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(166,180,200,0.5)] overflow-hidden flex flex-col my-auto text-[#1e293b]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white/90 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-amber-600 uppercase">
                      VOICE PO INGESTION &amp; AUDIO AI DOCK
                    </span>
                    <span className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                      GEMINI FLASH
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] font-mono mt-0.5">
                    Speak or drag WhatsApp voice notes / voice memos to extract structured tech-pack POs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openTechPack()}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-[#d97706] hover:bg-[#b45309] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Switch directly to Tech-Pack PO Engine"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO</span>
                </button>
                <button
                  type="button"
                  onClick={closeVoiceIngest}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-white/90 hover:bg-white border border-slate-200 text-[#475569] hover:text-[#1e293b] transition-all cursor-pointer shadow-sm"
                  title="Close modal"
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
              <VoicePOIngestion
                onSpecExtracted={handleVoiceSpecExtracted}
                onCancel={closeVoiceIngest}
                autoPopulateOnReady={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Logistics & COD Settlement Dock (Modal Mode) ── */}
      {isLogisticsOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
          onClick={closeLogistics}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LogisticsSettlementHub
              initialOrder={preSelectedLogisticsOrder}
              mode="modal"
              onClose={closeLogistics}
            />
          </div>
        </div>
      )}

      {/* ── Factory Floor & SLA Monitor (Modal Mode) ── */}
      {isFactorySlaOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto"
          onClick={closeFactorySla}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <FactorySlaFloorTracker
              initialPoNumber={preSelectedSlaPo || undefined}
              mode="modal"
              onClose={closeFactorySla}
            />
          </div>
        </div>
      )}

      {/* ── B2B Deal Engine (Modal Mode) ── */}
      {isB2BDealOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={closeB2BDeal}
        >
          <div
            className="relative w-full max-w-7xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <B2BDealEngine
              mode="modal"
              onClose={closeB2BDeal}
            />
          </div>
        </div>
      )}

      {/* ── Production Floor Bridge (Modal Mode) ── */}
      {isFloorBridgeOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={closeFloorBridge}
        >
          <div
            className="relative w-full max-w-7xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductionFloorAndSettlementBridge
              mode="modal"
              onClose={closeFloorBridge}
            />
          </div>
        </div>
      )}

      {/* ── Vault & Reorder Engine (Modal Mode) ── */}
      {isVaultOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={closeVault}
        >
          <div
            className="relative w-full max-w-7xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <VaultAndReorderEngine
              mode="modal"
              onClose={closeVault}
            />
          </div>
        </div>
      )}

      {/* ── Enterprise Sourcing & Factory Escrow (Modal Mode) ── */}
      {isSourcingEscrowOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={closeSourcingEscrow}
        >
          <div
            className="relative w-full max-w-7xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <EnterpriseSourcingAndFactoryEscrow
              mode="modal"
              initialContractPo={preSelectedEscrowPo || undefined}
              onClose={closeSourcingEscrow}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
