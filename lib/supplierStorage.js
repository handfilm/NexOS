import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../data/suppliers.json");
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}
let cachedSuppliers = null;
let lastMtime = 0;
function readAllSuppliers() {
  ensureDataFile();
  try {
    const stat = fs.statSync(DATA_FILE);
    if (cachedSuppliers && stat.mtimeMs === lastMtime) {
      return cachedSuppliers;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    let needsRewrite = false;
    const cleaned = data.map((s, idx) => {
      if (!s.id || typeof s.id !== "string" || s.id.trim() === "") {
        s.id = "sup_" + (s.slug ? s.slug.replace(/[^a-z0-9]/gi, "_") : `exp_${idx}_${Date.now().toString(36)}`);
        needsRewrite = true;
      }
      return s;
    });
    if (needsRewrite) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(cleaned, null, 2), "utf8");
      try {
        lastMtime = fs.statSync(DATA_FILE).mtimeMs;
      } catch (e) {
      }
    } else {
      lastMtime = stat.mtimeMs;
    }
    cachedSuppliers = cleaned;
    return cleaned;
  } catch (err) {
    console.error("[SupplierStorage] Failed to read suppliers.json:", err);
    return cachedSuppliers || [];
  }
}
function writeAllSuppliers(suppliers) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(suppliers, null, 2), "utf8");
    cachedSuppliers = suppliers;
    try {
      lastMtime = fs.statSync(DATA_FILE).mtimeMs;
    } catch (e) {
    }
  } catch (err) {
    console.error("[SupplierStorage] Failed to write suppliers.json:", err);
  }
}
function getSuppliersFiltered(options = {}) {
  const all = readAllSuppliers();
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const query = (options.q || "").trim().toLowerCase();
  const district = (options.district || "").trim().toLowerCase();
  const bondStatus = (options.bondStatus || "").trim().toUpperCase();
  const productType = (options.type || "").trim().toLowerCase();
  const certFilter = (options.cert || "").trim().toLowerCase();
  let filtered = all.filter((s) => {
    if (district && district !== "all" && s.district.toLowerCase() !== district) {
      return false;
    }
    if (bondStatus && bondStatus !== "ALL" && s.bondStatus.toUpperCase() !== bondStatus) {
      return false;
    }
    if (productType && productType !== "all") {
      const matchType = s.productTypes?.some((t) => t.toLowerCase().includes(productType));
      if (!matchType) return false;
    }
    if (certFilter && certFilter !== "all") {
      const matchCert = s.certifications?.some((c) => c.toLowerCase().includes(certFilter));
      if (!matchCert) return false;
    }
    if (query) {
      const nameMatch = s.companyName.toLowerCase().includes(query);
      const slugMatch = s.slug.toLowerCase().includes(query);
      const hsMatch = s.hsCodes?.some((code) => code.toLowerCase().includes(query));
      const districtMatch = s.district.toLowerCase().includes(query);
      const contactMatch = s.contactPerson?.toLowerCase().includes(query);
      const addressMatch = s.factoryAddress?.toLowerCase().includes(query);
      const certMatch = s.certifications?.some((c) => c.toLowerCase().includes(query));
      const epbMatch = s.epbId?.toLowerCase().includes(query);
      if (!nameMatch && !slugMatch && !hsMatch && !districtMatch && !contactMatch && !addressMatch && !certMatch && !epbMatch) {
        return false;
      }
    }
    return true;
  });
  if (options.sort === "name_asc") {
    filtered.sort((a, b) => a.companyName.localeCompare(b.companyName));
  } else if (options.sort === "name_desc") {
    filtered.sort((a, b) => b.companyName.localeCompare(a.companyName));
  } else if (options.sort === "district") {
    filtered.sort((a, b) => a.district.localeCompare(b.district));
  } else if (options.sort === "rating_desc") {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (options.sort === "compliance_desc") {
    filtered.sort((a, b) => (b.complianceScore || 0) - (a.complianceScore || 0));
  } else {
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);
  return {
    suppliers: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    stats: calculateSupplierStats(all)
  };
}
function calculateSupplierStats(all) {
  const totalCount = all.length;
  let bondedCount = 0;
  let nonBondedCount = 0;
  let unknownCount = 0;
  const districtCounts = {};
  for (const s of all) {
    const status = s.bondStatus?.toUpperCase();
    if (status === "BONDED") bondedCount++;
    else if (status === "NON_BONDED") nonBondedCount++;
    else unknownCount++;
    const dist = s.district?.trim() || "Unknown";
    districtCounts[dist] = (districtCounts[dist] || 0) + 1;
  }
  const bondedRatio = totalCount > 0 ? Math.round(bondedCount / totalCount * 100) : 0;
  const topDistricts = Object.entries(districtCounts).map(([district, count]) => ({
    district,
    count,
    percentage: totalCount > 0 ? Math.round(count / totalCount * 100) : 0
  })).sort((a, b) => b.count - a.count).slice(0, 6);
  return {
    totalCount,
    bondedCount,
    nonBondedCount,
    unknownCount,
    bondedRatio,
    topDistricts
  };
}
function upsertSupplierRecord(data) {
  const all = readAllSuppliers();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingIndex = all.findIndex(
    (s) => s.slug === data.slug || s.companyName.toLowerCase() === data.companyName.toLowerCase()
  );
  if (existingIndex >= 0) {
    const existing = all[existingIndex];
    const updated = {
      ...existing,
      ...data,
      id: existing.id || data.id || `sup_${data.slug ? data.slug.replace(/[^a-z0-9]/gi, "_") : Date.now().toString(36)}`,
      slug: data.slug || existing.slug,
      productTypes: data.productTypes || existing.productTypes || ["Knit", "Woven"],
      hsCodes: data.hsCodes && data.hsCodes.length > 0 ? data.hsCodes : existing.hsCodes || [],
      bondStatus: data.bondStatus || existing.bondStatus || "BONDED",
      updatedAt: now
    };
    all[existingIndex] = updated;
    writeAllSuppliers(all);
    return updated;
  } else {
    const newRecord = {
      id: data.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: "Garments & RMG",
      productTypes: ["Knit", "Woven"],
      bondStatus: "BONDED",
      district: "Dhaka",
      hsCodes: [],
      verificationSource: "EPB",
      isVerified: true,
      ...data,
      companyName: data.companyName.trim(),
      slug: data.slug.trim(),
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    all.push(newRecord);
    writeAllSuppliers(all);
    return newRecord;
  }
}
function updateSupplierRecord(id, updates) {
  const all = readAllSuppliers();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  all[idx] = {
    ...all[idx],
    ...updates,
    id: all[idx].id,
    updatedAt: now
  };
  writeAllSuppliers(all);
  return all[idx];
}
function batchUpsertSuppliers(incoming) {
  const current = readAllSuppliers();
  const map = /* @__PURE__ */ new Map();
  for (const s of current) {
    if (s.slug) map.set(s.slug, s);
    else if (s.id) map.set(s.id, s);
  }
  let added = 0;
  let updated = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of incoming) {
    const existing = item.slug ? map.get(item.slug) : null;
    if (existing) {
      map.set(item.slug, {
        ...existing,
        ...item,
        id: existing.id || item.id || `sup_${item.slug.replace(/[^a-z0-9]/gi, "_")}`,
        updatedAt: now
      });
      updated++;
    } else {
      const id = item.id || `sup_${item.slug ? item.slug.replace(/[^a-z0-9]/gi, "_") : Date.now().toString(36)}`;
      map.set(item.slug || id, {
        ...item,
        id,
        createdAt: item.createdAt || now,
        updatedAt: now
      });
      added++;
    }
  }
  const merged = Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  writeAllSuppliers(merged);
  return { total: merged.length, added, updated };
}
function deleteSupplierRecord(id) {
  const all = readAllSuppliers();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;
  writeAllSuppliers(filtered);
  return true;
}
export {
  batchUpsertSuppliers,
  calculateSupplierStats,
  deleteSupplierRecord,
  getSuppliersFiltered,
  readAllSuppliers,
  updateSupplierRecord,
  upsertSupplierRecord,
  writeAllSuppliers
};
