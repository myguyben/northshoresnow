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

export const collections = { services, areas, industries, blog }
