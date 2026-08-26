/**
 * Quote-form draft, held for the tab's lifetime.
 *
 * Two jobs:
 *
 * 1. HANDOFF — the hero's mini form (address + email) writes a draft and
 *    navigates to /contact#quote, where the full form reads it. This used to
 *    travel as a query string, which defeated the whole point of prerendering
 *    /contact: the HTTP cache keys on the query, so `/contact?address=…`
 *    never matched the speculation rule and every hero submit paid for a
 *    fresh page load.
 *
 * 2. RESUME — the full form saves as the visitor types. Wandering off to read
 *    the pricing page, or hitting back after a mis-tap, no longer means
 *    re-typing an address. Half-filled forms are the single biggest silent
 *    leak on a quote page.
 *
 * sessionStorage, not localStorage: this is one visit's work in progress, not
 * a profile, and it should not survive the tab closing.
 */

const KEY = 'nss_quote_draft'

export interface QuoteDraft {
  name?: string
  phone?: string
  email?: string
  address?: string
  propertyType?: string
  scope?: string
  /** 'hero' means the mini form started this — the full form scrolls to itself. */
  from?: 'hero' | 'form'
}

export function readQuoteDraft(): QuoteDraft {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QuoteDraft) : {}
  } catch {
    return {}
  }
}

/** Merge `patch` into the stored draft. Best-effort; storage may be blocked. */
export function saveQuoteDraft(patch: QuoteDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readQuoteDraft(), ...patch }))
  } catch {
    /* private mode / storage disabled — the form just doesn't resume */
  }
}

export function clearQuoteDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
