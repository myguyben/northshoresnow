/**
 * Site A/B tests.
 *
 * The homepage header test (2026-09-23 to 2026-10-19) is OVER. Ben,
 * 2026-10-19: "lets stick with header b as a is not converting well." The
 * old header is now the only one (index.astro), and nothing assigns,
 * stores or reports a header arm any more. Leads from before the change
 * still carry "home-hero:a|b" in Icey's source_detail.experiment.
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
 * paint, so it has no reason to run in the head.
 * 50/50, sticky per browser (localStorage), `?qp=on` / `?qp=off` forces an
 * arm for checking. Crawlers are 'off' and nothing is stored for them; a
 * browser that refuses storage gets no arm at all — the card fails closed
 * without the storage its "don't nag" rules live in.
 *
 * MEASUREMENT: experimentFields() puts the arm in the lead's `experiment`
 * string (and the visit beacon's), and GA4 gets a `quote_prompt` user
 * property plus the parameter on every custom event (lib/analytics.ts). The
 * lead count per arm decides it.
 */

export const QUOTE_PROMPT_EXPERIMENT = 'quote-prompt'
export const QUOTE_PROMPT_STORAGE_KEY = 'nss_exp_quote_prompt'
export type QuotePromptArm = 'on' | 'off'

/**
 * Crawlers, Lighthouse and headless browsers: never in a test. Same rule as
 * the visit beacon (lib/visit-beacon.ts); keep the two in step.
 */
export const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless/i

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
 * `{ experiment: "quote-prompt:on" }` — or nothing at all.
 *
 * One string, comma-separated, because the lead's `experiment` field is a
 * single string (80 characters) on Icey's side. The header test used to
 * share it ("home-hero:b,quote-prompt:on"); a future test joins the list
 * the same way.
 */
export function experimentFields(): Record<string, string> {
  const arms = [[QUOTE_PROMPT_EXPERIMENT, quotePromptArm()]]
    .filter(([, arm]) => arm)
    .map(([name, arm]) => `${name}:${arm}`)
  return arms.length ? { experiment: arms.join(',') } : {}
}
