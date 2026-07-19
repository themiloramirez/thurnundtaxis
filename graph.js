const INTI_FACTOR = 45;

const CATEGORIES = {
  COMMUTER_1040NR: { id: 'commuter_1040nr', baseQuoteMin: 800 * INTI_FACTOR, baseQuoteMax: 1800 * INTI_FACTOR },
  COMMUTER_1040: { id: 'commuter_1040', baseQuoteMin: 1200 * INTI_FACTOR, baseQuoteMax: 2600 * INTI_FACTOR },
  US_PERSON_IN_CAN: { id: 'us_person_in_can', baseQuoteMin: 1500 * INTI_FACTOR, baseQuoteMax: 3500 * INTI_FACTOR },
  US_RESIDENT_CAN_INCOME: { id: 'us_resident_can_income', baseQuoteMin: 1200 * INTI_FACTOR, baseQuoteMax: 3000 * INTI_FACTOR },
  MIGRANT_TRANSIT: { id: 'migrant_transit', baseQuoteMin: 1500 * INTI_FACTOR, baseQuoteMax: 4000 * INTI_FACTOR },
  DOMESTIC_CAN: { id: 'domestic_can', baseQuoteMin: 300 * INTI_FACTOR, baseQuoteMax: 900 * INTI_FACTOR },
  DOMESTIC_CAN_US_INVESTMENT: { id: 'domestic_can_us_investment', baseQuoteMin: 500 * INTI_FACTOR, baseQuoteMax: 1400 * INTI_FACTOR },
  DOMESTIC_US: { id: 'domestic_us', baseQuoteMin: 300 * INTI_FACTOR, baseQuoteMax: 900 * INTI_FACTOR },
  OUT_OF_SCOPE: { id: 'out_of_scope', baseQuoteMin: null, baseQuoteMax: null },
};

const COMPLEXITY_FLAGS = {
  HAS_RRSP_TFSA: { id: 'rrsp_tfsa', multiplier: 1.3, forms: ['8938', '3520 (posible)'] },
  OWNS_BUSINESS_CORP: { id: 'biz_corp', multiplier: 1.8, forms: ['5471'] },
  OWNS_BUSINESS_LLC: { id: 'biz_llc', multiplier: 1.6, forms: ['8858'] },
  OWNS_BUSINESS_SOLE: { id: 'biz_sole', multiplier: 1.2, forms: [] },
  PARTNERSHIP_INTEREST: { id: 'partnership', multiplier: 1.5, forms: ['8865'] },
  MULTI_RENTAL: { id: 'multi_rental', multiplier: 1.3, forms: [] },
  NON_US_SPOUSE_JOINT: { id: 'non_us_spouse', multiplier: 1.2, forms: ['W-7 (ITIN)'] },
  ACCIDENTAL_AMERICAN: { id: 'accidental', multiplier: 1.4, forms: ['Streamlined Filing (posible)'] },
};

function computeFlags(answers) {
  const sources = answers.q4_income_sources || [];
  const flags = [];
  if (sources.includes('ca_investment_rrsp_tfsa')) flags.push(COMPLEXITY_FLAGS.HAS_RRSP_TFSA);
  if (answers.business_type === 'corp') flags.push(COMPLEXITY_FLAGS.OWNS_BUSINESS_CORP);
  if (answers.business_type === 'llc') flags.push(COMPLEXITY_FLAGS.OWNS_BUSINESS_LLC);
  if (answers.business_type === 'sole') flags.push(COMPLEXITY_FLAGS.OWNS_BUSINESS_SOLE);
  if (answers.has_partnership === 'yes') flags.push(COMPLEXITY_FLAGS.PARTNERSHIP_INTEREST);
  if (sources.includes('us_rental') && sources.includes('ca_rental')) flags.push(COMPLEXITY_FLAGS.MULTI_RENTAL);
  if (answers.q5b_spouse_status === 'neither') flags.push(COMPLEXITY_FLAGS.NON_US_SPOUSE_JOINT);
  return flags;
}

function classify(answers) {
  if (answers.q0_transit === 'yes') {
    return { category: CATEGORIES.MIGRANT_TRANSIT, flags: [], needsContactForm: true };
  }

  const isUSPerson = ['us_citizen', 'dual', 'green_card'].includes(answers.q1_status);
  const isCanadianOnly = answers.q1_status === 'canadian_citizen';
  const livesInCAN = answers.q2_country === 'CA';
  const livesInUS = answers.q2_country === 'US';
  const worksInUS = answers.q3_country === 'US';
  const worksInCAN = answers.q3_country === 'CA';
  const regularCommute = answers.q3b_commute === 'regular_commute';

  if (isCanadianOnly && livesInCAN && worksInUS && regularCommute) {
    return { category: CATEGORIES.COMMUTER_1040NR, flags: computeFlags(answers), needsContactForm: false };
  }
  if (isUSPerson && livesInCAN && worksInUS && regularCommute) {
    return { category: CATEGORIES.COMMUTER_1040, flags: computeFlags(answers), needsContactForm: false };
  }
  if (isUSPerson && livesInCAN && !(worksInUS && regularCommute)) {
    return { category: CATEGORIES.US_PERSON_IN_CAN, flags: computeFlags(answers), needsContactForm: false };
  }
  if (livesInUS) {
    const hasCanIncome = (answers.q4_income_sources || []).some((s) =>
      ['ca_employment', 'ca_self_employment', 'ca_investment_rrsp_tfsa', 'ca_rental', 'pension_cpp_oas_ss'].includes(s)
    );
    if (hasCanIncome) {
      return { category: CATEGORIES.US_RESIDENT_CAN_INCOME, flags: computeFlags(answers), needsContactForm: false };
    }
    return { category: CATEGORIES.DOMESTIC_US, flags: computeFlags(answers), needsContactForm: false };
  }
  if (isCanadianOnly && livesInCAN && worksInCAN) {
    if (answers.q1c_accidental === 'yes') {
      return {
        category: CATEGORIES.US_PERSON_IN_CAN,
        flags: [...computeFlags(answers), COMPLEXITY_FLAGS.ACCIDENTAL_AMERICAN],
        needsContactForm: false,
      };
    }
    const hasUSInvestment = (answers.q4_income_sources || []).includes('us_investment');
    if (hasUSInvestment) {
      return { category: CATEGORIES.DOMESTIC_CAN_US_INVESTMENT, flags: computeFlags(answers), needsContactForm: false };
    }
    return { category: CATEGORIES.DOMESTIC_CAN, flags: [], needsContactForm: false };
  }

  return { category: CATEGORIES.OUT_OF_SCOPE, flags: [], needsContactForm: true };
}

function computeQuote(classification) {
  const { category, flags } = classification;
  if (category.baseQuoteMin === null) return null;
  const multiplier = flags.reduce((acc, f) => acc * f.multiplier, 1);
  return {
    min: Math.round((category.baseQuoteMin * multiplier) / 50) * 50,
    max: Math.round((category.baseQuoteMax * multiplier) / 50) * 50,
  };
}
