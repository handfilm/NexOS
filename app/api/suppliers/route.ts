import { NextRequest, NextResponse } from 'next/server';
import { GET as marketplaceGet, OPTIONS as marketplaceOptions } from '../marketplace/suppliers/route.ts';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return marketplaceOptions(request);
}

export async function GET(request: NextRequest) {
  return marketplaceGet(request);
}
