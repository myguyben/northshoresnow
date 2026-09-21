/** Single source of truth for business facts used across pages + schema. */
export const SITE = {
  name: 'North Shore Snow',
  legalName: 'North Shore Snow Removal Ltd.',
  url: 'https://northshoresnow.com',
  phone: '(604) 990-7072',
  phoneHref: 'tel:+16049907072',
  email: 'Quotes@northshoresnow.com',
  address: {
    street: '#3 342 Esplanade E',
    city: 'North Vancouver',
    region: 'BC',
    postalCode: 'V7L 1A4',
    country: 'CA',
  },
  geo: { lat: 49.310278, lng: -123.069166 },
  hours: '24/7 during snow events · Office Mon–Fri 8am–5pm',
  defaultOgImage: '/og/default.jpg',
  /** Google Business Profile — used for the reviews link and LocalBusiness sameAs/hasMap. */
  googleBusinessProfile:
    'https://www.google.com/maps/place/?q=place_id:ChIJWQ-g9MNEf2oRhmrru26SGtc',
  quoteEndpoint:
    import.meta.env.PUBLIC_QUOTE_ENDPOINT ??
    'https://iceysoftware.com/api/inbound/website-lead',
} as const

/**
 * Google Business Profile rating, shown next to the quote form as well as in
 * the testimonials section — one constant so the two can never disagree.
 * Update the count together with the reviews in Testimonials.astro.
 */
export const GOOGLE_REVIEWS = {
  rating: '5.0',
  count: 27,
  url: SITE.googleBusinessProfile,
} as const

/**
 * The coverage we actually carry. Quoted from our own signed contract terms
 * (LIABILITY & INSURANCE: "We carry Commercial General Liability insurance of
 * not less than CAD $5,000,000 per occurrence"). Six of the competitors
 * publish a $5M figure and we were the only one saying "fully insured" with
 * no number, which reads as the weakest claim on the page.
 *
 * NEVER state a limit here that the contract does not. If the policy changes,
 * this and `lib/pdf/contract-static-content.ts` in Icey change together.
 */
export const INSURANCE = {
  limit: 'CAD $5,000,000',
  short: '$5M liability insured · WorkSafeBC registered',
  long: 'Commercial General Liability insurance of not less than CAD $5,000,000 per occurrence, plus WorkSafeBC registration. Certificates of insurance are available on request with your quote.',
} as const

/**
 * LAST SEASON, AS THE JOB RECORD ACTUALLY HAS IT.
 *
 * What was here before — "98% on-time response rate", "95% client retention
 * rate", "100+ commercial sites managed", "24/7 monitoring" — was four
 * figures that trace to nothing. They are the first thing a property manager
 * reads, and a buyer who discounts them discounts the rest of the page with
 * them. Every competitor publishes the same shape of number, which is
 * precisely why none of them are believed.
 *
 * These are counted from production on 2026-09-21 for the 2025-10-01 →
 * 2026-04-30 season (company e3a4e921-e1de-43ba-9040-fc63504fe1de):
 *   visits     completed jobs with check_out_at inside the window
 *   properties distinct site_id on those jobs
 *   photos     job_photos rows joined to those jobs
 *   documented 746 of those 766 jobs carry at least one photo
 *
 * 97.4% is published as 97.4%, NOT rounded up to "every visit". The
 * guarantee in ResponseCommitment.astro is worded to exactly that gap: if we
 * cannot show the record, the visit is not charged. Rounding this to 100%
 * would make the guarantee a liability instead of a promise.
 *
 * RE-COUNT THESE EACH SEASON. A stale figure is the same problem as an
 * invented one.
 */
export const STATS = [
  { value: '766', label: 'Service visits last season' },
  { value: '61', label: 'Properties under contract' },
  { value: '5,445', label: 'Photos logged to service records' },
  { value: '97.4%', label: 'Of visits photo-documented' },
] as const

/** Names the season the figures above were counted over. */
export const STATS_PERIOD = '2025/26 season · North Shore Snow operating record'

/** Areas shown in nav/footer/form dropdowns — slugs match content collection. */
export const AREA_LINKS = [
  { slug: 'north-vancouver', name: 'North Vancouver' },
  { slug: 'west-vancouver', name: 'West Vancouver' },
  { slug: 'downtown-vancouver', name: 'Downtown Vancouver' },
  { slug: 'burnaby', name: 'Burnaby' },
  { slug: 'richmond', name: 'Richmond' },
  { slug: 'north-shore', name: 'North Shore' },
  { slug: 'lonsdale', name: 'Lonsdale' },
  { slug: 'lynn-valley', name: 'Lynn Valley' },
  { slug: 'edgemont-village', name: 'Edgemont Village' },
  { slug: 'deep-cove', name: 'Deep Cove' },
  { slug: 'capilano', name: 'Capilano & Pemberton Heights' },
  { slug: 'seymour', name: 'Seymour & Blueridge' },
  { slug: 'ambleside', name: 'Ambleside' },
  { slug: 'dundarave', name: 'Dundarave' },
  { slug: 'horseshoe-bay', name: 'Horseshoe Bay' },
] as const

export const SERVICE_LINKS = [
  { slug: 'snow-removal', name: 'Commercial Snow Removal' },
  { slug: 'snow-plowing', name: 'Snow Plowing' },
  { slug: 'de-icing', name: 'De-Icing & Anti-Icing' },
  { slug: 'salting', name: 'Salting & Ice Melt' },
] as const

export const INDUSTRY_LINKS = [
  { slug: 'residential', name: 'Residential Homes' },
  { slug: 'strata', name: 'Strata Properties' },
  { slug: 'strata-councils', name: 'Strata Councils' },
  { slug: 'property-managers', name: 'Property Managers' },
  { slug: 'commercial', name: 'Commercial Properties' },
  { slug: 'retail', name: 'Retail & Shopping Centres' },
  { slug: 'industrial', name: 'Industrial & Warehouse' },
] as const
