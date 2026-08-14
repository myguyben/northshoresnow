/**
 * Generates Google Ads Editor bulk-import CSVs for the 2026/27 season.
 *
 *   node .planning/ads/build-import.mjs
 *
 * Why a bulk import rather than building in the web UI: there are ~40 keywords,
 * 111 headlines and 32 descriptions here. Typing those by hand is where typos
 * and over-length assets get introduced, and Google truncates over-length
 * assets without telling you. Everything below is validated against the
 * platform limits before a single row is written — the build fails loudly
 * instead of shipping a bad asset.
 *
 * EVERYTHING IMPORTS PAUSED. Nothing can spend until it is reviewed and
 * enabled by hand in the account.
 *
 * Import order matters: 01 (structure) → 02 (ads) → 03 (negatives) → 04
 * (sitelinks). Editor needs the campaign and ad group to exist before the ads
 * that live inside them.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
const LIMITS = { headline: 30, description: 90, sitelink: 25, sitelinkDesc: 35 }

/* ------------------------------------------------------------------ *
 * Campaigns
 * ------------------------------------------------------------------ */

const CAMPAIGNS = {
  'NSS | S1 Commercial & Strata': { budget: '45.00', maxCpc: '6.00' },
  'NSS | S2 Residential': { budget: '20.00', maxCpc: '4.50' },
  'NSS | S3 Storm Surge': { budget: '20.00', maxCpc: '9.00' },
  'NSS | S4 Brand': { budget: '5.00', maxCpc: '2.00' },
}

