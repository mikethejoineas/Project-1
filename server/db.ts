import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { encryptBuffer, encryptText } from './crypto.ts';
import { generateTotpSecret } from './totp.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'easyapp.db');

export type FormType = 'new' | 'renewal';
export type PaymentStatus = 'pending_payment' | 'paid' | 'failed';
export type WorkflowStatus = 'new' | 'submitted_to_isp' | 'completed' | 'purged';

export interface ApplicationRow {
  id: string;
  reference_id: string;
  form_type: FormType;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  payment_status: PaymentStatus;
  workflow_status: WorkflowStatus;
  stripe_session_id: string | null;
  amount_cents: number;
  encrypted_payload: string | null;
  certificate_filename: string | null;
  certificate_mime: string | null;
  certificate_encrypted_path: string | null;
  created_at: string;
  paid_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  purge_after: string | null;
}

export interface RevealAuditRow {
  id: number;
  application_id: string;
  field_name: string;
  admin_actor: string;
  revealed_at: string;
  ip_address: string;
}

let dbInstance: Database.Database | null = null;

export function getDb(customPath?: string): Database.Database {
  if (dbInstance && !customPath) return dbInstance;

  if (!customPath) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
    }
  }

  const db = new Database(customPath ?? DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      reference_id TEXT UNIQUE NOT NULL,
      form_type TEXT NOT NULL CHECK (form_type IN ('new', 'renewal')),
      applicant_name TEXT NOT NULL,
      applicant_email TEXT NOT NULL,
      applicant_phone TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (payment_status IN ('pending_payment', 'paid', 'failed')),
      workflow_status TEXT NOT NULL DEFAULT 'new' CHECK (workflow_status IN ('new', 'submitted_to_isp', 'completed', 'purged')),
      stripe_session_id TEXT,
      amount_cents INTEGER NOT NULL,
      encrypted_payload TEXT,
      certificate_filename TEXT,
      certificate_mime TEXT,
      certificate_encrypted_path TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      submitted_at TEXT,
      completed_at TEXT,
      purge_after TEXT
    );

    CREATE TABLE IF NOT EXISTS reveal_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      admin_actor TEXT NOT NULL,
      revealed_at TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function getUploadsDir(): string {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
  }
  return UPLOADS_DIR;
}

export function getOrInitTotpConfig(db: Database.Database): {
  secret: string;
  verified: boolean;
} {
  const envSecret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (envSecret) {
    return { secret: envSecret, verified: true };
  }

  const secretRow = db
    .prepare('SELECT value FROM admin_settings WHERE key = ?')
    .get('totp_secret') as { value: string } | undefined;
  const verifiedRow = db
    .prepare('SELECT value FROM admin_settings WHERE key = ?')
    .get('totp_verified') as { value: string } | undefined;

  if (secretRow) {
    return {
      secret: secretRow.value,
      verified: verifiedRow?.value === '1',
    };
  }

  const newSecret = generateTotpSecret();
  db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run(
    'totp_secret',
    newSecret
  );
  db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run(
    'totp_verified',
    '0'
  );
  return { secret: newSecret, verified: false };
}

