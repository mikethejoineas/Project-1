import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOtpAuthUri, generateTotpCode, verifyTotpCode } from './totp';

test('RFC 6238 TOTP generates and verifies 6-digit codes within window', () => {
  // Standard RFC test secret base32("12345678901234567890") = GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const now = 1700000000000;
  const code = generateTotpCode(secret, now);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotpCode(secret, code, now), true);
  // 25 seconds later should still verify within +-1 step window
  assert.equal(verifyTotpCode(secret, code, now + 25000), true);
  // Wrong code must fail
  assert.equal(verifyTotpCode(secret, '000000', now), false);
});

test('buildOtpAuthUri formats issuer and secret properly', () => {
  const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'bobsump@gmail.com', 'EasyApp Processing');
  assert.ok(uri.startsWith('otpauth://totp/'));
  assert.ok(uri.includes('secret=JBSWY3DPEHPK3PXP'));
});
