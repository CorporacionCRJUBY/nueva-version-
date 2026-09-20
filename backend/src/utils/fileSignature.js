'use strict';

const crypto = require('crypto');
const fs = require('fs');

const WINDOW = 2048;

/**
 * Utility for verifying file signatures by reading magic bytes.
 *
 * Usage:
 *   const sig = await readFileSignature(filePath);
 *   const ok = allowedMime(sig, allowedSignatures);
 */

const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46],
  zip: [0x50, 0x4b, 0x03, 0x04],
  docx: [0x50, 0x4b, 0x03, 0x04],
  xlsx: [0x50, 0x4b, 0x03, 0x44],
  ole: [0xd0, 0xcf, 0x11, 0xe0],
};

function readFileSignature(filePath) {
  return new Promise((resolve, reject) => {
    fs.open(filePath, 'r', (openErr, fd) => {
      if (openErr) {
        return reject(openErr);
      }

      const buffer = Buffer.allocUnsafe(WINDOW);
      fs.read(fd, buffer, 0, WINDOW, 0, (readErr, bytesRead) => {
        try {
          if (fs.closeSync(fd) !== undefined) {
            // fs.closeSync returns undefined
          }
        } catch (closeErr) {
          // ignore
        }

        if (readErr) {
          return reject(readErr);
        }

        const slice = buffer.subarray(0, bytesRead);
        const sig = Array.from(slice).slice(0, 4);
        return resolve(sig);
      });
    });
  });
}

function readBufferSignature(buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new TypeError('Expected a Buffer or Uint8Array');
  }

  const arr = Array.from(buffer).slice(0, 4);
  return arr;
}

function matches(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) {
    return false;
  }

  if (actual.length < expected.length) {
    return false;
  }

  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      return false;
    }
  }

  return true;
}

function detectMime(signature) {
  if (!Array.isArray(signature) || signature.length === 0) {
    return null;
  }

  if (matches(MAGIC.pdf, signature)) {
    return 'application/pdf';
  }

  if (matches(MAGIC.png, signature)) {
    return 'image/png';
  }

  if (matches(MAGIC.jpeg, signature)) {
    return 'image/jpeg';
  }

  if (matches(MAGIC.gif, signature)) {
    return 'image/gif';
  }

  if (matches(MAGIC.webp, signature)) {
    return 'image/webp';
  }

  if (matches(MAGIC.zip, signature)) {
    return 'application/zip';
  }

  if (matches(MAGIC.docx, signature)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  if (matches(MAGIC.xlsx, signature)) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  if (matches(MAGIC.ole, signature)) {
    return 'application/x-ole-storage';
  }

  return null;
}

module.exports = {
  readFileSignature,
  readBufferSignature,
  matches,
  detectMime,
  MAGIC,
};