export function markTotpVerified(db: Database.Database): void {
  db.prepare(
    'INSERT INTO admin_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('totp_verified', '1');
}

export function generateReferenceId(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EA-${year}-${suffix}`;
}

export function purgeExpiredCompletedApplications(db: Database.Database): number {
  const nowIso = new Date().toISOString();
  const expiredRows = db
    .prepare(
      `SELECT id, certificate_encrypted_path FROM applications
       WHERE workflow_status = 'completed'
         AND purge_after IS NOT NULL
         AND purge_after <= ?`
    )
    .all(nowIso) as Array<{ id: string; certificate_encrypted_path: string | null }>;

  for (const row of expiredRows) {
    if (row.certificate_encrypted_path && fs.existsSync(row.certificate_encrypted_path)) {
      try {
        fs.unlinkSync(row.certificate_encrypted_path);
      } catch {
        // Ignore missing file on purge
      }
    }
    db.prepare(
      `UPDATE applications
       SET encrypted_payload = NULL,
           certificate_encrypted_path = NULL,
           certificate_filename = NULL,
           certificate_mime = NULL,
           workflow_status = 'purged'
       WHERE id = ?`
    ).run(row.id);
  }

  return expiredRows.length;
}

export function permanentlyDeleteApplication(
  db: Database.Database,
  id: string
): boolean {
  const row = db
    .prepare('SELECT certificate_encrypted_path FROM applications WHERE id = ?')
    .get(id) as { certificate_encrypted_path: string | null } | undefined;

  if (!row) return false;

  if (row.certificate_encrypted_path && fs.existsSync(row.certificate_encrypted_path)) {
    try {
      fs.unlinkSync(row.certificate_encrypted_path);
    } catch {
      // Ignore file unlink failure
    }
  }

  const res = db.prepare('DELETE FROM applications WHERE id = ?').run(id);
  return res.changes > 0;
}

export function seedDemoApplicationsIfEmpty(db: Database.Database): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM applications').get() as {
    cnt: number;
  };
  if (countRow.cnt > 0) return;

  const uploadsDir = getUploadsDir();
  const sampleCertSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <rect width="800" height="520" fill="#F8FAFC" stroke="#0F2744" stroke-width="6"/>
    <rect x="24" y="24" width="752" height="472" fill="none" stroke="#B48327" stroke-width="2"/>
    <text x="400" y="95" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0F2744">ILLINOIS CONCEALED CARRY TRAINING CERTIFICATE</text>
    <text x="400" y="145" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#475569">Sample Demonstration Document (Encrypted at Rest)</text>
    <text x="400" y="235" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0F172A">Alex R. Mercer</text>
    <text x="400" y="280" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#334155">16-Hour Illinois Concealed Carry Firearms Training Completed</text>
    <text x="400" y="340" text-anchor="middle" font-family="monospace" font-size="14" fill="#475569">Certificate ID: IL-TRN-SAMPLE-001</text>
  </svg>`;

  const demo1Id = crypto.randomUUID();
  const demo1CertPath = path.join(uploadsDir, `${demo1Id}.enc`);
  fs.writeFileSync(demo1CertPath, encryptBuffer(Buffer.from(sampleCertSvg, 'utf8')));

  const demo1Payload = {
    personalInfo: {
      lastName: 'Mercer',
      firstName: 'Alex',
      middleName: 'R',
      suffix: '',
      placeOfBirth: 'Illinois',
      dateOfBirth: '04/14/1984',
      email: 'alex.mercer.example@example.com',
      primaryPhone: '(217) 555-0142',
      retiredPoliceOfficer: 'No',
    },
    driversLicense: {
      dlNumber: 'M626-0142-8410',
      stateIssued: 'IL',
      dateIssued: '04/14/2023',
      expirationDate: '04/14/2027',
      dlClass: 'D',
      sex: 'Male',
      heightFeet: '5',
      heightInches: '11',
      weightLbs: '185',
      hairColor: 'Brown',
      eyeColor: 'Hazel',
      ddNumber: '202304148821IL',
    },
    foidCitizenship: {
      foidNumber: '248910345',
      foidHeightFeet: '5',
      foidHeightInches: '11',
      foidWeightLbs: '185',
      tcnNumber: 'TCN990184221',
      isUsCitizen: 'Yes',
      arnNumber: '',
      i94Number: '',
      exceptionNumber: '',
    },
    addressHistory: {
      streetAddress: '1420 S Lincoln Ave',
      aptBldg: '',
      city: 'Springfield',
      zip: '62704',
      moveInMonth: '03',
      moveInYear: '2014',
      priorAddresses: [],
    },
    ispAccount: {
      ispUserId: 'ARMercer',
      ispEmail: 'alex.mercer.example@example.com',
      ispPassword: 'SamplePass1!',
      sq1Answer: 'Springfield, IL',
      sq2Answer: 'Champaign',
      sq3Answer: '4821',
      sq4Answer: 'Henderson',
    },
    criminalAnswers: Object.fromEntries(
      Array.from({ length: 19 }, (_, idx) => [`q${idx + 1}`, 'No'])
    ),
    authorization: {
      authorized: true,
      printedName: 'Alex R Mercer',
      signatureData: 'Alex R. Mercer',
      signatureDate: '11/18/2026',
    },
  };

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();

  db.prepare(
    `INSERT INTO applications (
      id, reference_id, form_type, applicant_name, applicant_email, applicant_phone,
      payment_status, workflow_status, amount_cents, encrypted_payload,
      certificate_filename, certificate_mime, certificate_encrypted_path,
      created_at, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    demo1Id,
    'EA-2026-DEMO01',
    'new',
    'Alex R Mercer',
    'alex.mercer.example@example.com',
    '(217) 555-0142',
    'paid',
    'new',
    3500,
    encryptText(JSON.stringify(demo1Payload)),
    'training-certificate-sample.svg',
    'image/svg+xml',
    demo1CertPath,
    yesterday,
    yesterday
  );

  const demo2Id = crypto.randomUUID();
  const demo2Payload = {
    personalInfo: {
      lastName: 'Brooks',
      firstName: 'Jordan',
      middleName: 'L',
      suffix: '',
      placeOfBirth: 'Missouri',
      dateOfBirth: '09/22/1979',
      email: 'jordan.brooks.example@example.com',
      primaryPhone: '(309) 555-0198',
      retiredPoliceOfficer: 'No',
    },
    driversLicense: {
      dlNumber: 'B620-4412-7909',
      stateIssued: 'IL',
      dateIssued: '09/22/2022',
      expirationDate: '09/22/2026',
      dlClass: 'D',
      sex: 'Female',
      heightFeet: '5',
      heightInches: '6',
      weightLbs: '142',
      hairColor: 'Black',
      eyeColor: 'Brown',
      ddNumber: '202209221190IL',
    },
    foidCitizenship: {
      foidNumber: '192044812',
      foidHeightFeet: '5',
      foidHeightInches: '6',
      foidWeightLbs: '142',
      tcnNumber: '',
      isUsCitizen: 'Yes',
      arnNumber: '',
      i94Number: '',
      exceptionNumber: '',
    },
    addressHistory: {
      streetAddress: '408 W Walnut St',
      aptBldg: 'Apt 2B',
      city: 'Bloomington',
      zip: '61701',
      moveInMonth: '06',
      moveInYear: '2019',
      priorAddresses: [
        {
          street: '912 N Main St',
          city: 'Normal',
          zip: '61761',
          county: 'McLean',
          moveInMonth: '05',
          moveInYear: '2015',
          moveOutMonth: '06',
          moveOutYear: '2019',
        },
      ],
    },
    ispAccount: {
      ispUserId: 'JLBrooks',
      ispEmail: 'jordan.brooks.example@example.com',
      ispPassword: 'Renewal99!',
    },
    authorization: {
      authorized: true,
      printedName: 'Jordan L Brooks',
      signatureData: 'Jordan L. Brooks',
      signatureDate: '11/19/2026',
    },
  };

  db.prepare(
    `INSERT INTO applications (
      id, reference_id, form_type, applicant_name, applicant_email, applicant_phone,
      payment_status, workflow_status, amount_cents, encrypted_payload,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    demo2Id,
    'EA-2026-DEMO02',
    'renewal',
    'Jordan L Brooks',
    'jordan.brooks.example@example.com',
    '(309) 555-0198',
    'pending_payment',
    'new',
    3500,
    encryptText(JSON.stringify(demo2Payload)),
    now.toISOString()
  );
}
