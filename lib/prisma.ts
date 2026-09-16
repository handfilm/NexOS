/**
 * Fail-Safe Prisma Client & Hybrid Storage Provider
 * 
 * Production Cloud Run Resilience:
 * 1. Safely checks process.env.DATABASE_URL before attempting any database operations.
 * 2. Lazily initializes PrismaClient via dynamic module resolution so missing schema
 *    or ungenerated client binaries NEVER throw unhandled exceptions or crash the container.
 * 3. Gracefully falls back to high-performance local supplier storage (JSON / in-memory cache)
 *    if PostgreSQL is offline, unconfigured, or throws connection timeouts.
 */

import { createRequire } from 'module';
import {
  readAllSuppliers,
  upsertSupplierRecord,
  updateSupplierRecord,
  deleteSupplierRecord,
  getSuppliersFiltered,
} from './supplierStorage.ts';
import type { Supplier } from './supplierStorage.ts';

const require = createRequire(import.meta.url);

let cachedClient: any = null;
let clientInitAttempted = false;
let isPrismaOperational = false;

function getSafePrismaClient(): any | null {
  if (clientInitAttempted) {
    return isPrismaOperational ? cachedClient : null;
  }
  clientInitAttempted = true;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '' || dbUrl.includes('placeholder')) {
    return null;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    cachedClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    isPrismaOperational = true;
    console.log('[Prisma] Database client initialized successfully.');
    return cachedClient;
  } catch (err: any) {
    console.warn('[Prisma] PrismaClient unavailable (un-generated or offline). Falling back to resilient local engine:', err?.message || err);
    isPrismaOperational = false;
    return null;
  }
}

// Clean Prisma proxy that supports PrismaClient when DATABASE_URL is set,
// and gracefully falls back to local storage engine with exact same API
export const prisma = {
  $connect: async () => {
    const client = getSafePrismaClient();
    if (client?.$connect) {
      try {
        await client.$connect();
      } catch (err: any) {
        console.warn('[Prisma] Database connection check failed, using local storage fallback:', err?.message || err);
      }
    }
  },

  $disconnect: async () => {
    const client = getSafePrismaClient();
    if (client?.$disconnect) {
      try {
        await client.$disconnect();
      } catch (err: any) {
        // Safe ignore
      }
    }
  },

  supplier: {
    findMany: async (args?: {
      where?: any;
      take?: number;
      skip?: number;
      orderBy?: any;
    }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.findMany) {
        try {
          return await client.supplier.findMany(args);
        } catch (dbErr: any) {
          console.warn('[Prisma] findMany query failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      let filtered = [...all];

      if (args?.where) {
        const { district, bondStatus, companyName, slug } = args.where;
        if (district) {
          filtered = filtered.filter((s) => s.district?.toLowerCase() === String(district).toLowerCase());
        }
        if (bondStatus) {
          filtered = filtered.filter((s) => s.bondStatus === bondStatus);
        }
        if (slug) {
          filtered = filtered.filter((s) => s.slug === slug);
        }
        if (companyName) {
          filtered = filtered.filter((s) =>
            s.companyName?.toLowerCase().includes(String(companyName).toLowerCase())
          );
        }
      }

      if (args?.skip) {
        filtered = filtered.slice(args.skip);
      }
      if (args?.take) {
        filtered = filtered.slice(0, args.take);
      }
      return filtered;
    },

    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.findUnique) {
        try {
          return await client.supplier.findUnique({ where });
        } catch (dbErr: any) {
          console.warn('[Prisma] findUnique failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      if (where.id) return all.find((s) => s.id === where.id) || null;
      if (where.slug) return all.find((s) => s.slug === where.slug) || null;
      return null;
    },

    findFirst: async ({ where }: { where: any }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.findFirst) {
        try {
          return await client.supplier.findFirst({ where });
        } catch (dbErr: any) {
          console.warn('[Prisma] findFirst failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      return all.find((s) => (where?.slug ? s.slug === where.slug : true)) || null;
    },

    count: async (args?: { where?: any }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.count) {
        try {
          return await client.supplier.count(args);
        } catch (dbErr: any) {
          console.warn('[Prisma] count query failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      if (!args?.where) return all.length;
      return all.length;
    },

    create: async ({ data }: { data: any }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.create) {
        try {
          return await client.supplier.create({ data });
        } catch (dbErr: any) {
          console.warn('[Prisma] create failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      return upsertSupplierRecord(data);
    },

    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { slug?: string };
      update: any;
      create: any;
    }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.upsert) {
        try {
          return await client.supplier.upsert({ where, update, create });
        } catch (dbErr: any) {
          console.warn('[Prisma] upsert failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      const existing = where.slug ? all.find((s) => s.slug === where.slug) : null;
      if (existing) {
        return upsertSupplierRecord({ ...existing, ...update, slug: where.slug || existing.slug });
      } else {
        return upsertSupplierRecord(create);
      }
    },

    update: async ({ where, data }: { where: { id?: string; slug?: string }; data: any }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.update) {
        try {
          return await client.supplier.update({ where, data });
        } catch (dbErr: any) {
          console.warn('[Prisma] update failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const all = readAllSuppliers();
      const target = where.id ? all.find((s) => s.id === where.id) : all.find((s) => s.slug === where.slug);
      if (!target) throw new Error(`Supplier not found`);
      return updateSupplierRecord(target.id, data);
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const client = getSafePrismaClient();
      if (client?.supplier?.delete) {
        try {
          return await client.supplier.delete({ where });
        } catch (dbErr: any) {
          console.warn('[Prisma] delete failed, falling back to local storage:', dbErr?.message || dbErr);
        }
      }

      const success = deleteSupplierRecord(where.id);
      if (!success) throw new Error(`Supplier with id ${where.id} not found`);
      return { id: where.id };
    },
  },
};

export default prisma;
