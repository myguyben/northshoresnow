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
        const content = `${rules.join('\n')}\n`
        await writeFile(join(outDir, '_redirects'), content, 'utf8')
        logger.info(`wrote _redirects with ${rules.length} clean-URL rules`)
      },
    },
  }
}