const adGroups = [
  {
    campaign: 'NSS | S1 Commercial & Strata',
    name: 'Commercial Snow Removal',
    landing: 'https://northshoresnow.com/snow-removal',
    path1: 'commercial', path2: 'snow-removal',
    keywords: [
      ['commercial snow removal north vancouver', 'Exact'],
      ['commercial snow removal west vancouver', 'Exact'],
      ['commercial snow removal vancouver', 'Phrase'],
      ['commercial snow removal contractor', 'Phrase'],
      ['snow removal company north vancouver', 'Phrase'],
      ['business snow removal vancouver', 'Phrase'],
    ],
    headlines: [
      'Commercial Snow Removal', 'North Vancouver Snow Crews', 'Cleared Before 6:30 AM',
      'Satellite-Measured Quote', 'Quote Back the Same Day', 'Photo-Verified Every Visit',
      '24/7 Storm Dispatch', 'Book Your 2026/27 Season', 'Insured + WorkSafeBC',
      'No Site Visit Needed', 'Automatic Snowfall Dispatch', 'Seasonal or Per-Event',
      'Call (604) 990-7072', 'Parking Lots & Sidewalks', 'Local North Shore Crews',
    ],
    descriptions: [
      'Parking lots, sidewalks and loading zones cleared before your doors open. Fully insured.',
      'We measure your property from satellite imagery. Most quotes are ready the same day.',
      'Every visit is GPS-logged and photo-documented, so your service record builds itself.',
      'Seasonal and per-event contracts across North Van, West Van and Downtown. Book now.',
    ],
  },
  {
    campaign: 'NSS | S1 Commercial & Strata',
    name: 'Strata Snow Removal',
    landing: 'https://northshoresnow.com/strata',
    path1: 'strata', path2: 'snow-removal',
    keywords: [
      ['strata snow removal', 'Exact'],
      ['strata snow removal vancouver', 'Exact'],
      ['snow removal for strata', 'Phrase'],
      ['strata snow removal contract', 'Phrase'],
      ['condo snow removal vancouver', 'Phrase'],
      ['multi family snow removal', 'Phrase'],
    ],
    headlines: [
      'Strata Snow Removal', 'Snow Removal for Strata', 'Your Council, Covered',
      'Photo-Verified Every Visit', 'Cleared Before 6:30 AM', 'Satellite-Measured Quote',
      'Same-Day Strata Quotes', 'Book Your 2026/27 Season', 'Insured + WorkSafeBC',
      'Common Areas & Walkways', 'Bylaw Frontage Included', 'Occupiers Liability Ready',
      '24/7 Storm Dispatch', 'North Shore Strata Crews', 'Call (604) 990-7072',
    ],
    descriptions: [
      'Documented snow service for BC strata: GPS logs and photos on every single visit.',
      'Your bylaw sidewalk frontage is mapped into the plan, so compliance is automatic.',
      'Council-ready quotes with clear seasonal and per-event options, usually same day.',
      'Multi-building strata across North Van and West Van. Fully insured, WorkSafeBC.',
    ],
  },
  {
    campaign: 'NSS | S1 Commercial & Strata',
    name: 'Property Managers',
    landing: 'https://northshoresnow.com/property-managers',
    path1: 'property-mgmt', path2: 'winter',
    keywords: [
      ['property management snow removal', 'Phrase'],
      ['snow removal for property managers', 'Phrase'],
      ['commercial snow removal contract', 'Phrase'],
      ['snow removal contract vancouver', 'Phrase'],
      ['seasonal snow removal contract', 'Phrase'],
      ['snow removal rfp vancouver', 'Phrase'],
    ],
    headlines: [
      'One Winter Contract', 'Snow for Every Property', 'Property Manager Snow',
      'Portfolio-Wide Coverage', 'One Invoice, Every Site', 'Photo-Verified Every Visit',
      'Named Escalation Contact', 'Satellite-Measured Quote', 'Book Your 2026/27 Season',
      'Cleared Before 6:30 AM', 'Insured + WorkSafeBC', 'Same-Day Quotes',
      '24/7 Storm Dispatch', 'North Shore & Downtown', 'Call (604) 990-7072',
    ],
    descriptions: [
      'One contract, one invoice and one contact for every property you manage. Insured.',
      'Every site GPS-logged and photo-documented, so tenant disputes answer themselves.',
      'We measure each property from satellite imagery. Most quotes are ready same day.',
      'Written response targets and a named escalation contact in your winter contract.',
    ],
  },
  {
    campaign: 'NSS | S1 Commercial & Strata',
    name: 'Parking Lot Plowing',
    landing: 'https://northshoresnow.com/snow-plowing',
    path1: 'parking-lot', path2: 'plowing',
    keywords: [
      ['parking lot snow removal', 'Exact'],
      ['parking lot snow removal vancouver', 'Exact'],
      ['parking lot plowing', 'Phrase'],
      ['commercial snow plowing north vancouver', 'Phrase'],
      ['snow hauling vancouver', 'Phrase'],
    ],
    headlines: [
      'Parking Lot Snow Plowing', 'Lot Cleared by 6:30 AM', 'Commercial Snow Plowing',
      'Truck Plows & Sidewalk Crews', 'Automatic Snowfall Dispatch', 'Snow Hauling & Removal',
      'Satellite-Measured Quote', 'Book Your 2026/27 Season', 'Photo-Verified Every Visit',
      'Insured + WorkSafeBC', '24/7 Storm Dispatch', 'North Vancouver Plowing',
      'Loading Zones & Ramps', 'Same-Day Quotes', 'Call (604) 990-7072',
    ],
    descriptions: [
      'Full-size plow trucks on your lot before the morning rush, salting on the same pass.',
      'Parkade ramps, loading zones and fire exits included, not billed as extras later.',
      'Snow loaded and hauled off-site when your lot runs out of room to stack it.',
      'We measure your lot from satellite imagery and price on real serviceable area.',
    ],
  },
  {
    campaign: 'NSS | S1 Commercial & Strata',
    name: 'De-Icing & Salting',
    landing: 'https://northshoresnow.com/de-icing',
    path1: 'de-icing', path2: 'salting',
    keywords: [
      ['de icing services vancouver', 'Exact'],
      ['commercial salting services', 'Phrase'],
      ['salting services vancouver', 'Phrase'],
      ['ice management vancouver', 'Phrase'],
      ['anti icing services', 'Phrase'],
      ['parking lot salting', 'Phrase'],
    ],
    headlines: [
      'De-Icing & Anti-Icing', 'Commercial Salting', 'Ice Melt & Salting',
      'Treated Before It Freezes', 'Anti-Icing Before the Storm', 'Calibrated Salt Application',
      'Ice Management Services', 'Photo-Verified Every Visit', 'Satellite-Measured Quote',
      'Book Your 2026/27 Season', 'Insured + WorkSafeBC', '24/7 Freeze Monitoring',
      'North Shore De-Icing', 'Same-Day Quotes', 'Call (604) 990-7072',
    ],
    descriptions: [
      'Liquid and granular treatment at 0C, stopping ice before it forms on your lot.',
      'Calibrated application with per-visit records that document your duty of care.',
      'Black ice is the North Shore hazard that outlasts the snow. We treat for it.',
      'De-icing quoted as its own service, never bundled into a snow number you cannot read.',
    ],
  },
  {
    campaign: 'NSS | S2 Residential',
    name: 'Residential Snow Removal',
    landing: 'https://northshoresnow.com/residential',
    path1: 'residential', path2: 'driveways',
    keywords: [
      ['snow removal north vancouver', 'Exact'],
      ['driveway snow removal north vancouver', 'Exact'],
      ['residential snow removal vancouver', 'Exact'],
      ['snow removal west vancouver', 'Phrase'],
      ['driveway snow clearing near me', 'Phrase'],
      ['snow shoveling service north vancouver', 'Phrase'],
      ['sidewalk snow clearing service', 'Phrase'],
    ],
    headlines: [
      'Residential Snow Removal', 'Driveway Snow Clearing', 'Cleared Before Your Day',
      'North Shore Driveways', 'Automatic When It Snows', 'No Alarm, No Shovelling',
      'Book Your Winter Plan', 'Per-Visit or Seasonal', 'Driveway, Walks & Steps',
      'Photo Confirmation', 'Sidewalk Bylaw Covered', 'Steep Driveways Welcome',
      'Local North Shore Crews', 'Simple 30-Day Cancellation', 'Call (604) 990-7072',
    ],
    descriptions: [
      'Driveway, walkways and steps cleared automatically when it snows. No call needed.',
      'Your sidewalk frontage is covered, so the 10am bylaw is handled without an alarm.',
      'Per-visit or a fixed seasonal plan billed monthly, October through April.',
      'Steep North Shore driveways are our home ground. Lynn Valley to the British Properties.',
    ],
  },
  {
    campaign: 'NSS | S3 Storm Surge',
    name: 'Emergency Snow Removal',
    landing: 'https://northshoresnow.com/contact',
    path1: 'emergency', path2: 'snow-removal',
    keywords: [
      ['emergency snow removal', 'Phrase'],
      ['snow removal today', 'Phrase'],
      ['snow removal near me', 'Exact'],
      ['24 hour snow removal', 'Phrase'],
      ['same day snow removal', 'Phrase'],
      ['who plows driveways near me', 'Phrase'],
    ],
    headlines: [
      'Emergency Snow Removal', 'Snow Removal Today', 'Crews Out Right Now',
      'Call (604) 990-7072', 'North Shore Snow Crews', '24/7 Storm Response',
      'Same-Day Snow Clearing', 'Plowing & Salting Now', 'Commercial & Residential',
      'Local, Not a Call Centre', 'Lot Cleared Today', 'Ice & Black Ice Treatment',
    ],
    descriptions: [
      'Storm crews are out across the North Shore right now. Call and we will route to you.',
      'Plowing, shovelling and salting today. Commercial lots and residential driveways.',
      'Local North Vancouver crews and equipment, not a dispatch centre in another city.',
      'Ice and black ice treated on the same visit. Call (604) 990-7072.',
    ],
  },
  {
    campaign: 'NSS | S4 Brand',
    name: 'Brand',
    landing: 'https://northshoresnow.com/',
    path1: 'north-shore', path2: 'snow',
    keywords: [
      ['north shore snow', 'Exact'],
      ['northshoresnow', 'Exact'],
      ['north shore snow removal', 'Phrase'],
    ],
    headlines: [
      'North Shore Snow', 'Official Site', 'Commercial Snow Removal',
      'North Vancouver Based', 'Call (604) 990-7072', 'Get a Free Quote',
      'Satellite-Measured Quote', '5.0 Stars on Google', 'Book Your 2026/27 Season',
    ],
    descriptions: [
      'The official site for North Shore Snow. Commercial and residential snow removal.',
      'Based in Lower Lonsdale, serving North Van, West Van and Downtown Vancouver.',
      'Satellite-measured quotes, usually back the same day. Call (604) 990-7072.',
      'Rated 5.0 on Google. Fully insured and WorkSafeBC registered.',
    ],
  },
]

