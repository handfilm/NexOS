/**
 * Next.js App Router API Handler for Suppliers Management
 * Route: /api/suppliers
 * Supports:
 * - GET: Pagination, full-text debounced search (Name, HS codes), multi-facet filtering (district, bondStatus, type)
 * - POST: Create supplier with Zod validation
 * - PUT: Update supplier with Zod validation
 * - DELETE: Delete supplier by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getSuppliersFiltered,
  upsertSupplierRecord,
  updateSupplierRecord,
  deleteSupplierRecord,
  readAllSuppliers,
  calculateSupplierStats,
} from '@/lib/supplierStorage';

// ── Zod Schemas for Strict Input Validation ──

export const SupplierCreateSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(150),
  slug: z.string().optional(),
  category: z.string().default('Garments & RMG'),
  productTypes: z
    .array(z.string())
    .min(1, 'At least one product type is required')
    .default(['Knit', 'Woven']),
  bondStatus: z.enum(['BONDED', 'NON_BONDED', 'UNKNOWN']).default('BONDED'),
  district: z.string().min(2, 'District is required'),
  hsCodes: z.array(z.string()).default([]),
  verificationSource: z.string().nullable().optional().default('EPB'),
  isVerified: z.boolean().default(true),
});

export const SupplierUpdateSchema = z.object({
  id: z.string().min(1, 'Supplier ID is required for update'),
  companyName: z.string().min(2).max(150).optional(),
  slug: z.string().optional(),
  category: z.string().optional(),
  productTypes: z.array(z.string()).optional(),
  bondStatus: z.enum(['BONDED', 'NON_BONDED', 'UNKNOWN']).optional(),
  district: z.string().min(2).optional(),
  hsCodes: z.array(z.string()).optional(),
  verificationSource: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
});

export const SupplierQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional().default(''),
  district: z.string().optional().default(''),
  bondStatus: z.string().optional().default(''),
  type: z.string().optional().default(''),
  sort: z.string().optional().default('newest'),
});

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.floor(1000 + Math.random() * 9000)
  );
}

// ── GET: Paginated & Filtered Suppliers with Global Stats ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      district: searchParams.get('district') ?? undefined,
      bondStatus: searchParams.get('bondStatus') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
    };

    const validated = SupplierQuerySchema.parse(rawParams);
    const result = getSuppliersFiltered(validated);

    return NextResponse.json({
      success: true,
      data: result.suppliers,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve suppliers' },
      { status: 500 }
    );
  }
}

// ── POST: Create New Supplier Record ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SupplierCreateSchema.parse(body);

    const slug = validated.slug?.trim() || generateSlug(validated.companyName);

    const newSupplier = upsertSupplierRecord({
      ...validated,
      slug,
      verificationSource: validated.verificationSource || 'EPB',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Supplier "${newSupplier.companyName}" successfully registered.`,
        data: newSupplier,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create supplier' },
      { status: 500 }
    );
  }
}

// ── PUT: Update Existing Supplier Record ──
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SupplierUpdateSchema.parse(body);

    const { id, ...updates } = validated;
    const updated = updateSupplierRecord(id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Supplier with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Supplier "${updated.companyName}" updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// ── DELETE: Remove Supplier by ID ──
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "id" is required for deletion.' },
        { status: 400 }
      );
    }

    const removed = deleteSupplierRecord(id);
    if (!removed) {
      return NextResponse.json(
        { success: false, error: `Supplier with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Supplier record successfully deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
