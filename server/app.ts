import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import QRCode from 'qrcode';
import Stripe from 'stripe';
import { z } from 'zod';
import { BUSINESS_INFO, SERVICE_FEE_CENTS, SERVICE_FEE_USD } from '../src/shared/config.ts';
import {
  addressHistorySchema,
  authorizationSchema,
  criminalHistorySchema,
  driversLicenseSchema,
  foidCitizenshipSchema,
  ispAccountNewSchema,
  ispAccountRenewalSchema,
  personalInfoSchema,
} from '../src/utils/validation.ts';
import {
  decryptBuffer,
  decryptText,
  encryptBuffer,
  encryptText,
  maskSensitiveValue,
} from './crypto.ts';
import {
  type ApplicationRow,
  type RevealAuditRow,
  generateReferenceId,
  getDb,
  getOrInitTotpConfig,
  getUploadsDir,
  markTotpVerified,
  permanentlyDeleteApplication,
  purgeExpiredCompletedApplications,
  seedDemoApplicationsIfEmpty,
} from './db.ts';
import { sendContactInquiryEmail, sendPaidSubmissionNotifications } from './email.ts';
import { sanitizeDeep, sanitizeString } from './sanitize.ts';
import { buildOtpAuthUri, verifyTotpCode } from './totp.ts';

const SESSION_COOKIE_NAME = 'ea_admin_session';
const CSRF_COOKIE_NAME = 'ea_csrf';

