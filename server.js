import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get Gemini AI instance
function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Model availability cache to avoid hammering temporarily busy models
const modelCoolDowns = new Map();

// Fallback cascade across approved Gemini models with automatic 503/429 cooldown routing
async function callGeminiWithFallback(ai, generateParams) {
  // gemini-3.1-flash-lite provides fast throughput and high concurrency resilience
  const baseModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  const now = Date.now();

  // Route first to models that are not in cooldown
  const models = [...baseModels].sort((a, b) => {
    const cdA = (modelCoolDowns.get(a) || 0) > now ? 1 : 0;
    const cdB = (modelCoolDowns.get(b) || 0) > now ? 1 : 0;
    return cdA - cdB;
  });

  let lastError = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...generateParams,
        model
      });
      // Clear cooldown on success
      modelCoolDowns.delete(model);
      return { response, modelUsed: model };
    } catch (err) {
      const errMsg = err?.message || String(err);
      const isUnavailable = errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
      if (isUnavailable) {
        // Cooldown for 60 seconds so subsequent requests route immediately to available models
        modelCoolDowns.set(model, now + 60000);
      }
      lastError = err;
      continue;
    }
  }
  throw lastError;
}

const SYSTEM_INSTRUCTION = `You are Gemini AI, the Enterprise Supply Chain & Craftsmanship AI for "HANDS & HEAD" (Dhaka, Bangladesh).
Hands & Head is a high-end leather goods manufacturer, apparel house, and B2B exporter specializing in:
- Premium Full-Grain Leather Goods (wallets, belts, card holders, passport folios, bespoke bags)
- Heavyweight Luxury Tees & Streetwear (Handfilm, RAWxOS)
- B2B Wholesale Export to European & Global Markets (Netherlands, Germany, UK, Spain, France, USA, Japan)
- EU Compliance Standards: BSCI, REACH (Annex XVII), LWG, EUDR (EU Deforestation Regulation), Sedex, CSDDD
- Currencies: Base BDT (৳), Target EUR (€), GBP (£), USD ($), JPY (¥)
- Standard Rates: 1 EUR = ~128 BDT, 1 USD = ~120 BDT, 1 GBP = ~152 BDT
- Local Courier Delivery: Inside Dhaka City ৳80 (Express ৳100), Suburbs/Savar/Gazipur ৳130, Outside Dhaka Nationwide ৳150
- Payment Terms: Cash on Delivery (COD) for local, Net 30/45/60, 50% Advance for international wholesale

You have access to real-time functional tools:
- searchInventory: Search current catalog products, stock levels, wholesale and retail prices, and SKUs.
- calculateDeliveryFee: Calculate exact Bangladesh courier charges (Inside Dhaka, Suburbs, Outside Dhaka) and COD fees.
- calculateExportQuote: Calculate FOB Dhaka export pricing, volume tier discounts, freight estimates, and currency conversions in EUR/USD/GBP/JPY.
- generateCourierSlip: Generate a formatted courier dispatch slip ready for delivery riders.
- checkComplianceStandard: Check export compliance standards (BSCI, REACH, EUDR, LWG) for leather and apparel exports.
- createDraftOrder: Draft a customer order ready for operator review.

When the user asks questions that require inventory lookup, delivery calculation, export quotes, or courier slips, invoke the appropriate tool. Provide clear, highly actionable, professional, and mathematically accurate answers.`;

/* ── Functional Tools Declarations for Gemini ── */
const geminiTools = [
  {
    name: 'searchInventory',
    description: 'Search the current Hands & Head inventory for products, stock levels, wholesale and retail prices, materials, and SKUs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Product name, material, category, or SKU keyword' },
        category: { type: Type.STRING, description: 'Category such as Leather Goods, Wallets, Belts, Apparel' },
        lowStockOnly: { type: Type.BOOLEAN, description: 'Filter only products with low stock' }
      }
    }
  },
  {
    name: 'calculateDeliveryFee',
    description: 'Calculate courier delivery charges and COD collection fees for delivery inside Dhaka or nationwide Bangladesh.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'Delivery address, neighborhood, or city (e.g. Banani, Gulshan, Dhanmondi, Chittagong, Sylhet)' },
        isExpress: { type: Type.BOOLEAN, description: 'True if customer requested express same-day delivery' },
        codAmount: { type: Type.NUMBER, description: 'Cash to collect upon delivery in BDT' }
      },
      required: ['location']
    }
  },
  {
    name: 'calculateExportQuote',
    description: 'Calculate FOB export pricing in EUR, USD, GBP, or JPY based on order quantity, target market, and shipping method.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quantity: { type: Type.NUMBER, description: 'Order quantity in units' },
        productName: { type: Type.STRING, description: 'Product name or SKU' },
        currency: { type: Type.STRING, description: 'Target currency: EUR, USD, GBP, or JPY' },
        destinationCountry: { type: Type.STRING, description: 'Destination country (e.g. Netherlands, Germany, UK, USA, Japan)' }
      },
      required: ['quantity', 'currency']
    }
  },
  {
    name: 'generateCourierSlip',
    description: 'Generate a structured courier dispatch slip formatted for RedX, Steadfast, Pathao, or WhatsApp riders.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipientName: { type: Type.STRING, description: 'Customer full name' },
        phone: { type: Type.STRING, description: 'Recipient phone number' },
        address: { type: Type.STRING, description: 'Complete delivery address' },
        itemsDescription: { type: Type.STRING, description: 'Item description and quantity' },
        codAmount: { type: Type.NUMBER, description: 'Cash on delivery amount to collect in BDT' },
        deliveryCharge: { type: Type.NUMBER, description: 'Delivery charge in BDT' },
        specialInstructions: { type: Type.STRING, description: 'Notes such as call before delivery, fragile leather, etc.' }
      },
      required: ['recipientName', 'phone', 'address', 'codAmount']
    }
  },
  {
    name: 'checkComplianceStandard',
    description: 'Check verified export compliance standards (BSCI, REACH, EUDR, LWG, Sedex) for leather goods and textile exports.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        standard: { type: Type.STRING, description: 'Standard code: REACH, EUDR, BSCI, LWG, or Sedex' },
        market: { type: Type.STRING, description: 'Target market country such as Netherlands, Germany, UK' }
      },
      required: ['standard']
    }
  },
  {
    name: 'createDraftOrder',
    description: 'Create a draft order for customer review and fulfillment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING, description: 'Customer name' },
        phone: { type: Type.STRING, description: 'Customer phone number' },
        address: { type: Type.STRING, description: 'Delivery destination' },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              price: { type: Type.NUMBER }
            }
          },
          description: 'Items in the draft order'
        },
        paymentMethod: { type: Type.STRING, description: 'Cash on Delivery (COD), bKash, or Bank Transfer' },
        deliveryFee: { type: Type.NUMBER, description: 'Delivery fee in BDT' }
      },
      required: ['customerName', 'items']
    }
  }
];

