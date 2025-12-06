// encryption.js
const crypto = require('crypto');

// AES-256-CBC algorithm
const algorithm = 'aes-256-cbc';
// 32-byte key derived from secret in .env
const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32);

/**
 * Encrypt a text string
 * @param {string} text - Plain text to encrypt
 * @returns {Object} { data: encrypted string, iv: initialization vector }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16); // unique IV for each encryption
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { data: encrypted, iv: iv.toString('hex') };
}

/**
 * Decrypt a text string
 * @param {string} encryptedData - Encrypted string
 * @param {string} ivHex - Initialization vector used during encryption
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedData, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
