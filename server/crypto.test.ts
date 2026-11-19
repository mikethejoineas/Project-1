import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  decryptBuffer,
  decryptText,
  encryptBuffer,
  encryptText,
  maskSensitiveValue,
} from './crypto';

test('AES-256-GCM encryptText/decryptText roundtrip', () => {
  const key = crypto.randomBytes(32);
  const secret = 'S123-4567-8901 | Digital2!';
  const encrypted = encryptText(secret, key);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptText(encrypted, key), secret);
});

test('AES-256-GCM detects tampered ciphertext', () => {
  const key = crypto.randomBytes(32);
  const buf = encryptBuffer(Buffer.from('sensitive pdf bytes'), key);
  buf[buf.length - 1] ^= 0xff;
  assert.throws(() => decryptBuffer(buf, key));
});

test('maskSensitiveValue obscures sensitive prefixes', () => {
  assert.equal(maskSensitiveValue('S123-4567-8901', 4), '••••••••••8901');
  assert.equal(maskSensitiveValue('4821', 4), '••••');
  assert.equal(maskSensitiveValue('Digital2!', 0), '•••••••••');
});
