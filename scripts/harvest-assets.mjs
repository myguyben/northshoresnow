/**
 * One-time migration helper: pull every Webflow-CDN asset referenced by the
 * legacy export into the repo so the rebuilt site has no external asset
 * dependencies. Safe to re-run; skips files that already exist.
 */
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const LEGACY = new URL('../legacy/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
const OUT = new URL('../harvest/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')

const urlPattern = /https:\/\/cdn\.prod\.website-files\.com\/[^\s"'()<>]+/g

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(path)
    else if (entry.name.endsWith('.html') || entry.name.endsWith('.css')) yield path
  }
}

const urls = new Set()
for await (const file of htmlFiles(LEGACY)) {
  const html = await readFile(file, 'utf8')
  for (const match of html.matchAll(urlPattern)) {
    // Strip trailing punctuation that regex may capture from srcset/CSS.
    urls.add(match[0].replace(/[,)]+$/, ''))
  }
}

console.log(`Found ${urls.size} unique CDN URLs`)
await mkdir(OUT, { recursive: true })

let ok = 0
let failed = 0
for (const url of urls) {
  const name = decodeURIComponent(url.split('/').pop() ?? '')
  if (!name || !extname(name)) continue
  const dest = join(OUT, name)
  try {
    await stat(dest)
    ok++
    continue // already downloaded
  } catch {
    /* not yet downloaded */
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
    ok++
    console.log(`ok  ${name}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${url}: ${error.message}`)
  }
}
console.log(`Done: ${ok} saved/existing, ${failed} failed`)
