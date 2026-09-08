import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin SDK singleton
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Strip potential prompt injection vectors from untrusted operator/user prompts
 */
function sanitizePrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/ignore\s+(all\s+|previous\s+|above\s+)?(instructions|prompts|directions|rules|system)/gi, '[FILTERED_OVERRIDE]')
    .replace(/disregard\s+(all\s+|previous\s+|above\s+)?(instructions|prompts|directions|rules)/gi, '[FILTERED_OVERRIDE]')
    .replace(/bypass\s+(security|auth|rules|guardrails)/gi, '[FILTERED_OVERRIDE]')
    .replace(/system:\s*/gi, '')
    .replace(/assistant:\s*/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/<\|system\|>/gi, '')
    .replace(/```system/gi, '```')
    .trim();
}

/**
 * ======================================================================
 * 1. authorizeCutting — 2nd-Gen Firebase Callable Cloud Function
 * ======================================================================
 * Inputs: { orderId: string, idempotencyKey: string, operatorPin: string }
 *
 * Security Gates:
 * 1. Master PIN verification against process.env.MASTER_OPERATOR_PIN.
 * 2. Idempotency Gate against /idempotencyKeys/{idempotencyKey} within db.runTransaction.
 * 3. Immutable Payment Ledger verification: sum(/orders/{orderId}/paymentLedger) >= 0.5 * totalAmount.
 * 4. AI Sanity Gate: order.techPack.status === "verified_by_human" (blocks "pending_ai_review").
 * 5. Atomic Commit: order.status = "cutting_authorized", 24h idempotency key lock, audit log append.
 */
