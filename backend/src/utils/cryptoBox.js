'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.CRYPTO_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY / CRYPTO_KEY is not configured. ' +
      'Field-level encryption requires a 32-byte key (or a base64/hex representation).'
    );
  }
  return crypto.createHash('sha256').update(String(key)).digest();
}

function encrypt(plaintext) {
  if (plaintext == null) {
    return null;
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ]);

  return packed.toString('base64');
}

function decrypt(ciphertext) {
  if (ciphertext == null || ciphertext === '') {
    return null;
  }

  const key = getKey();
  let buffer;
  try {
    buffer = Buffer.from(ciphertext, 'base64');
  } catch (error) {
    return null;
  }

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    return null;
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function isEncrypted(value) {
  if (typeof value !== 'string' || value === '') {
    return false;
  }
  try {
    const buffer = Buffer.from(value, 'base64');
    return (
      buffer.length > IV_LENGTH + AUTH_TAG_LENGTH + 1 &&
      buffer.length % 1 === 0
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  ALGORITHM,
  IV_LENGTH,
  TAG_LENGTH,
};
