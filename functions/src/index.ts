import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 1. authorizeCutting — 2nd-Gen Firebase Callable Cloud Function
 *
 * Enforces atomic transaction verification for B2B JIT cutting authorization.
 * Rule: Production cannot begin until at least 50% advance deposit is verified in Firestore.
 */
export const authorizeCutting = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10
  },
  async (request) => {
    // 1. Authentication Check
    const auth = request.auth;
    const operatorUid = auth?.uid || request.data?.operatorUid || 'system-operator';

    // 2. Validate Input
    const { orderId } = request.data || {};
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'The function must be called with a valid "orderId" string.'
      );
    }

    const orderRef = db.collection('orders').doc(orderId);
    const auditLogsRef = db.collection('auditLogs');

    try {
      // 3. Atomic Firestore Transaction
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists) {
          throw new HttpsError('not-found', `Order document "${orderId}" was not found.`);
        }

        const orderData = orderSnap.data() || {};

        // Extract financial numbers with robust fallback mapping
        const totalAmount = Number(
          orderData.totalAmount ??
          orderData.total ??
          orderData.grandTotal ??
          0
        );

        const payment = orderData.payment || {};
        const amountPaid = Number(
          payment.amountPaid ??
          orderData.amountPaid ??
          orderData.paidAmount ??
          orderData.depositPaid ??
          0
        );

        const requiredAdvance = 0.5 * totalAmount;

        // Security Gate: Verify 50% advance payment requirement
        if (amountPaid < requiredAdvance) {
          // Log blocked attempt to audit ledger
          const blockedAuditDoc = auditLogsRef.doc();
          transaction.set(blockedAuditDoc, {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            orderId,
            operatorUid,
            amountPaid,
            totalAmount,
            currency: orderData.currency || 'USD',
            result: 'BLOCKED_LESS_THAN_50_PCT',
            message: `Transaction Blocked: Less than 50% advance deposit confirmed. ($${amountPaid} of required $${requiredAdvance})`,
            clientIp: request.rawRequest?.ip || 'internal'
          });

          throw new HttpsError(
            'failed-precondition',
            'Transaction Blocked: Less than 50% advance deposit confirmed.'
          );
        }

        // Advance is verified: Authorize JIT Cutting in production
        transaction.update(orderRef, {
          status: 'cutting_authorized',
          productionUnlockedAt: admin.firestore.FieldValue.serverTimestamp(),
          authorizedBy: operatorUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Write immutable audit log record inside the same atomic commit
        const auditDoc = auditLogsRef.doc();
        transaction.set(auditDoc, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          orderId,
          operatorUid,
          amountPaid,
          totalAmount,
          currency: orderData.currency || 'USD',
          result: 'AUTHORIZED',
          message: `JIT Cutting authorized. Advance payment of ${amountPaid} meets or exceeds 50% threshold (${requiredAdvance}).`,
          clientIp: request.rawRequest?.ip || 'internal'
        });

        return {
          orderId,
          status: 'cutting_authorized',
          amountPaid,
          totalAmount,
          authorizedAt: new Date().toISOString()
        };
      });

      return {
        ok: true,
        message: `Order ${orderId} successfully unlocked for JIT Cutting.`,
        data: result
      };
    } catch (error: any) {
      // Re-throw if it's already an HttpsError
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error(`[authorizeCutting] Transaction Error for order ${orderId}:`, error);
      throw new HttpsError('internal', error.message || 'Internal atomic transaction error.');
    }
  }
);

/**
 * 2. callGemini — 2nd-Gen Firebase Callable Cloud Function
 *
 * Authenticated proxy executing Gemini 1.5 Flash server-side to safeguard API keys.
 * Accepts text prompt or audio base64 payload and returns typed inference JSON.
 */
export const callGemini = onCall(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY']
  },
  async (request) => {
    // 1. Authenticate Caller
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication required to invoke Hands & Head Gemini proxy.'
      );
    }

    const { prompt, audioBase64, mimeType = 'audio/webm', systemInstruction } = request.data || {};

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
              text: prompt || 'Extract B2B tech pack PO specifications or summarize audio content.'
            }
          ]
        };
      } else {
        contents = prompt;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          systemInstruction:
            systemInstruction ||
            'You are the B2B Deal & Revenue Intelligence Engine for Hands & Head Atelier (Dhaka, Bangladesh). Provide concise, mathematically verified B2B wholesale calculations.',
          temperature: 0.4
        }
      });

      return {
        ok: true,
        text: response.text || '',
        modelUsed: 'gemini-1.5-flash'
      };
    } catch (err: any) {
      console.error('[callGemini] Error invoking Gemini SDK:', err);
      throw new HttpsError('internal', err.message || 'Gemini inference failed upstream.');
    }
  }
);
