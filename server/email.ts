import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { BUSINESS_INFO, SERVICE_FEE_USD } from '../src/shared/config.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const OUTBOX_LOG = path.join(DATA_DIR, 'email-outbox.log');

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

async function dispatchEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from =
    process.env.SMTP_FROM?.trim() || `${BUSINESS_INFO.name} <${BUSINESS_INFO.email}>`;
  const transporter = getTransporter();

  if (transporter) {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return;
  }

  // Fallback outbox log when SMTP is not configured; never contains sensitive applicant data.
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  const entry = `[${new Date().toISOString()}] TO=${params.to} | SUBJECT=${params.subject}\n${params.text}\n---\n`;
  fs.appendFileSync(OUTBOX_LOG, entry, { mode: 0o600 });
}

export async function sendPaidSubmissionNotifications(params: {
  applicantName: string;
  applicantEmail: string;
  formType: 'new' | 'renewal';
  referenceId: string;
  submittedDate: string;
  appUrl: string;
}): Promise<void> {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || BUSINESS_INFO.email;
  const formLabel =
    params.formType === 'new'
      ? 'New Concealed Carry & FOID Application'
      : 'Concealed Carry & FOID Renewal';
  const adminUrl = `${params.appUrl.replace(/\/$/, '')}/admin`;

  // Summary ONLY to owner: zero sensitive fields (no SSN digits, passwords, security answers, DL#)
  await dispatchEmail({
    to: adminEmail,
    subject: `New Paid Submission: ${params.applicantName} (${params.referenceId})`,
    text: [
      'A new paid EasyApp Processing submission has been received.',
      '',
      `Applicant Name: ${params.applicantName}`,
      `Application Type: ${formLabel}`,
      `Date: ${params.submittedDate}`,
      `Reference ID: ${params.referenceId}`,
      `Service Fee Paid: $${SERVICE_FEE_USD}.00`,
      '',
      `Review securely in Admin Dashboard: ${adminUrl}`,
      '',
      'Security Notice: Sensitive applicant data is encrypted and only accessible inside the 2FA-protected Admin Dashboard.',
    ].join('\n'),
  });

  // Confirmation receipt to customer
  await dispatchEmail({
    to: params.applicantEmail,
    subject: `EasyApp Processing Confirmation Receipt – ${params.referenceId}`,
    text: [
      `Hello ${params.applicantName},`,
      '',
      `Thank you for choosing ${BUSINESS_INFO.name}. We have received your ${formLabel} and your $${SERVICE_FEE_USD}.00 service fee payment.`,
      '',
      `Receipt / Reference Number: ${params.referenceId}`,
      `Date Received: ${params.submittedDate}`,
      '',
      'What Happens Next:',
      '1. We will carefully review your information for completeness and verify your 10-year address history.',
      '2. If anything is missing or needs clarification, we will contact you via the email or phone number you provided.',
      '3. We will create your digital ID, complete and submit your application to the Illinois State Police (ISP), and update your FOID address if needed.',
      '',
      `Questions? Contact ${BUSINESS_INFO.owner} at ${BUSINESS_INFO.email} or ${BUSINESS_INFO.phoneDisplay}.`,
      '',
      BUSINESS_INFO.disclaimer,
    ].join('\n'),
  });
}

export async function sendContactInquiryEmail(params: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): Promise<void> {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || BUSINESS_INFO.email;

  await dispatchEmail({
    to: adminEmail,
    subject: `EasyApp Contact Inquiry from ${params.name}`,
    text: [
      `Name: ${params.name}`,
      `Email: ${params.email}`,
      `Phone: ${params.phone || 'Not provided'}`,
      '',
      'Message:',
      params.message,
    ].join('\n'),
  });
}
