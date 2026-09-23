/**
 * The homepage header A/B test. Ben, 2026-09-23.
 *
 *   A — the new header: "See what your property costs before anyone calls
 *       you back." Instant price range, then the measured quote by email.
 *   B — the old header, exactly as it was on the live site before the
 *       overhaul: "Snow cleared before business hours. Every storm.
 *       Guaranteed." with its stat bar. Ben chose to test it verbatim,
 *       stats included.
 *
 * Everything below the header is the new site in both arms, and both forms
 * hand off to the same /contact form, so the header is the only difference.
 *
 * ASSIGNMENT happens in an inline script in the homepage <head> (index.astro),
 * before first paint, so nobody sees one header swap for the other. It is
 * 50/50, sticky per browser (localStorage), and `?hero=a` / `?hero=b` forces
 * an arm for checking either one. Crawlers always get A.
 *
 * MEASUREMENT, two ways:
 *   - every lead carries `experiment: "home-hero:a|b"` into Icey
 *     (source_detail + the lead's internal attribution block), which is the
 *     number that decides the test;
 *   - GA4, when configured, gets a `home_hero` user property on every page
 *     and an `experiment_view` event on the homepage, for the denominator.
 *
 * Keep these names in step with the inline scripts in index.astro and
 * Analytics.astro, which cannot import this module.
 */

export const HERO_EXPERIMENT = 'home-hero'
export const HERO_STORAGE_KEY = 'nss_exp_home_hero'
export type HeroVariant = 'a' | 'b'

/** The arm this browser was assigned, or null if it never saw the homepage. */
export function heroVariant(): HeroVariant | null {
  try {
    const v = localStorage.getItem(HERO_STORAGE_KEY)
    return v === 'a' || v === 'b' ? v : null
  } catch {
    return null
  }
}

/** Lead fields for Icey: `{ experiment: "home-hero:b" }`, or nothing. */
export function experimentFields(): Record<string, string> {
  const v = heroVariant()
  return v ? { experiment: `${HERO_EXPERIMENT}:${v}` } : {}
}
