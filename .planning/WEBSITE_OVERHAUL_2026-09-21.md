# northshoresnow.com — overhaul, 2026-09-21

Executed on branch `preview/overhaul` → staged at
https://northshoresnow-preview.onrender.com (never `main`; a push to `main`
publishes).

## The diagnosis

The site is competent and generic. Its rhythm is eight consecutive
`eyebrow → h2 → grid of identical cards` sections, every card carrying the same
radius and the same shadow, so the strongest claim on the page (the
documentation guarantee) has exactly the same visual weight as "24/7 storm
coverage". Nothing about the page could not be lifted onto a competitor's site
by swapping the logo.

Three specific failures, in order of what they cost:

**1. We hide the one thing nobody else has.** The competitive review of 13 Metro
Vancouver contractors found that every one of them is form-then-human-callback;
the best promise in the market is a reply within four business hours. We return
a real satellite-measured price range in seconds — and we show it *after* the
form, on `/thank-you`, where only someone who already converted ever sees it.
The homepage instead promises "most quotes are ready in one business day",
which is a *worse* promise than the thing we actually do, and is beaten
outright by Only Strata's four hours.

**2. The proof section does not render.** `ResponseCommitment.astro` — shipped
yesterday, the section carrying the response windows and the "photographed, or
you don't pay for it" guarantee — styles four elements with `brand-400`, a
colour that was never defined in the `@theme` block. Tailwind v4 emits nothing
for an undefined token, so: the tier labels inherit body grey on near-black and
are effectively invisible, and the guarantee's border and tinted background
never paint, leaving the strongest sentence on the site as unframed body text.
Verified against the deployed stylesheet: zero occurrences of `brand-400`.

**3. The numbers are unsourced.** "98% on-time response rate", "95% client
retention rate", "100+ commercial sites managed" are the four figures a
property manager reads first, and not one of them traces to anything. A buyer
who discounts them discounts the rest of the page with them. Meanwhile the real
operating record is better *and* checkable.

Also fixed in passing: `.eyebrow` is `brand-600` (#1b63c4), used on the
`ink-950` hero of every interior page at 3.2:1 — below WCAG AA for 13px text.

## What changed

| # | Change | Why |
|---|--------|-----|
| 1 | `--color-brand-400: #5fa8ff` added to the theme | Repairs the four dead declarations; 7.5:1 on ink-950 |
| 2 | Hero rebuilt around the instant estimate | Leads with the only unmatched capability instead of burying it |
| 3 | Stats replaced with the production record | 766 visits · 61 properties · 5,445 photos · 97.4% — sourced, dated, specific |
| 4 | New `ServiceRecord.astro` | Closes gap 4: four competitors *promise* documentation, none *shows* any |
| 5 | "Why us" restructured, `01/02/03/04` removed | The numbering encoded no sequence; hierarchy now real |
| 6 | Guarantee given visual primacy | It is the strongest claim and was styled like a footnote |
| 7 | Eyebrow contrast fixed site-wide | Accessibility, and interior heroes now read as intended |

## Sources for every number published

Queried against production (`vesmdgyrqzacpuvscrqd`, company
`e3a4e921-e1de-43ba-9040-fc63504fe1de`) on 2026-09-21, season window
2025-10-01 → 2026-04-30:

- **766** — completed jobs with `check_out_at` in the window
- **61** — distinct `site_id` on those jobs
- **39** — distinct `client_id` behind those sites
- **5,445** — `job_photos` rows joined to those jobs
- **97.4%** — 746 of 766 jobs carry at least one photo

97.4% is deliberately published as-is rather than rounded to "every visit".
The guarantee is worded to that gap: if the record is missing, the visit is not
charged.

## Deliberately NOT done

- **Published rate cards.** Limitless publishes "salting from $165/visit". We
  could, but a static number undercuts the personalised range and it is a
  pricing decision, not a copy one. Ben's call.
- **A real redacted service report.** The new section shows a clearly-labelled
  *example* record. A genuine redacted one from a consenting client would be
  strictly stronger and is the single highest-value asset still missing.
- **Case studies, SIMA/ASCA, review volume.** All need something only Ben can
  supply (a consenting client, a membership, a review push).
- **Coquitlam / Surrey bylaw pages.** Open territory per the competitive
  review, but that is expansion, not overhaul.