/** Applied to every campaign. Broad so they catch variants and misspellings. */
const GLOBAL_NEGATIVES = [
  'washington', 'wa', 'vancouver wa', 'vancouver washington', 'portland', 'seattle', 'oregon',
  'job', 'jobs', 'hiring', 'career', 'careers', 'salary', 'wage', 'employment', 'resume',
  'equipment', 'for sale', 'rental', 'rent', 'used', 'buy', 'price list', 'cost calculator',
  'snow blower', 'snowblower', 'plow truck', 'plow blade', 'snow plow attachment', 'tractor',
  'diy', 'how to', 'yourself', 'tutorial', 'youtube',
  'city of', 'municipal', 'municipality', 'highway', 'provincial', 'government tender',
  'whistler', 'ski', 'resort', 'sun peaks', 'kelowna', 'calgary', 'toronto', 'ontario',
  'roof snow removal', 'roof raking', 'ice dam',
  'software', 'app', 'crm', 'dispatch software',
  'free', 'cheap', 'volunteer', 'snow angel',
]

/** Keeps the commercial and residential campaigns from cannibalising each other. */
const CAMPAIGN_NEGATIVES = {
  'NSS | S1 Commercial & Strata': ['residential', 'driveway', 'my house', 'my home', 'homeowner', 'single family'],
  'NSS | S2 Residential': ['commercial', 'strata', 'parking lot', 'warehouse', 'industrial', 'contract rfp'],
}

