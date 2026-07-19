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
  quoteEndpoint:
    import.meta.env.PUBLIC_QUOTE_ENDPOINT ??
    'https://iceysoftware.com/api/inbound/website-lead',
} as const

export const STATS = [
  { value: '98%', label: 'On-time response rate' },
  { value: '24/7', label: 'Active weather monitoring' },
  { value: '100+', label: 'Commercial sites managed' },
  { value: '95%', label: 'Client retention rate' },
] as const

/** Areas shown in nav/footer/form dropdowns — slugs match content collection. */
export const AREA_LINKS = [
  { slug: 'north-vancouver', name: 'North Vancouver' },
  { slug: 'west-vancouver', name: 'West Vancouver' },
  { slug: 'downtown-vancouver', name: 'Downtown Vancouver' },
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
  { slug: 'strata', name: 'Strata Properties' },
  { slug: 'strata-councils', name: 'Strata Councils' },
  { slug: 'property-managers', name: 'Property Managers' },
  { slug: 'commercial', name: 'Commercial Properties' },
  { slug: 'retail', name: 'Retail & Shopping Centres' },
  { slug: 'industrial', name: 'Industrial & Warehouse' },
] as const
