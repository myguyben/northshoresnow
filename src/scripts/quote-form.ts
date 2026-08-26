/** Client logic for the quote form (QuoteForm.astro) and the address
 * autocomplete shared with QuoteFormMini.astro. */

import { attributionFields, stashPendingLead } from '../lib/analytics'
import { onActivated } from '../lib/prerender'
import {
  clearQuoteDraft,
  readQuoteDraft,
  saveQuoteDraft,
  type QuoteDraft,
} from '../lib/quote-draft'

// website-estimate = website-lead (same pipeline, same dedupe, same AI quote
// by email) PLUS an instant price range in the response, rendered on
// /thank-you. Falling back to website-lead just means no instant number.
const ENDPOINT =
  import.meta.env.PUBLIC_QUOTE_ENDPOINT ?? 'https://iceysoftware.com/api/inbound/website-estimate'
const AUTOCOMPLETE_ENDPOINT = ENDPOINT.replace(
  /\/website-(lead|estimate)$/,
  '/address-autocomplete'
)
const PARTIAL_ENDPOINT = ENDPOINT.replace(/\/website-(lead|estimate)$/, '/website-partial')
const ATTACHMENT_ENDPOINT = ENDPOINT.replace(/\/website-(lead|estimate)$/, '/website-attachment')
/** Server enforces the same cap; checking here saves a doomed upload. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_ATTACHMENTS = 2
const CONTACT_EMAIL = 'Quotes@northshoresnow.com'
/** Bias suggestions toward the North Shore / Greater Vancouver. */
const LOCATION_BIAS = '49.32,-123.07'

interface Suggestion {
  description: string
  mainText: string
  secondaryText: string
}

/**
 * Wire Google-Places-backed address suggestions (via the Icey proxy — the
 * key stays server-side) onto a text input. The input must sit inside a
 * `position: relative` wrapper containing a `[role="listbox"]` <ul>.
 * Degrades silently to a plain text input if the endpoint is unreachable.
 */
