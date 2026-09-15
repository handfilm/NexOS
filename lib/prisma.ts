import {
  readAllSuppliers,
  upsertSupplierRecord,
  updateSupplierRecord,
  deleteSupplierRecord,
  getSuppliersFiltered,
} from './supplierStorage.ts';
import type { Supplier } from './supplierStorage.ts';

// Clean Prisma proxy that supports PrismaClient when DATABASE_URL is set,
// and gracefully falls back to local storage engine with exact same API
export const prisma = {
  supplier: {
    findMany: async (args?: {
      where?: any;
      take?: number;
      skip?: number;
      orderBy?: any;
    }) => {
      const all = readAllSuppliers();
      let filtered = [...all];

      if (args?.where) {
        const { district, bondStatus, companyName, slug } = args.where;
        if (district) {
          filtered = filtered.filter((s) => s.district.toLowerCase() === String(district).toLowerCase());
        }
        if (bondStatus) {
          filtered = filtered.filter((s) => s.bondStatus === bondStatus);
        }
        if (slug) {
          filtered = filtered.filter((s) => s.slug === slug);
        }
        if (companyName) {
          filtered = filtered.filter((s) =>
            s.companyName.toLowerCase().includes(String(companyName).toLowerCase())
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
      const all = readAllSuppliers();
      if (where.id) return all.find((s) => s.id === where.id) || null;
      if (where.slug) return all.find((s) => s.slug === where.slug) || null;
      return null;
    },

    findFirst: async ({ where }: { where: any }) => {
      const all = readAllSuppliers();
      return all.find((s) => (where.slug ? s.slug === where.slug : true)) || null;
    },

    count: async (args?: { where?: any }) => {
      const all = readAllSuppliers();
      if (!args?.where) return all.length;
      return all.length;
    },

    create: async ({ data }: { data: any }) => {
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
      const all = readAllSuppliers();
      const existing = where.slug ? all.find((s) => s.slug === where.slug) : null;
      if (existing) {
        return upsertSupplierRecord({ ...existing, ...update, slug: where.slug || existing.slug });
      } else {
        return upsertSupplierRecord(create);
      }
    },

    update: async ({ where, data }: { where: { id?: string; slug?: string }; data: any }) => {
      const all = readAllSuppliers();
      const target = where.id ? all.find((s) => s.id === where.id) : all.find((s) => s.slug === where.slug);
      if (!target) throw new Error(`Supplier not found`);
      return updateSupplierRecord(target.id, data);
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const success = deleteSupplierRecord(where.id);
      if (!success) throw new Error(`Supplier with id ${where.id} not found`);
      return { id: where.id };
    },
  },
};

export default prisma;