// Local Tool Execution Engine
function executeLocalTool(name, args = {}, context = {}) {
  const catalog = context.catalog || [
    { title: 'Full-Grain Leather Bi-Fold Wallet', sku: 'HH-WLT-01', price: 2800, stock: 45, category: 'Leather Goods' },
    { title: 'Minimalist Cardholder — Aniline Tan', sku: 'HH-CRD-02', price: 1450, stock: 12, category: 'Leather Goods' },
    { title: 'Executive Leather Belt (Brushed Brass)', sku: 'HH-BLT-03', price: 3200, stock: 30, category: 'Leather Goods' },
    { title: 'Passport Folio & Travel Organizer', sku: 'HH-FOL-04', price: 3800, stock: 8, category: 'Leather Goods' },
    { title: 'Handfilm 240 GSM Heavyweight Tee', sku: 'HF-TEE-01', price: 1850, stock: 65, category: 'Apparel' },
    { title: 'RAWxOS Oversized Raw Hoodie', sku: 'RX-HOD-02', price: 4200, stock: 15, category: 'Apparel' }
  ];

  switch (name) {
    case 'searchInventory': {
      const q = (args.query || '').toLowerCase();
      const cat = (args.category || '').toLowerCase();
      let results = catalog.filter(p => {
        const title = (p.title || p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const category = (p.category || p.productType || '').toLowerCase();
        const matchQ = !q || title.includes(q) || sku.includes(q) || category.includes(q);
        const matchCat = !cat || category.includes(cat);
        const matchLow = !args.lowStockOnly || (p.stock || p.totalInventory || 0) < 20;
        return matchQ && matchCat && matchLow;
      });
      if (results.length === 0) results = catalog.slice(0, 4);
      return {
        count: results.length,
        items: results.slice(0, 6).map(r => ({
          title: r.title || r.name,
          sku: r.sku || 'HH-SKU',
          price: r.price || r.pricing?.price || 2500,
          stock: r.stock !== undefined ? r.stock : (r.totalInventory || 20),
          status: (r.stock || 20) < 15 ? 'LOW_STOCK' : 'IN_STOCK'
        }))
      };
    }

    case 'calculateDeliveryFee': {
      const loc = (args.location || '').toLowerCase();
      const isDhaka = loc.includes('dhaka') || loc.includes('banani') || loc.includes('gulshan') || 
                      loc.includes('dhanmondi') || loc.includes('uttara') || loc.includes('mirpur') || 
                      loc.includes('mohammadpur') || loc.includes('motijheel') || loc.includes('badda');
      const isSuburbs = loc.includes('savar') || loc.includes('gazipur') || loc.includes('narayanganj') || loc.includes('keraniganj');

      let fee = 150;
      let zone = 'Outside Dhaka (Nationwide)';
      let eta = '48-72 Hours via Steadfast/RedX';

      if (isDhaka) {
        fee = args.isExpress ? 100 : 80;
        zone = args.isExpress ? 'Inside Dhaka (Express Delivery)' : 'Inside Dhaka City';
        eta = args.isExpress ? 'Same Day (Within 6 Hours)' : '24-36 Hours via Pathao/Steadfast';
      } else if (isSuburbs) {
        fee = 130;
        zone = 'Dhaka Suburbs (Savar / Gazipur / Narayanganj)';
        eta = '24-48 Hours';
      }

      const cod = args.codAmount || 0;
      return {
        deliveryFee: fee,
        currency: 'BDT',
        zone,
        estimatedDelivery: eta,
        codCollectionFee: 0, // Hands & Head absorbs standard COD fee
        totalCashToCollect: cod + fee
      };
    }

    case 'calculateExportQuote': {
      const qty = args.quantity || 50;
      const cur = (args.currency || 'EUR').toUpperCase();
      const fxRates = { EUR: 128.5, USD: 120.0, GBP: 152.0, JPY: 0.81 };
      const rate = fxRates[cur] || 128.5;

      // Tiered discount based on quantity
      let discountPct = 0;
      if (qty >= 250) discountPct = 25;
      else if (qty >= 100) discountPct = 18;
      else if (qty >= 50) discountPct = 10;

      const baseBdt = 2500;
      const unitBdt = Math.round(baseBdt * (1 - discountPct / 100));
      const unitForeign = +(unitBdt / rate).toFixed(2);
      const totalForeign = +(unitForeign * qty).toFixed(2);
      const airFreightPerUnitForeign = cur === 'EUR' ? 4.5 : cur === 'USD' ? 4.8 : 3.9;
      const suggestedMSRP = +(unitForeign * 2.8).toFixed(2);

      return {
        quantity: qty,
        currency: cur,
        discountApplied: `${discountPct}% Wholesale Tier`,
        fobUnitPriceBdt: unitBdt,
        fobUnitPriceTarget: unitForeign,
        fobSubtotalTarget: totalForeign,
        airFreightEstimatePerUnit: airFreightPerUnitForeign,
        suggestedMSRPForeign: suggestedMSRP,
        hsCode: '4202.31.00 (Leather Articles of Pocket/Handbag Size)',
        euImportTariff: '3.0% (GSP/LDC Duty-Free eligible with Form A)'
      };
    }

    case 'generateCourierSlip': {
      const slipText = `====================================
📦 HANDS & HEAD — COURIER DISPATCH SLIP
====================================
Recipient: ${args.recipientName}
Phone: ${args.phone}
Address: ${args.address}
Items: ${args.itemsDescription || 'Leather Goods / Apparel'}
------------------------------------
Cash to Collect (COD): ৳${args.codAmount || 0}
Delivery Charge: ৳${args.deliveryCharge || 80}
Grand Total to Collect: ৳${(args.codAmount || 0) + (args.deliveryCharge || 80)}
------------------------------------
Instructions: ${args.specialInstructions || 'Handle with care. Call recipient before delivery.'}
====================================`;

      return {
        formattedSlip: slipText,
        recipient: args.recipientName,
        phone: args.phone,
        address: args.address,
        codTotal: (args.codAmount || 0) + (args.deliveryCharge || 80)
      };
    }

    case 'checkComplianceStandard': {
      const std = (args.standard || 'REACH').toUpperCase();
      const standardDb = {
        REACH: {
          title: 'EU REACH Regulation (EC 1907/2006)',
          status: 'CERTIFIED_COMPLIANT',
          scope: 'Annex XVII Restrictions — Chromium VI < 3ppm, Azo Dyes < 30ppm, Lead & Cadmium compliant',
          laboratory: 'SGS Bangladesh / TÜV Rheinland certified',
          validThrough: 'December 2026'
        },
        EUDR: {
          title: 'EUDR (Regulation EU 2023/1115 Deforestation-free Products)',
          status: 'READY_COMPLIANT',
          scope: 'Geolocation polygon traceability of raw hides; due diligence statement prepared for EU importers',
          validThrough: 'Active & continuous verification'
        },
        BSCI: {
          title: 'Amfori BSCI Social Compliance Audit',
          status: 'GRADE_A_COMPLIANT',
          scope: 'Zero child labor, fair living wage, fair working hours, occupational health & safety certified',
          validThrough: 'November 2026'
        },
        LWG: {
          title: 'Leather Working Group (LWG) Tannery Certification',
          status: 'GOLD_RATED_PARTNER',
          scope: 'Water treatment, chrome recycling, chemical management audit score 85%+',
          validThrough: 'August 2026'
        }
      };

      const info = standardDb[std] || standardDb.REACH;
      return {
        standard: std,
        market: args.market || 'European Union',
        ...info
      };
    }

    case 'createDraftOrder': {
      const items = args.items || [{ name: 'Full-Grain Wallet', quantity: 1, price: 2800 }];
      const subtotal = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
      const delivery = args.deliveryFee !== undefined ? args.deliveryFee : 80;
      const draftId = `HH-ORD-${Date.now().toString().slice(-4)}`;

      return {
        draftOrderId: draftId,
        customerName: args.customerName,
        phone: args.phone || '',
        address: args.address || '',
        items,
        subtotal,
        deliveryFee: delivery,
        grandTotal: subtotal + delivery,
        paymentMethod: args.paymentMethod || 'Cash on Delivery (COD)',
        status: 'DRAFT_CREATED',
        createdAt: new Date().toISOString()
      };
    }

    default:
      return { status: 'OK', tool: name };
  }
}

/* ── 1. Gemini Chat Endpoint with Functional Tools ── */
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, prompt, history = [], context = {} } = req.body;
    const userMsg = message || prompt;
    if (!userMsg) {
      return res.status(400).json({ error: 'Message or prompt is required' });
    }

    const ai = getGeminiAI();
    if (!ai) {
      // Deterministic offline fallback if API key is not configured
      return res.json({
        text: `✨ **The Gemini AI Advisory**\n\nI have received your query: "${userMsg}".\n\nTo unlock real-time Gemini reasoning, ensure your GEMINI_API_KEY is configured in Settings. In the meantime, here is immediate guidance for Hands & Head:\n• **Leather Production**: Maintain full-grain aniline and vegetable-tanned leather buffers in the Dhaka atelier.\n• **Export Compliance**: For EU buyers (Netherlands, Germany, UK), ensure REACH and EUDR (EU Deforestation Regulation) compliance dossiers are ready.\n• **Local Delivery**: Keep COD delivery charges standardized (৳80 Dhaka, ৳150 Nationwide).`
      });
    }

    // Build context-enhanced prompt
    let contextualPrompt = userMsg;
    if (context.catalogSummary || context.lowStockCount !== undefined || context.productsCount !== undefined) {
      contextualPrompt = `[Live OS Context: ${context.productsCount || context.totalProducts || 6} active products, ${context.customersCount || 0} registered buyers, Store: ${context.app || 'Hands & Head'}]\n\nUser Request: ${userMsg}`;
    }

    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach(h => {
        if (h.role === 'user' || h.role === 'model') {
          contents.push({
            role: h.role,
            parts: [{ text: h.text || h.content || '' }]
          });
        }
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: contextualPrompt }]
    });

    // Call Gemini with tools configured
    let firstResult;
    try {
      firstResult = await callGeminiWithFallback(ai, {
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: geminiTools }],
          temperature: 0.7,
          topP: 0.95
        }
      });
    } catch (apiErr) {
      console.warn('[Gemini AI] Primary tool call failed, falling back to basic prompt:', apiErr.message);
      // Fallback without tools if tool execution hits any constraint
      firstResult = await callGeminiWithFallback(ai, {
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topP: 0.95
        }
      });
    }

    const firstResponse = firstResult.response;
    const functionCalls = firstResponse.functionCalls;

    // If Gemini called a tool, execute it and perform second turn synthesis
    if (functionCalls && functionCalls.length > 0) {
      const executedCalls = [];

      for (const call of functionCalls) {
        const toolResult = executeLocalTool(call.name, call.args, context);
        executedCalls.push({
          name: call.name,
          args: call.args,
          result: toolResult
        });

        // Add model's tool call turn
        if (firstResponse.candidates?.[0]?.content) {
          contents.push(firstResponse.candidates[0].content);
        }
        // Add user turn with function response
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: toolResult
            }
          }]
        });
      }

      // Second turn: Get conversational synthesis from Gemini
      try {
        const secondResult = await callGeminiWithFallback(ai, {
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: geminiTools }],
            temperature: 0.7,
            topP: 0.95
          }
        });

        const finalText = secondResult.response.text || 'Tool executed successfully.';
        return res.json({
          text: finalText,
          toolCalls: executedCalls,
          modelUsed: secondResult.modelUsed
        });
      } catch (secondErr) {
        console.warn('[Gemini AI] Second turn failed, returning tool result directly:', secondErr.message);
        return res.json({
          text: `✨ Tool **${executedCalls[0].name}** executed successfully.`,
          toolCalls: executedCalls,
          modelUsed: firstResult.modelUsed
        });
      }
    }

    // No tool called; return direct text
    res.json({
      text: firstResponse.text || '',
      modelUsed: firstResult.modelUsed
    });
  } catch (err) {
    console.error('Gemini Chat Error:', err);
    // Return friendly, structured error instead of ugly raw 500 JSON
    res.json({
      text: `✨ **The Gemini AI Advisory**\n\nI encountered a temporary service latency while querying the upstream model. Here is immediate guidance based on current Dhaka atelier standards:\n• **Stock Buffer**: Maintain at least 150 units of full-grain leather wallets and cardholders for pending shipments.\n• **Courier Rate**: ৳80 inside Dhaka, ৳100 Express, ৳150 nationwide COD.\n• **EU Standards**: REACH Annex XVII and EUDR geolocation certificates are ready.`,
      isFallback: true
    });
  }
});