export function attachAddressAutocomplete(input: HTMLInputElement): void {
  const wrapper = input.closest('[data-address-autocomplete]')
  const found = wrapper?.querySelector<HTMLUListElement>('[role="listbox"]')
  if (!found) return
  // Re-declared with a non-nullable type: control-flow narrowing is lost
  // inside the nested functions below, and every one of them uses it.
  const listbox: HTMLUListElement = found

  // One Places session per address entry — renewed after each selection.
  let sessionToken = crypto.randomUUID()
  let debounceTimer: number | undefined
  let inflight: AbortController | null = null
  let suggestions: Suggestion[] = []
  let activeIndex = -1

  function close(): void {
    listbox.hidden = true
    listbox.innerHTML = ''
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
    suggestions = []
    activeIndex = -1
  }

  function select(index: number): void {
    const suggestion = suggestions[index]
    if (!suggestion) return
    input.value = suggestion.description
    sessionToken = crypto.randomUUID()
    close()
  }

  function highlight(index: number): void {
    activeIndex = index
    listbox.querySelectorAll('[role="option"]').forEach((el, i) => {
      el.setAttribute('aria-selected', String(i === index))
      el.classList.toggle('is-active', i === index)
    })
    const active = listbox.querySelectorAll('[role="option"]')[index]
    if (active) input.setAttribute('aria-activedescendant', active.id)
  }

  function render(): void {
    listbox.innerHTML = ''
    suggestions.forEach((suggestion, i) => {
      const li = document.createElement('li')
      li.id = `${input.id}-option-${i}`
      li.setAttribute('role', 'option')
      li.setAttribute('aria-selected', 'false')
      li.className = 'address-option'
      const main = document.createElement('span')
      main.className = 'address-option-main'
      main.textContent = suggestion.mainText
      const secondary = document.createElement('span')
      secondary.className = 'address-option-secondary'
      secondary.textContent = suggestion.secondaryText
      li.append(main, secondary)
      // mousedown beats the input's blur, so the click still lands.
      li.addEventListener('mousedown', (event) => {
        event.preventDefault()
        select(i)
      })
      li.addEventListener('mousemove', () => highlight(i))
      listbox.append(li)
    })
    // Required attribution when showing Places suggestions without a map.
    const footer = document.createElement('li')
    footer.className = 'address-listbox-footer'
    footer.setAttribute('aria-hidden', 'true')
    footer.textContent = 'powered by Google'
    listbox.append(footer)
    listbox.hidden = false
    input.setAttribute('aria-expanded', 'true')
    activeIndex = -1
  }

  async function fetchSuggestions(query: string): Promise<void> {
    inflight?.abort()
    inflight = new AbortController()
    try {
      const url = new URL(AUTOCOMPLETE_ENDPOINT)
      url.searchParams.set('q', query)
      url.searchParams.set('session', sessionToken)
      url.searchParams.set('bias', LOCATION_BIAS)
      const response = await fetch(url, { signal: inflight.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = (await response.json()) as { data?: { suggestions?: Suggestion[] } }
      suggestions = payload.data?.suggestions ?? []
      if (suggestions.length && document.activeElement === input) render()
      else close()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) close()
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(debounceTimer)
    const query = input.value.trim()
    if (query.length < 3) {
      close()
      return
    }
    debounceTimer = window.setTimeout(() => void fetchSuggestions(query), 250)
  })

  input.addEventListener('keydown', (event) => {
    if (listbox.hidden) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      highlight(Math.min(activeIndex + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      highlight(Math.max(activeIndex - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      select(activeIndex)
    } else if (event.key === 'Escape') {
      close()
    }
  })

  input.addEventListener('blur', () => close())
}


/* ------------------------------------------------------------------ *
 * Inline validation
 * ------------------------------------------------------------------ */

const REQUIRED_FIELDS = ['address', 'email', 'scope'] as const
type RequiredField = (typeof REQUIRED_FIELDS)[number]

/** Shown when the field is empty. */
const EMPTY_MESSAGE: Record<RequiredField, string> = {
  address: 'Enter the property address — that address is what we measure.',
  email: 'Enter an email so we can send the quote.',
  scope: 'Tell us what to clear — one sentence is plenty.',
}

/** Shown when there is something in the field but it can't be used. */
const INVALID_MESSAGE: Record<RequiredField, string> = {
  address: 'That looks too short — include the street number.',
  email: "That email doesn't look right — check for a typo.",
  scope: 'A few more words, please — "the driveway and front walk" is enough.',
}

/**
 * Mail domains a typo lands one or two keystrokes away from.
 *
 * A misspelled domain is the worst possible failure on this form: the lead is
 * captured, the crew measures the property, the quote is emailed — and it
 * bounces into nothing. Suggesting (never silently correcting) costs one line
 * of UI and saves the whole job.
 */
const COMMON_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'yahoo.ca',
  'icloud.com',
  'me.com',
  'live.com',
  'live.ca',
  'aol.com',
  'protonmail.com',
  'shaw.ca',
  'telus.net',
  'sympatico.ca',
]

/**
 * Damerau-Levenshtein (optimal string alignment), not plain Levenshtein.
 *
 * The difference matters here: the single most common email typo is a
 * transposition — gmial.com, hotmial.com — which plain Levenshtein scores as
 * two edits and a distance-1 threshold therefore misses entirely.
 */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[rows - 1][cols - 1]
}

/** The corrected address to offer, or null when the domain looks intentional. */
export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain || COMMON_DOMAINS.includes(domain)) return null
  for (const candidate of COMMON_DOMAINS) {
    // Two edits only for the longer domains, where a 1-in-9 slip is still
    // far likelier than a real domain that close to a mass-market one.
    const tolerance = candidate.length >= 10 ? 2 : 1
    if (editDistance(domain, candidate) <= tolerance) return `${local}@${candidate}`
  }
  return null
}

/** Run `fn` after the load event, when the browser is done with the URL fragment. */
function afterLoad(fn: () => void): void {
  if (document.readyState === 'complete') {
    requestAnimationFrame(fn)
    return
  }
  window.addEventListener('load', () => requestAnimationFrame(fn), { once: true })
}

