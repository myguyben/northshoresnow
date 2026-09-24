/**
 * Ad attribution + conversion tracking.
 *
 * Two jobs, deliberately kept separate:
 *
 * 1. ATTRIBUTION — capture the ad click identifiers (gclid/wbraid/fbclid/…)
 *    and UTMs on landing, persist them for the visit, and attach them to the
 *    quote lead. Snow contracts close days-to-weeks after the click, long
 *    after any pixel has stopped watching, so the click id has to travel with
 *    the lead into Icey. That is what makes Google Ads offline conversion
 *    import possible: upload "this gclid became a $9,800 seasonal contract"
 *    and bidding optimises toward signed revenue instead of raw form fills.
 *
 * 2. CONVERSIONS — fire the in-browser events (lead, click-to-call) to GA4,
 *    Google Ads and the Meta pixel.
 *
 * 3. ENGAGEMENT — scroll depth, CTA clicks and the quote funnel, to GA4 only,
 *    so the header A/B test (lib/experiment.ts) can be read further up the
 *    page than the lead: which arm gets people to the pricing section, which
 *    gets them to start the form.
 *
 * Every function here no-ops when the corresponding tag is not configured, so
 * the site behaves exactly as it did before the tags were added.
 *
 * The per-visitor record (which pages, how long, which network) is a separate
 * first-party beacon to Icey — lib/visit-beacon.ts — and does not touch GA4.
 */

import { heroVariant, quotePromptArm } from './experiment'
import { onActivated } from './prerender'

const STORAGE_KEY = 'nss_attribution'

/** Ad-platform click identifiers, in the order they win when several appear. */
const CLICK_IDS = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid'] as const
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

export interface Attribution {
  /** e.g. 'gclid' */
  clickIdName?: string
  clickIdValue?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  /** First page of the visit that carried the ad click. */
  landingPage?: string
  /** Referrer at first touch — the only signal for organic/referral leads. */
  referrer?: string
  /** ISO timestamp of first touch. */
  firstSeen?: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { loaded?: boolean }
  }
}

function readStored(): Attribution {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Attribution) : {}
  } catch {
    return {}
  }
}

function write(attribution: Attribution): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    /* private mode / storage disabled — attribution is best-effort */
  }
}

/**
 * Record the ad click that started this visit.
 *
 * Last non-direct click wins: a visitor who arrives on a Google ad, leaves,
 * then returns on a Meta ad is credited to Meta. A visitor who arrives on an
 * ad and then browses the site keeps the ad credit, because internal
 * navigation carries no click id and never overwrites. Runs on every page.
 */
export function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search)
  const stored = readStored()

  const clickIdName = CLICK_IDS.find((name) => params.get(name))
  const hasUtm = UTMS.some((name) => params.get(name))
  if (!clickIdName && !hasUtm) return stored

  const fresh: Attribution = {
    landingPage: window.location.pathname,
    referrer: document.referrer || undefined,
    firstSeen: stored.firstSeen ?? new Date().toISOString(),
  }
  if (clickIdName) {
    fresh.clickIdName = clickIdName
    fresh.clickIdValue = params.get(clickIdName) ?? undefined
  }
  for (const name of UTMS) {
    const value = params.get(name)
    if (value) fresh[name] = value.slice(0, 120)
  }

  write(fresh)
  return fresh
}

export function getAttribution(): Attribution {
  return readStored()
}

/** Flatten attribution onto the lead payload the quote form POSTs. */
export function attributionFields(): Record<string, string> {
  const attribution = getAttribution()
  const fields: Record<string, string> = {}
  if (attribution.clickIdName && attribution.clickIdValue) {
    fields.clickId = attribution.clickIdValue
    fields.clickIdType = attribution.clickIdName
  }
  for (const name of UTMS) {
    const value = attribution[name]
    if (value) fields[name] = value
  }
  if (attribution.landingPage) fields.landingPage = attribution.landingPage
  if (attribution.referrer) fields.referrer = attribution.referrer.slice(0, 500)
  return fields
}

/* ------------------------------------------------------------------ *
 * Conversions
 * ------------------------------------------------------------------ */

const ADS_ID = import.meta.env.PUBLIC_GOOGLE_ADS_ID as string | undefined
const LEAD_LABEL = import.meta.env.PUBLIC_GOOGLE_ADS_LEAD_LABEL as string | undefined
const CALL_LABEL = import.meta.env.PUBLIC_GOOGLE_ADS_CALL_LABEL as string | undefined
const EMAIL_LABEL = import.meta.env.PUBLIC_GOOGLE_ADS_EMAIL_LABEL as string | undefined
const ENHANCED = import.meta.env.PUBLIC_GOOGLE_ADS_ENHANCED === 'true'

