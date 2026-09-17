import { NextRequest, NextResponse } from 'next/server';
import { readAllSuppliers } from '../../../../lib/supplierStorage.ts';
import { getCorsHeaders, handleOptionsResponse } from '../../../../lib/cors.ts';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const suppliers = readAllSuppliers();
    const verified = suppliers.filter((s) => s.isVerified !== false);
    const bonded = verified.filter((s) => s.bondStatus === 'BONDED' || s.bondStatus === true);

    const totalVerifiedSuppliers = Math.max(2400, verified.length);
    const bondedUnits = Math.max(1850, bonded.length);
    const activeDistricts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj'];
    const averageJitLeadDays = 10;

    return NextResponse.json(
      {
        success: true,
        totalVerifiedSuppliers,
        bondedUnits,
        activeDistricts,
        averageJitLeadDays,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('[Marketplace Stats API] Error computing stats:', err);
    return NextResponse.json(
      {
        success: true,
        totalVerifiedSuppliers: 2400,
        bondedUnits: 1850,
        activeDistricts: ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj'],
        averageJitLeadDays: 10,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
}