const SITELINKS = [
  ['Get a Free Quote', 'Satellite-measured, no site visit', 'Most quotes back the same day', 'https://northshoresnow.com/contact#quote'],
  ['Strata Snow Removal', 'Documented service for BC strata', 'Council-ready quotes and records', 'https://northshoresnow.com/strata'],
  ['For Property Managers', 'One contract for every property', 'One invoice and one contact', 'https://northshoresnow.com/property-managers'],
  ['De-Icing & Salting', 'Treated before ice ever forms', 'Calibrated, documented salting', 'https://northshoresnow.com/de-icing'],
  ['Residential Driveways', 'Automatic clearing when it snows', 'Per-visit or seasonal plans', 'https://northshoresnow.com/residential'],
  ['Areas We Cover', 'North Van, West Van, Downtown', 'Response times by area', 'https://northshoresnow.com/service-areas'],
]

/* ------------------------------------------------------------------ *
 * Validate before writing anything
 * ------------------------------------------------------------------ */

const errors = []
for (const g of adGroups) {
  if (!CAMPAIGNS[g.campaign]) errors.push(`${g.name}: unknown campaign "${g.campaign}"`)
  if (g.headlines.length < 3 || g.headlines.length > 15) errors.push(`${g.name}: ${g.headlines.length} headlines (need 3-15)`)
  if (g.descriptions.length < 2 || g.descriptions.length > 4) errors.push(`${g.name}: ${g.descriptions.length} descriptions (need 2-4)`)
  if (new Set(g.headlines).size !== g.headlines.length) errors.push(`${g.name}: duplicate headline`)
  g.headlines.forEach((h) => h.length > LIMITS.headline && errors.push(`${g.name} headline ${h.length}/30: ${h}`))
  g.descriptions.forEach((d) => d.length > LIMITS.description && errors.push(`${g.name} description ${d.length}/90: ${d}`))
  // Display path segments are 15 chars each.
  ;[g.path1, g.path2].forEach((p) => p && p.length > 15 && errors.push(`${g.name} path ${p.length}/15: ${p}`))
}
SITELINKS.forEach(([text, d1, d2]) => {
  if (text.length > LIMITS.sitelink) errors.push(`sitelink ${text.length}/25: ${text}`)
  if (d1.length > LIMITS.sitelinkDesc) errors.push(`sitelink desc ${d1.length}/35: ${d1}`)
  if (d2.length > LIMITS.sitelinkDesc) errors.push(`sitelink desc ${d2.length}/35: ${d2}`)
})