function getDeterministicEnrichment(title, category, sku, price, product = {}) {
  const cleanTitle = title.includes('H&H') ? title : `${title} — Hand-Finished`;
  return {
    isGenerated: true,
    generatedAt: new Date().toISOString(),
    model: 'gemini-resilient-fallback',
    title: cleanTitle,
    shortDescription: `Hand-finished ${category.toLowerCase()} crafted from select full-grain leather in Dhaka. Features precision burnished edges and structural longevity.`,
    description: `${cleanTitle} embodies the tactile heritage of Hands & Head. Precision cut and saddle-stitched in our Dhaka atelier, this ${category.toLowerCase()} develops an authentic patina with daily use. Built with reinforced hardware and ergonomic compartments.`,
    bulletPoints: [
      '100% Full-Grain Vegetable-Tanned Leather / Premium Heavyweight Cotton',
      'Hand-burnished edge finishing with natural wax seal',
      'Tactile brushed metal hardware & reinforced stress points',
      'Engineered & crafted in Dhaka, Bangladesh'
    ],
    seo: {
      title: `${cleanTitle} | Premium ${category} — HANDS & HEAD`,
      description: `Buy ${cleanTitle}. Handcrafted ${category.toLowerCase()} in Dhaka, Bangladesh. Worldwide wholesale B2B export & express local delivery.`,
      keywords: `${category}, ${cleanTitle}, dhaka leather, b2b export, wholesale fashion, hands and head`
    },
    tags: [category.toLowerCase().replace(/\s+/g, '-'), 'dhaka-craft', 'hands-and-head', 'full-grain', sku.toLowerCase()],
    suggestedCategory: category,
    suggestedAttributes: {
      Material: 'Full-Grain Leather / 240 GSM Combed Cotton',
      Origin: 'Dhaka, Bangladesh',
      Finish: 'Natural Wax Aniline / Matte',
      Care: 'Wipe with damp cloth; apply organic leather conditioner twice yearly'
    },
    wholesalePitch: `Ideal for European boutique retailers seeking high-margin leather goods with authentic artisan provenance and certified REACH compliance.`
  };
}