/**
 * The arms this browser holds, keyed as GA4 knows them: `home_hero` for the
 * header test, `quote_prompt` for the corner card (lib/experiment.ts).
 * Only the ones assigned — a browser in neither test contributes nothing.
 */
function experimentArms(): Record<string, string> {
  const arms: Record<string, string> = {}
  const hero = heroVariant()
  if (hero) arms.home_hero = hero
  const prompt = quotePromptArm()
  if (prompt) arms.quote_prompt = prompt
  return arms
}

/**
 * Every custom GA4 event goes out through here so it carries each test's
 * arm as an event parameter. Analytics.astro already sets them as user
 * properties before the first page_view; the parameters are belt and braces
 * — a user property only reaches a report through its own custom dimension,
 * and an event parameter survives a report built without one. Google Ads
 * `conversion` hits are not custom events and stay as they are.
 */
function sendEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!window.gtag) return
  window.gtag('event', name, { ...params, ...experimentArms() })
}

/**
 * Set the arms as GA4 user properties, so hits that do not go through
 * sendEvent (page_view, the Ads conversions) split by arm too.
 *
 * Analytics.astro does this as the tag boots, from localStorage, on every
 * page — but the quote-prompt arm is assigned client-side AFTER the tag has
 * booted (scripts/quote-prompt.ts), so the page that assigns it calls this
 * the moment it does. Always the whole set in one call: whether a later
 * `set` of `user_properties` merges with or replaces an earlier one is not
 * something to rely on.
 */
export function trackExperimentArms(): void {
  if (!window.gtag) return
  const arms = experimentArms()
  if (Object.keys(arms).length) window.gtag('set', 'user_properties', arms)
}

/**
 * Declared lead value, in CAD, used only as a bidding signal.
 *
 * This is NOT revenue — it is what an average quote request is worth once the
 * close rate is applied, and it exists so Google/Meta can tell a residential
 * driveway lead from a commercial-site lead when optimising. Overridden per
 * call site; tune from real close data rather than leaving it guessed.
 */
export const LEAD_VALUE = { commercial: 400, residential: 60, unknown: 120 } as const

/**
 * Lead handed from the quote form to /thank-you, which owns the conversion
 * fire. Firing on the destination page instead of in the submit handler keeps
 * a tag from racing the navigation that follows it.
 */
const PENDING_LEAD_KEY = 'nss_pending_lead'

/** Rounded price band returned by the estimate endpoint — display-only. */
export interface BallparkEstimate {
  /** Per-visit snow clearing (a visit is snow OR salting, never both). */
  perVisit: { low: number; high: number }
  /** Per-visit salting/de-icing; absent when the company prices none. */
  deicingPerVisit?: { low: number; high: number } | null
  seasonal: { low: number; high: number }
  currency: string
}

export interface PendingLead {
  submissionId: string
  propertyType?: string
  email?: string
  /** Instant ballpark from the submit response; shown once on /thank-you. */
  estimate?: BallparkEstimate | null
  /** The first property — the one the ballpark was priced for. */
  address?: string
  /** How many more properties the request carried (quoted by email). */
  otherProperties?: number
}

export function stashPendingLead(lead: PendingLead): void {
  try {
    sessionStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(lead))
  } catch {
    /* storage unavailable — the lead converts unattributed */
  }
}

/**
 * Read and clear the pending lead. Clearing is what stops a refresh or a
 * back-button return to /thank-you from counting the same lead twice.
 */
export function consumePendingLead(): PendingLead | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LEAD_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_LEAD_KEY)
    return JSON.parse(raw) as PendingLead
  } catch {
    return null
  }
}

async function sha256(value: string): Promise<string | undefined> {
  try {
    const bytes = new TextEncoder().encode(value.trim().toLowerCase())
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return undefined
  }
}

/**
 * Fire the quote-request conversion.
 *
 * `eventId` deduplicates: the same id is used for the Meta browser event so a
 * future Conversions API server event collapses onto it instead of counting
 * the lead twice.
 */
