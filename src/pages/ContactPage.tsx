import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from '../lib/router';
import { BUSINESS_INFO } from '../shared/config';
import { formatPhoneMask } from '../utils/validation';

export function ContactPage() {
  usePageMeta(
    'Contact EasyApp Processing – Illinois CCL & FOID Assistance',
    'Contact Bob Sumption at EasyApp Processing for help with Illinois Concealed Carry License and FOID card applications.'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, message }),
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#9A6D1B]">Direct Assistance</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F2744]">
              Contact EasyApp Processing
            </h1>
            <p className="text-slate-600 leading-relaxed">
              Questions about your Illinois Concealed Carry or FOID paperwork, address updates, or training certificate? Reach out directly by phone, email, or the contact form.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#0F2744] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Phone (Call or Text)
                </p>
                <a
                  href={BUSINESS_INFO.phoneHref}
                  className="text-base font-semibold text-[#0F2744] hover:underline tabular-nums"
                >
                  {BUSINESS_INFO.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#0F2744] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email
                </p>
                <a
                  href={BUSINESS_INFO.emailHref}
                  className="text-base font-semibold text-[#0F2744] hover:underline break-all"
                >
                  {BUSINESS_INFO.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0F2744] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Service Area
                </p>
                <p className="text-base text-slate-700">
                  State of Illinois (Remote &amp; Online Application Preparation)
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Please do not include sensitive personal numbers (such as Driver&apos;s License numbers, SSN digits, or passwords) in general contact messages. Use the secure application forms for all official submissions.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[#0F2744]">
                  Message Sent
                </h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Thank you for contacting EasyApp Processing. Your message has been sent to {BUSINESS_INFO.email} and we will respond promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-sm font-semibold text-[#0F2744] border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="font-display text-xl font-bold text-[#0F2744]">
                  Send a Message to {BUSINESS_INFO.owner}
                </h2>

                {error && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Full Name <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Email Address <span className="text-red-700">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 tabular-nums"
                      placeholder="(217) 555-0100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    How Can We Help? <span className="text-red-700">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    minLength={10}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    placeholder="Ask about New CCL applications, Renewals, FOID address updates, or fingerprinting..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-[#0F2744] hover:bg-[#17365D] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
