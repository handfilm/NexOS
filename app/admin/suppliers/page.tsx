'use client';

import React from 'react';
import SuppliersManagementDashboard from '@/src/components/SuppliersManagementDashboard';

export default function AdminSuppliersPage() {
  return (
    <main className="min-h-screen bg-slate-100/60 py-6 px-3 sm:px-6">
      <SuppliersManagementDashboard mode="embedded" />
    </main>
  );
}
