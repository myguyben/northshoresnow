/**
 * Client logic for the on-site quote prompt (components/QuotePrompt.astro):
 * who sees the card, when, and what happens when they use it.
 *
 * Ben, 2026-09-23: "we want to ask for quotes for people who just visit the
 * site but don't fill anything out." They cannot be emailed — no address —
 * so the site asks while they are here. Half of browsers are in the 'on'
 * arm and may see the card; half never do (lib/experiment.ts).
 *
 * WHEN IT APPEARS — once the visitor has shown some interest, never on
 * arrival, and at most once per page view:
 *   - the second page view of the session, after a few seconds to settle
 *     (long enough for the form-in-view check below to have an answer);
 *   - 45 seconds of engaged time on one page. "Engaged" means visible AND
 *     focused, the visit beacon's clock: a tab left open behind a
 *     spreadsheet does not earn the card;
 *   - 20 seconds on a pricing page — /commercial, /residential, or any
 *     path with "pricing" in it;
 *   - exit intent: the mouse leaving through the top of the viewport after
 *     10 seconds on the page. Pointer devices only; a phone has no cursor
 *     and its "back" is a swipe.
 *
 * WHEN IT NEVER APPEARS:
 *   - the browser is a crawler, Lighthouse or headless;
 *   - the arm is 'off';
 *   - this browser submitted a quote in the last 90 days — /thank-you
 *     records that (markQuoteSubmitted): a customer waiting on a quote must
 *     not be asked to request one;
 *   - it was closed in the last 14 days. A ✕ is an answer;
 *   - it was already shown this session and not used;
 *   - the quote draft already holds an address: they are mid-quote;
 *   - the hero's mini form or the full form is on screen at the moment a
 *     trigger fires. Asking twice on one screen is nagging; the trigger is
 *     spent and a later one gets its own chance;
 *   - storage is blocked. Every rule above lives in storage, and a browser
 *     that will not keep them would be shown the card on every page. Fail
 *     closed.
 * Base.astro also leaves the card out of /contact, /thank-you, /privacy,
 * /terms and /404 altogether.
 *
 * PRERENDER: /contact is prerendered from every page (lib/prerender.ts) and
 * initQuotePrompt runs from Base.astro on every page, so everything that
 * counts, stores or reports waits for activation.
 */

import {
  trackExperimentArms,
  trackQuotePromptDismiss,
  trackQuotePromptShown,
  trackQuotePromptSubmit,
} from '../lib/analytics'
import { BOT_UA, assignQuotePromptArm, type QuotePromptArm } from '../lib/experiment'
import { onActivated } from '../lib/prerender'
import { readQuoteDraft, saveQuoteDraft } from '../lib/quote-draft'
import { attachAddressAutocomplete } from './quote-form'

/** localStorage: ISO date of this browser's last quote submission (/thank-you). */
const SUBMITTED_KEY = 'nss_quote_submitted'
/** localStorage: ISO date the card was last closed. */
const DISMISSED_KEY = 'nss_qp_dismissed_at'
/** sessionStorage: the card has been shown in this tab. */
const SHOWN_KEY = 'nss_qp_shown'
/** sessionStorage: page views in this tab, every page counted. */
const VIEWS_KEY = 'nss_qp_views'

const DAY_MS = 86_400_000
const SUBMITTED_QUIET_DAYS = 90
const DISMISSED_QUIET_DAYS = 14

/** Engaged seconds each trigger waits for. */
const SECOND_PAGE_SETTLE_S = 3
const PRICING_S = 20
const ENGAGED_S = 45
const EXIT_MIN_S = 10
/**
 * Exit intent counts a leave whose last position was this close to the top
 * edge. Chromium reports the pointer's last in-viewport position on the
 * `mouseout` that leaves the document, so a fast flick upward can read as
 * a few pixels, not a negative number.
 */
const EXIT_TOP_PX = 10
/** How often the engaged clock is read against the thresholds. */
const TICK_MS = 1000

export type QuotePromptTrigger = 'second_page' | 'engaged' | 'pricing' | 'exit'

/**
 * /thank-you calls this when a real submission lands. The date, not a flag,
 * so the quiet period can end: a customer from two winters ago is a
 * prospect again.
 */
export function markQuoteSubmitted(): void {
  try {
    localStorage.setItem(SUBMITTED_KEY, new Date().toISOString())
  } catch {
    /* nothing to remember it with; the card fails closed in that browser anyway */
  }
}

/** The clean URL the site serves, whatever the browser was handed. */
function pagePath(): string {
  return window.location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '') || '/'
}

function isPricingPage(): boolean {
  const path = pagePath()
  return path.includes('pricing') || path === '/commercial' || path === '/residential'
}