export function setupQuoteForm(): void {
  const formElement = document.getElementById('quote-form') as HTMLFormElement | null
  if (!formElement) return
  // Same reason as `listbox` above — the closures need a non-nullable type,
  // not a narrowed one.
  const form: HTMLFormElement = formElement

  const submitButton = document.getElementById('qf-submit') as HTMLButtonElement
  const submitLabel = document.getElementById('qf-submit-label') as HTMLElement
  const spinner = document.getElementById('qf-spinner') as HTMLElement
  const errorPanel = document.getElementById('qf-error') as HTMLElement
  const mailtoLink = document.getElementById('qf-mailto') as HTMLAnchorElement
  const addressInput = form.elements.namedItem('address') as HTMLInputElement
  const emailField = form.elements.namedItem('email') as HTMLInputElement
  const scopeField = form.elements.namedItem('scope') as HTMLTextAreaElement
  const propertyTypeSelect = form.elements.namedItem('propertyType') as HTMLSelectElement | null

  const submissionId = crypto.randomUUID()

  attachAddressAutocomplete(addressInput)

  /* ——— Inline field errors ——— */

  function fieldOf(name: RequiredField): HTMLInputElement | HTMLTextAreaElement {
    return form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement
  }

  function setFieldError(name: RequiredField, message: string | null): void {
    const field = fieldOf(name)
    const slot = document.getElementById(`qf-${name}-error`)
    field.setAttribute('aria-invalid', message ? 'true' : 'false')
    if (!slot) return
    slot.textContent = message ?? ''
    slot.hidden = !message
  }

  /** Validate one field and render (or clear) its message. */
  function validateField(name: RequiredField): boolean {
    const field = fieldOf(name)
    const value = field.value.trim()
    if (!value) {
      setFieldError(name, EMPTY_MESSAGE[name])
      return false
    }
    if (!field.checkValidity()) {
      setFieldError(name, INVALID_MESSAGE[name])
      return false
    }
    setFieldError(name, null)
    return true
  }

  for (const name of REQUIRED_FIELDS) {
    const field = fieldOf(name)
    // Blur validates only what was actually touched — nagging someone for
    // tabbing through an empty field is how a form loses people.
    field.addEventListener('blur', () => {
      if (field.value.trim()) validateField(name)
    })
    // Once a field is showing an error, correct it live rather than making
    // the visitor submit again to find out whether they fixed it.
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name)
    })
  }

  /* ——— Email typo suggestion ——— */

  const emailSuggestion = document.getElementById('qf-email-suggestion') as HTMLElement | null
  const emailFixButton = document.getElementById('qf-email-fix') as HTMLButtonElement | null

  function offerEmailFix(): void {
    if (!emailSuggestion || !emailFixButton) return
    const value = emailField.value.trim()
    const fix = emailField.checkValidity() && value ? suggestEmailFix(value) : null
    emailFixButton.textContent = fix ?? ''
    emailSuggestion.hidden = !fix
  }

  emailField.addEventListener('blur', offerEmailFix)
  emailField.addEventListener('input', () => {
    if (emailSuggestion) emailSuggestion.hidden = true
  })
  emailFixButton?.addEventListener('click', () => {
    emailField.value = emailFixButton.textContent ?? emailField.value
    if (emailSuggestion) emailSuggestion.hidden = true
    validateField('email')
    saveDraft()
    emailField.focus()
  })

  /* ——— Draft: prefill in, save as they type ——— */

  const draftFields = ['name', 'phone', 'email', 'address', 'propertyType', 'scope'] as const

  function saveDraft(): void {
    const data = new FormData(form)
    const draft: QuoteDraft = { from: 'form' }
    for (const name of draftFields) {
      draft[name] = String(data.get(name) ?? '').trim()
    }
    saveQuoteDraft(draft)
  }

  let draftTimer: number | undefined
  function queueDraftSave(): void {
    window.clearTimeout(draftTimer)
    draftTimer = window.setTimeout(saveDraft, 400)
  }
  form.addEventListener('input', queueDraftSave)
  propertyTypeSelect?.addEventListener('change', saveDraft)

  /**
   * Everything that reads where the visitor came from waits for activation.
   *
   * /contact is prerendered from every other page, so this module runs long
   * before the click — at which point the hero's mini form has not written
   * its handoff yet, and the URL is not the one the visitor will arrive on.
   * Reading either at load time would prefill nothing and scroll nowhere.
   */
  onActivated(() => {
    // Query params win over the stored draft: they are an explicit intent
    // (an ad landing page, the residential page's ?type link, or the no-JS
    // GET fallback from the hero form).
    const params = new URLSearchParams(window.location.search)
    const draft = readQuoteDraft()

    const prefill: Record<string, string | undefined> = {
      address: params.get('address') ?? draft.address,
      email: params.get('email') ?? draft.email,
      name: draft.name,
      phone: draft.phone,
      scope: draft.scope,
    }
    for (const [name, value] of Object.entries(prefill)) {
      if (!value) continue
      const field = form.elements.namedItem(name) as HTMLInputElement | null
      if (field) field.value = value
    }

    if (propertyTypeSelect) {
      // The residential page links here with ?type=residential.
      if (params.get('type') === 'residential') propertyTypeSelect.value = 'Residential'
      else if (draft.propertyType) propertyTypeSelect.value = draft.propertyType
    }

    // Someone who started in the hero has already answered two of the three
    // questions; drop them at the one that is left rather than at the top of
    // a form that looks untouched. Keyboard only — stealing focus on a phone
    // throws up the keyboard over the page they just arrived at.
    //
    // This waits for load: every CTA links to /contact#quote, and the
    // browser's own fragment handling runs after the document finishes
    // loading, scrolling to #quote and clearing focus to <body> as it goes.
    // Focusing before that would just be undone.
    if (draft.from === 'hero' || params.get('address')) {
      afterLoad(() => {
        // Redundant when the URL carries #quote, but the no-JS GET fallback
        // from the hero form arrives at /contact?address=… with no fragment.
        document.getElementById('quote')?.scrollIntoView({ block: 'start' })
        if (window.matchMedia('(pointer: fine)').matches) {
          const next = REQUIRED_FIELDS.map((name) => fieldOf(name)).find(
            (field) => !field.value.trim()
          )
          next?.focus({ preventScroll: true })
        }
      })
    }
  })

  // ——— Optional site map / scope document upload ———
  // Files upload the moment they're picked (multipart to the attachment
  // endpoint, same submissionId — the server joins them to this form
  // instance). The AI pipeline reads them for scope and follows a marked-up
  // site map exactly. Failures are silent and never block the submit.
  const attachmentInput = document.getElementById('qf-attachment') as HTMLInputElement | null
  const attachmentStatus = document.getElementById('qf-attachment-status') as HTMLElement | null
  if (attachmentInput) {
    let attachedCount = 0
    const uploadedKeys = new Set<string>()

    async function uploadAttachment(file: File): Promise<boolean> {
      const fd = new FormData()
      fd.set('submissionId', submissionId)
      fd.set('pageUrl', window.location.origin + window.location.pathname)
      fd.set('file', file, file.name)
      try {
        // No keepalive: browsers cap keepalive bodies at ~64KB, and these
        // uploads happen while the page is alive anyway.
        const response = await fetch(ATTACHMENT_ENDPOINT, { method: 'POST', body: fd })
        if (!response.ok) return false
        const payload = (await response.json().catch(() => null)) as {
          data?: { accepted?: boolean }
        } | null
        return payload?.data?.accepted === true
      } catch {
        return false
      }
    }

    attachmentInput.addEventListener('change', () => {
      const files = Array.from(attachmentInput.files ?? [])
      void (async () => {
        for (const file of files) {
          const key = `${file.name}:${file.size}`
          if (uploadedKeys.has(key)) continue
          if (attachedCount >= MAX_ATTACHMENTS) break
          if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) {
            if (attachmentStatus) {
              attachmentStatus.textContent = `"${file.name}" is over 10 MB — please attach a smaller file.`
              attachmentStatus.hidden = false
            }
            continue
          }
          uploadedKeys.add(key)
          if (attachmentStatus) {
            attachmentStatus.textContent = `Uploading ${file.name}…`
            attachmentStatus.hidden = false
          }
          const ok = await uploadAttachment(file)
          if (ok) {
            attachedCount += 1
            if (attachmentStatus) {
              attachmentStatus.textContent = `Attached ✓ (${attachedCount} file${attachedCount === 1 ? '' : 's'})`
              attachmentStatus.hidden = false
            }
          } else {
            // Silent failure by design: the quote still goes out from the
            // written description; a scary upload error loses the lead.
            uploadedKeys.delete(key)
            if (attachmentStatus && attachedCount === 0) attachmentStatus.hidden = true
          }
        }
      })()
    })
  }

  // ——— Abandoned-form beacon ———
  // The moment there's a valid email, save what's typed so far: a visitor who
  // sees the ballpark and bails (or never hits submit) is still someone the
  // team can reach out to. Same submissionId as the real submit, so the
  // server upgrades the saved row in place if they do finish. Fire-and-forget
  // by design: a beacon failure must never affect the form.
  let submitted = false
  let lastPartialPayload = ''
  let partialTimer: number | undefined

  function partialBody(): string | null {
    const email = emailField.value.trim()
    if (!email || !emailField.checkValidity()) return null
    const data = new FormData(form)
    const fullName = String(data.get('name') ?? '').trim()
    const [firstName = '', ...rest] = fullName.split(/\s+/)
    return JSON.stringify({
      submissionId,
      firstName,
      lastName: rest.join(' '),
      email,
      phone: String(data.get('phone') ?? '').trim(),
      address: String(data.get('address') ?? '').trim(),
      propertyType: String(data.get('propertyType') ?? '').trim(),
      scope: String(data.get('scope') ?? '').trim(),
      website: String(data.get('website') ?? ''),
      pageUrl: window.location.origin + window.location.pathname,
      ...attributionFields(),
    })
  }

  function sendPartial(viaBeacon = false): void {
    if (submitted) return
    const body = partialBody()
    if (!body || body === lastPartialPayload) return
    lastPartialPayload = body
    if (viaBeacon && navigator.sendBeacon) {
      // text/plain keeps the beacon CORS-safelisted (no preflight during
      // unload); the endpoint parses the body as JSON regardless.
      navigator.sendBeacon(PARTIAL_ENDPOINT, new Blob([body], { type: 'text/plain' }))
      return
    }
    void fetch(PARTIAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* silent — reach-out data is best-effort */
    })
  }

  function queuePartial(): void {
    window.clearTimeout(partialTimer)
    partialTimer = window.setTimeout(() => sendPartial(), 2000)
  }

  emailField.addEventListener('blur', () => sendPartial())
  addressInput.addEventListener('input', queuePartial)
  scopeField.addEventListener('input', queuePartial)
  propertyTypeSelect?.addEventListener('change', queuePartial)
  window.addEventListener('pagehide', () => sendPartial(true))

  function collect() {
    const data = new FormData(form)
    // Optional single "Your name" field, split for Icey's firstName/lastName
    // pair — first word / rest. The pipeline greets by name in the auto-reply
    // and stores it on the client record; empty stays empty (both optional).
    const fullName = String(data.get('name') ?? '').trim()
    const [firstName = '', ...rest] = fullName.split(/\s+/)
    return {
      submissionId,
      firstName,
      lastName: rest.join(' '),
      email: String(data.get('email') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      address: String(data.get('address') ?? '').trim(),
      propertyType: String(data.get('propertyType') ?? '').trim(),
      scope: String(data.get('scope') ?? '').trim(),
      pageUrl: window.location.origin + window.location.pathname,
      website: String(data.get('website') ?? ''),
      // Which ad produced this lead. Icey renders it on the request so a
      // signed contract can be traced back to the campaign that paid for it.
      ...attributionFields(),
    }
  }

  /** Mark every problem at once, then send them to the first one. */
  function validate(): boolean {
    let firstInvalid: RequiredField | null = null
    for (const name of REQUIRED_FIELDS) {
      if (!validateField(name) && !firstInvalid) firstInvalid = name
    }
    if (firstInvalid) {
      const field = fieldOf(firstInvalid)
      field.focus({ preventScroll: true })
      field.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return false
    }
    return true
  }

  function mailtoFallback(lead: ReturnType<typeof collect>): string {
    const subject = `Quote request — ${lead.address}`
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
    const body = [
      ...(name ? [`Name: ${name}`] : []),
      `Email: ${lead.email}`,
      ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
      `Property address: ${lead.address}`,
      `Property type: ${lead.propertyType || '—'}`,
      '',
      `Scope of the site: ${lead.scope}`,
    ].join('\n')
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!validate()) return

    const lead = collect()
    errorPanel.hidden = true
    submitButton.disabled = true
    spinner.hidden = false
    submitLabel.textContent = 'Sending…'

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      // The real submission is in — stop the abandoned-form beacons for good.
      submitted = true
      window.clearTimeout(partialTimer)
      window.clearTimeout(draftTimer)
      // Nothing left to resume, and the next visitor on a shared office
      // machine should not inherit this one's address.
      clearQuoteDraft()
      // Instant ballpark rides back on the submit response; a missing or
      // malformed body must never fail a submission the server accepted.
      let estimate = null
      try {
        const payload = (await response.json()) as {
          data?: { estimate?: import('../lib/analytics').BallparkEstimate | null }
        }
        estimate = payload.data?.estimate ?? null
      } catch {
        /* body unreadable — lead landed, just no instant number */
      }
      // The conversion fires on /thank-you rather than here: a tag racing a
      // page navigation is the classic way to under-count leads. Reaching
      // that page is itself the proof the POST succeeded.
      stashPendingLead({
        submissionId: lead.submissionId,
        propertyType: lead.propertyType,
        email: lead.email,
        estimate,
      })
      window.location.assign('/thank-you')
    } catch {
      mailtoLink.href = mailtoFallback(lead)
      errorPanel.hidden = false
      submitButton.disabled = false
      spinner.hidden = true
      submitLabel.textContent = 'Get my quote'
    }
  })
}
