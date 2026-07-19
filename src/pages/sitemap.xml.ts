import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { SITE } from '../lib/site'

/**
 * Custom sitemap endpoint at the exact /sitemap.xml URL Search Console already
 * knows (the @astrojs/sitemap integration would emit sitemap-index.xml).
 */

const STATIC_ROUTES = [
  '',
  'about',
  'services',
  'contact',
  'areas',
  'service-areas',
  'blog',
  'sitemap',
  'privacy',
  'terms',
]

export const GET: APIRoute = async () => {
  const [services, areas, industries, blog] = await Promise.all([
    getCollection('services'),
    getCollection('areas'),
    getCollection('industries'),
    getCollection('blog'),
  ])

  const buildDate = new Date().toISOString().slice(0, 10)
  const entries: Array<{ path: string; lastmod: string }> = [
    ...STATIC_ROUTES.map((route) => ({ path: route ? `/${route}` : '/', lastmod: buildDate })),
    ...services.map((entry) => ({ path: `/${entry.id}`, lastmod: buildDate })),
    ...areas.map((entry) => ({ path: `/${entry.id}`, lastmod: buildDate })),
    ...industries.map((entry) => ({ path: `/${entry.id}`, lastmod: buildDate })),
    ...blog.map((entry) => ({
      path: `/blog/${entry.id}`,
      lastmod: entry.data.updated.toISOString().slice(0, 10),
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${SITE.url}${entry.path === '/' ? '' : entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