/**
 * True while the date under `key` is less than `days` old. Throws when
 * storage is blocked — the caller treats that as "do not show".
 *
 * A value that will not parse counts as recent: it was written to say
 * "don't ask", and a parse failure is no reason to ask.
 */
function within(storage: Storage, key: string, days: number): boolean {
  const raw = storage.getItem(key)
  if (!raw) return false
  const at = Date.parse(raw)
  return Number.isNaN(at) || Date.now() - at < days * DAY_MS
}

/**
 * The "don't nag" rules, read fresh each time they are needed — another tab
 * may have closed the card or submitted a quote since this page loaded.
 * Throws when storage is blocked.
 */
function eligible(): boolean {
  if (within(localStorage, SUBMITTED_KEY, SUBMITTED_QUIET_DAYS)) return false
  if (within(localStorage, DISMISSED_KEY, DISMISSED_QUIET_DAYS)) return false
  if (sessionStorage.getItem(SHOWN_KEY)) return false
  if ((readQuoteDraft().address ?? '').trim()) return false
  return true
}

interface Session {
  arm: QuotePromptArm
  /** Page views in this tab, this one included. */
  views: number
}

/**
 * Assign the arm and count this page view. Null when storage is blocked,
 * which is the card's cue to stay hidden.
 */
function openSession(): Session | null {
  const assigned = assignQuotePromptArm()
  if (!assigned) return null
  // The first time a browser gets an arm is the one moment GA4 has to be
  // told; Analytics.astro reads it from storage on every page after this.
  if (assigned.fresh) trackExperimentArms()
  try {
    const views = (Number(sessionStorage.getItem(VIEWS_KEY)) || 0) + 1
    sessionStorage.setItem(VIEWS_KEY, String(views))
    return { arm: assigned.arm, views }
  } catch {
    return null
  }
}

/**
 * Whether either quote form is on screen right now. The hero's mini form
 * (`form[data-quote-mini]` — the homepage renders two, one per header arm,
 * and the hidden one never intersects) and the full form (`#quote-form`).
 * A browser without IntersectionObserver reports "in view" and never
 * shows the card — fail closed, as everywhere else here.
 */
function watchForms(): { inView(): boolean; stop(): void } {
  const forms = document.querySelectorAll('form[data-quote-mini], #quote-form')
  if (forms.length === 0) return { inView: () => false, stop: () => {} }
  if (!('IntersectionObserver' in window)) return { inView: () => true, stop: () => {} }
  const visible = new Set<Element>()
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target)
      else visible.delete(entry.target)
    }
  })
  forms.forEach((form) => observer.observe(form))
  return { inView: () => visible.size > 0, stop: () => observer.disconnect() }
}

/**
 * Engaged time on this page — visible AND focused, with the visitor's own
 * scrolling and typing as a witness when the browser is wrong about focus.
 * The same clock as the visit beacon (lib/visit-beacon.ts); kept separate
 * because the beacon stays silent for DNT and GPC visitors, and those
 * visitors still get asked.
 */
function engagedClock(): { seconds(): number; stop(): void } {
  let engagedMs = 0
  /** performance.now() when the current engaged stretch began; null while paused. */
  let since: number | null = null
  let focused = document.hasFocus()

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
  function interacted(): void {
    focused = true
    clock()
  }
  function blurred(): void {
    focused = false
    clock()
  }
  function shown(): void {
    if (document.visibilityState === 'visible') focused = document.hasFocus()
    clock()
  }

  window.addEventListener('focus', interacted)
  window.addEventListener('blur', blurred)
  window.addEventListener('pointerdown', interacted, { passive: true })
  window.addEventListener('keydown', interacted)
  window.addEventListener('scroll', interacted, { passive: true })
  document.addEventListener('visibilitychange', shown)
  window.addEventListener('pageshow', shown)
  clock()

  return {
    seconds() {
      const running = since === null ? 0 : performance.now() - since
      return (engagedMs + running) / 1000
    },
    stop() {
      window.removeEventListener('focus', interacted)
      window.removeEventListener('blur', blurred)
      window.removeEventListener('pointerdown', interacted)
      window.removeEventListener('keydown', interacted)
      window.removeEventListener('scroll', interacted)
      document.removeEventListener('visibilitychange', shown)
      window.removeEventListener('pageshow', shown)
    },
  }
}

/**
 * Wire the card's controls and reveal it. Wired here, not at load: most
 * page views never get this far, and the autocomplete mints a Places
 * session token it would be a shame to waste.
 */
