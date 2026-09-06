/**
 * Hands & Head — Canonical Bangladesh Phone Normalizer
 * Standardizes BD phone formats (017..., 88017..., +88017...) to canonical +88017XXXXXXXX.
 */

export function normalizeBangladeshPhone(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  let s = String(raw).trim();
  if (!s) return '';

  // Strip excel quotes, apostrophes, dashes, spaces, parentheses, slashes
  s = s.replace(/^['"]+|['"]+$/g, '').replace(/[\s\-\(\)\.\/]+/g, '');

  // Extract raw digits
  let digits = s.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Fix common typo: 88001XXXXXXXXX (14 digits) -> 8801XXXXXXXXX
  if (digits.startsWith('88001') && digits.length === 14) {
    digits = '8801' + digits.slice(5);
  }

  // 11 digits starting with 01 (e.g. 01712345678) -> +8801712345678
  if (digits.length === 11 && digits.startsWith('01')) {
    return '+88' + digits;
  }

  // 13 digits starting with 8801 (e.g. 8801712345678) -> +8801712345678
  if (digits.length === 13 && digits.startsWith('8801')) {
    return '+' + digits;
  }

  // 10 digits starting with 1 (e.g. 1712345678) -> +8801712345678
  if (digits.length === 10 && digits.startsWith('1')) {
    return '+880' + digits;
  }

  // If originally formatted with leading +, preserve international prefix
  if (s.startsWith('+')) {
    return '+' + digits;
  }

  // International standard fallback if length >= 8
  if (digits.length >= 8) {
    return '+' + digits;
  }

  return s;
}

export function isValidBangladeshMobile(phone: string): boolean {
  const norm = normalizeBangladeshPhone(phone);
  // Canonical BD mobile: +8801[3-9]XXXXXXXX (14 characters total)
  return /^\+8801[3-9]\d{8}$/.test(norm);
}
