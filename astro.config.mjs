// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'
import renderRedirects from './integrations/render-redirects.mjs'

// build.format 'file' emits foo.html (not foo/index.html) so every URL from
// the previous Webflow-export site keeps working unchanged on Render.
export default defineConfig({
  site: 'https://northshoresnow.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [mdx(), renderRedirects()],
  vite: {
    plugins: [tailwindcss()],
  },
})
