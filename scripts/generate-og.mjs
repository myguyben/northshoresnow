/**
 * Generates 1200x630 OG images (photo + ink gradient + wordmark) and favicons
 * from the brand/photo assets. Rerun whenever source photos change.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const photos = `${root}src/assets/photos`
const out = `${root}public/og`
await mkdir(out, { recursive: true })

const overlay = (label) => Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0A1420" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#0A1420" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="64" y="452" width="72" height="6" rx="3" fill="#63C9F5"/>
  <text x="64" y="512" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800" fill="#FFFFFF">North Shore Snow</text>
  <text x="64" y="562" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500" fill="#A5E3FF">${label}</text>
</svg>`)

const variants = [
  ['default', 'nss-01.jpg', 'Commercial Snow &amp; Ice Management · North Vancouver'],
  ['service', 'nss-04.jpg', 'Snow Removal · Plowing · Salting · De-Icing'],
  ['area', 'north-vancouver.jpg', 'Serving the North Shore &amp; Greater Vancouver'],
  ['industry', 'nss-06.jpg', 'Strata · Property Managers · Commercial'],
  ['blog', 'nss-07.jpg', 'Winter Operations Insights'],
]

for (const [name, photo, label] of variants) {
  await sharp(`${photos}/${photo}`)
    .resize(1200, 630, { fit: 'cover' })
    .composite([{ input: overlay(label) }])
    .jpeg({ quality: 82 })
    .toFile(`${out}/${name}.jpg`)
  console.log(`og/${name}.jpg`)
}

// Favicons from the brand logo.
const logo = `${root}src/assets/brand/nss-logo.png`
await sharp(logo).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${root}public/favicon.png`)
await sharp(logo).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${root}public/apple-touch-icon.png`)
console.log('favicon.png + apple-touch-icon.png')
