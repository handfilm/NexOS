import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCorsHeaders, handleOptionsResponse } from '../../../../lib/cors.ts';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RFQS_FILE = path.join(DATA_DIR, 'rfqs.json');

const rfqSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  quantity: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number({ invalid_type_error: 'Quantity must be a valid number' }).positive('Quantity must be greater than 0')
  ),
  targetUnitPrice: z.union([z.string(), z.number()]).optional(),
  specs: z.string().min(1, 'Product specifications are required'),
  contactEmail: z.string().min(3, 'Valid contact email or phone number is required'),
  techPackUrl: z.string().optional().nullable(),
  buyerName: z.string().optional(),
  companyName: z.string().optional(),
});

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

function safeWriteJson(filePath: string, data: any): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Marketplace RFQ] Storage write error:', err);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const rawBody = await request.json();
    const parseResult = rfqSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: parseResult.error.format(),
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const data = parseResult.data;
    const rfqId = 'BD-RFQ-' + randomUUID().slice(0, 8).toUpperCase();
    const now = new Date().toISOString();

    const pipelineEntry = {
      id: rfqId,
      rfqId,
      orderNumber: rfqId,
      type: 'B2B_RFQ',
      status: 'Open / Lead',
      stage: 'RFQ / Ingestion',
      category: data.category,
      quantity: data.quantity,
      targetUnitPrice: data.targetUnitPrice || null,
      specs: data.specs,
      customer: {
        name: data.buyerName || data.companyName || 'B2B Prospective Buyer',
        email: data.contactEmail.includes('@') ? data.contactEmail : '',
        phone: !data.contactEmail.includes('@') ? data.contactEmail : '',
        contact: data.contactEmail,
        company: data.companyName || '',
      },
      techPackUrl: data.techPackUrl || null,
      financials: {
        estimatedTotal: data.targetUnitPrice ? Number(data.targetUnitPrice) * data.quantity : null,
        advancePaymentRequired: '50%',
        advanceTerms: 'JIT 50% Advance / 50% Upon BL Dispatch',
        currency: 'USD',
      },
      pipeline: {
        status: 'Open / Lead',
        assignedTier: 'Verified Exporter Network',
        source: 'b2b.handsandhead.com',
        routedToVerifiedExporters: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Store into RFQs file
    const existingRfqs = safeReadJson<any[]>(RFQS_FILE, []);
    existingRfqs.unshift(pipelineEntry);
    safeWriteJson(RFQS_FILE, existingRfqs);

    // Store into Orders pipeline as status "Open / Lead" for JIT 50% advance system
    const existingOrders = safeReadJson<any[]>(ORDERS_FILE, []);
    existingOrders.unshift(pipelineEntry);
    safeWriteJson(ORDERS_FILE, existingOrders);

    return NextResponse.json(
      {
        success: true,
        rfqId,
        message: 'RFQ successfully routed to verified exporters.',
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('[Marketplace RFQ] Submission processing error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process RFQ submission: ' + (err?.message || 'Server error'),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
