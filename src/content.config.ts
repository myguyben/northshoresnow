import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const faq = z.object({ q: z.string(), a: z.string() })

const services = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/services' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    hero: z.string(),
    order: z.number(),
    features: z.array(z.object({ title: z.string(), body: z.string() })),
    faqs: z.array(faq),
    photo: z.string().optional(),
  }),
})

const areas = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/areas' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    hero: z.string(),
    /** Hub pages (areas, service-areas) don't render via [slug].astro. */
    neighborhoods: z.array(z.string()),
    landmarks: z.array(z.string()).default([]),
    terrainNote: z.string(),
    faqs: z.array(faq),
    siblings: z.array(z.string()).default([]),
  }),
})

const industries = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/industries' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    hero: z.string(),
    painPoints: z.array(z.object({ title: z.string(), body: z.string() })),
    faqs: z.array(faq).default([]),
    /**
     * Google reviews are homeowner proof. Ben, 2026-09-20: a commercial
     * buyer is persuaded by the client logos in the marquee, not by consumer
     * star ratings, so the review wall appears on /residential only.
     */
    showTestimonials: z.boolean().default(false),
  }),
})

/**
 * SERVICE × LOCATION pages — "strata snow removal in Burnaby".
 *
 * The area collection answers `service + city` ("snow removal north
 * vancouver"), which is the ONE query shape we ranked for out of eight
 * tested. We were absent from every service-qualified variant — strata,
 * commercial, parking lot — because an area page written around local
 * freeze-thaw is a PLACE page, and those queries want a different page.
 *
 * Two competitors run this matrix already: SnowMasters with 21 city pages,
 * Burnaby Blacktop with a 52-URL city × service grid.
 *
 * ⚠️ THESE MUST STAY GENUINELY BESPOKE. The 15 area pages measure 10.8%
 * shared sentences against each other, and that is why they are not treated
 * as doorway pages. A templated matrix layered on top would put the whole
 * cluster at risk. Every page here is written from a real local fact — the
 * municipal bylaw and its actual deadline, the built form, the specific
 * hazard — and if there is nothing true and particular to say about a
 * city × service pair, DO NOT ADD THE PAGE.
 */
const locations = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/locations' }),
  schema: z.object({
    /** Which buyer this page is written for. */
    segment: z.enum(['strata', 'commercial']),
    city: z.string(),
    /** Slug of the matching area page, for the cross-link. */
    citySlug: z.string(),
    title: z.string(),
    description: z.string(),
    hero: z.string(),
    /** The municipal clearing obligation, in this city's own terms. */
    bylaw: z.object({ rule: z.string(), source: z.string() }),
    /** What is actually hard here, for this buyer. Not generic copy. */
    challenges: z.array(z.object({ title: z.string(), body: z.string() })),
    faqs: z.array(faq),
  }),
})

const blog = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    readingMinutes: z.number(),
    tags: z.array(z.string()).default([]),
  }),
})

export const collections = { services, areas, industries, locations, blog }