function getSessionSecret(): string {
  const env = process.env.SESSION_SECRET?.trim();
  if (env && env.length >= 16) return env;
  const secretFile = path.resolve(process.cwd(), '.data', '.session-secret');
  const dir = path.dirname(secretFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  return generated;
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || 'EasyAppAdmin2026!';
}

function signSessionToken(payload: { role: 'admin'; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(data)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function getAppUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') return envUrl;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

export function createApiApp(options?: { dbPath?: string; skipSeed?: boolean }) {
  const app = express();
  const db = getDb(options?.dbPath);
  if (!options?.skipSeed) {
    seedDemoApplicationsIfEmpty(db);
  }
  purgeExpiredCompletedApplications(db);

  // Trust proxy in Cloud Run / reverse-proxy environments
  app.set('trust proxy', 1);

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'https://api.stripe.com'],
          frameSrc: ['https://js.stripe.com', 'https://checkout.stripe.com'],
          frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.google.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  // Rate limiters
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);
  app.use(cookieParser());

  // Stripe Webhook MUST receive raw body before express.json()
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const stripe = getStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!stripe || !webhookSecret) {
        res.status(400).json({ error: 'Stripe webhook not configured' });
        return;
      }

      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        res.status(400).json({ error: 'Missing Stripe signature' });
        return;
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const referenceId = session.client_reference_id;
        if (referenceId) {
          const row = db
            .prepare('SELECT * FROM applications WHERE reference_id = ?')
            .get(referenceId) as ApplicationRow | undefined;

          if (row && row.payment_status !== 'paid') {
            const paidAt = new Date().toISOString();
            db.prepare(
              `UPDATE applications SET payment_status = 'paid', paid_at = ?, stripe_session_id = ? WHERE id = ?`
            ).run(paidAt, session.id, row.id);

            await sendPaidSubmissionNotifications({
              applicantName: row.applicant_name,
              applicantEmail: row.applicant_email,
              formType: row.form_type,
              referenceId: row.reference_id,
              submittedDate: paidAt,
              appUrl: getAppUrl(req),
            }).catch(() => {});
          }
        }
      }

      res.json({ received: true });
    }
  );

  app.use(express.json({ limit: '1mb' }));

  // CSRF double-submit cookie middleware for state-changing /api requests
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    let token = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    if (!token || token.length < 16) {
      token = crypto.randomBytes(24).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        path: '/',
      });
    }
    res.json({ csrfToken: token });
  });

  function requireCsrf(req: Request, res: Response, next: NextFunction): void {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers['x-csrf-token'];
    if (
      !cookieToken ||
      !headerToken ||
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      cookieToken.length < 16
    ) {
      res.status(403).json({ error: 'Invalid or missing CSRF token' });
      return;
    }
    const a = Buffer.from(cookieToken, 'utf8');
    const b = Buffer.from(headerToken, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({ error: 'CSRF token mismatch' });
      return;
    }
    next();
  }

  function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!verifySessionToken(sessionToken)) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }
    next();
  }

  // Public Configuration
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({
      serviceFeeUsd: SERVICE_FEE_USD,
      stripeEnabled: Boolean(getStripeClient()),
      contactEmail: BUSINESS_INFO.email,
      contactPhone: BUSINESS_INFO.phoneDisplay,
    });
  });

  // Multer memory upload (encrypt in memory before touching disk!)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, JPG, and PNG training certificates are accepted.'));
      }
    },
  });

  // Submit New or Renewal Application (saved as pending_payment prior to Stripe Checkout)
  app.post(
    '/api/applications',
    requireCsrf,
    (req: Request, res: Response, next: NextFunction) => {
      upload.single('certificate')(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message || 'File upload failed' });
          return;
        }
        next();
      });
    },
    (req: Request, res: Response) => {
      try {
        const rawFormType = req.body?.formType;
        if (rawFormType !== 'new' && rawFormType !== 'renewal') {
          res.status(400).json({ error: 'Invalid application type' });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: 'Training certificate file is required (PDF/JPG/PNG, max 10 MB)' });
          return;
        }

        let parsedPayload: Record<string, unknown>;
        try {
          parsedPayload = sanitizeDeep(JSON.parse(String(req.body.payload || '{}')));
        } catch {
          res.status(400).json({ error: 'Malformed application payload' });
          return;
        }

        const personalInfo = personalInfoSchema.parse(parsedPayload.personalInfo);
        const driversLicense = driversLicenseSchema.parse(parsedPayload.driversLicense);
        const foidCitizenship = foidCitizenshipSchema.parse(parsedPayload.foidCitizenship);
        const addressHistory = addressHistorySchema.parse(parsedPayload.addressHistory);
        const authorization = authorizationSchema.parse(parsedPayload.authorization);

        let ispAccount: unknown;
        let criminalAnswers: Record<string, 'Yes' | 'No'> | undefined;

        if (rawFormType === 'new') {
          ispAccount = ispAccountNewSchema.parse(parsedPayload.ispAccount);
          criminalAnswers = criminalHistorySchema.parse({
            criminalAnswers: parsedPayload.criminalAnswers,
          }).criminalAnswers;
        } else {
          ispAccount = ispAccountRenewalSchema.parse(parsedPayload.ispAccount);
        }

        const id = crypto.randomUUID();
        const referenceId = generateReferenceId();
        const applicantName = [
          personalInfo.firstName,
          personalInfo.middleName,
          personalInfo.lastName,
          personalInfo.suffix,
        ]
          .filter(Boolean)
          .join(' ');

        const sensitiveBundle = {
          personalInfo,
          driversLicense,
          foidCitizenship,
          addressHistory,
          ispAccount,
          ...(criminalAnswers ? { criminalAnswers } : {}),
          authorization,
        };

        const encryptedPayload = encryptText(JSON.stringify(sensitiveBundle));
        const encryptedCertBuffer = encryptBuffer(req.file.buffer);
        const encryptedCertPath = path.join(getUploadsDir(), `${id}.enc`);
        fs.writeFileSync(encryptedCertPath, encryptedCertBuffer, { mode: 0o600 });

        const createdAt = new Date().toISOString();
        db.prepare(
          `INSERT INTO applications (
            id, reference_id, form_type, applicant_name, applicant_email, applicant_phone,
            payment_status, workflow_status, amount_cents, encrypted_payload,
            certificate_filename, certificate_mime, certificate_encrypted_path, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', 'new', ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          referenceId,
          rawFormType,
          applicantName,
          personalInfo.email,
          personalInfo.primaryPhone,
          SERVICE_FEE_CENTS,
          encryptedPayload,
          sanitizeString(req.file.originalname),
          req.file.mimetype,
          encryptedCertPath,
          createdAt
        );

        res.status(201).json({
          id,
          referenceId,
          formType: rawFormType,
          applicantName,
          amountUsd: SERVICE_FEE_USD,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({
            error: err.issues[0]?.message || 'Validation failed',
            issues: err.issues,
          });
          return;
        }
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Unable to save application',
        });
      }
    }
  );

  // Non-sensitive status lookup for Payment & Thank You pages
  app.get('/api/applications/status/:referenceId', (req: Request, res: Response) => {
    const refId = sanitizeString(req.params.referenceId);
    const row = db
      .prepare(
        `SELECT reference_id, form_type, applicant_name, payment_status, amount_cents, created_at, paid_at
         FROM applications WHERE reference_id = ?`
      )
      .get(refId) as
      | Pick<
          ApplicationRow,
          | 'reference_id'
          | 'form_type'
          | 'applicant_name'
          | 'payment_status'
          | 'amount_cents'
          | 'created_at'
          | 'paid_at'
        >
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Application reference not found' });
      return;
    }

    res.json({
      referenceId: row.reference_id,
      formType: row.form_type,
      applicantName: row.applicant_name,
      paymentStatus: row.payment_status,
      amountUsd: row.amount_cents / 100,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    });
  });

  // Create Stripe Checkout Session (or safe preview checkout URL when Stripe env isn't set)
  app.post('/api/payments/create-checkout', requireCsrf, async (req: Request, res: Response) => {
    const referenceId = sanitizeString(req.body?.referenceId);
    const row = db
      .prepare('SELECT * FROM applications WHERE reference_id = ?')
      .get(referenceId) as ApplicationRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (row.payment_status === 'paid') {
      res.json({ mode: 'already_paid', redirectUrl: `/thank-you?ref=${encodeURIComponent(referenceId)}` });
      return;
    }

    const appUrl = getAppUrl(req).replace(/\/$/, '');
    const stripe = getStripeClient();

    if (!stripe) {
      res.json({
        mode: 'sandbox',
        referenceId,
        amountUsd: row.amount_cents / 100,
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: row.reference_id,
        customer_email: row.applicant_email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'EasyApp Processing Service Fee',
                description:
                  row.form_type === 'new'
                    ? 'Illinois Concealed Carry & FOID Application Preparation'
                    : 'Illinois Concealed Carry & FOID Renewal Preparation',
              },
              unit_amount: row.amount_cents,
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/thank-you?ref=${encodeURIComponent(row.reference_id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment?ref=${encodeURIComponent(row.reference_id)}&canceled=1`,
      });

      db.prepare('UPDATE applications SET stripe_session_id = ? WHERE id = ?').run(
        session.id,
        row.id
      );

      res.json({
        mode: 'stripe',
        checkoutUrl: session.url,
      });
    } catch {
      res.status(500).json({ error: 'Failed to initialize Stripe checkout session' });
    }
  });

  // Sandbox confirmation endpoint ONLY enabled when STRIPE_SECRET_KEY is not configured
  app.post('/api/payments/sandbox-confirm', requireCsrf, async (req: Request, res: Response) => {
    if (getStripeClient()) {
      res.status(403).json({ error: 'Sandbox payment is disabled when Stripe is configured' });
      return;
    }

    const referenceId = sanitizeString(req.body?.referenceId);
    const outcome = req.body?.outcome === 'cancel' ? 'cancel' : 'success';

    const row = db
      .prepare('SELECT * FROM applications WHERE reference_id = ?')
      .get(referenceId) as ApplicationRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (outcome === 'cancel') {
      res.json({ status: 'canceled', referenceId });
      return;
    }

    if (row.payment_status !== 'paid') {
      const paidAt = new Date().toISOString();
      db.prepare(
        `UPDATE applications SET payment_status = 'paid', paid_at = ? WHERE id = ?`
      ).run(paidAt, row.id);

      await sendPaidSubmissionNotifications({
        applicantName: row.applicant_name,
        applicantEmail: row.applicant_email,
        formType: row.form_type,
        referenceId: row.reference_id,
        submittedDate: paidAt,
        appUrl: getAppUrl(req),
      }).catch(() => {});
    }

    res.json({ status: 'paid', referenceId });
  });

  // Contact Form Endpoint
  app.post('/api/contact', requireCsrf, async (req: Request, res: Response) => {
    const contactSchema = z.object({
      name: z.string().trim().min(2, 'Name is required').max(100),
      email: z.string().trim().email('Valid email address is required'),
      phone: z.string().trim().max(30).optional().default(''),
      message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
    });

    try {
      const clean = contactSchema.parse(sanitizeDeep(req.body));
      const id = crypto.randomUUID();
      db.prepare(
        'INSERT INTO contact_messages (id, name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, clean.name, clean.email, clean.phone, clean.message, new Date().toISOString());

      await sendContactInquiryEmail(clean).catch(() => {});
      res.status(201).json({ ok: true, id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.issues[0]?.message || 'Invalid contact submission' });
        return;
      }
      res.status(500).json({ error: 'Failed to submit inquiry' });
    }
  });

  // ==========================
  // ADMIN AUTH & 2FA ENDPOINTS
  // ==========================
  app.get('/api/admin/auth-status', (req: Request, res: Response) => {
    const authenticated = verifySessionToken(req.cookies?.[SESSION_COOKIE_NAME]);
    const totp = getOrInitTotpConfig(db);
    res.json({
      authenticated,
      totpConfigured: totp.verified,
    });
  });

  // First-time 2FA QR enrollment (requires admin password in body)
  app.post(
    '/api/admin/2fa-setup',
    strictAuthLimiter,
    requireCsrf,
    async (req: Request, res: Response) => {
      const password = String(req.body?.password || '');
      const expected = getAdminPassword();
      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Invalid administrator password' });
        return;
      }

      const totp = getOrInitTotpConfig(db);
      if (totp.verified) {
        res.status(403).json({
          error: '2FA is already enrolled. Enter your authenticator code to sign in.',
        });
        return;
      }

      const otpauthUri = buildOtpAuthUri(totp.secret, BUSINESS_INFO.email, BUSINESS_INFO.name);
      const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 220, margin: 1 });
      res.json({
        qrDataUrl,
        manualSecret: totp.secret,
      });
    }
  );

  app.post(
    '/api/admin/login',
    strictAuthLimiter,
    requireCsrf,
    (req: Request, res: Response) => {
      const password = String(req.body?.password || '');
      const totpCode = String(req.body?.totpCode || '');
      const expected = getAdminPassword();

      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Invalid password or 2FA code' });
        return;
      }

      const totp = getOrInitTotpConfig(db);
      if (!verifyTotpCode(totp.secret, totpCode)) {
        res.status(401).json({ error: 'Invalid password or 2FA code' });
        return;
      }

      if (!totp.verified) {
        markTotpVerified(db);
      }

      const token = signSessionToken({
        role: 'admin',
        exp: Date.now() + 8 * 60 * 60 * 1000,
      });

      res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({ ok: true });
    }
  );

  app.post('/api/admin/logout', requireCsrf, (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  // ==========================
  // ADMIN SUBMISSIONS ENDPOINTS
  // ==========================
  app.get('/api/admin/applications', requireAdminAuth, (req: Request, res: Response) => {
    purgeExpiredCompletedApplications(db);

    const typeFilter = req.query.type;
    const paymentFilter = req.query.payment;
    const search = sanitizeString(req.query.search || '').toLowerCase();

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (typeFilter === 'new' || typeFilter === 'renewal') {
      clauses.push('form_type = ?');
      params.push(typeFilter);
    }
    if (paymentFilter === 'paid' || paymentFilter === 'pending_payment') {
      clauses.push('payment_status = ?');
      params.push(paymentFilter);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT id, reference_id, form_type, applicant_name, applicant_email, applicant_phone,
                payment_status, workflow_status, amount_cents, certificate_filename,
                created_at, paid_at, submitted_at, completed_at, purge_after
         FROM applications ${where}
         ORDER BY created_at DESC`
      )
      .all(...params) as Array<Omit<ApplicationRow, 'encrypted_payload' | 'certificate_encrypted_path' | 'certificate_mime' | 'stripe_session_id'>>;

    const filtered = search
      ? rows.filter(
          (r) =>
            r.applicant_name.toLowerCase().includes(search) ||
            r.reference_id.toLowerCase().includes(search) ||
            r.applicant_email.toLowerCase().includes(search)
        )
      : rows;

    res.json({ applications: filtered });
  });

  app.get('/api/admin/applications/:id', requireAdminAuth, (req: Request, res: Response) => {
    const id = sanitizeString(req.params.id);
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
      | ApplicationRow
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const auditLogs = db
      .prepare(
        `SELECT id, field_name, admin_actor, revealed_at, ip_address
         FROM reveal_audit_log WHERE application_id = ? ORDER BY revealed_at DESC`
      )
      .all(id) as RevealAuditRow[];

    let decrypted: Record<string, any> | null = null;
    if (row.encrypted_payload) {
      decrypted = JSON.parse(decryptText(row.encrypted_payload));
    }

    // Build masked view of sensitive fields so plaintext never leaves server without logged reveal
    const maskedView = decrypted
      ? {
          personalInfo: {
            ...decrypted.personalInfo,
            dateOfBirth: maskSensitiveValue(decrypted.personalInfo?.dateOfBirth || '', 4),
          },
          driversLicense: {
            ...decrypted.driversLicense,
            dlNumber: maskSensitiveValue(decrypted.driversLicense?.dlNumber || '', 4),
            ddNumber: maskSensitiveValue(decrypted.driversLicense?.ddNumber || '', 4),
          },
          foidCitizenship: {
            ...decrypted.foidCitizenship,
            foidNumber: maskSensitiveValue(decrypted.foidCitizenship?.foidNumber || '', 4),
            tcnNumber: decrypted.foidCitizenship?.tcnNumber
              ? maskSensitiveValue(decrypted.foidCitizenship.tcnNumber, 4)
              : '',
            arnNumber: decrypted.foidCitizenship?.arnNumber
              ? maskSensitiveValue(decrypted.foidCitizenship.arnNumber, 4)
              : '',
            i94Number: decrypted.foidCitizenship?.i94Number
              ? maskSensitiveValue(decrypted.foidCitizenship.i94Number, 4)
              : '',
            exceptionNumber: decrypted.foidCitizenship?.exceptionNumber
              ? maskSensitiveValue(decrypted.foidCitizenship.exceptionNumber, 4)
              : '',
          },
          addressHistory: decrypted.addressHistory,
          ispAccount: {
            ispUserId: decrypted.ispAccount?.ispUserId,
            ispEmail: decrypted.ispAccount?.ispEmail,
            ispPassword: maskSensitiveValue(decrypted.ispAccount?.ispPassword || '', 0),
            ...(decrypted.ispAccount?.sq1Answer !== undefined
              ? {
                  sq1Answer: maskSensitiveValue(decrypted.ispAccount.sq1Answer, 0),
                  sq2Answer: maskSensitiveValue(decrypted.ispAccount.sq2Answer, 0),
                  sq3Answer: maskSensitiveValue(decrypted.ispAccount.sq3Answer, 0),
                  sq4Answer: maskSensitiveValue(decrypted.ispAccount.sq4Answer, 0),
                }
              : {}),
          },
          criminalAnswers: decrypted.criminalAnswers || null,
          authorization: decrypted.authorization,
        }
      : null;

    res.json({
      application: {
        id: row.id,
        referenceId: row.reference_id,
        formType: row.form_type,
        applicantName: row.applicant_name,
        applicantEmail: row.applicant_email,
        applicantPhone: row.applicant_phone,
        paymentStatus: row.payment_status,
        workflowStatus: row.workflow_status,
        amountUsd: row.amount_cents / 100,
        certificateFilename: row.certificate_filename,
        certificateMime: row.certificate_mime,
        createdAt: row.created_at,
        paidAt: row.paid_at,
        submittedAt: row.submitted_at,
        completedAt: row.completed_at,
        purgeAfter: row.purge_after,
      },
      data: maskedView,
      auditLogs,
    });
  });

  app.post(
    '/api/admin/applications/:id/reveal',
    requireAdminAuth,
    requireCsrf,
    (req: Request, res: Response) => {
      const id = sanitizeString(req.params.id);
      const fieldName = sanitizeString(req.body?.fieldName);

      const allowedFields: Record<string, (d: any) => string> = {
        dateOfBirth: (d) => d.personalInfo?.dateOfBirth || '',
        dlNumber: (d) => d.driversLicense?.dlNumber || '',
        ddNumber: (d) => d.driversLicense?.ddNumber || '',
        foidNumber: (d) => d.foidCitizenship?.foidNumber || '',
        tcnNumber: (d) => d.foidCitizenship?.tcnNumber || '',
        arnNumber: (d) => d.foidCitizenship?.arnNumber || '',
        i94Number: (d) => d.foidCitizenship?.i94Number || '',
        exceptionNumber: (d) => d.foidCitizenship?.exceptionNumber || '',
        ispPassword: (d) => d.ispAccount?.ispPassword || '',
        sq1Answer: (d) => d.ispAccount?.sq1Answer || '',
        sq2Answer: (d) => d.ispAccount?.sq2Answer || '',
        sq3Answer: (d) => d.ispAccount?.sq3Answer || '',
        sq4Answer: (d) => d.ispAccount?.sq4Answer || '',
      };

      const extractor = allowedFields[fieldName];
      if (!extractor) {
        res.status(400).json({ error: 'Unknown sensitive field' });
        return;
      }

      const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
        | ApplicationRow
        | undefined;
      if (!row || !row.encrypted_payload) {
        res.status(404).json({ error: 'Application data not available or purged' });
        return;
      }

      const decrypted = JSON.parse(decryptText(row.encrypted_payload));
      const value = extractor(decrypted);
      const revealedAt = new Date().toISOString();
      const ipAddress = sanitizeString(req.ip || 'unknown');

      db.prepare(
        `INSERT INTO reveal_audit_log (application_id, field_name, admin_actor, revealed_at, ip_address)
         VALUES (?, ?, 'Admin (Bob)', ?, ?)`
      ).run(id, fieldName, revealedAt, ipAddress);

      res.json({
        fieldName,
        value,
        revealedAt,
      });
    }
  );

  app.get(
    '/api/admin/applications/:id/certificate',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const id = sanitizeString(req.params.id);
      const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
        | ApplicationRow
        | undefined;

      if (
        !row ||
        !row.certificate_encrypted_path ||
        !fs.existsSync(row.certificate_encrypted_path)
      ) {
        res.status(404).json({ error: 'Training certificate not found or purged' });
        return;
      }

      const encryptedBytes = fs.readFileSync(row.certificate_encrypted_path);
      const plaintext = decryptBuffer(encryptedBytes);

      db.prepare(
        `INSERT INTO reveal_audit_log (application_id, field_name, admin_actor, revealed_at, ip_address)
         VALUES (?, 'trainingCertificate', 'Admin (Bob)', ?, ?)`
      ).run(id, new Date().toISOString(), sanitizeString(req.ip || 'unknown'));

      res.setHeader('Content-Type', row.certificate_mime || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${row.certificate_filename || 'certificate'}"`
      );
      res.send(plaintext);
    }
  );

  app.post(
    '/api/admin/applications/:id/status',
    requireAdminAuth,
    requireCsrf,
    (req: Request, res: Response) => {
      const id = sanitizeString(req.params.id);
      const nextStatus = req.body?.workflowStatus;

      if (nextStatus !== 'submitted_to_isp' && nextStatus !== 'completed') {
        res.status(400).json({ error: 'Invalid status transition' });
        return;
      }

      const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
        | ApplicationRow
        | undefined;
      if (!row) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }

      const now = new Date();
      if (nextStatus === 'submitted_to_isp') {
        db.prepare(
          `UPDATE applications SET workflow_status = 'submitted_to_isp', submitted_at = ? WHERE id = ?`
        ).run(now.toISOString(), id);
      } else {
        const purgeAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(
          `UPDATE applications SET workflow_status = 'completed', completed_at = ?, purge_after = ? WHERE id = ?`
        ).run(now.toISOString(), purgeAfter, id);
      }

      res.json({ ok: true, workflowStatus: nextStatus });
    }
  );

  app.delete(
    '/api/admin/applications/:id',
    requireAdminAuth,
    requireCsrf,
    (req: Request, res: Response) => {
      const id = sanitizeString(req.params.id);
      const deleted = permanentlyDeleteApplication(db, id);
      if (!deleted) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }
      res.json({ ok: true });
    }
  );

  app.post('/api/admin/purge-expired', requireAdminAuth, requireCsrf, (_req: Request, res: Response) => {
    const purgedCount = purgeExpiredCompletedApplications(db);
    res.json({ ok: true, purgedCount });
  });

  return app;
}