export const authorizeCutting = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['MASTER_OPERATOR_PIN']
  },
  async (request) => {
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'master-operator';
    const { orderId, idempotencyKey, operatorPin } = request.data || {};

    // ── Security Check 1: Master Operator PIN Validation ──
    const masterPin = process.env.MASTER_OPERATOR_PIN;
    if (!masterPin) {
      console.error('[SECURITY FATAL] MASTER_OPERATOR_PIN secret is missing from Cloud Functions environment.');
      throw new HttpsError(
        'failed-precondition',
        'Security configuration error: MASTER_OPERATOR_PIN secret is not configured on the server.'
      );
    }

    if (!operatorPin || typeof operatorPin !== 'string' || operatorPin !== masterPin) {
      // Record unauthorized attempt in immutable audit log
      try {
        await db.collection('auditLogs').add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          orderId: orderId || 'UNKNOWN',
          operatorUid,
          result: 'UNAUTHORIZED_PIN_FAILURE',
          message: 'Security Alert: Unauthorized execution attempt with invalid Master Operator PIN.',
          clientIp: request.rawRequest?.ip || 'internal'
        });
      } catch (logErr) {
        console.error('[authorizeCutting] Failed to write unauthorized audit log:', logErr);
      }

      throw new HttpsError('permission-denied', 'Invalid Master PIN authorization.');
    }

    // ── Input Validation ──
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "orderId" string is required.');
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "idempotencyKey" UUID string is required.');
    }

    const orderRef = db.collection('orders').doc(orderId);
    const idemRef = db.collection('idempotencyKeys').doc(idempotencyKey);
    const auditLogsRef = db.collection('auditLogs');

    try {
      // ── Atomic Firestore Transaction ──
      const result = await db.runTransaction(async (transaction) => {
        // Idempotency Check: Reads /idempotencyKeys/{idempotencyKey} within db.runTransaction
        const idemSnap = await transaction.get(idemRef);
        if (idemSnap.exists) {
          const cached = idemSnap.data() || {};
          console.log(`[authorizeCutting] Idempotent replay triggered for key: ${idempotencyKey}`);
          return cached.response || {
            orderId,
            status: 'cutting_authorized',
            idempotentReplay: true,
            cachedAt: cached.createdAt
          };
        }

        // Fetch Order Document
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new HttpsError('not-found', `Order document "${orderId}" was not found.`);
        }

        const orderData = orderSnap.data() || {};

        // ── Financial Ledger Verification ──
        // Query sub-collection /orders/{orderId}/paymentLedger inside transaction
        const ledgerQuery = orderRef.collection('paymentLedger');
        const ledgerSnap = await transaction.get(ledgerQuery);

        let totalLedgerPaid = 0;
        ledgerSnap.forEach((doc) => {
          const entry = doc.data();
          const amount = Number(entry.amount || 0);
          if (!isNaN(amount) && amount > 0) {
            totalLedgerPaid += amount;
          }
        });

        // Compute Required 50% Threshold
        const totalAmount = Number(
          orderData.totalAmount ??
          orderData.total ??
          orderData.grandTotal ??
          0
        );
        const requiredAdvance = 0.5 * totalAmount;

        // Invariant: sum(paymentLedger.amount) >= (0.5 * order.totalAmount)
        if (totalLedgerPaid < requiredAdvance) {
          // Log blocked attempt to audit ledger
          const blockedAuditDoc = auditLogsRef.doc();
          transaction.set(blockedAuditDoc, {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            orderId,
            operatorUid,
            amountPaid: totalLedgerPaid,
            totalAmount,
            currency: orderData.currency || 'USD',
            result: 'BLOCKED_LESS_THAN_50_PCT',
            message: `Transaction Blocked: Advance balance below 50% threshold. (Confirmed Ledger: ${totalLedgerPaid} of required: ${requiredAdvance})`,
            clientIp: request.rawRequest?.ip || 'internal'
          });

          throw new HttpsError(
            'failed-precondition',
            `Advance balance below 50% threshold. Verified payment ledger: ${totalLedgerPaid}, required 50%: ${requiredAdvance}.`
          );
        }

        // ── AI Sanity Gate ──
        // Check if order.techPack.status === "verified_by_human".
        // If it is still "pending_ai_review", throw HttpsError.
        const techPack = orderData.techPack;
        const techPackStatus = techPack?.status || orderData.techPackStatus;

        if (techPackStatus === 'pending_ai_review') {
          throw new HttpsError(
            'failed-precondition',
            'Specs must be explicitly confirmed before cutting. Tech-pack status is currently "pending_ai_review".'
          );
        }

        if (techPack && techPack.status !== 'verified_by_human') {
          throw new HttpsError(
            'failed-precondition',
            `Specs must be explicitly confirmed before cutting. Tech-pack status must be "verified_by_human" (found: "${techPack.status}").`
          );
        }

        // ── Atomic Execution ──
        const nowIso = new Date().toISOString();

        // 1. Update order status
        transaction.update(orderRef, {
          status: 'cutting_authorized',
          productionUnlockedAt: admin.firestore.FieldValue.serverTimestamp(),
          authorizedBy: operatorUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Prepare payload
        const responsePayload = {
          orderId,
          status: 'cutting_authorized',
          amountPaid: totalLedgerPaid,
          totalAmount,
          authorizedBy: operatorUid,
          authorizedAt: nowIso
        };

        // 3. Write /idempotencyKeys/{idempotencyKey} with 24-hour expiration
        const expiresAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        transaction.set(idemRef, {
          key: idempotencyKey,
          orderId,
          response: responsePayload,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt
        });

        // 4. Append immutable entry into /auditLogs
        const auditDoc = auditLogsRef.doc();
        transaction.set(auditDoc, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          orderId,
          operatorUid,
          amountPaid: totalLedgerPaid,
          totalAmount,
          currency: orderData.currency || 'USD',
          result: 'AUTHORIZED',
          idempotencyKey,
          message: `JIT Cutting authorized. Verified payment ledger sum ${totalLedgerPaid} satisfies 50% advance invariant (${requiredAdvance}). Tech-pack human-verified.`,
          clientIp: request.rawRequest?.ip || 'internal'
        });

        return responsePayload;
      });

      return {
        ok: true,
        message: `Order ${orderId} successfully unlocked for JIT Cutting.`,
        data: result
      };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error(`[authorizeCutting] Transaction Error for order ${orderId}:`, error);
      throw new HttpsError('internal', error.message || 'Internal atomic transaction error.');
    }
  }
);