function show(root: HTMLElement, trigger: QuotePromptTrigger): void {
  const form = root.querySelector<HTMLFormElement>('form')
  const input = root.querySelector<HTMLInputElement>('input[name="address"]')
  const found = root.querySelector<HTMLElement>('[role="listbox"]')
  const closeButton = root.querySelector<HTMLButtonElement>('[data-qp-close]')
  if (!form || !input || !found || !closeButton) return
  // Non-nullable for the key handler below, which loses the narrowing.
  const listbox: HTMLElement = found

  try {
    sessionStorage.setItem(SHOWN_KEY, '1')
  } catch {
    /* checked before we got here; if it fails now the card is already earned */
  }

  attachAddressAutocomplete(input)

  function close(): void {
    root.hidden = true
    root.removeAttribute('data-open')
    document.removeEventListener('keydown', onKeydown, true)
    try {
      localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
    } catch {
      /* the session flag above still keeps it away for this tab */
    }
    trackQuotePromptDismiss()
  }

  // Capture phase, so this sees the suggestions list BEFORE the input's own
  // Escape handler (scripts/quote-form.ts) closes it: with suggestions open,
  // Escape closes them and the card stays; the next Escape closes the card.
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || root.hidden || !listbox.hidden) return
    close()
  }

  closeButton.addEventListener('click', close)
  document.addEventListener('keydown', onKeydown, true)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    // Same handoff as QuoteFormMini: the address rides in the session draft
    // and 'hero' tells the full form to scroll to itself and, on a desktop,
    // put the cursor in the email field — the one question left.
    saveQuoteDraft({ address: input.value.trim(), from: 'hero' })
    trackQuotePromptSubmit()
    // The URL Base.astro prerenders — query-free so the speculation hits.
    window.location.assign('/contact#quote')
  })

  root.hidden = false
  // The reflow commits the card's start position before `data-open` moves
  // it, so the slide actually runs (a same-frame change would be coalesced
  // into a plain appear). Under reduced motion there is no transition and
  // this is just an appear — which is the point.
  void root.offsetHeight
  root.setAttribute('data-open', '')
  trackQuotePromptShown(trigger)
}

/** Arm the triggers on a page that has the card and a visitor in the 'on' arm. */
function armTriggers(root: HTMLElement, session: Session): void {
  const forms = watchForms()
  const clock = engagedClock()
  const pricing = isPricingPage()
  const pointer = window.matchMedia('(pointer: fine)').matches
  const fired = new Set<QuotePromptTrigger>()
  let done = false

  function stop(): void {
    done = true
    window.clearInterval(interval)
    document.removeEventListener('mouseout', onMouseOut)
    forms.stop()
    clock.stop()
  }

  /** One trigger's chance. Spent whether or not the card appears. */
  function attempt(trigger: QuotePromptTrigger): void {
    if (done || fired.has(trigger)) return
    fired.add(trigger)
    try {
      if (!eligible()) {
        stop()
        return
      }
    } catch {
      stop()
      return
    }
    if (forms.inView()) return
    stop()
    show(root, trigger)
  }

  function tick(): void {
    const seconds = clock.seconds()
    if (session.views >= 2 && seconds >= SECOND_PAGE_SETTLE_S) attempt('second_page')
    if (pricing && seconds >= PRICING_S) attempt('pricing')
    if (seconds >= ENGAGED_S) {
      attempt('engaged')
      // The last timed trigger has had its turn; only exit intent is left,
      // and that needs no clock reads.
      if (!done) window.clearInterval(interval)
    }
  }

  // Leaving the document (no element under the pointer on the other side)
  // through the top edge — toward the tab bar, the address bar, the back
  // button. Exit intent is not a one-shot: a visitor who left through the
  // top while the form was on screen may leave again later.
  function onMouseOut(event: MouseEvent): void {
    if (event.relatedTarget || event.clientY > EXIT_TOP_PX) return
    if (clock.seconds() < EXIT_MIN_S) return
    if (done) return
    fired.delete('exit')
    attempt('exit')
  }

  const interval = window.setInterval(tick, TICK_MS)
  if (pointer) document.addEventListener('mouseout', onMouseOut)
}

/**
 * Start the prompt for this page. Runs from Base.astro on every page: the
 * arm assignment and the session's page count happen everywhere, and the
 * card is wired only where Base.astro rendered one. A failure anywhere in
 * here is swallowed — an ask never breaks a page.
 */
export function initQuotePrompt(): void {
  onActivated(() => {
    try {
      if (BOT_UA.test(navigator.userAgent)) return
      const session = openSession()
      const root = document.getElementById('quote-prompt')
      if (!session || !root || session.arm !== 'on') return
      // The rules are checked again the moment a trigger fires; this early
      // read just spares an ineligible page the listeners.
      if (!eligible()) return
      armTriggers(root, session)
    } catch {
      /* storage blocked, or something stranger — the card stays hidden */
    }
  })
}
