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
 * Every function here no-ops when the corresponding tag is not configured, so
 * the site behaves exactly as it did before the tags were added.
 */

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
    window.gtag('event', 'generate_lead', {
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
  window.gtag?.('event', 'click_to_call', { currency: 'CAD', value: LEAD_VALUE.unknown })
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
  window.gtag?.('event', 'email_click', { currency: 'CAD', value: LEAD_VALUE.unknown })
  if (window.gtag && ADS_ID && EMAIL_LABEL) {
    window.gtag('event', 'conversion', { send_to: `${ADS_ID}/${EMAIL_LABEL}` })
  }
  window.fbq?.('track', 'Contact')
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
 */
export function initAnalytics(): void {
  captureAttribution()
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null
    if (target?.closest('a[href^="tel:"]')) trackCallClick()
    else if (target?.closest('a[href^="mailto:"]')) trackEmailClick()
  })
}
