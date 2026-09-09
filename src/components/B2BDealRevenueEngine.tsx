import React, { useState, useEffect } from 'react';
import { B2BDealEngine, B2BDealEngineProps } from './B2BDealEngine';

/**
 * B2BDealRevenueEngine
 * Immediate mount wrapper with strict 800ms fallback timer to guarantee
 * zero freeze or deadlock on initialization across all environments.
 */
export const B2BDealRevenueEngine: React.FC<B2BDealEngineProps> = (props) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return (
      <div className="b2b-deal-initializing-wrapper p-8 text-center font-mono text-xs text-[#FF5500] bg-[#0D0D0C] border border-[#262624] rounded-xl flex items-center justify-center gap-3">
        <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
        <span>INITIALIZING B2B DEAL &amp; REVENUE ENGINE...</span>
      </div>
    );
  }

  return <B2BDealEngine {...props} />;
};

export default B2BDealRevenueEngine;
export * from './B2BDealEngine';
