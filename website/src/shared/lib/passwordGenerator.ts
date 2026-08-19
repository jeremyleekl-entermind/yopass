// Cryptographically secure password generation.
// Uses window.crypto.getRandomValues exclusively — no Math.random anywhere.

export type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  noDuplicates: boolean;
};

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Characters that look alike and are easily confused (Il1O0 etc).
const AMBIGUOUS = new Set('Il1O0o`´\'"|.,:;[]{}()<>/\\');

function buildAlphabet(options: PasswordOptions): string {
  let chars = '';
  if (options.lowercase) chars += LOWER;
  if (options.uppercase) chars += UPPER;
  if (options.numbers) chars += DIGITS;
  if (options.symbols) chars += SYMBOLS;
  if (options.excludeAmbiguous) {
    chars = [...chars].filter(c => !AMBIGUOUS.has(c)).join('');
  }
  return chars;
}

export function passwordStrength(length: number): number {
  // Rough entropy-based score 0..4 (weak..excellent)
  if (length >= 20) return 4;
  if (length >= 14) return 3;
  if (length >= 10) return 2;
  if (length >= 8) return 1;
  return 0;
}

export function generatePassword(options: PasswordOptions): string {
  const alphabet = buildAlphabet(options);
  if (alphabet.length === 0) {
    return '';
  }
  const length = Math.max(1, Math.min(128, options.length));
  // When duplicates are forbidden the password cannot exceed the alphabet.
  const effectiveLength = options.noDuplicates
    ? Math.min(length, alphabet.length)
    : length;

  // Rejection sampling with crypto randomness — uniform, no modulo bias.
  const out: string[] = [];
  let pool = alphabet;
  while (out.length < effectiveLength) {
    if (options.noDuplicates && pool.length === 0) break;
    const bytes = new Uint8Array(1);
    window.crypto.getRandomValues(bytes);
    // Keep a small rejection window so the distribution stays uniform.
    const max = 256 - (256 % pool.length);
    if (bytes[0] >= max) continue;
    const idx = bytes[0] % pool.length;
    out.push(pool[idx]);
    if (options.noDuplicates) {
      pool = pool.slice(0, idx) + pool.slice(idx + 1);
    }
  }
  return out.join('');
}
