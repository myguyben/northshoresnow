/** Client logic for the 3-step quote form (QuoteForm.astro). */

const ENDPOINT =
  import.meta.env.PUBLIC_QUOTE_ENDPOINT ?? 'https://iceysoftware.com/api/inbound/website-lead'
const CONTACT_EMAIL = 'Quotes@northshoresnow.com'

export function setupQuoteForm(): void {
  const form = document.getElementById('quote-form') as HTMLFormElement | null
  if (!form) return

  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>('[data-step]'))
  const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-step-dot]'))
  const backButton = document.getElementById('qf-back') as HTMLButtonElement
  const nextButton = document.getElementById('qf-next') as HTMLButtonElement
  const submitButton = document.getElementById('qf-submit') as HTMLButtonElement
  const spinner = document.getElementById('qf-spinner') as HTMLElement
  const errorPanel = document.getElementById('qf-error') as HTMLElement
  const mailtoLink = document.getElementById('qf-mailto') as HTMLAnchorElement

  const submissionId = crypto.randomUUID()
  let current = 1

  // QuoteFormMini hands off via /contact#quote?address=…&email=…
  const params = new URLSearchParams(window.location.search)
  const prefillAddress = params.get('address')
  const prefillEmail = params.get('email')
  if (prefillAddress) {
    ;(form.elements.namedItem('address') as HTMLInputElement).value = prefillAddress
  }
  if (prefillEmail) {
    ;(form.elements.namedItem('email') as HTMLInputElement).value = prefillEmail
  }

  function show(step: number): void {
    current = step
    for (const fieldset of steps) {
      fieldset.hidden = Number(fieldset.dataset.step) !== step
    }
    dots.forEach((dot, i) => {
      if (i < step) dot.setAttribute('data-active', '')
      else dot.removeAttribute('data-active')
    })
    backButton.hidden = step === 1
    nextButton.hidden = step === 3
    submitButton.hidden = step !== 3
  }

  function validateStep(step: number): boolean {
    const fieldset = steps.find((f) => Number(f.dataset.step) === step)
    if (!fieldset) return true
    for (const field of fieldset.querySelectorAll<HTMLInputElement>('input, select, textarea')) {
      if (!field.checkValidity()) {
        field.reportValidity()
        return false
      }
    }
    return true
  }

  backButton.addEventListener('click', () => show(Math.max(1, current - 1)))
  nextButton.addEventListener('click', () => {
    if (validateStep(current)) show(Math.min(3, current + 1))
  })

  function collect() {
    const data = new FormData(form)
    const services = data.getAll('services').map(String)
    return {
      submissionId,
      firstName: String(data.get('firstName') ?? '').trim(),
      lastName: String(data.get('lastName') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      serviceArea: String(data.get('serviceArea') ?? ''),
      propertyType: String(data.get('propertyType') ?? ''),
      address: String(data.get('address') ?? '').trim(),
      serviceType: String(data.get('serviceType') ?? 'seasonal') as 'seasonal' | 'per-event',
      services,
      details: String(data.get('details') ?? '').trim(),
      pageUrl: window.location.origin + window.location.pathname,
      website: String(data.get('website') ?? ''),
    }
  }

  function mailtoFallback(lead: ReturnType<typeof collect>): string {
    const subject = `Quote request — ${lead.address}`
    const body = [
      `Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ')}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || '—'}`,
      `Property address: ${lead.address}`,
      `Service area: ${lead.serviceArea}`,
      `Property type: ${lead.propertyType}`,
      `Contract type: ${lead.serviceType === 'per-event' ? 'Per-event' : 'Seasonal contract'}`,
      `Services: ${lead.services.join(', ') || '—'}`,
      '',
      lead.details,
    ].join('\n')
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!validateStep(3)) return

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

  show(1)
}
