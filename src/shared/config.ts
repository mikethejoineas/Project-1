export const SERVICE_FEE_USD = 35;
export const SERVICE_FEE_CENTS = SERVICE_FEE_USD * 100;

export const BUSINESS_INFO = {
  name: 'EasyApp Processing',
  owner: 'Bob Sumption',
  tagline: 'Illinois Concealed Carry & FOID Applications, Made Easy.',
  email: 'bobsump@gmail.com',
  phoneDisplay: '217-766-8408',
  phoneHref: 'tel:+12177668408',
  emailHref: 'mailto:bobsump@gmail.com',
  serviceArea: 'Serving clients across the State of Illinois',
  disclaimer:
    'EasyApp Processing is an independent service. We are not employed by or affiliated with the Illinois State Police or any training provider. Our fee is separate from your training class fee and separate from ISP\'s state fees.',
};

export const SECURITY_QUESTIONS = [
  { id: 'sq1', label: 'Security Question #1: Where were you born?' },
  { id: 'sq2', label: 'Security Question #2: What city was your first job?' },
  { id: 'sq3', label: 'Security Question #3: What are the last four digits of your Social Security Number?' },
  { id: 'sq4', label: "Security Question #4: What is your mother's maiden name?" },
] as const;

export const HAIR_COLORS = [
  'Black',
  'Blonde',
  'Brown',
  'Gray',
  'Red/Auburn',
  'Bald',
  'Sandy',
  'White',
] as const;

export const EYE_COLORS = [
  'Amber',
  'Black',
  'Blue',
  'Brown',
  'Gray',
  'Green',
  'Hazel',
] as const;

export const US_STATES = [
  'IL', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI',
  'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
  'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
] as const;