export async function trackLead(options: {
  eventId: string
  value: number
  propertyType?: string
  email?: string
}): Promise<void> {
  const { eventId, value, propertyType, email } = options

  if (window.gtag) {
    // Enhanced conversions lift match rates on a form whose only identifier
    // is an email address. Hashed here rather than handing Google plaintext.
    if (ENHANCED && email) {
      const hashed = await sha256(email)
      if (hashed) window.gtag('set', 'user_data', { sha256_email_address: hashed })
    }
    sendEvent('generate_lead', {
      currency: 'CAD',
      value,
      property_type: propertyType ?? 'unknown',
    })
    if (ADS_ID && LEAD_LABEL) {
      window.gtag('event', 'conversion', {
        send_to: `${ADS_ID}/${LEAD_LABEL}`,
        value,
        currency: 'CAD',
        transaction_id: eventId,
      })
    }
  }

  window.fbq?.('track', 'Lead', { currency: 'CAD', value, content_category: propertyType }, { eventID: eventId })
}

/**
 * Fire the click-to-call conversion.
 *
 * Worth its own conversion action: during a storm most commercial callers
 * phone rather than fill in a form, so a lead-form-only setup makes the
 * highest-intent traffic of the season look like it converted at zero.
 */
export function trackCallClick(): void {
  sendEvent('click_to_call', { currency: 'CAD', value: LEAD_VALUE.unknown })
  if (window.gtag && ADS_ID && CALL_LABEL) {
    window.gtag('event', 'conversion', { send_to: `${ADS_ID}/${CALL_LABEL}` })
  }
  window.fbq?.('track', 'Contact')
}

/**
 * Fire the email-click conversion.
 *
 * Same reasoning as the call: a visitor who mails the address directly never
 * touches the quote form, so without this the channel reports zero and looks
 * worthless next to the form. The Ads conversion needs its own action and
 * label (PUBLIC_GOOGLE_ADS_EMAIL_LABEL); until one exists the GA4 event still
 * records the click and, with it, whether that visit was organic or paid.
 */
export function trackEmailClick(): void {
  sendEvent('email_click', { currency: 'CAD', value: LEAD_VALUE.unknown })
  if (window.gtag && ADS_ID && EMAIL_LABEL) {
    window.gtag('event', 'conversion', { send_to: `${ADS_ID}/${EMAIL_LABEL}` })
  }
  window.fbq?.('track', 'Contact')
}

/**
 * Fire when contact details are captured but the quote is not submitted.
 *
 * The abandoned-form beacon already saves this row server-side so the team can
 * phone the visitor back, so it is real reach — it is just invisible in GA4,
 * which makes the form read as though those people never existed. Fires once
 * per visit (the caller holds the latch) so it counts people, not keystrokes.
 *
 * Deliberately NOT a lead and never a Google Ads conversion: mark this a key
 * event and everyone who goes on to finish is counted twice.
 */
export function trackPartialLead(): void {
  sendEvent('quote_lead_partial')
}

/**
 * Fire when a submission the visitor completed did NOT reach the server and
 * they were shown the mailto fallback instead.
 *
 * `generate_lead` only ever fires on /thank-you, so without this a bad deploy,
 * an origin-allowlist slip or a 10-second timeout looks exactly like a quiet
 * week — the funnel loses leads with no trace. `reason` is bucketed
 * (`timeout` / `http_500` / `network`) to keep cardinality bounded.
 */
export function trackQuoteSubmitFailed(reason: string): void {
  sendEvent('quote_submit_failed', { reason })
}

/* ------------------------------------------------------------------ *
 * Quote funnel
 * ------------------------------------------------------------------ */

/**
 * The hero's mini form was submitted (address + email) — the top of the quote
 * funnel, and the one step the header A/B test changes directly. `variant` is
 * the card's copy ('price' | 'classic'), which is the arm by another name.
 */
export function trackQuoteHeroSubmit(variant: string): void {
  sendEvent('quote_hero_submit', { variant })
}

/** First keystroke in the full form. The caller holds the once-latch. */
export function trackQuoteFormStart(): void {
  sendEvent('quote_form_start')
}

/** "Add another property" — `properties` is the total on the form after adding. */
export function trackQuoteAddProperty(properties: number): void {
  sendEvent('quote_add_property', { properties })
}

/* ------------------------------------------------------------------ *
 * Quote prompt (the corner card — scripts/quote-prompt.ts)
 * ------------------------------------------------------------------ */

/**
 * The card appeared. `trigger` is what earned it — 'second_page',
 * 'engaged', 'pricing' or 'exit' — so the shown → submit rate can be read
 * per trigger, not just per arm: if exit intent converts and the 45-second
 * timer only annoys, the timer goes.
 */
export function trackQuotePromptShown(trigger: string): void {
  sendEvent('quote_prompt_shown', { trigger })
}

/** The ✕ (or Escape). The visitor is not asked again for 14 days. */
export function trackQuotePromptDismiss(): void {
  sendEvent('quote_prompt_dismiss')
}

