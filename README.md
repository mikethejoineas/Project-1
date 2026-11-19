# EasyApp Processing

Independent Illinois Concealed Carry License (CCL) and FOID card application preparation service web application.

## Features

- **Public Website**: Home, Apply selector, New Application (Form A, 8 steps + Review), Renewal Application (Form B, 6 steps + Review), Payment, Thank You, Contact, Privacy Policy, and Terms & Disclaimer.
- **10-Year Address History Calculator**: Live verification checking that current and prior addresses cover 10 full years up to today's date without double-counting overlaps.
- **Security & Encryption**:
  - AES-256-GCM encryption at rest for sensitive applicant fields (DL#, DD#, FOID#, TCN/ARN/I-94, DOB, ISP password, security question answers, SSN last 4) and uploaded training certificate files.
  - Helmet security headers, rate limiting, double-submit CSRF protection, and deep input sanitization.
  - Zero card numbers or CVV handled by our servers—all payments run through Stripe Checkout + verified Stripe Webhooks.
- **2FA-Protected Admin Dashboard (`/admin`)**:
  - Password + RFC 6238 TOTP 2-Factor Authentication (with built-in QR code enrollment).
  - Filterable by application type and payment status.
  - Masked sensitive fields with audited `"Reveal"` logging.
  - Decrypted training certificate viewer, status transitions (`Submitted to ISP`, `Completed`), printable PDF export, permanent delete, and automatic 30-day post-completion data purge.

## Configuration & Environment Variables

Copy `.env.example` to `.env` and set:

```bash
# Generate a 64-char hex key for AES-256-GCM:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `ENCRYPTION_KEY`: 32-byte (64-hex-character) AES-256-GCM encryption key.
- `ADMIN_PASSWORD`: Owner password for `/admin`.
- `ADMIN_TOTP_SECRET`: Optional pre-provisioned Base32 TOTP secret (if omitted, `/admin` guides you through scanning a QR code on first login).
- `SESSION_SECRET`: Secret used to sign HttpOnly admin session cookies.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Stripe API credentials for $35.00 checkout & webhook verification (`POST /api/webhooks/stripe`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_NOTIFICATION_EMAIL`: SMTP credentials for summary notifications to `bobsump@gmail.com` and customer receipts.
- `APP_URL`: Public HTTPS origin of the deployed application.

### Configurable Price Constant

To adjust the $35 service fee, update `SERVICE_FEE_USD` in `src/shared/config.ts`.

## Local Development & Testing

```bash
npm install
npx --yes tsx --test src/utils/addressHistory.test.ts src/utils/validation.test.ts server/crypto.test.ts server/totp.test.ts
npm run dev
```

## Production Build & Deployment

```bash
npm run build
NODE_ENV=production npm start
```
