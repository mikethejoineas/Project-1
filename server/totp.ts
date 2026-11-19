import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(numBytes = 20): string {
  return base32Encode(crypto.randomBytes(numBytes));
}

export function generateTotpCode(
  base32Secret: string,
  timestampMs: number = Date.now(),
  stepSeconds = 30,
  digits = 6
): string {
  const key = base32Decode(base32Secret);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return String(otp).padStart(digits, '0');
}

export function verifyTotpCode(
  base32Secret: string,
  token: string,
  timestampMs: number = Date.now(),
  windowSteps = 1
): boolean {
  const cleanToken = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const checkTime = timestampMs + offset * 30 * 1000;
    const expected = generateTotpCode(base32Secret, checkTime);
    const expectedBuf = Buffer.from(expected, 'utf8');
    const tokenBuf = Buffer.from(cleanToken, 'utf8');
    if (
      expectedBuf.length === tokenBuf.length &&
      crypto.timingSafeEqual(expectedBuf, tokenBuf)
    ) {
      return true;
    }
  }

  return false;
}

export function buildOtpAuthUri(
  secret: string,
  accountName = 'bobsump@gmail.com',
  issuer = 'EasyApp Processing'
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
