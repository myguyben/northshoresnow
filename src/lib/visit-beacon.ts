/**
 * First-party visit beacon.
 *
 * Every page view, and how long the visitor really spent on it, goes to Icey
 * (POST /api/inbound/site-visit) so a quote request can be read next to the
 * visits that led up to it: which pages, how many times, how long, from
 * which network. GA4 keeps the aggregate picture; this is the per-visitor
 * one, and it lives in our own system rather than a third party's. The plan
 * is .planning/VISITOR_INTENT_ROUTING_2026-09-23.md in the Icey repo.
 *
 * Three identifiers, all random, none of them a name:
 *   - visitorId  localStorage, once per browser (`nss_vid`)
 *   - sessionId  sessionStorage, once per tab (`nss_sid`)
 *   - viewId     one per page view, so the later 'engage' pings name the
 *                'view' they belong to
 *
 * When a visitor later types their email into the quote form, the lead
 * carries the visitorId (scripts/quote-form.ts) and Icey joins the two.
 * Until then the record is a browser, not a person.
 *
 * NOTHING IS SENT when:
 *   - PUBLIC_NOINDEX is set: the preview build posts to production Icey and
 *     must never record staging traffic;
 *   - the user agent is a crawler, Lighthouse or a headless browser;
 *   - the browser sends Global Privacy Control or Do Not Track. No visitor
 *     id is minted in that browser either — there is nothing to honour a
 *     signal with if the identifier already exists.
 *
 * PRERENDER: /contact is prerendered from every page (Base.astro), so this
 * module runs in documents the visitor may never open. Everything — the
 * ids, the view, the engagement clock — waits for activation
 * (lib/prerender.ts). Storage waits too: a prerendered page only sees the
 * sessionStorage the initiating page wrote once it is activated, and the
 * session id is what says whether this is the first view of a session.
 *
 * The payload is `SiteVisitEvent` in Icey's lib/intent/types.ts. This site
 * cannot import it, so the shape is copied below; keep the two in step.
 */

import { getAttribution, scrollPercent } from './analytics'
import { experimentFields } from './experiment'
import { onActivated } from './prerender'

// Same base as the quote form's endpoints (scripts/quote-form.ts): a local
// Icey pointed at by PUBLIC_QUOTE_ENDPOINT gets the visits too.
const ENDPOINT = (
  import.meta.env.PUBLIC_QUOTE_ENDPOINT ?? 'https://iceysoftware.com/api/inbound/website-estimate'
).replace(/\/website-(lead|estimate)$/, '/site-visit')

const VISITOR_KEY = 'nss_vid'
const SESSION_KEY = 'nss_sid'
/** Same rule as the header test's inline script in index.astro; keep in step. */
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless/i
/** While the page is being read, engagement goes out this often. */
const HEARTBEAT_MS = 30_000
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

interface ViewEvent {
  type: 'view'
  visitorId: string
  sessionId: string
  /** Unique per page view; the later 'engage' pings name it. */
  viewId: string
  path: string
  title?: string
  referrer?: string
  /** e.g. 'home-hero:b' */
  experiment?: string
  /** First view of a session only: landing page, referrer, utm_*, clickIdType. */
  firstTouch?: Record<string, string>
}

interface EngageEvent {
  type: 'engage'
  visitorId: string
  sessionId: string
  viewId: string
  /** Seconds the page was visible and focused, cumulative for this view. */
  engagedSeconds: number
  /** Deepest scroll reached on this view, 0–100. */
  maxScrollPct: number
}

type SiteVisitEvent = ViewEvent | EngageEvent

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function uuid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Older Safari has getRandomValues but not randomUUID: same v4 shape.
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

/** The id under `key`, if it is one of ours. Anything else is ignored. */
function storedId(storage: Storage, key: string): string | null {
  try {
    const value = storage.getItem(key)
    return value && UUID.test(value) ? value : null
  } catch {
    return null
  }
}

/** Mint an id under `key`; null when the browser refuses to keep it. */
function mintId(storage: Storage, key: string): string | null {
  const id = uuid()
  try {
    storage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

/** This browser's visitor id, if one has been minted. Never creates one. */
export function visitorId(): string | null {
  return storedId(localStorage, VISITOR_KEY)
}

/** Lead field for Icey: `{ visitorId }`, or nothing — the join to the visits. */
export function visitorFields(): Record<string, string> {
  const id = visitorId()
  return id ? { visitorId: id } : {}
}

function trackingAllowed(): boolean {
  // Any value, not just '1' (which is what Seo.astro keys on): the safe
  // failure for a mis-set preview variable is silence, not staging traffic
  // in the production tables.
  if (import.meta.env.PUBLIC_NOINDEX) return false
  if (BOT_UA.test(navigator.userAgent)) return false
  const signals = navigator as Navigator & {
    globalPrivacyControl?: boolean
    doNotTrack?: string | null
  }
  if (signals.globalPrivacyControl === true || signals.doNotTrack === '1') return false
  return true
}

/** The clean URL the site serves, whatever the browser was handed. */
function pagePath(): string {
  return window.location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '') || '/'
}

function send(event: SiteVisitEvent): void {
  const body = JSON.stringify(event)
  try {
    // text/plain keeps the request CORS-safelisted — no preflight — which is
    // what lets a beacon go out during unload. Icey parses it as JSON.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return
  } catch {
    /* fall through to fetch */
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    keepalive: true,
  }).catch(() => {
    /* silent — a visit record is best-effort and never the page's problem */
  })
}

