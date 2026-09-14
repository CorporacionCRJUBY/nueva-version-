'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = Number(process.env.TWO_FACTOR_PERIOD) || 30;

// Coste bcrypt para los códigos de respaldo (más bajo que el de las
// contraseñas: los códigos se comparan uno a uno contra una lista corta y
// el acceso a esta función ya está autenticado).
const BACKUP_CODE_BCRYPT_ROUNDS = 10;

function hotpSha1(hmacSha1, digits) {
  const offset = hmacSha1[19] & 0xf;
  const binary =
    ((hmacSha1[offset] & 0x7f) << 24) |
    ((hmacSha1[offset + 1] & 0xff) << 16) |
    ((hmacSha1[offset + 2] & 0xff) << 8) |
    (hmacSha1[offset + 3] & 0xff);

  return (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
}

function base32Decode(secret) {
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = String(secret).toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');

  if (normalized.length === 0) {
    return null;
  }

  const bits = [];
  for (const ch of normalized) {
    const index = base32Alphabet.indexOf(ch);
    if (index === -1) {
      continue;
    }
    for (let i = 4; i >= 0; i--) {
      bits.push((index >> i) & 1);
    }
  }

  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

// 20 bytes aleatorios -> 32 caracteres base32, longitud múltiplo de 8 y
// tamaño estándar (160 bits) aceptado por Google Authenticator, Authy, etc.
function generateSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  return base32Encode(bytes);
}

function base32Encode(bytes) {
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  bits = bits.padEnd(Math.ceil(bits.length / 5) * 5, '0');

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const value = parseInt(chunk, 2);
    if (value >= 0 && value < base32Alphabet.length) {
      result += base32Alphabet[value];
    }
  }

  return result;
}

/**
 * Genera el código TOTP para un secreto.
 * @param {string} secret - Secreto base32
 * @param {number} [timeStep] - Contador de pasos de 30s (si se omite, el actual)
 */
function generateTOTP(secret, timeStep) {
  const key = base32Decode(secret);
  if (!key) {
    return null;
  }

  const period = TOTP_PERIOD || 30;
  const digits = TOTP_DIGITS || 6;

  const counter = Number.isFinite(timeStep)
    ? Math.floor(timeStep)
    : Math.floor(Date.now() / 1000 / period);

  const counterBytes = Buffer.allocUnsafe(8);
  for (let i = 0; i < 8; i++) {
    counterBytes[i] = (counter >> (8 * (7 - i))) & 0xff;
  }

  const hmac = crypto.createHmac(TOTP_ALGORITHM, key);
  hmac.update(counterBytes);
  const digest = hmac.digest();

  return hotpSha1(digest, digits);
}

function verifyTOTP(secret, token, window = 1) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const normalizedToken = String(token).trim();
  if (!/^\d+$/.test(normalizedToken)) {
    return false;
  }

  const tokenInt = parseInt(normalizedToken, 10);
  const currentStep = Math.floor(Date.now() / 1000 / (TOTP_PERIOD || 30));

  for (let i = -window; i <= window; i++) {
    const candidate = generateTOTP(secret, currentStep + i);
    if (candidate && parseInt(candidate, 10) === tokenInt) {
      return true;
    }
  }

  return false;
}

function createTOTPUrl(secret, accountName, issuer) {
  const resolvedIssuer = issuer || process.env.TWO_FACTOR_ISSUER || 'ACADEMIX';
  const label = encodeURIComponent(`${resolvedIssuer}:${accountName || 'user'}`);
  const secretEncoded = encodeURIComponent(secret);
  return `otpauth://totp/${label}?secret=${secretEncoded}&issuer=${encodeURIComponent(resolvedIssuer)}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD}`;
}

function generateRecoveryCode() {
  const bytes = crypto.randomBytes(10);
  return bytes.toString('hex');
}

/**
 * Genera `count` códigos de respaldo legibles (hex, en mayúsculas, con un
 * guion para agruparlos). Se devuelven en claro exactamente una vez, al
 * momento de activar 2FA o regenerarlos.
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = generateRecoveryCode().toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`);
  }
  return codes;
}

/**
 * Hashea los códigos de respaldo para guardarlos (nunca en claro).
 * @returns {Promise<string[]>} hashes bcrypt
 */
async function hashBackupCodes(codes) {
  const hashes = [];
  for (const code of codes) {
    hashes.push(await bcrypt.hash(String(code), BACKUP_CODE_BCRYPT_ROUNDS));
  }
  return hashes;
}

/**
 * Compara un código contra la lista de hashes y, si coincide, devuelve la
 * lista restante (sin el código consumido) para persistirla.
 * @param {string} code
 * @param {string[]} storedHashes - Hashes bcrypt de los códigos vigentes
 * @returns {Promise<string[]|null>} hashes restantes, o null si no coincide
 */
async function consumeBackupCode(code, storedHashes) {
  if (!code || !Array.isArray(storedHashes) || storedHashes.length === 0) {
    return null;
  }

  const normalized = String(code).trim().toUpperCase();
  for (let i = 0; i < storedHashes.length; i++) {
    if (await bcrypt.compare(normalized, storedHashes[i])) {
      const remaining = storedHashes.slice();
      remaining.splice(i, 1);
      return remaining;
    }
  }

  return null;
}

module.exports = {
  generateTOTP,
  verifyTOTP,
  createTOTPUrl,
  generateSecret,
  generateRecoveryCode,
  generateBackupCodes,
  hashBackupCodes,
  consumeBackupCode,
  base32Decode,
  base32Encode,
  TOTP_PERIOD,
  TOTP_DIGITS,
};