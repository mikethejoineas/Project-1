import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const KEY_FILE = path.join(DATA_DIR, '.app-encryption-key');

let cachedKey: Buffer | null = null;

export function resolveEncryptionKey(explicitHexKey?: string): Buffer {
  if (explicitHexKey) {
    const trimmed = explicitHexKey.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }
    return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
  }

  if (cachedKey) return cachedKey;

  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    cachedKey = /^[0-9a-fA-F]{64}$/.test(envKey)
      ? Buffer.from(envKey, 'hex')
      : crypto.createHash('sha256').update(envKey, 'utf8').digest();
    return cachedKey;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  if (fs.existsSync(KEY_FILE)) {
    const hex = fs.readFileSync(KEY_FILE, 'utf8').trim();
    if (/^[0-9a-fA-F]{64}$/.test(hex)) {
      cachedKey = Buffer.from(hex, 'hex');
      return cachedKey;
    }
  }

  const generated = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, generated.toString('hex'), { mode: 0o600 });
  cachedKey = generated;
  return cachedKey;
}

export function encryptBuffer(plaintext: Buffer, key?: Buffer): Buffer {
  const k = key ?? resolveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: [12 bytes IV][16 bytes AuthTag][ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptBuffer(payload: Buffer, key?: Buffer): Buffer {
  if (payload.length < 28) {
    throw new Error('Encrypted payload is corrupted or too short');
  }
  const k = key ?? resolveEncryptionKey();
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptText(plaintext: string, key?: Buffer): string {
  return encryptBuffer(Buffer.from(plaintext, 'utf8'), key).toString('base64');
}

export function decryptText(encoded: string, key?: Buffer): string {
  return decryptBuffer(Buffer.from(encoded, 'base64'), key).toString('utf8');
}

export function maskSensitiveValue(value: string, visibleTail = 4): string {
  if (!value) return '—';
  if (visibleTail <= 0 || value.length <= visibleTail) {
    return '•'.repeat(Math.min(12, Math.max(4, value.length)));
  }
  return '•'.repeat(Math.min(10, value.length - visibleTail)) + value.slice(-visibleTail);
}