/**
 * An address was submitted from the card. Fired before the navigation to
 * /contact#quote — GA4 sends events as beacons, so it survives the page
 * going away. The full form's own funnel events take over from there.
 */
export function trackQuotePromptSubmit(): void {
  sendEvent('quote_prompt_submit')
}

/* ------------------------------------------------------------------ *
 * Engagement
 * ------------------------------------------------------------------ */

/**
 * How much of the page has been seen, 0–100: the viewport's bottom edge as a
 * share of the document's height, which is the definition GA4's own scroll
 * event uses. A page shorter than the viewport is 100 without scrolling.
 */
export function scrollPercent(): number {
  const height = document.documentElement.scrollHeight
  if (height <= 0) return 0
  const seen = ((window.scrollY + window.innerHeight) / height) * 100
  return Math.min(100, Math.max(0, Math.round(seen)))
}

const SCROLL_MARKS = [25, 50, 75, 90] as const

/**
 * Scroll depth at 25/50/75/90%, once per mark per page view.
 *
 * GA4's built-in scroll event fires at 90% only, which answers "did they reach
 * the bottom" and nothing about where the rest stopped. Four marks show where
 * a page loses people, and — read per header arm — whether the new header
 * carries more of them down to the pricing section.
 */
function trackScrollDepth(): void {
  const reached = new Set<number>()
  function check(): void {
    const percent = scrollPercent()
    for (const mark of SCROLL_MARKS) {
      if (percent < mark || reached.has(mark)) continue
      reached.add(mark)
      sendEvent('scroll_depth', { percent: mark, page_path: window.location.pathname })
    }
  }
  window.addEventListener('scroll', check, { passive: true })
  // A short page is fully seen at load; wait a frame for layout to settle.
  requestAnimationFrame(check)
}

/** GA4 caps a text parameter at 100 characters; 60 keeps the reports legible. */
const LABEL_MAX = 60

function squeeze(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** The section a click came from: its id, a data-section, or its heading. */
function sectionOf(el: Element): string {
  const section = el.closest<HTMLElement>('section, [data-section]')
  if (!section) return ''
  const label =
    section.id || section.dataset.section || section.querySelector('h2, h1')?.textContent
  return squeeze(label).slice(0, LABEL_MAX)
}

/**
 * Every link and button in the page content, delegated from <main> so the
 * header, footer and sticky call bar (all outside it) stay out of the count.
 * Phone and email links already report as click_to_call / email_click and
 * are skipped, as is anything inside a form — the quote form has its own
 * funnel events above.
 *
 * A card that is one big link (the audience fork, the service cards) reports
 * its heading, not its whole text, so the label reads as a name in GA4.
 */
function trackCtaClicks(): void {
  const main = document.getElementById('main')
  if (!main) return
  main.addEventListener('click', (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('a[href], button')
    if (!target || !main.contains(target)) return
    const href = target.getAttribute('href') ?? ''
    if (/^(tel|mailto):/i.test(href)) return
    if (target.closest('form')) return
    const label =
      squeeze(target.querySelector('h1, h2, h3, h4')?.textContent) ||
      squeeze(target.textContent) ||
      squeeze(target.getAttribute('aria-label')) ||
      href
    sendEvent('cta_click', {
      cta_label: label.slice(0, LABEL_MAX),
      cta_href: href,
      section: sectionOf(target),
      page_path: window.location.pathname,
    })
  })
}

/**
 * Wire the page-level listeners.
 *
 * Phone numbers and the quotes@ address appear in the header, footer, hero,
 * CTA bands, contact page, the sticky mobile bar and the form's error panel —
 * delegated listeners keep every one of them tracked without a dozen call
 * sites drifting out of sync.
 *
 * These fire on EVERY click, not just ad traffic: an organic or direct
 * visitor who phones is exactly as real as one who arrived on a gclid, and
 * the GA4 event carries its own traffic source. (Google Ads only reports the
 * ones it can attribute to a click of its own, which is why GA4 has to be
 * configured for the organic half to be countable at all.)
 *
 * Scroll depth and CTA clicks wait for activation: /contact is prerendered
 * from every page (lib/prerender.ts), and a short prerendered page would
 * otherwise report itself fully read by a visitor who never opened it.
 */
export function initAnalytics(): void {
  captureAttribution()
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null
    if (target?.closest('a[href^="tel:"]')) trackCallClick()
    else if (target?.closest('a[href^="mailto:"]')) trackEmailClick()
  })
  onActivated(() => {
    trackScrollDepth()
    trackCtaClicks()
  })
}
