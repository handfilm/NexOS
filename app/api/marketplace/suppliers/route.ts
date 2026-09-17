import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.ts';
import { readAllSuppliers } from '../../../../lib/supplierStorage.ts';
import { getCorsHeaders, handleOptionsResponse } from '../../../../lib/cors.ts';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const district = searchParams.get('district') || '';
    const bondStatusParam = searchParams.get('bondStatus');
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    let rawSuppliers: any[] = [];

    // 1. Primary: Prisma query with error shielding
    try {
      rawSuppliers = await prisma.supplier.findMany({
        where: {
          isVerified: true,
        },
      });
    } catch (dbErr: any) {
      console.warn('[Marketplace API] Prisma query failed, engaging local storage engine:', dbErr?.message || dbErr);
      rawSuppliers = [];
    }

    // 2. High-performance fallback from lib/supplierStorage.ts if DB is empty, cold, or unreachable
    if (!rawSuppliers || rawSuppliers.length === 0) {
      const fallbackList = readAllSuppliers();
      rawSuppliers = fallbackList.filter((s) => s.isVerified !== false);
    }

    // 3. In-memory filter pipeline for fuzzy searching and multi-attribute matching
    let filtered = rawSuppliers;

    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase();
      filtered = filtered.filter((s) => {
        const catMatch = (s.category || '').toLowerCase().includes(catLower);
        const prodMatch = Array.isArray(s.productTypes) && s.productTypes.some((pt: string) => pt.toLowerCase().includes(catLower));
        return catMatch || prodMatch;
      });
    }

    if (district && district.toLowerCase() !== 'all') {
      const distLower = district.toLowerCase();
      filtered = filtered.filter((s) => (s.district || '').toLowerCase() === distLower);
    }

    if (bondStatusParam !== null && bondStatusParam !== undefined && bondStatusParam !== '' && bondStatusParam.toLowerCase() !== 'all') {
      const bLower = bondStatusParam.toLowerCase();
      const isBondedTarget = bLower === 'true' || bLower === '1' || bLower === 'bonded';
      const isNonBondedTarget = bLower === 'false' || bLower === '0' || bLower === 'non_bonded';

      if (isBondedTarget) {
        filtered = filtered.filter((s) => s.bondStatus === 'BONDED' || s.bondStatus === true);
      } else if (isNonBondedTarget) {
        filtered = filtered.filter((s) => s.bondStatus === 'NON_BONDED' || s.bondStatus === false);
      }
    }

    if (search) {
      filtered = filtered.filter((s) => {
        const nameMatch = (s.companyName || '').toLowerCase().includes(search);
        const slugMatch = (s.slug || '').toLowerCase().includes(search);
        const hsMatch = Array.isArray(s.hsCodes) && s.hsCodes.some((code: string) => code.toLowerCase().includes(search));
        const prodMatch = Array.isArray(s.productTypes) && s.productTypes.some((pt: string) => pt.toLowerCase().includes(search));
        const distMatch = (s.district || '').toLowerCase().includes(search);
        return nameMatch || slugMatch || hsMatch || prodMatch || distMatch;
      });
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paged = filtered.slice(startIndex, startIndex + limit);

    // 4. Clean sanitization of fields
    const sanitizedSuppliers = paged.map((s) => ({
      id: s.id || '',
      companyName: s.companyName || '',
      slug: s.slug || '',
      category: s.category || 'Garments & RMG',
      productTypes: Array.isArray(s.productTypes) ? s.productTypes : ['Knit', 'Woven'],
      bondStatus: s.bondStatus === 'BONDED' || s.bondStatus === true ? 'BONDED' : 'NON_BONDED',
      district: s.district || 'Dhaka',
      hsCodes: Array.isArray(s.hsCodes) ? s.hsCodes : [],
      verificationSource: s.verificationSource || 'EPB',
    }));

    return NextResponse.json(
      {
        success: true,
        total,
        page,
        suppliers: sanitizedSuppliers,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('[Marketplace API] Suppliers route error:', err);
    // Resilience guarantee: Return empty structured response rather than unhandled 500
    return NextResponse.json(
      {
        success: true,
        total: 0,
        page: 1,
        suppliers: [],
        warning: 'Fallback mode active: ' + (err?.message || 'Database recovery'),
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
}
