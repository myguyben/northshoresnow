/**
 * Speculation-rules helpers.
 *
 * The site prerenders /contact#quote from every other page (see Base.astro),
 * so the quote form is fully built and painted before the visitor clicks
 * "Get a Quote" — the navigation is then an instant swap rather than a
 * round-trip to Cloudflare plus a parse.
 *
 * The catch: a prerendered document runs its scripts BEFORE the click, in a
 * hidden page that may never be activated (or may be activated minutes
 * later). Anything that measures a visit, or reads state the previous page
 * writes on its way out, has to wait for activation instead of running at
 * load. That is what `onActivated` is for.
 */

/** True while this document is a prerender that has not been navigated to. */
export function isPrerendering(): boolean {
  return (document as Document & { prerendering?: boolean }).prerendering === true
}

/**
 * Run `fn` now, or — if this document is still a prerender — the moment the
 * visitor actually navigates to it. Never runs at all if the prerendered
 * page is discarded, which is exactly what a pageview beacon should do.
 */
export function onActivated(fn: () => void): void {
  if (isPrerendering()) {
    document.addEventListener('prerenderingchange', fn, { once: true })
  } else {
    fn()
  }
}