/* ── 2. Gemini AI Product Copy & SEO Enrichment ── */
app.post('/api/gemini/enrich-product', async (req, res) => {
  try {
    const { product } = req.body;
    if (!product) {
      return res.status(400).json({ error: 'Product payload is required' });
    }

    const title = product.title || product.name || 'Leather Good';
    const category = product.productType || product.category || 'Leather Goods';
    const sku = product.sku || product.variants?.[0]?.sku || 'HH-001';
    const price = product.pricing?.price || product.price || 2500;

    const ai = getGeminiAI();
    if (!ai) {
      return res.json(getDeterministicEnrichment(title, category, sku, price, product));
    }

    const prompt = `Enrich this product for the Hands & Head B2B/D2C luxury catalog:
Title: ${title}
Category: ${category}
SKU: ${sku}
Price: BDT ${price}
Existing Info: ${product.description || 'No existing description'}
Materials/Notes: ${product.materials || 'Select Full-grain leather or luxury heavyweight cotton'}

Generate a compelling, editorial product description, high-converting short hook, 4 core specification bullet points, Google/Shopify SEO metadata (title & description), 5-8 relevant tags, suggested attributes (Material, Origin, Finish, Care), and a 1-sentence B2B wholesale pitch. Return purely valid JSON matching the schema.`;

    try {
      const { response, modelUsed } = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Elevated, polished product title' },
              shortDescription: { type: Type.STRING, description: '1-sentence punchy hook or subtitle' },
              description: { type: Type.STRING, description: '2-3 paragraph editorial craftsmanship story' },
              bulletPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 high-impact feature/spec bullets'
              },
              seo: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'SEO title under 60 chars' },
                  description: { type: Type.STRING, description: 'SEO meta description under 160 chars' },
                  keywords: { type: Type.STRING, description: 'Comma separated high-intent search keywords' }
                },
                required: ['title', 'description', 'keywords']
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Keywords and categorisation tags'
              },
              suggestedCategory: { type: Type.STRING },
              suggestedAttributes: {
                type: Type.OBJECT,
                properties: {
                  Material: { type: Type.STRING },
                  Origin: { type: Type.STRING },
                  Finish: { type: Type.STRING },
                  Care: { type: Type.STRING }
                }
              },
              wholesalePitch: { type: Type.STRING, description: 'B2B export value proposition' }
            },
            required: ['title', 'shortDescription', 'description', 'bulletPoints', 'seo', 'tags']
          }
        }
      });

      let jsonResult = {};
      try {
        jsonResult = JSON.parse(response.text.trim());
      } catch (parseErr) {
        jsonResult = { description: response.text };
      }

      return res.json({
        isGenerated: true,
        generatedAt: new Date().toISOString(),
        model: modelUsed,
        ...jsonResult
      });
    } catch (apiErr) {
      return res.json(getDeterministicEnrichment(title, category, sku, price, product));
    }
  } catch (err) {
    res.json(getDeterministicEnrichment('Leather Good', 'Leather Goods', 'HH-001', 2500, {}));
  }
});

/* ── 3. Gemini Demand & Supply Chain Forecasting ── */
app.post('/api/gemini/forecast', async (req, res) => {
  try {
    const { inventory = [], orders = [] } = req.body;
    const ai = getGeminiAI();

    const fallbackForecast = {
      summary: "Based on 90-day operational trends, leather wallets and heavyweight tees are maintaining steady +18% demand momentum heading into the European autumn reorder window.",
      recommendations: [
        "Increase Full-Grain Cardholder batch sizes by 40 units prior to Amsterdam shipment.",
        "Secure REACH-compliant tanning drums for the upcoming German buyer cycle.",
        "Monitor low-stock SKUs to prevent backorder delays on Shopify and WhatsApp channels."
      ],
      projectedGrowth: "+22.4% Q4 Target",
      isFallback: true
    };

    if (!ai) {
      return res.json(fallbackForecast);
    }

    const inventorySnippet = inventory.slice(0, 20).map(i => `${i.title || i.t} (Stock: ${i.stock || i.totalInventory || 0})`).join(', ');
    const prompt = `Analyze this live inventory & supply chain snapshot for Hands & Head:
Inventory: ${inventorySnippet || 'General Leather & Apparel line'}
Recent Orders Count: ${orders.length}

Provide:
1. Executive Supply Chain & Demand Summary (2-3 sentences).
2. 3 concrete operational recommendations (batch sizing, reorder timing, EU shipping prep).
3. 30-Day Growth projection.
Return as JSON with keys: summary (string), recommendations (array of strings), projectedGrowth (string).`;

    try {
      const { response, modelUsed } = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              projectedGrowth: { type: Type.STRING }
            },
            required: ['summary', 'recommendations', 'projectedGrowth']
          }
        }
      });

      const parsed = JSON.parse(response.text.trim());
      return res.json({ ...parsed, model: modelUsed });
    } catch (apiErr) {
      return res.json(fallbackForecast);
    }
  } catch (err) {
    res.json({
      summary: "Based on Dhaka atelier operational records, leather goods maintain robust demand with active export interest.",
      recommendations: [
        "Maintain inventory buffer for bifold wallets and cardholders.",
        "Ensure EUDR geolocation documentation is ready for EU freight dispatch.",
        "Schedule regular leather drum batch tanning."
      ],
      projectedGrowth: "+20.0% Projected",
      isFallback: true
    });
  }
});