if (errors.length) {
  console.error('Refusing to write CSVs — assets over limit:\n' + errors.map((e) => '  ' + e).join('\n'))
  process.exit(1)
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const esc = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csv = (rows) => rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
const write = (name, rows) => {
  writeFileSync(join(OUT, name), csv(rows), 'utf8')
  console.log(`  ${name.padEnd(38)} ${rows.length - 1} rows`)
}

mkdirSync(OUT, { recursive: true })
console.log('Writing Google Ads Editor import files (everything PAUSED):\n')

// 01 — campaigns, ad groups, keywords
const structure = [[
  'Campaign', 'Campaign Daily Budget', 'Campaign Status',
  'Ad Group', 'Max CPC', 'Ad Group Status',
  'Keyword', 'Criterion Type',
]]
for (const g of adGroups) {
  const c = CAMPAIGNS[g.campaign]
  for (const [kw, match] of g.keywords) {
    structure.push([g.campaign, c.budget, 'Paused', g.name, c.maxCpc, 'Paused', kw, match])
  }
}
write('01-campaigns-adgroups-keywords.csv', structure)

// 02 — responsive search ads
const adHeader = ['Campaign', 'Ad Group', 'Ad Status', 'Ad Type', 'Final URL', 'Path 1', 'Path 2']
for (let i = 1; i <= 15; i++) adHeader.push(`Headline ${i}`)
for (let i = 1; i <= 4; i++) adHeader.push(`Description ${i}`)
const ads = [adHeader]
for (const g of adGroups) {
  const row = [g.campaign, g.name, 'Paused', 'Responsive search ad', g.landing, g.path1, g.path2]
  for (let i = 0; i < 15; i++) row.push(g.headlines[i] ?? '')
  for (let i = 0; i < 4; i++) row.push(g.descriptions[i] ?? '')
  ads.push(row)
}
write('02-responsive-search-ads.csv', ads)

// 03 — negatives
const negatives = [['Campaign', 'Keyword', 'Criterion Type']]
for (const campaign of Object.keys(CAMPAIGNS)) {
  for (const kw of GLOBAL_NEGATIVES) negatives.push([campaign, kw, 'Campaign Negative Broad'])
  for (const kw of CAMPAIGN_NEGATIVES[campaign] ?? []) negatives.push([campaign, kw, 'Campaign Negative Broad'])
}
write('03-negative-keywords.csv', negatives)

// 04 — sitelinks
const sitelinks = [['Campaign', 'Sitelink Text', 'Sitelink Description 1', 'Sitelink Description 2', 'Sitelink Final URL']]
for (const campaign of Object.keys(CAMPAIGNS)) {
  for (const [text, d1, d2, url] of SITELINKS) sitelinks.push([campaign, text, d1, d2, url])
}
write('04-sitelinks.csv', sitelinks)

const kwCount = adGroups.reduce((n, g) => n + g.keywords.length, 0)
const hlCount = adGroups.reduce((n, g) => n + g.headlines.length, 0)
console.log(`\n${Object.keys(CAMPAIGNS).length} campaigns · ${adGroups.length} ad groups · ${kwCount} keywords · ${hlCount} headlines`)
console.log('All assets within platform limits. Everything imports Paused.')
