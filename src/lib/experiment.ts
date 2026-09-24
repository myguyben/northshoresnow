/**
 * The homepage header A/B test. Ben, 2026-09-23.
 *
 *   A — the new header: "See what your property costs before anyone calls
 *       you back." Instant price range, then the measured quote by email.
 *   B — the old header from the live site before the overhaul: "Snow
 *       cleared before business hours. Every storm. Guaranteed." with its
 *       stat bar (Ben chose to keep the stats). Trimmed the same day on his
 *       word: no buttons, and the eyebrow reads "Snow & ice management ·
 *       Greater Vancouver" like arm A.
 *
 * Everything below the header is the new site in both arms, and both forms
 * hand off to the same /contact form, so the header is the only difference.
 *
 * ASSIGNMENT happens in an inline script in the homepage <head> (index.astro,
 * in Base.astro's head-first slot): before first paint, so nobody sees one
 * header swap for the other, and before the analytics tags, so the first
 * page_view already carries the arm. It is 50/50, sticky per browser
 * (localStorage), and `?hero=a` / `?hero=b` forces an arm for checking
 * either one. Crawlers always get A.
 *
 * MEASUREMENT, three ways:
 *   - every lead carries `experiment: "home-hero:a|b"` into Icey
 *     (source_detail + the lead's internal attribution block), which is the
 *     number that decides the test;
 *   - GA4, when configured, gets a `home_hero` user property on every page,
 *     an `experiment_view` event on the homepage for the denominator, and
 *     `home_hero` as a parameter on every custom event (lib/analytics.ts) so
 *     scroll depth, CTA clicks and the quote funnel split by arm too;
 *   - the visit beacon (lib/visit-beacon.ts) sends the same
 *     `experiment: "home-hero:a|b"` with every page view.
 *
 * Keep these names in step with the inline scripts in index.astro and
 * Analytics.astro, which cannot import this module.
 *
 * ---
 *
 * The quote-prompt test. Ben, 2026-09-23: "we want to ask for quotes for
 * people who just visit the site but don't fill anything out."
 *
 *   on  — the corner card (components/QuotePrompt.astro) may appear once
 *         the visitor has shown some interest; scripts/quote-prompt.ts has
 *         the rules.
 *   off — the card never appears. The site as it was.
 *
 * ASSIGNMENT is client-side, after activation (scripts/quote-prompt.ts calls
 * assignQuotePromptArm below): nothing about the arm is visible at first
 * paint, so unlike the header test it has no reason to run in the head.
 * 50/50, sticky per browser (localStorage), `?qp=on` / `?qp=off` forces an
 * arm for checking. Crawlers are 'off' and nothing is stored for them; a
 * browser that refuses storage gets no arm at all — the card fails closed
 * without the storage its "don't nag" rules live in.
 *
 * MEASUREMENT rides on the same three channels as the header test:
 * experimentFields() names BOTH arms in the one `experiment` string, and
 * GA4 gets a `quote_prompt` user property plus the parameter on every
 * custom event (lib/analytics.ts). The lead count per arm decides it.
 */

export const HERO_EXPERIMENT = 'home-hero'
export const HERO_STORAGE_KEY = 'nss_exp_home_hero'
export type HeroVariant = 'a' | 'b'

export const QUOTE_PROMPT_EXPERIMENT = 'quote-prompt'
export const QUOTE_PROMPT_STORAGE_KEY = 'nss_exp_quote_prompt'
export type QuotePromptArm = 'on' | 'off'

/**
 * Crawlers, Lighthouse and headless browsers: never in a test. Same rule as
 * the header test's inline script in index.astro and the visit beacon
 * (lib/visit-beacon.ts); keep the three in step.
 */
export const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless/i

/** The arm this browser was assigned, or null if it never saw the homepage. */
export function heroVariant(): HeroVariant | null {
  try {
    const v = localStorage.getItem(HERO_STORAGE_KEY)
    return v === 'a' || v === 'b' ? v : null
  } catch {
    return null
  }
}

/** The quote-prompt arm this browser holds, or null if none was assigned. */
export function quotePromptArm(): QuotePromptArm | null {
  try {
    const v = localStorage.getItem(QUOTE_PROMPT_STORAGE_KEY)
    return v === 'on' || v === 'off' ? v : null
  } catch {
    return null
  }
}

/**
 * Assign (or re-read) this browser's quote-prompt arm.
 *
 * `fresh` is true the first time a browser gets an arm — that is the one
 * moment the GA4 user property has to be set (lib/analytics.ts). Null when
 * storage is blocked: an arm that cannot be kept is not an arm, and the
 * caller must treat it as 'off'.
 */
export function assignQuotePromptArm(): { arm: QuotePromptArm; fresh: boolean } | null {
  if (BOT_UA.test(navigator.userAgent)) return { arm: 'off', fresh: false }
  try {
    const forced = new URLSearchParams(location.search).get('qp')
    const stored = quotePromptArm()
    const arm: QuotePromptArm =
      forced === 'on' || forced === 'off' ? forced : (stored ?? (Math.random() < 0.5 ? 'on' : 'off'))
    if (arm !== stored) localStorage.setItem(QUOTE_PROMPT_STORAGE_KEY, arm)
    return { arm, fresh: arm !== stored }
  } catch {
    return null
  }
}

/**
 * Lead field for Icey: every test this browser is in, as ONE string —
 * `{ experiment: "home-hero:b,quote-prompt:on" }` — or nothing at all.
 *
 * One string, comma-separated, because the lead's `experiment` field is a
 * single string (80 characters) on Icey's side and a second test did not
 * earn a second column. A browser that has only seen one test reports only
 * that one, exactly as before, so nothing that already parses
 * "home-hero:b" changes.
 */
export function experimentFields(): Record<string, string> {
  const arms = [
    [HERO_EXPERIMENT, heroVariant()],
    [QUOTE_PROMPT_EXPERIMENT, quotePromptArm()],
  ]
    .filter(([, arm]) => arm)
    .map(([name, arm]) => `${name}:${arm}`)
  return arms.length ? { experiment: arms.join(',') } : {}
}
