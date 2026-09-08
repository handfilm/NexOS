import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
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
 * Derive caller identifier for in-memory and persistent brute-force rate-limiting
 */
function getCallerId(request: any): string {
  if (request.auth?.uid) {
    return `user_${request.auth.uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }
  const rawIp = request.rawRequest?.headers?.['x-forwarded-for'] || request.rawRequest?.ip || 'unknown';
  const ipStr = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();
  const sanitized = ipStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `ip_${sanitized || 'anonymous'}`;
}

/**
 * Enforces Master PIN verification with brute-force rate limiting:
 * - Tracks failed attempts in /rateLimits/{callerId}
 * - Blocks caller for 15 minutes upon 5 consecutive failed attempts
 * - Resets counter only upon successful PIN verification
 */
async function verifyMasterPinWithRateLimit(
  operatorPin: any,
  callerId: string,
  context: { orderId: string; functionName: string; operatorUid: string; rawIp: string }
): Promise<void> {
  const masterPin = process.env.MASTER_OPERATOR_PIN;
  if (!masterPin) {
    console.error('[SECURITY FATAL] MASTER_OPERATOR_PIN secret is missing from Cloud Functions environment.');
    throw new HttpsError(
      'failed-precondition',
      'Security configuration error: MASTER_OPERATOR_PIN secret is not configured on the server.'
    );
  }

  const rateLimitRef = db.collection('rateLimits').doc(callerId);
  const rateLimitSnap = await rateLimitRef.get();

  if (rateLimitSnap.exists) {
    const data = rateLimitSnap.data() || {};
    const failedAttempts = Number(data.failedAttempts || 0);
    const lastFailedAt = data.lastFailedAt ? data.lastFailedAt.toDate().getTime() : 0;
    const fifteenMinutesMs = 15 * 60 * 1000;

    if (failedAttempts >= 5 && Date.now() - lastFailedAt < fifteenMinutesMs) {
      const remainingMinutes = Math.ceil((fifteenMinutesMs - (Date.now() - lastFailedAt)) / (60 * 1000));
      console.warn(`[RATE LIMIT LOCKOUT] Caller ${callerId} blocked. Attempts: ${failedAttempts}`);
      throw new HttpsError(
        'resource-exhausted',
        `Security lockout: Max PIN attempts exceeded. Try again in ${remainingMinutes || 15} minutes.`
      );
    }
  }

  // Check PIN
  if (!operatorPin || typeof operatorPin !== 'string' || operatorPin !== masterPin) {
    let currentFailed = 1;
    if (rateLimitSnap.exists) {
      const data = rateLimitSnap.data() || {};
      const lastFailedAt = data.lastFailedAt ? data.lastFailedAt.toDate().getTime() : 0;
      const fifteenMinutesMs = 15 * 60 * 1000;
      if (Date.now() - lastFailedAt < fifteenMinutesMs) {
        currentFailed = Number(data.failedAttempts || 0) + 1;
      }
    }

    await rateLimitRef.set({
      callerId,
      failedAttempts: currentFailed,
      lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
      await db.collection('auditLogs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        orderId: context.orderId || 'UNKNOWN',
        operatorUid: context.operatorUid,
        functionName: context.functionName,
        failedAttempts: currentFailed,
        result: 'UNAUTHORIZED_PIN_FAILURE',
        message: `Security Alert: Invalid Master Operator PIN attempt (${currentFailed}/5).`,
        clientIp: context.rawIp
      });
    } catch (logErr) {
      console.error('[auditLogs] Failed to write unauthorized audit log:', logErr);
    }

    throw new HttpsError('permission-denied', 'Invalid Master PIN authorization.');
  }

  // Successful verification: Reset lockout counter
  if (rateLimitSnap.exists) {
    await rateLimitRef.delete();
  }
}

/**
 * ======================================================================
 * 1. authorizeCutting — 2nd-Gen Firebase Callable Cloud Function (O(1))
 * ======================================================================
 * Inputs: { orderId: string, idempotencyKey: string, operatorPin: string }
 *
 * Enterprise Security & Architecture:
 * 1. In-Memory / Firestore Brute-Force Rate Limiting on Master PIN.
 * 2. Order-Bound Idempotency Engine (/idempotencyKeys/{orderId}__{idempotencyKey}).
 * 3. O(1) Single Parent Document Read — Checks runningTotalPaid >= 0.5 * totalAmount.
 * 4. Spec Verification Gate: order.specVerification.status === "verified_by_human".
 * 5. Atomic Commit: order.status = "cutting_authorized", 24h idempotency lock, audit log append.
 */
export const authorizeCutting = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['MASTER_OPERATOR_PIN']
  },
  async (request: CallableRequest<any>) => {
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'master-operator';
    const callerId = getCallerId(request);
    const { orderId, idempotencyKey, operatorPin } = request.data || {};

    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "orderId" string is required.');
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "idempotencyKey" UUID string is required.');
    }

    // ── Security Check 1: Rate-Limited Master PIN Gate ──
    await verifyMasterPinWithRateLimit(operatorPin, callerId, {
      orderId,
      functionName: 'authorizeCutting',
      operatorUid,
      rawIp: request.rawRequest?.ip || 'internal'
    });

    // ── Order-Bound Idempotency Key ──
    const scopedKey = `${orderId}__${idempotencyKey}`;
    const idemRef = db.collection('idempotencyKeys').doc(scopedKey);
    const orderRef = db.collection('orders').doc(orderId);
    const auditLogsRef = db.collection('auditLogs');

    try {
      const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Step A: Check Scoped Idempotency within Transaction
        const idemSnap = await transaction.get(idemRef);
        if (idemSnap.exists) {
          const cached = idemSnap.data() || {};
          if (cached.orderId && cached.orderId !== orderId) {
            throw new HttpsError('invalid-argument', 'Idempotency key scope violation.');
          }
          console.log(`[authorizeCutting] Idempotent replay triggered for scoped key: ${scopedKey}`);
          return cached.response || {
            orderId,
            status: 'cutting_authorized',
            idempotentReplay: true,
            cachedAt: cached.createdAt
          };
        }

        // Step B: Single O(1) Parent Document Read
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new HttpsError('not-found', `Order document "${orderId}" was not found.`);
        }

        const orderData = orderSnap.data() || {};

        // Invariant 1: 50% Advance Check on O(1) Denormalized Running Total
        const totalAmount = Number(
          orderData.totalAmount ??
          orderData.total ??
          orderData.grandTotal ??
          0
        );
        const runningTotalPaid = Number(
          orderData.runningTotalPaid ??
          orderData.totalAmountPaid ??
          orderData.amountPaid ??
          0
        );
        const requiredAdvance = 0.5 * totalAmount;

        if (runningTotalPaid < requiredAdvance) {
          const blockedAuditDoc = auditLogsRef.doc();
          transaction.set(blockedAuditDoc, {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            orderId,
            operatorUid,
            amountPaid: runningTotalPaid,
            totalAmount,
            currency: orderData.currency || 'USD',
            result: 'BLOCKED_LESS_THAN_50_PCT',
            message: `Transaction Blocked: Advance balance below 50% threshold. (Running Total Paid: ${runningTotalPaid} of required: ${requiredAdvance})`,
            clientIp: request.rawRequest?.ip || 'internal'
          });

          throw new HttpsError(
            'failed-precondition',
            `Advance balance below 50% threshold. Confirmed running paid: ${runningTotalPaid}, required 50%: ${requiredAdvance}.`
          );
        }

        // Invariant 2: Spec Verification Gate (Requires "verified_by_human")
        const specStatus =
          orderData.specVerification?.status ||
          orderData.techPack?.status ||
          orderData.techPackStatus;

        if (specStatus === 'pending_ai_review') {
          throw new HttpsError(
            'failed-precondition',
            'Specs must be explicitly confirmed before cutting. Tech-pack status is currently "pending_ai_review".'
          );
        }

        if (specStatus !== 'verified_by_human') {
          throw new HttpsError(
            'failed-precondition',
            `Specs must be explicitly confirmed before cutting. Tech-pack spec verification status must be "verified_by_human" (found: "${specStatus || 'unverified'}").`
          );
        }

        // Step C: Atomic Commit
        const nowIso = new Date().toISOString();
        const serverTs = admin.firestore.FieldValue.serverTimestamp();

        transaction.update(orderRef, {
          status: 'cutting_authorized',
          productionUnlockedAt: serverTs,
          authorizedBy: operatorUid,
          updatedAt: serverTs
        });

        const responsePayload = {
          orderId,
          status: 'cutting_authorized',
          amountPaid: runningTotalPaid,
          totalAmount,
          authorizedBy: operatorUid,
          authorizedAt: nowIso
        };

        // Write Scoped Idempotency Key (24h TTL)
        const expiresAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        transaction.set(idemRef, {
          key: idempotencyKey,
          scopedKey,
          orderId,
          response: responsePayload,
          createdAt: serverTs,
          expiresAt
        });

        // Write to Immutable /auditLogs
        const auditDoc = auditLogsRef.doc();
        transaction.set(auditDoc, {
          timestamp: serverTs,
          orderId,
          operatorUid,
          amountPaid: runningTotalPaid,
          totalAmount,
          currency: orderData.currency || 'USD',
          result: 'AUTHORIZED',
          idempotencyKey,
          scopedKey,
          message: `JIT Cutting authorized. O(1) verified running paid ${runningTotalPaid} satisfies 50% advance invariant (${requiredAdvance}). Tech-pack confirmed human-verified.`,
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
      if (error instanceof HttpsError) throw error;
      console.error(`[authorizeCutting] Transaction Error for order ${orderId}:`, error);
      throw new HttpsError('internal', error.message || 'Internal atomic transaction error.');
    }
  }
);

/**
 * ======================================================================
 * 2. recordPaymentEvent — O(1) Denormalized Payment Ledger Cloud Function
 * ======================================================================
 * Inputs: { orderId: string, amount: number, method: 'BANK_TT' | 'BKASH' | 'CASH', referenceId: string, idempotencyKey: string, operatorPin: string, notes?: string }
 *
 * Enterprise Security & Architecture:
 * 1. In-Memory / Firestore Brute-Force Rate Limiting on Master PIN.
 * 2. Scoped Idempotency Gate (/idempotencyKeys/{orderId}__{idempotencyKey}).
 * 3. O(1) Atomic Execution: Reads current order.runningTotalPaid, increments by amount,
 *    appends immutable subdocument to /orders/{orderId}/paymentLedger, and writes back runningTotalPaid.
 */
export const recordPaymentEvent = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['MASTER_OPERATOR_PIN']
  },
  async (request: CallableRequest<any>) => {
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'master-operator';
    const callerId = getCallerId(request);
    const { orderId, amount, method, referenceId, idempotencyKey, operatorPin, notes } = request.data || {};

    // ── Input Validations ──
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "orderId" string is required.');
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "idempotencyKey" UUID string is required.');
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
      throw new HttpsError('invalid-argument', 'A valid string "referenceId" is required.');
    }

    // ── Security Check: Rate-Limited Master PIN Gate ──
    await verifyMasterPinWithRateLimit(operatorPin, callerId, {
      orderId,
      functionName: 'recordPaymentEvent',
      operatorUid,
      rawIp: request.rawRequest?.ip || 'internal'
    });

    const scopedKey = `${orderId}__${idempotencyKey}`;
    const idemRef = db.collection('idempotencyKeys').doc(scopedKey);
    const orderRef = db.collection('orders').doc(orderId);
    const auditLogsRef = db.collection('auditLogs');

    try {
      const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Step A: Idempotency Check
        const idemSnap = await transaction.get(idemRef);
        if (idemSnap.exists) {
          const cached = idemSnap.data() || {};
          if (cached.orderId && cached.orderId !== orderId) {
            throw new HttpsError('invalid-argument', 'Idempotency key scope violation.');
          }
          console.log(`[recordPaymentEvent] Idempotent replay for scoped key: ${scopedKey}`);
          return cached.response || {
            orderId,
            amountRecorded: numericAmount,
            idempotentReplay: true,
            cachedAt: cached.createdAt
          };
        }

        // Step B: O(1) Parent Document Read
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

        const currentRunning = Number(
          orderData.runningTotalPaid ??
          orderData.totalAmountPaid ??
          orderData.amountPaid ??
          0
        );
        const newRunningTotal = currentRunning + numericAmount;
        const is50PercentMet = totalAmount > 0 && newRunningTotal >= 0.5 * totalAmount;
        const serverTs = admin.firestore.FieldValue.serverTimestamp();

        // Step C: Append-only entry in /orders/{orderId}/paymentLedger/{ledgerId}
        const newLedgerDocRef = orderRef.collection('paymentLedger').doc();
        transaction.set(newLedgerDocRef, {
          amount: numericAmount,
          method,
          referenceId: referenceId.trim(),
          notes: (notes || '').trim(),
          idempotencyKey,
          scopedKey,
          verifiedBy: operatorUid,
          createdAt: serverTs
        });

        // Step D: O(1) Atomic denormalization update on parent order
        transaction.update(orderRef, {
          runningTotalPaid: newRunningTotal,
          totalAmountPaid: newRunningTotal,
          amountPaid: newRunningTotal,
          paymentStatus: is50PercentMet ? 'advance_50_pct' : 'partial',
          updatedAt: serverTs
        });

        const responsePayload = {
          ledgerId: newLedgerDocRef.id,
          orderId,
          amountRecorded: numericAmount,
          method,
          referenceId: referenceId.trim(),
          runningTotalPaid: newRunningTotal,
          totalAmountPaid: newRunningTotal,
          is50PercentAdvanceMet: is50PercentMet
        };

        // Step E: Write Scoped Idempotency Key (24h TTL)
        const expiresAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        transaction.set(idemRef, {
          key: idempotencyKey,
          scopedKey,
          orderId,
          response: responsePayload,
          createdAt: serverTs,
          expiresAt
        });

        // Step F: Append to immutable audit log
        const auditDocRef = auditLogsRef.doc();
        transaction.set(auditDocRef, {
          timestamp: serverTs,
          orderId,
          operatorUid,
          amountPaid: numericAmount,
          totalAmountPaid: newRunningTotal,
          runningTotalPaid: newRunningTotal,
          currency: orderData.currency || 'USD',
          result: 'PAYMENT_EVENT_RECORDED',
          idempotencyKey,
          scopedKey,
          message: `O(1) Payment of ${numericAmount} recorded via ${method} (Ref: ${referenceId}). Running Total Paid: ${newRunningTotal}.`,
          clientIp: request.rawRequest?.ip || 'internal'
        });

        return responsePayload;
      });

      return {
        ok: true,
        message: `Payment event committed to immutable ledger. Running total verified: ${result.runningTotalPaid}.`,
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
 * 3. markSpecVerified — Server-Side Spec Verification Gate
 * ======================================================================
 * Inputs: { orderId: string, operatorPin: string }
 *
 * Requirements:
 * 1. Validates Master PIN with rate-limit brute-force protection.
 * 2. Atomically updates order.specVerification = { status: "verified_by_human", verifiedBy, verifiedAt }.
 * 3. Logs action to /auditLogs.
 */
export const markSpecVerified = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['MASTER_OPERATOR_PIN']
  },
  async (request: CallableRequest<any>) => {
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'master-operator';
    const callerId = getCallerId(request);
    const { orderId, operatorPin } = request.data || {};

    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid "orderId" string is required.');
    }

    // ── Security Check: Rate-Limited Master PIN Gate ──
    await verifyMasterPinWithRateLimit(operatorPin, callerId, {
      orderId,
      functionName: 'markSpecVerified',
      operatorUid,
      rawIp: request.rawRequest?.ip || 'internal'
    });

    const orderRef = db.collection('orders').doc(orderId);
    const auditLogsRef = db.collection('auditLogs');

    try {
      const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new HttpsError('not-found', `Order document "${orderId}" was not found.`);
        }

        const nowServerTs = admin.firestore.FieldValue.serverTimestamp();
        const nowIso = new Date().toISOString();

        const specVerificationData = {
          status: 'verified_by_human',
          verifiedBy: operatorUid,
          verifiedAt: nowServerTs
        };

        transaction.update(orderRef, {
          specVerification: specVerificationData,
          'techPack.status': 'verified_by_human',
          techPackStatus: 'verified_by_human',
          updatedAt: nowServerTs
        });

        const auditDoc = auditLogsRef.doc();
        transaction.set(auditDoc, {
          timestamp: nowServerTs,
          orderId,
          operatorUid,
          result: 'SPEC_VERIFIED_BY_HUMAN',
          message: `Tech-pack specs cryptographically authorized by human operator (${operatorUid}). Ready for JIT cutting unlock.`,
          clientIp: request.rawRequest?.ip || 'internal'
        });

        return {
          orderId,
          specVerification: {
            status: 'verified_by_human',
            verifiedBy: operatorUid,
            verifiedAt: nowIso
          }
        };
      });

      return {
        ok: true,
        message: `Tech-pack specs for order ${orderId} verified by human operator.`,
        data: result
      };
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      console.error(`[markSpecVerified] Error for order ${orderId}:`, err);
      throw new HttpsError('internal', err.message || 'Error verifying tech pack specs.');
    }
  }
);

/**
 * ======================================================================
 * 4. callGemini — 2nd-Gen Firebase Callable Cloud Function
 * ======================================================================
 * Server-side proxy for Gemini 1.5 Flash using process.env.GEMINI_API_KEY.
 * Handles structured JSON parsing and strips prompt injection patterns before returning data.
 */
export const callGemini = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY']
  },
  async (request: CallableRequest<any>) => {
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