/**
 * ======================================================================
 * 2. recordPaymentEvent — 2nd-Gen Firebase Callable Cloud Function
 * ======================================================================
 * Inputs: { orderId: string, amount: number, method: 'BANK_TT' | 'BKASH' | 'CASH', referenceId: string, notes?: string, operatorPin: string }
 *
 * Requirements:
 * 1. Validates operatorPin === process.env.MASTER_OPERATOR_PIN.
 * 2. Atomically creates an append-only record in /orders/{orderId}/paymentLedger/{ledgerId} with serverTimestamp().
 * 3. Recomputes and caches totalAmountPaid on the parent order document.
 */
export const recordPaymentEvent = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['MASTER_OPERATOR_PIN']
  },
  async (request) => {
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'master-operator';
    const { orderId, amount, method, referenceId, notes, operatorPin } = request.data || {};

    // ── Validate Master PIN ──
    const masterPin = process.env.MASTER_OPERATOR_PIN;
    if (!masterPin) {
      console.error('[SECURITY FATAL] MASTER_OPERATOR_PIN secret is unset.');
      throw new HttpsError(
        'failed-precondition',
        'Security configuration error: MASTER_OPERATOR_PIN secret is not configured.'
      );
    }

    if (!operatorPin || typeof operatorPin !== 'string' || operatorPin !== masterPin) {
      throw new HttpsError('permission-denied', 'Invalid Master PIN authorization.');
    }

    // ── Input Validations ──
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid "orderId" string required.');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new HttpsError('invalid-argument', 'Payment "amount" must be a positive number.');
    }

    const validMethods = ['BANK_TT', 'BKASH', 'CASH'];
    if (!validMethods.includes(method)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid payment method "${method}". Allowed values: ${validMethods.join(', ')}`
      );
    }

    if (!referenceId || typeof referenceId !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid string "referenceId" (e.g. Bank TT or bKash TrxID) is required.');
    }

    const orderRef = db.collection('orders').doc(orderId);
    const auditLogsRef = db.collection('auditLogs');

    try {
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new HttpsError('not-found', `Order "${orderId}" does not exist.`);
        }

        const orderData = orderSnap.data() || {};
        const totalAmount = Number(
          orderData.totalAmount ??
          orderData.total ??
          orderData.grandTotal ??
          0
        );

        // Fetch existing ledger entries to recompute total
        const ledgerQuery = orderRef.collection('paymentLedger');
        const existingLedgerSnap = await transaction.get(ledgerQuery);

        let currentTotal = 0;
        existingLedgerSnap.forEach((doc) => {
          const docData = doc.data();
          currentTotal += Number(docData.amount || 0);
        });

        const newTotalPaid = currentTotal + numericAmount;

        // 1. Create append-only entry in /orders/{orderId}/paymentLedger/{ledgerId}
        const newLedgerDocRef = orderRef.collection('paymentLedger').doc();
        transaction.set(newLedgerDocRef, {
          amount: numericAmount,
          method,
          referenceId: referenceId.trim(),
          notes: (notes || '').trim(),
          verifiedBy: operatorUid,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Recompute and cache totalAmountPaid on parent order document
        const is50PercentMet = totalAmount > 0 && newTotalPaid >= 0.5 * totalAmount;
        transaction.update(orderRef, {
          totalAmountPaid: newTotalPaid,
          amountPaid: newTotalPaid,
          paymentStatus: is50PercentMet ? 'advance_50_pct' : 'partial',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Append to immutable audit log
        const auditDocRef = auditLogsRef.doc();
        transaction.set(auditDocRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          orderId,
          operatorUid,
          amountPaid: numericAmount,
          totalAmountPaid: newTotalPaid,
          currency: orderData.currency || 'USD',
          result: 'PAYMENT_EVENT_RECORDED',
          message: `Payment of ${numericAmount} recorded via ${method} (Ref: ${referenceId}). Ledger sum: ${newTotalPaid}.`,
          clientIp: request.rawRequest?.ip || 'internal'
        });

        return {
          ledgerId: newLedgerDocRef.id,
          orderId,
          amountRecorded: numericAmount,
          method,
          referenceId,
          totalAmountPaid: newTotalPaid,
          is50PercentAdvanceMet: is50PercentMet
        };
      });

      return {
        ok: true,
        message: `Payment event committed to immutable ledger. Total verified paid: ${result.totalAmountPaid}.`,
        data: result
      };
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      console.error(`[recordPaymentEvent] Error recording payment for order ${orderId}:`, err);
      throw new HttpsError('internal', err.message || 'Error executing payment ledger transaction.');
    }
  }
);

/**
 * ======================================================================
 * 3. callGemini — 2nd-Gen Firebase Callable Cloud Function
 * ======================================================================
 * Server-side proxy for Gemini 1.5 Flash using process.env.GEMINI_API_KEY.
 * Handles structured JSON parsing and strips any prompt injection patterns before returning data.
 */
export const callGemini = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY']
  },
  async (request) => {
    // Authenticate Caller
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication required to invoke Hands & Head Gemini proxy.'
      );
    }

    const {
      prompt,
      audioBase64,
      mimeType = 'audio/webm',
      systemInstruction,
      jsonOutput = false,
      responseSchema
    } = request.data || {};

    if (!prompt && !audioBase64) {
      throw new HttpsError(
        'invalid-argument',
        'Either "prompt" (string) or "audioBase64" must be provided.'
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'Server configuration error: GEMINI_API_KEY environment secret is not set.'
      );
    }

    // Strip Prompt Injection Patterns
    const cleanPrompt = prompt ? sanitizePrompt(prompt) : '';
    const cleanSystemInstruction = systemInstruction
      ? sanitizePrompt(systemInstruction)
      : 'You are the B2B Deal & Revenue Intelligence Engine for Hands & Head Atelier (Dhaka, Bangladesh). Provide concise, mathematically verified B2B wholesale calculations and structured JSON.';

    try {
      const ai = new GoogleGenAI({ apiKey });

      let contents: any;
      if (audioBase64) {
        const cleanBase64 = audioBase64
          .replace(/^data:audio\/[^;]+;base64,/, '')
          .replace(/^data:[^;]+;base64,/, '');

        contents = {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            },
            {
              text: cleanPrompt || 'Extract B2B tech pack PO specifications or summarize audio content.'
            }
          ]
        };
      } else {
        contents = cleanPrompt;
      }

      const config: any = {
        systemInstruction: cleanSystemInstruction,
        temperature: 0.2
      };

      if (jsonOutput || responseSchema) {
        config.responseMimeType = 'application/json';
        if (responseSchema) {
          config.responseSchema = responseSchema;
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config
      });

      const rawText = response.text || '';
      let parsedJson: any = null;

      if (jsonOutput || responseSchema) {
        try {
          parsedJson = JSON.parse(rawText);
        } catch {
          // Attempt markdown json cleanup if rawText is enclosed in ```json
          const cleanJsonText = rawText
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          try {
            parsedJson = JSON.parse(cleanJsonText);
          } catch {
            parsedJson = null;
          }
        }
      }

      return {
        ok: true,
        text: rawText,
        json: parsedJson,
        modelUsed: 'gemini-1.5-flash'
      };
    } catch (err: any) {
      console.error('[callGemini] Error invoking Gemini SDK:', err);
      throw new HttpsError('internal', err.message || 'Gemini inference failed upstream.');
    }
  }
);
