/** Client logic for the quote form (QuoteForm.astro) and the address
 * autocomplete shared with QuoteFormMini.astro. */

const ENDPOINT =
  import.meta.env.PUBLIC_QUOTE_ENDPOINT ?? 'https://iceysoftware.com/api/inbound/website-lead'
const AUTOCOMPLETE_ENDPOINT = ENDPOINT.replace(/\/website-lead$/, '/address-autocomplete')
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
  const listbox = wrapper?.querySelector<HTMLUListElement>('[role="listbox"]')
  if (!listbox) return

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

export function setupQuoteForm(): void {
  const form = document.getElementById('quote-form') as HTMLFormElement | null
  if (!form) return

  const submitButton = document.getElementById('qf-submit') as HTMLButtonElement
  const spinner = document.getElementById('qf-spinner') as HTMLElement
  const errorPanel = document.getElementById('qf-error') as HTMLElement
  const mailtoLink = document.getElementById('qf-mailto') as HTMLAnchorElement
  const scopeError = document.getElementById('qf-scope-error') as HTMLElement
  const addressInput = form.elements.namedItem('address') as HTMLInputElement

  const submissionId = crypto.randomUUID()

  attachAddressAutocomplete(addressInput)

  // QuoteFormMini hands off via /contact#quote?address=…&email=…
  const params = new URLSearchParams(window.location.search)
  const prefillAddress = params.get('address')
  const prefillEmail = params.get('email')
  if (prefillAddress) addressInput.value = prefillAddress
  if (prefillEmail) {
    ;(form.elements.namedItem('email') as HTMLInputElement).value = prefillEmail
  }

  function collect() {
    const data = new FormData(form)
    return {
      submissionId,
      email: String(data.get('email') ?? '').trim(),
      address: String(data.get('address') ?? '').trim(),
      services: data.getAll('services').map(String),
      details: String(data.get('details') ?? '').trim(),
      pageUrl: window.location.origin + window.location.pathname,
      website: String(data.get('website') ?? ''),
    }
  }

  function validate(): boolean {
    for (const name of ['email', 'address'] as const) {
      const field = form.elements.namedItem(name) as HTMLInputElement
      if (!field.checkValidity()) {
        field.reportValidity()
        return false
      }
    }
    const hasScope = collect().services.length > 0
    scopeError.hidden = hasScope
    return hasScope
  }

  function mailtoFallback(lead: ReturnType<typeof collect>): string {
    const subject = `Quote request — ${lead.address}`
    const body = [
      `Email: ${lead.email}`,
      `Property address: ${lead.address}`,
      `Scope: ${lead.services.join(', ') || '—'}`,
      '',
      lead.details,
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
      window.location.assign('/thank-you')
    } catch {
      mailtoLink.href = mailtoFallback(lead)
      errorPanel.hidden = false
      submitButton.disabled = false
      spinner.hidden = true
    }
  })
}
