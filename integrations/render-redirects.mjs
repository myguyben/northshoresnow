import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * Render static sites don't rewrite /foo → /foo.html on their own — the old
 * site shipped a hand-maintained `_redirects` file for that. This integration
 * regenerates it from the actual built page list, so a page can never be
 * published without its clean-URL rule.
 *
 * Deliberately NO `/* /index.html 200` catch-all (the old file had one): it
 * soft-404'd every bad URL. Unmatched paths now fall through to 404.html.
 */
/**
 * ⚠️ RENDER DOES NOT READ THIS FILE. Proven on production 2026-09-20: the
 * built `_redirects` deploys and serves as plain text at /_redirects with a
 * 200, and every rule in it is ignored — /privacy-policy still returned 404
 * with its 301 sitting right there in the file. Same trap as `_headers`,
 * which turned out to be configured on the SERVICE, not from the repo.
 * Render serves clean URLs (/about → about.html) natively, which is why the
 * 200 rules below appeared to work and nobody noticed.
 *
 * The file is kept because it documents intent and would work unchanged on
 * Netlify or Cloudflare Pages. The redirects that ACTUALLY run are static
 * stub pages — see src/components/LegacyRedirect.astro. Fix properly by
 * setting Redirect/Rewrite rules on the Render service (the Render MCP has
 * no tool for it; needs the dashboard or the REST API).
 *
 * Dead URLs Google still has in its index, and where they should land.
 *
 * Source: Search Console ▸ Page indexing ▸ "Not found (404)", 2026-09-20 —
 * nine URLs, first detected 2025-08-30 and still 404ing a year later. Two of
 * the nine are subdomains (outreach., url8483.) that this site cannot answer
 * for; the rest are the Webflow-era paths the 2026 Astro rebuild renamed
 * without leaving a trail.
 *
 * Each one is a real entry point Google is holding open and we are slamming
 * shut. A 301 keeps whatever authority the old URL earned and stops the
 * visitor hitting a dead end. Targets are the closest honest match, never a
 * blanket redirect to the homepage — Google treats that as a soft 404.
 */
const LEGACY_REDIRECTS = [
  // Renamed in the rebuild: shorter slugs, no forwarding address left.
  ['/privacy-policy', '/privacy'],
  ['/terms-conditions', '/terms'],
  // Webflow published the blog under /post/*; the rebuild moved it to /blog/*.
  [
    '/post/comprehensive-snow-removal-and-de-icing-ensuring-safety-and-accessibility-throughout-winter-on-vancouvers-north-shore',
    '/blog/commercial-snow-removal-north-vancouver',
  ],
  [
    '/post/winter-ready-your-comprehensive-guide-to-snow-removal-and-ice-management-on-the-north-shore',
    '/blog/commercial-snow-response-plan-checklist',
  ],
  ['/post/vancouver-snow-removal-black-ice-protocol-north-shore-snow', '/de-icing'],
  ['/post/expert-snow-removal-de-icing-services-for-vancouvers-north-shore', '/services'],
  // Anything else under the old blog prefix lands on the blog index rather
  // than 404. Listed last so the specific rules above win.
  ['/post/*', '/blog'],
]

export default function renderRedirects() {
  return {
    name: 'render-redirects',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        const outDir = fileURLToPath(dir)
        const rules = []
        for (const page of pages) {
          // page.pathname examples with format:'file' → '', 'about', 'blog/foo'
          const route = page.pathname.replace(/\/+$/, '')
          if (route === '' || route === '404') continue
          rules.push(`/${route} /${route}.html 200`)
        }
        rules.sort()
        // 301s FIRST: Render takes the first matching rule, and a legacy path
        // must win before any clean-URL rewrite can claim it.
        const legacy = LEGACY_REDIRECTS.map(([from, to]) => `${from} ${to} 301`)
        const content = `${[...legacy, ...rules].join('\n')}\n`
        await writeFile(join(outDir, '_redirects'), content, 'utf8')
        logger.info(
          `wrote _redirects with ${legacy.length} legacy 301s + ${rules.length} clean-URL rules`
        )
      },
    },
  }
}