/* ── 4. Dedicated Gemini Functional Tools Execution Endpoint ── */
app.post('/api/gemini/tools/execute', async (req, res) => {
  try {
    const { toolName, params = {}, context = {} } = req.body;
    if (!toolName) {
      return res.status(400).json({ error: 'toolName is required' });
    }

    const localResult = executeLocalTool(toolName, params, context);
    const ai = getGeminiAI();

    // If Gemini is available, generate an intelligent synthesis
    if (ai) {
      try {
        const prompt = `You executed the functional tool "${toolName}" with arguments: ${JSON.stringify(params)}.
Tool Execution Result: ${JSON.stringify(localResult)}.
Synthesize this result into a crisp, authoritative, professional 2-3 sentence summary for the store operator.`;

        const { response } = await callGeminiWithFallback(ai, {
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.5
          }
        });

        return res.json({
          success: true,
          toolName,
          result: localResult,
          synthesis: response.text || ''
        });
      } catch (e) {
        console.warn('Synthesis fallback triggered:', e.message);
      }
    }

    res.json({
      success: true,
      toolName,
      result: localResult,
      synthesis: `✓ Tool ${toolName} completed successfully.`
    });
  } catch (err) {
    console.error('Gemini Tool Execute Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── 4. Server-Side Excel & CSV Parsing Endpoint ── */
app.post('/api/import/parse-excel', (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ error: 'Workbook is empty' });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawJson || rawJson.length === 0) {
      return res.status(400).json({ error: 'No data found in sheet' });
    }

    const headers = rawJson[0].map(h => String(h || '').trim()).filter(Boolean);
    const rows = [];

    for (let i = 1; i < rawJson.length; i++) {
      const rowArr = rawJson[i];
      if (!rowArr || rowArr.every(cell => String(cell || '').trim() === '')) continue;
      
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rowArr[idx] !== undefined ? String(rowArr[idx]).trim() : '';
      });
      rows.push(rowObj);
    }

    res.json({
      sheetName: firstSheetName,
      totalSheets: workbook.SheetNames.length,
      headers,
      rowCount: rows.length,
      rows
    });
  } catch (err) {
    console.error('Excel Parse Error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PERSISTENT CROSS-DEVICE STORAGE LAYER (PIN 1981 / Operator OS)
   Ensures products, customers, and orders persist permanently
   across all devices, browser sessions, and server restarts.
   ═══════════════════════════════════════════════════════════════ */

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function safeReadJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Storage] Failed to read ${filePath}:`, err.message);
    return fallback;
  }
}

function safeWriteJson(filePath, data) {
  try {
    const tmp = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.error(`[Storage] Failed to atomic-write ${filePath}, using direct write:`, err.message);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

// Seed default products if not already initialized
if (!fs.existsSync(PRODUCTS_FILE) || safeReadJson(PRODUCTS_FILE, []).length === 0) {
  const seedProducts = [
    {
      id: "prod-tee-01",
      title: "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
      handle: "heavyweight-boxy-graphic-tee-dhaka-cyber",
      status: "active",
      vendor: "Hands & Head",
      productType: "Tees & Apparel",
      description: "260 GSM combed cotton vintage acid-washed oversized streetwear tee with high-density screenprint and reinforced ribbed collar.",
      tags: ["tee", "tshirt", "oversized", "streetwear", "acid-wash", "apparel"],
      pricing: { price: 1850, compareAtPrice: 2400, cost: 750, currency: "BDT" },
      images: [
        { url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80", alt: "Heavyweight Boxy Graphic Tee" },
        { url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80", alt: "Tee Back View" }
      ],
      variants: [
        { id: "v-tee-m", title: "Vintage Washed Black / M", sku: "HH-TEE-01-M", price: 1850, inventoryQty: 45, availableForSale: true },
        { id: "v-tee-l", title: "Vintage Washed Black / L", sku: "HH-TEE-01-L", price: 1850, inventoryQty: 60, availableForSale: true },
        { id: "v-tee-xl", title: "Vintage Washed Black / XL", sku: "HH-TEE-01-XL", price: 1850, inventoryQty: 30, availableForSale: true }
      ],
      totalInventory: 135,
      lowStockThreshold: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-tee-02",
      title: "Artisanal Raw-Hem Oversized Drop Tee",
      handle: "artisanal-raw-hem-oversized-drop-tee",
      status: "active",
      vendor: "Hands & Head",
      productType: "Tees & Apparel",
      description: "240 GSM organic slub cotton drop-shoulder silhouette with raw-cut distressed hems and tonal embroidered chest emblem.",
      tags: ["tee", "tshirt", "raw-hem", "streetwear", "apparel", "minimalist"],
      pricing: { price: 1650, compareAtPrice: 2100, cost: 680, currency: "BDT" },
      images: [
        { url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80", alt: "Raw-Hem Drop Tee" }
      ],
      variants: [
        { id: "v-tee-raw-l", title: "Bone White / L", sku: "HH-TEE-02-L", price: 1650, inventoryQty: 50, availableForSale: true },
        { id: "v-tee-raw-xl", title: "Bone White / XL", sku: "HH-TEE-02-XL", price: 1650, inventoryQty: 38, availableForSale: true }
      ],
      totalInventory: 88,
      lowStockThreshold: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-tee-03",
      title: "Architectural Cutout Leather-Pocket Tee",
      handle: "architectural-cutout-leather-pocket-tee",
      status: "active",
      vendor: "Hands & Head",
      productType: "Tees & Apparel",
      description: "Heavy 280 GSM French terry tee featuring genuine vegetable-tanned leather utility patch pocket with antique brass rivet.",
      tags: ["tee", "leather-trim", "luxury", "apparel", "streetwear"],
      pricing: { price: 2450, compareAtPrice: 2950, cost: 950, currency: "BDT" },
      images: [
        { url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80", alt: "Leather Pocket Tee" }
      ],
      variants: [
        { id: "v-tee-pock-m", title: "Charcoal Slate / M", sku: "HH-TEE-03-M", price: 2450, inventoryQty: 32, availableForSale: true },
        { id: "v-tee-pock-l", title: "Charcoal Slate / L", sku: "HH-TEE-03-L", price: 2450, inventoryQty: 40, availableForSale: true }
      ],
      totalInventory: 72,
      lowStockThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-wlt-01",
      title: "Full-Grain Leather Bi-Fold Wallet",
      handle: "full-grain-leather-bi-fold-wallet",
      status: "active",
      vendor: "Hands & Head",
      productType: "Leather Goods",
      description: "Handcrafted 100% full-grain vegetable-tanned cowhide wallet with 6 card slots and dual currency partitions.",
      tags: ["wallet", "leather", "bifold", "b2b"],
      pricing: { price: 2850, compareAtPrice: 3400, cost: 1600, currency: "BDT" },
      images: [{ url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80", alt: "Leather Wallet" }],
      variants: [{ id: "v-wlt-tan", title: "Tan Brown", sku: "HH-WLT-01", price: 2850, inventoryQty: 48, availableForSale: true }],
      totalInventory: 48,
      lowStockThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-brf-02",
      title: "Executive Leather Briefcase",
      handle: "executive-leather-briefcase",
      status: "active",
      vendor: "Hands & Head",
      productType: "Leather Goods",
      description: "Handmade vegetable-tanned full-grain leather briefcase with brass hardware, laptop compartment, and luggage trolley strap.",
      tags: ["briefcase", "luxury", "executive", "b2b"],
      pricing: { price: 14500, compareAtPrice: 17500, cost: 8200, currency: "BDT" },
      images: [{ url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", alt: "Leather Briefcase" }],
      variants: [{ id: "v-brf-blk", title: "Midnight Black", sku: "HH-BRF-02", price: 14500, inventoryQty: 18, availableForSale: true }],
      totalInventory: 18,
      lowStockThreshold: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-crd-02",
      title: "Minimalist Cardholder — Aniline Tan",
      handle: "minimalist-cardholder-aniline-tan",
      status: "active",
      vendor: "Hands & Head",
      productType: "Leather Goods",
      description: "Slim 4-slot cardholder crafted from oil-pullup calf leather with center cash pocket.",
      tags: ["cardholder", "minimalist", "accessories"],
      pricing: { price: 1450, compareAtPrice: 1800, cost: 650, currency: "BDT" },
      images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80", alt: "Cardholder" }],
      variants: [{ id: "v-crd-tan", title: "Aniline Tan", sku: "HH-CRD-02", price: 1450, inventoryQty: 65, availableForSale: true }],
      totalInventory: 65,
      lowStockThreshold: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-blt-01",
      title: "Heavyweight Full-Grain Leather Belt",
      handle: "heavyweight-full-grain-leather-belt",
      status: "active",
      vendor: "Hands & Head",
      productType: "Leather Goods",
      description: "Solid 38mm harness leather belt with solid brushed brass roller buckle.",
      tags: ["belt", "accessories", "b2b"],
      pricing: { price: 3200, compareAtPrice: 3800, cost: 1400, currency: "BDT" },
      images: [{ url: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80", alt: "Leather Belt" }],
      variants: [{ id: "v-blt-brn", title: "Cognac Brown", sku: "HH-BLT-01", price: 3200, inventoryQty: 52, availableForSale: true }],
      totalInventory: 52,
      lowStockThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prod-fol-01",
      title: "Passport Travel Folio & Boarding Wallet",
      handle: "passport-travel-folio-boarding-wallet",
      status: "active",
      vendor: "Hands & Head",
      productType: "Leather Goods",
      description: "All-in-one travel organizer accommodating two passports, boarding pass, 6 cards, and pen loop.",
      tags: ["travel", "passport", "folio"],
      pricing: { price: 4200, compareAtPrice: 4900, cost: 1900, currency: "BDT" },
      images: [{ url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80", alt: "Travel Folio" }],
      variants: [{ id: "v-fol-blk", title: "Onyx Black", sku: "HH-FOL-01", price: 4200, inventoryQty: 34, availableForSale: true }],
      totalInventory: 34,
      lowStockThreshold: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  safeWriteJson(PRODUCTS_FILE, seedProducts);
}

// Seed default orders if not already initialized
if (!fs.existsSync(ORDERS_FILE) || safeReadJson(ORDERS_FILE, []).length === 0) {
  const seedOrders = [
    {
      id: "ord-1048",
      orderNumber: "NX-1048",
      customerSnapshot: { name: "Amsterdam Goods B.V.", email: "procurement@leather-amsterdam.nl", country: "NL", currency: "EUR" },
      lineItems: [
        { productId: "prod-wlt-01", title: "Full-Grain Leather Bi-Fold Wallet", sku: "HH-WLT-01", quantity: 50, price: 2850 }
      ],
      subtotal: 142500,
      shipping: 8500,
      discount: 0,
      total: 151000,
      currency: "BDT",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
      status: "completed",
      paymentMethod: "bank_transfer",
      notes: "B2B Export batch to Rotterdam via air freight.",
      timeline: [
        { event: "Order created and confirmed", at: new Date(Date.now() - 3600000 * 24).toISOString(), by: "Operator 1981" },
        { event: "Payment verified in EUR", at: new Date(Date.now() - 3600000 * 18).toISOString(), by: "Finance" },
        { event: "Dispatched via DHL Global Forwarding", at: new Date(Date.now() - 3600000 * 6).toISOString(), by: "Logistics" }
      ],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      id: "ord-1047",
      orderNumber: "NX-1047",
      customerSnapshot: { name: "London Retail Group", email: "orders@londonretail.co.uk", country: "GB", currency: "GBP" },
      lineItems: [
        { productId: "prod-brf-02", title: "Executive Leather Briefcase", sku: "HH-BRF-02", quantity: 6, price: 14500 }
      ],
      subtotal: 87000,
      shipping: 5200,
      discount: 0,
      total: 92200,
      currency: "BDT",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      status: "open",
      paymentMethod: "bank_transfer",
      notes: "Custom embossed monogramming requested for briefcases.",
      timeline: [
        { event: "Order placed (6 items, ৳92,200)", at: new Date(Date.now() - 3600000 * 12).toISOString(), by: "Operator 1981" }
      ],
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: "ord-1046",
      orderNumber: "NX-1046",
      customerSnapshot: { name: "Tomotaka Minoura", phone: "+8801912010701", country: "BD", currency: "BDT" },
      lineItems: [
        { productId: "prod-tee-01", title: "Heavyweight Boxy Graphic Tee — Dhaka Cyber", sku: "HH-TEE-01-L", quantity: 2, price: 1850 },
        { productId: "prod-crd-02", title: "Minimalist Cardholder — Aniline Tan", sku: "HH-CRD-02", quantity: 1, price: 1450 }
      ],
      subtotal: 5150,
      shipping: 80,
      discount: 0,
      total: 5230,
      currency: "BDT",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
      status: "completed",
      paymentMethod: "cod",
      notes: "Inside Dhaka City delivery.",
      timeline: [
        { event: "Order placed and dispatched", at: new Date(Date.now() - 3600000 * 4).toISOString(), by: "Operator 1981" }
      ],
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];
  safeWriteJson(ORDERS_FILE, seedOrders);
}

/* ── PIN Authentication Verification ── */
app.post('/api/auth/pin', (req, res) => {
  const { pin } = req.body;
  if (pin === '1981') {
    return res.json({
      ok: true,
      role: 'expert',
      name: 'Expert Operator',
      email: 'handfilm.ai@gmail.com',
      token: 'session_operator_1981',
      permissions: ['read', 'write', 'admin', 'export', 'pos']
    });
  }
  if (pin === '2024') {
    return res.json({
      ok: true,
      role: 'production',
      name: 'Production Lead',
      token: 'session_prod_2024',
      permissions: ['read', 'write_orders', 'inventory']
    });
  }
  return res.status(401).json({ ok: false, error: 'Invalid operator PIN' });
});

/* ── 1. PRODUCTS REST API ── */
app.get('/api/products', (req, res) => {
  try {
    let items = safeReadJson(PRODUCTS_FILE, []);
    const { search, category, vendor, status, sortBy, sortDir } = req.query;

    if (status && status !== 'all') {
      items = items.filter(p => (p.status || 'active') === status);
    }
    if (category && category !== 'all') {
      items = items.filter(p => (p.productType || '').toLowerCase() === category.toLowerCase());
    }
    if (vendor && vendor !== 'all') {
      items = items.filter(p => (p.vendor || '').toLowerCase() === vendor.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.handle || '').toLowerCase().includes(q) ||
        (p.vendor || '').toLowerCase().includes(q) ||
        (p.productType || '').toLowerCase().includes(q) ||
        (p.variants || []).some(v => (v.sku || '').toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price') {
      items.sort((a, b) => {
        const pa = a.pricing?.price || a.price || 0;
        const pb = b.pricing?.price || b.price || 0;
        return sortDir === 'asc' ? pa - pb : pb - pa;
      });
    } else {
      // Default newest first
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    res.json({ ok: true, items, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  const items = safeReadJson(PRODUCTS_FILE, []);
  const product = items.find(p => p.id === req.params.id || p.handle === req.params.id);
  if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, item: product });
});

app.post('/api/products', (req, res) => {
  try {
    const data = req.body;
    if (!data.title && !data.Name) {
      return res.status(400).json({ ok: false, error: 'Product title is required' });
    }

    const items = safeReadJson(PRODUCTS_FILE, []);
    const title = (data.title || data.Name || 'New Product').trim();
    const price = Number(data.price || data.Price || data.pricing?.price || 0);
    const sku = data.sku || data.SKU || ('HH-' + Math.floor(1000 + Math.random() * 9000));
    const stock = Number(data.stock || data.Stock || data.totalInventory || 100);
    const newId = data.id || data.ID || ('prod-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000));

    const newProduct = {
      id: newId,
      title,
      handle: (data.handle || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')),
      status: data.status || 'active',
      vendor: data.vendor || data.Vendor || 'Hands & Head',
      productType: data.productType || data.Type || 'Leather Goods',
      description: data.description || data.Description || '',
      tags: Array.isArray(data.tags) ? data.tags : [data.productType || 'Leather Goods'],
      pricing: {
        price,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        currency: data.currency || 'BDT'
      },
      images: Array.isArray(data.images) && data.images.length ? data.images : (
        data.Image ? [{ url: data.Image, alt: title }] : [{ url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80', alt: title }]
      ),
      variants: [
        { id: 'v-' + newId, title: 'Standard', sku, price, inventoryQty: stock, availableForSale: true }
      ],
      totalInventory: stock,
      lowStockThreshold: Number(data.lowStockThreshold) || 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    items.unshift(newProduct);
    safeWriteJson(PRODUCTS_FILE, items);

    res.json({ ok: true, id: newId, item: newProduct });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const items = safeReadJson(PRODUCTS_FILE, []);
    const idx = items.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Product not found' });

    const existing = items[idx];
    const patch = req.body;
    
    if (patch.price !== undefined) {
      existing.pricing = { ...existing.pricing, price: Number(patch.price) };
    }
    if (patch.stock !== undefined) {
      existing.totalInventory = Number(patch.stock);
    }

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    items[idx] = updated;
    safeWriteJson(PRODUCTS_FILE, items);
    res.json({ ok: true, item: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    let items = safeReadJson(PRODUCTS_FILE, []);
    const initialLen = items.length;
    items = items.filter(p => p.id !== req.params.id);
    if (items.length === initialLen) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    safeWriteJson(PRODUCTS_FILE, items);
    res.json({ ok: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ── 2. CUSTOMERS REST API ── */
app.get('/api/customers', (req, res) => {
  try {
    let items = safeReadJson(CUSTOMERS_FILE, []);
    const { search, country, tag, limit } = req.query;

    if (country && country !== 'all') {
      items = items.filter(c => (c.country || '').toUpperCase() === country.toUpperCase());
    }
    if (tag && tag !== 'all') {
      items = items.filter(c => (c.tags || []).includes(tag));
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q)
      );
    }

    const maxItems = limit ? parseInt(limit, 10) : 500;
    res.json({ ok: true, items: items.slice(0, maxItems), count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  const items = safeReadJson(CUSTOMERS_FILE, []);
  const customer = items.find(c => String(c.id) === String(req.params.id));
  if (!customer) return res.status(404).json({ ok: false, error: 'Customer not found' });
  res.json({ ok: true, item: customer });
});

app.post('/api/customers', (req, res) => {
  try {
    const data = req.body;
    if (!data.name && !data.Name && !data.companyName) {
      return res.status(400).json({ ok: false, error: 'Customer name or company is required' });
    }

    const items = safeReadJson(CUSTOMERS_FILE, []);
    const name = (data.name || data.Name || data.companyName || 'New Buyer').trim();
    const newId = data.id || data.ID || ('cust-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000));

    const newCustomer = {
      id: newId,
      name,
      companyName: data.companyName || name,
      contactPerson: data.contactPerson || name,
      email: data.email || data.Email || '',
      phone: data.phone || data.Phone || '',
      country: data.country || data.Address || 'BD',
      currency: data.currency || 'BDT',
      totalSpent: Number(data.totalSpent || 0),
      totalOrders: Number(data.totalOrders || 0),
      moq: Number(data.moq || 0),
      paymentTerms: data.paymentTerms || data.terms || 'Cash on Delivery (COD)',
      tags: Array.isArray(data.tags) ? data.tags : ['retail-customer'],
      addressLine1: data.addressLine1 || data.Address || '',
      addresses: data.addresses || [
        { type: 'shipping', line1: data.addressLine1 || data.Address || '', city: 'Dhaka', country: data.country || 'BD', isDefault: true }
      ],
      notes: data.notes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    items.unshift(newCustomer);
    safeWriteJson(CUSTOMERS_FILE, items);

    res.json({ ok: true, id: newId, item: newCustomer });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const items = safeReadJson(CUSTOMERS_FILE, []);
    const idx = items.findIndex(c => String(c.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Customer not found' });

    const updated = {
      ...items[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    items[idx] = updated;
    safeWriteJson(CUSTOMERS_FILE, items);
    res.json({ ok: true, item: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    let items = safeReadJson(CUSTOMERS_FILE, []);
    const initialLen = items.length;
    items = items.filter(c => String(c.id) !== String(req.params.id));
    if (items.length === initialLen) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }
    safeWriteJson(CUSTOMERS_FILE, items);
    res.json({ ok: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ── 3. ORDERS REST API ── */
app.get('/api/orders', (req, res) => {
  try {
    let items = safeReadJson(ORDERS_FILE, []);
    const { search, status, paymentStatus, fulfillmentStatus, sortBy, sortDir } = req.query;

    if (status && status !== 'all') {
      items = items.filter(o => o.status === status);
    }
    if (paymentStatus && paymentStatus !== 'all') {
      items = items.filter(o => o.paymentStatus === paymentStatus);
    }
    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      items = items.filter(o => o.fulfillmentStatus === fulfillmentStatus);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerSnapshot?.name || '').toLowerCase().includes(q) ||
        (o.customerSnapshot?.phone || '').toLowerCase().includes(q) ||
        (o.lineItems || []).some(li => (li.title || '').toLowerCase().includes(q))
      );
    }

    if (sortBy === 'total') {
      items.sort((a, b) => sortDir === 'asc' ? (a.total || 0) - (b.total || 0) : (b.total || 0) - (a.total || 0));
    } else {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    res.json({ ok: true, items, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  const items = safeReadJson(ORDERS_FILE, []);
  const order = items.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
  res.json({ ok: true, item: order });
});

app.post('/api/orders', (req, res) => {
  try {
    const data = req.body;
    const orders = safeReadJson(ORDERS_FILE, []);
    const products = safeReadJson(PRODUCTS_FILE, []);

    const orderNumber = data.orderNumber || ('NX-' + Math.floor(1000 + Math.random() * 9000));
    const newId = data.id || ('ord-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000));

    // Resolve line items
    let lineItems = [];
    if (Array.isArray(data.lineItems) && data.lineItems.length) {
      lineItems = data.lineItems.map(item => ({
        productId: item.productId || item.id || '',
        variantId: item.variantId || 'default',
        title: item.title || item.name || 'Leather Goods',
        sku: item.sku || 'HH-ITEM',
        quantity: Math.max(1, Number(item.quantity || 1)),
        price: Number(item.price || 0),
        image: item.image || ''
      }));
    } else if (Array.isArray(data.items) && data.items.length) {
      lineItems = data.items.map(item => ({
        productId: item.productId || item.id || '',
        variantId: item.variantId || 'default',
        title: item.title || item.name || 'Leather Goods',
        sku: item.sku || 'HH-ITEM',
        quantity: Math.max(1, Number(item.quantity || 1)),
        price: Number(item.price || 0),
        image: item.image || ''
      }));
    } else if (typeof data.Items === 'string') {
      lineItems = [{
        productId: '',
        variantId: 'default',
        title: data.Items,
        sku: 'HH-ITEM',
        quantity: 1,
        price: Number(data.Total || data.price || 0)
      }];
    } else if (data.item || data.Item) {
      lineItems = [{
        productId: '',
        variantId: 'default',
        title: String(data.item || data.Item),
        sku: 'HH-ITEM',
        quantity: 1,
        price: Number(data.price || data.Total || data.total || 0)
      }];
    } else {
      lineItems = [{
        productId: '',
        variantId: 'default',
        title: 'B2B Custom Order',
        sku: 'HH-B2B',
        quantity: 1,
        price: Number(data.total || data.Total || 0)
      }];
    }

    // Deduct stock from products if matched
    lineItems.forEach(item => {
      const prod = products.find(p => p.id === item.productId || p.title === item.title);
      if (prod && prod.totalInventory !== undefined) {
        prod.totalInventory = Math.max(0, prod.totalInventory - item.quantity);
        if (Array.isArray(prod.variants) && prod.variants.length) {
          const v = prod.variants.find(x => x.id === item.variantId || x.sku === item.sku) || prod.variants[0];
          if (v && v.inventoryQty !== undefined) {
            v.inventoryQty = Math.max(0, v.inventoryQty - item.quantity);
          }
        }
      }
    });
    safeWriteJson(PRODUCTS_FILE, products);

    const subtotal = lineItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const shipping = Number(data.shippingTotal || data.deliveryCharge || data.deliveryFee || data.shipping || 0);
    const discount = Number(data.discountTotal || data.discount || 0);
    const tax = Number(data.taxTotal || data.tax || 0);
    const total = Number(data.total || data.Total || (subtotal + shipping + tax - discount));

    const custSnap = data.customerSnapshot || data.customer || {};
    const buyerName = custSnap.name || custSnap.companyName || data.Customer || data.buyer || 'Walk-in Buyer';
    const buyerPhone = custSnap.phone || data.phone || '';
    const buyerEmail = custSnap.email || data.email || '';
    const buyerCountry = custSnap.country || data.country || 'BD';
    const buyerCurrency = custSnap.currency || data.currency || 'BDT';

    const newOrder = {
      id: newId,
      orderNumber,
      source: data.source || 'Direct',
      customerId: data.customerId || custSnap.id || null,
      customerSnapshot: {
        id: data.customerId || custSnap.id || null,
        name: buyerName,
        phone: buyerPhone,
        email: buyerEmail,
        country: buyerCountry,
        currency: buyerCurrency,
        address: custSnap.address || data.address || ''
      },
      lineItems,
      subtotal,
      shipping,
      discount,
      tax,
      total,
      currency: buyerCurrency,
      paymentStatus: data.paymentStatus || 'paid',
      fulfillmentStatus: data.fulfillmentStatus || 'unfulfilled',
      status: data.status || 'open',
      paymentMethod: data.paymentMethod || data.method || 'cash',
      paidAmount: Number(data.paidAmount !== undefined ? data.paidAmount : (data.paymentStatus === 'paid' ? total : 0)),
      dueAmount: Number(data.dueAmount !== undefined ? data.dueAmount : (data.paymentStatus === 'paid' ? 0 : total)),
      shippingAddress: data.shippingAddress || { line1: data.address || custSnap.address || '', city: 'Dhaka', country: buyerCountry },
      notes: data.notes || '',
      timeline: Array.isArray(data.timeline) && data.timeline.length ? data.timeline : [
        {
          event: `Order placed (${lineItems.length} items, ৳${total.toLocaleString()})`,
          at: new Date().toISOString(),
          by: 'Operator'
        }
      ],
      createdAt: typeof data.createdAt === 'string' && data.createdAt ? data.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    safeWriteJson(ORDERS_FILE, orders);

    // Also auto-record customer if new and phone exists
    if (buyerPhone && buyerPhone.length >= 8) {
      const customers = safeReadJson(CUSTOMERS_FILE, []);
      const existingCust = customers.find(c => (c.phone || '').replace(/[^0-9]/g, '') === buyerPhone.replace(/[^0-9]/g, ''));
      if (existingCust) {
        existingCust.totalOrders = (existingCust.totalOrders || 0) + 1;
        existingCust.totalSpent = (existingCust.totalSpent || 0) + total;
        existingCust.lastOrderDate = new Date().toISOString();
        safeWriteJson(CUSTOMERS_FILE, customers);
      } else {
        customers.unshift({
          id: 'cust-' + Date.now().toString(36),
          name: buyerName,
          companyName: buyerName,
          contactPerson: buyerName,
          phone: buyerPhone,
          email: buyerEmail,
          country: buyerCountry,
          currency: buyerCurrency,
          totalSpent: total,
          totalOrders: 1,
          lastOrderDate: new Date().toISOString(),
          tags: ['retail-customer'],
          addresses: [{ line1: custSnap.address || data.address || '', city: 'Dhaka', country: buyerCountry, isDefault: true }],
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        safeWriteJson(CUSTOMERS_FILE, customers);
      }
    }

    res.json({ ok: true, id: newId, orderId: newId, orderNumber, item: newOrder, order: newOrder });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const orders = safeReadJson(ORDERS_FILE, []);
    const idx = orders.findIndex(o => o.id === req.params.id || o.orderNumber === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Order not found' });

    const existing = orders[idx];
    const patch = req.body || {};
    let timeline = Array.isArray(existing.timeline) ? [...existing.timeline] : [];

    if (patch.status && patch.status !== existing.status) {
      timeline.push({
        event: `Status changed to ${String(patch.status).toUpperCase()}`,
        at: new Date().toISOString(),
        by: 'Operator'
      });
    }
    if (patch.paymentStatus && patch.paymentStatus !== existing.paymentStatus) {
      timeline.push({
        event: `Payment marked ${String(patch.paymentStatus).toUpperCase()}`,
        at: new Date().toISOString(),
        by: 'Operator'
      });
    }
    if (patch.fulfillmentStatus && patch.fulfillmentStatus !== existing.fulfillmentStatus) {
      timeline.push({
        event: `Fulfillment marked ${String(patch.fulfillmentStatus).toUpperCase()}`,
        at: new Date().toISOString(),
        by: 'Operator'
      });
    }

    // If caller provided timeline entries as array
    if (Array.isArray(patch.timeline)) {
      patch.timeline.forEach(te => {
        if (te && te.event && !timeline.some(t => t.event === te.event && t.at === te.at)) {
          timeline.push(te);
        }
      });
    }

    // Clean patch to avoid nullifying critical fields
    const safePatch = { ...patch };
    delete safePatch.id;
    delete safePatch.timeline;

    const updated = {
      ...existing,
      ...safePatch,
      timeline,
      updatedAt: new Date().toISOString()
    };

    orders[idx] = updated;
    safeWriteJson(ORDERS_FILE, orders);
    res.json({ ok: true, item: updated, order: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    let orders = safeReadJson(ORDERS_FILE, []);
    const initialLen = orders.length;
    orders = orders.filter(o => o.id !== req.params.id && o.orderNumber !== req.params.id);
    if (orders.length === initialLen) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }
    safeWriteJson(ORDERS_FILE, orders);
    res.json({ ok: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ── 4. REAL-TIME BUSINESS STATS & CROSS-DEVICE SYNC ENGINE ── */
app.get('/api/stats', (req, res) => {
  try {
    const orders = safeReadJson(ORDERS_FILE, []);
    const products = safeReadJson(PRODUCTS_FILE, []);
    const customers = safeReadJson(CUSTOMERS_FILE, []);

    const salesToday = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
    const pending = orders.filter(o => o.fulfillmentStatus === 'unfulfilled' && o.status !== 'cancelled').length;

    res.json({
      ok: true,
      salesToday,
      ordersToday: orders.length,
      pending,
      catalog: products.length,
      customers: customers.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* Fast real-time sync heartbeat: checks data state in <3ms for multi-device sync */
app.get('/api/sync', (req, res) => {
  try {
    const orders = safeReadJson(ORDERS_FILE, []);
    const products = safeReadJson(PRODUCTS_FILE, []);
    const customers = safeReadJson(CUSTOMERS_FILE, []);

    const salesToday = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
    const pending = orders.filter(o => o.fulfillmentStatus === 'unfulfilled' && o.status !== 'cancelled').length;

    const latestOrder = orders[0] || null;
    const latestProduct = products[0] || null;

    res.json({
      ok: true,
      serverTime: Date.now(),
      counts: {
        orders: orders.length,
        products: products.length,
        customers: customers.length
      },
      stats: {
        salesToday,
        ordersToday: orders.length,
        pending,
        catalog: products.length,
        customers: customers.length
      },
      signatures: {
        orderSig: latestOrder ? `${latestOrder.id}_${latestOrder.updatedAt || latestOrder.createdAt}_${orders.length}` : `empty_0`,
        productSig: latestProduct ? `${latestProduct.id}_${latestProduct.updatedAt || latestProduct.createdAt}_${products.length}` : `empty_0`,
        customerSig: `${customers.length}`,
        orders: { count: orders.length, lastUpdated: latestOrder?.updatedAt || latestOrder?.createdAt || null, latestId: latestOrder?.id || null },
        products: { count: products.length, lastUpdated: latestProduct?.updatedAt || latestProduct?.createdAt || null },
        customers: { count: customers.length, lastUpdated: null }
      },
      recentOrders: orders.slice(0, 10).map(o => ({
        id: o.orderNumber || o.id,
        rawId: o.id,
        t: (o.lineItems || []).map(li => `${li.title} x${li.quantity}`).join(", ") || "Leather Goods",
        s: `${o.customerSnapshot?.name || 'Walk-in'} · ৳${(o.total || 0).toLocaleString()}`,
        st: [
          (o.status || 'NEW').toUpperCase(),
          o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'
        ],
        total: o.total || 0,
        status: o.status || 'open',
        fulfillmentStatus: o.fulfillmentStatus || 'unfulfilled',
        paymentStatus: o.paymentStatus || 'paid',
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NexOS server running with Gemini AI on http://0.0.0.0:${PORT}`);
});

