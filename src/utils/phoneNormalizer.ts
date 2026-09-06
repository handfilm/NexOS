/**
 * Hands & Head — Canonical Bangladesh Phone Normalizer
 * Standardizes BD phone formats (017..., 88017..., +88017...) to canonical +88017XXXXXXXX.
 * Validates against Bangladesh mobile carrier codes (013-019).
 */

export interface PhoneParseResult {
  rawPhone: string;
  normalizedPhone: string | null; // Canonical +88017XXXXXXXX format
  isValid: boolean;
  operatorPrefix?: string;
  carrierName?: string;
}

export const BD_CARRIER_PREFIXES: Record<string, string> = {
  '013': 'Grameenphone (Skitto)',
  '014': 'Banglalink',
  '015': 'Teletalk',
  '016': 'Airtel',
  '017': 'Grameenphone',
  '018': 'Robi',
  '019': 'Banglalink'
};

/**
 * Deterministically parses, validates, and normalizes a Bangladesh phone number.
 * Returns PhoneParseResult. Never mutates raw data blindly.
 */
export function parseBangladeshPhone(raw: string | number | null | undefined): PhoneParseResult {
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  const trimmed = rawStr.trim();

  if (!trimmed) {
    return {
      rawPhone: rawStr,
      normalizedPhone: null,
      isValid: false
    };
  }

  // Strip excel quotes, apostrophes, dashes, spaces, parentheses, slashes, dots
  let cleaned = trimmed
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/[\s\-\(\)\.\/\\]+/g, '');

  // Strip international exit prefix 00 (e.g. 0088017...)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // Extract raw digits
  let digits = cleaned.replace(/[^0-9]/g, '');
  if (!digits) {
    return {
      rawPhone: rawStr,
      normalizedPhone: null,
      isValid: false
    };
  }

  // Handle common data-entry typo: 88001XXXXXXXXX (14 digits) -> 8801XXXXXXXXX
  if (digits.startsWith('88001') && digits.length === 14) {
    digits = '8801' + digits.slice(5);
  }

  let localEleven = '';

  // 1. Exactly 11 digits starting with '01' (e.g. 017XXXXXXXX)
  if (digits.length === 11 && digits.startsWith('01')) {
    localEleven = digits;
  }
  // 2. Exactly 13 digits starting with '8801' (e.g. 88017XXXXXXXX)
  else if (digits.length === 13 && digits.startsWith('8801')) {
    localEleven = digits.slice(2); // '01...'
  }
  // 3. Exactly 10 digits starting with '1' (missing leading 0, e.g. 17XXXXXXXX)
  else if (digits.length === 10 && digits.startsWith('1')) {
    localEleven = '0' + digits;
  }
  // 4. Exactly 12 digits starting with '881' (e.g. 8817XXXXXXXX)
  else if (digits.length === 12 && digits.startsWith('881')) {
    localEleven = '0' + digits.slice(2);
  }

  // Validate local eleven digits
  if (localEleven.length === 11 && localEleven.startsWith('01')) {
    const prefix = localEleven.slice(0, 3);
    const carrier = BD_CARRIER_PREFIXES[prefix];

    if (carrier) {
      const canonical = '+88' + localEleven; // 14 characters total: +8801XXXXXXXXX
      return {
        rawPhone: rawStr,
        normalizedPhone: canonical,
        isValid: true,
        operatorPrefix: prefix,
        carrierName: carrier
      };
    }
  }

  // If input could not be validated as a legitimate BD mobile phone
  return {
    rawPhone: rawStr,
    normalizedPhone: null,
    isValid: false
  };
}

/**
 * Backwards-compatible convenience normalizer. Returns canonical string or raw fallback.
 */
export function normalizeBangladeshPhone(raw: string | number | null | undefined): string {
  const result = parseBangladeshPhone(raw);
  if (result.isValid && result.normalizedPhone) {
    return result.normalizedPhone;
  }
  return raw === null || raw === undefined ? '' : String(raw).trim();
}

/**
 * Backwards-compatible validator. Checks whether phone is a valid BD mobile number.
 */
export function isValidBangladeshMobile(phone: string | number | null | undefined): boolean {
  return parseBangladeshPhone(phone).isValid;
}

// Global browser window exposure for hybrid scripts
if (typeof window !== 'undefined') {
  (window as any).PhoneNormalizer = {
    parseBangladeshPhone,
    normalizeBangladeshPhone,
    isValidBangladeshMobile,
    BD_CARRIER_PREFIXES
  };
}