/**
 * Where the session began. The attribution store (lib/analytics.ts) was
 * written by captureAttribution() earlier in the same page load, so any
 * UTMs or click id on this URL are already in it.
 */
function firstTouch(): Record<string, string> {
  const attribution = getAttribution()
  const touch: Record<string, string> = { landingPage: pagePath() }
  if (document.referrer) touch.referrer = document.referrer.slice(0, 500)
  for (const name of UTMS) {
    const value = attribution[name]
    if (value) touch[name] = value
  }
  if (attribution.clickIdName) touch.clickIdType = attribution.clickIdName
  return touch
}

/**
 * One page view: send it, then keep the engagement clock for it.
 *
 * "Engaged" means the page is visible AND the window has focus. The clock
 * pauses on a tab switch or an app switch and resumes when the visitor comes
 * back, so a page left open behind a spreadsheet all afternoon reads as the
 * minute it was actually looked at. Engagement goes out when the page is
 * hidden, when it is left (pagehide), and every 30 seconds while it is
 * being read — the same numbers may go out more than once and the server
 * keeps the highest, so re-sending is harmless.
 */
function startView(): void {
  const visitor = visitorId() ?? mintId(localStorage, VISITOR_KEY)
  const existingSession = storedId(sessionStorage, SESSION_KEY)
  const session = existingSession ?? mintId(sessionStorage, SESSION_KEY)
  // A browser that will not keep the ids is one we cannot recognise on the
  // next page: every view would be a new one-page visitor. Noise, not data.
  if (!visitor || !session) return
  // One object, typed after the guard: the closures below would otherwise
  // see `visitor` and `session` as nullable again.
  const ids = { visitorId: visitor, sessionId: session, viewId: uuid() }

  const view: ViewEvent = {
    type: 'view',
    ...ids,
    path: pagePath(),
    title: document.title.slice(0, 200),
    ...experimentFields(),
  }
  if (document.referrer) view.referrer = document.referrer.slice(0, 500)
  if (!existingSession) view.firstTouch = firstTouch()
  send(view)

  let engagedMs = 0
  /** performance.now() when the current engaged stretch began; null while paused. */
  let since: number | null = null
  let focused = document.hasFocus()
  let maxScroll = scrollPercent()
  let lastSent = ''

  function clock(): void {
    const now = performance.now()
    const engaged = document.visibilityState === 'visible' && focused
    if (engaged) {
      if (since === null) since = now
    } else if (since !== null) {
      engagedMs += now - since
      since = null
    }
  }

  function engagedSeconds(): number {
    const running = since === null ? 0 : performance.now() - since
    return Math.round((engagedMs + running) / 1000)
  }

  function sendEngage(): void {
    const seconds = engagedSeconds()
    const key = `${seconds}:${maxScroll}`
    if (key === lastSent) return
    lastSent = key
    send({ type: 'engage', ...ids, engagedSeconds: seconds, maxScrollPct: maxScroll })
  }

  // A browser that reports no focus while the visitor is scrolling or
  // typing is wrong about the focus; the interaction is the better witness.
  function interacted(): void {
    focused = true
    clock()
  }

  window.addEventListener('focus', interacted)
  window.addEventListener('blur', () => {
    focused = false
    clock()
  })
  window.addEventListener('pointerdown', interacted, { passive: true })
  window.addEventListener('keydown', interacted)
  window.addEventListener(
    'scroll',
    () => {
      maxScroll = Math.max(maxScroll, scrollPercent())
      interacted()
    },
    { passive: true }
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      focused = document.hasFocus()
      clock()
    } else {
      clock()
      sendEngage()
    }
  })
  // Leaving the page, and coming back to it from the back/forward cache.
  window.addEventListener('pagehide', () => {
    clock()
    sendEngage()
  })
  window.addEventListener('pageshow', () => {
    focused = document.hasFocus()
    clock()
  })
  window.setInterval(() => {
    if (since !== null) sendEngage()
  }, HEARTBEAT_MS)

  clock()
}

/**
 * Start the beacon for this page. Runs from Base.astro on every page; the
 * view itself waits for activation (see the prerender note above) and a
 * failure anywhere in here is swallowed — measurement never breaks a page.
 */
export function initVisitBeacon(): void {
  if (!trackingAllowed()) return
  onActivated(() => {
    try {
      startView()
    } catch {
      /* no crypto, no storage, no beacon — the page is unaffected */
    }
  })
}
