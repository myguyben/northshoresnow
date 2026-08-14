# North Shore Snow — Google & Meta Ads Launch Kit

Built 2026-08-13. Every asset below is validated against platform character limits.
Copy is paste-ready; the settings are the ones that actually decide whether the money works.

---

## 1. The three findings that shaped this plan

**You are inside the commercial decision window right now.** Commercial snow RFPs are
released in July–August and awarded by mid-September. The 2026/27 commercial pipeline is
being decided over the next four to six weeks. This is the opposite of the intuition that
snow advertising starts when it snows — by November the commercial season is already sold.
**Campaign S1 should go live first and carry most of the early budget.**

**Plan for a low-snow winter.** Vancouver just closed its first snow-free winter in 43
years, and a strong El Niño is favoured for 2026/27. Two consequences: sell *seasonal*
contracts rather than per-push (a per-push book earns nothing in a dry year), and do not
run an always-on residential campaign from October to March — most of that budget would
burn on days with no demand. Residential in-storm spend is held in reserve and surged.

Useful sales counter, because clients will raise the dry winter: **YVR is at sea level in
Richmond and is not your territory.** In February 2025 Lynn Valley took 20 cm and West Van
14–24 cm while the airport reported far less. The benches out-snow the headline every year.

**Snow removal is not an eligible Local Services Ads category in Canada.** Google's own
Canada category list has 16 entries and snow removal is not among them; the US list has it
explicitly. Several Canadian agency guides claim otherwise — they are copying the US list.
So there is no Google Guaranteed badge route here, and Search takes the budget.

---

## 2. Budget plan

Benchmarks for context (US Home & Home Improvement, the closest published proxy — no
snow-specific or Canadian data exists publicly): Google Search ≈ $8.33 CPC and ≈ $91 per
lead; Meta ≈ $2.30 CPC and ≈ $34 per lead. Treat as directional and expect Canadian CPCs
somewhat lower. Pull real numbers from Keyword Planner before scaling.

| Phase | Google | Meta | Monthly |
|---|---|---|---|
| **Aug 14 – Sep 30** — commercial RFP window | S1 $45/day · S4 $5/day | Commercial $20/day | ≈ $2,100 |
| **Oct – Nov** — pre-season, residential opens | S1 $35 · S2 $20 · S4 $5/day | Residential $25/day | ≈ $2,550 |
| **Dec – Mar** — in-season | S1 $25 · S2 $15 · S4 $5/day | $15/day | ≈ $1,800 |
| **Storm surge** — on forecast only | S3 $150–300/day for 24–72h | $50/day | reserve ≈ $1,500 |
| **Apr – Jul** | S4 brand only $5/day | paused | ≈ $150 |

Storm surge is a **reserve, not a monthly line**. Trigger it on an Environment Canada
snowfall warning for the North Shore, not on the first flake. Apply a Google seasonality
adjustment at the same time — it is designed for 1–7 day events and is the right tool
here, because a 48-hour spike is too short for Smart Bidding to learn on by itself.

---

## 3. Google Ads

### 3.1 Settings that decide whether this works

Apply to every campaign unless noted.

| Setting | Value | Why |
|---|---|---|
| Networks | Search only — **Search Partners OFF, Display OFF** | Display on a Search campaign spends the budget on junk placements |
| Location targeting | North Vancouver (City + District), West Vancouver, City of Vancouver. Add Lions Bay to S1 only | |
| **Location option** | **"Presence: people in or regularly in your targeted locations"** | The default is presence-*or-interest*, which serves anyone *searching about* the area — this is how you end up paying for Vancouver, Washington |
| Language | English | |
| Bid strategy weeks 1–3 | Maximize Clicks with a max CPC cap of **$6.00** | No conversion history yet; the cap stops runaway CPCs |
| Bid strategy after ~20 conversions | Maximize Conversions, then Target CPA at ≈ $110 | |
| Ad schedule (S1, S2, S4) | Mon–Fri 6am–8pm, Sat–Sun 7am–6pm | Commercial decisions get made in business hours |
| Ad schedule (S3) | 24/7 | Storms do not keep hours |
| Ad rotation | Optimize | |
| Auto-applied recommendations | **Turn all of them OFF** | Google will otherwise widen your keywords and undo the negatives |

**The single most important negative:** `washington`, `wa`, `vancouver washington`,
`portland`, `seattle`. Vancouver WA contaminates this keyword set badly.

### 3.2 Account-level negative keyword list — "Global Excludes"

Apply to all campaigns. Broad match unless bracketed.

```
washington, wa, vancouver wa, vancouver washington, portland, seattle, oregon
job, jobs, hiring, career, careers, salary, wage, employment, resume
equipment, for sale, rental, rent, used, buy, price list, cost calculator
snow blower, snowblower, plow truck, plow blade, snow plow attachment, tractor
diy, how to, yourself, tutorial, youtube
city of, municipal, municipality, highway, provincial, government tender
whistler, ski, resort, sun peaks, kelowna, calgary, toronto, ontario
roof snow removal, roof raking, ice dam
software, app, crm, dispatch software
free, cheap, volunteer, snow angel
```

`snow angel` matters — West Vancouver runs a free volunteer shovelling program by that name.

### 3.3 Campaign-level negatives

- **S1 (Commercial):** `residential`, `driveway`, `my house`, `my home`, `homeowner`, `single family`
- **S2 (Residential):** `commercial`, `strata`, `parking lot`, `warehouse`, `industrial`, `contract rfp`

These two campaigns must never share a budget or a bid strategy. Commercial is low-volume,
high-value, long-consideration. Residential is near-zero baseline with 10–50× spikes and
decisions made in minutes. Mixed together, the residential spike eats the commercial budget
in exactly the week commercial matters least.

### 3.4 Campaign S1 — Commercial & Strata *(launch first)*

**Ad group: Commercial Snow Removal** → `/snow-removal`
```
[commercial snow removal north vancouver]
[commercial snow removal west vancouver]
"commercial snow removal vancouver"
"commercial snow removal contractor"
"snow removal company north vancouver"
"business snow removal vancouver"
```

**Ad group: Strata Snow Removal** → `/strata`
```
[strata snow removal]
[strata snow removal vancouver]
"snow removal for strata"
"strata snow removal contract"
"condo snow removal vancouver"
"multi family snow removal"
```

**Ad group: Property Managers & Portfolios** → `/property-managers`
```
"property management snow removal"
"snow removal for property managers"
"commercial snow removal contract"
"snow removal contract vancouver"
"seasonal snow removal contract"
"snow removal rfp vancouver"
```

**Ad group: Parking Lot Plowing** → `/snow-plowing`
```
[parking lot snow removal]
[parking lot snow removal vancouver]
"parking lot plowing"
"commercial snow plowing north vancouver"
"snow hauling vancouver"
```

**Ad group: De-Icing & Salting** → `/de-icing`
```
[de icing services vancouver]
"commercial salting services"
"salting services vancouver"
"ice management vancouver"
"anti icing services"
"parking lot salting"
```

### 3.5 Campaign S2 — Residential Pre-Season *(launch ~Sep 15)*

→ `/residential`
```
[snow removal north vancouver]
[driveway snow removal north vancouver]
[residential snow removal vancouver]
"snow removal west vancouver"
"driveway snow clearing near me"
"snow shoveling service north vancouver"
"sidewalk snow clearing service"
```

### 3.6 Campaign S3 — Storm Surge *(build now, leave PAUSED)*

→ `/contact` · 24/7 · **add a call-only ad variant** — nobody fills in a form mid-storm.
```
"emergency snow removal"
"snow removal today"
[snow removal near me]
"24 hour snow removal"
"same day snow removal"
"who plows driveways near me"
```

### 3.7 Campaign S4 — Brand *(cheap, defensive)*

→ `/` · $5/day. Competitors can bid on your name; this keeps the top slot at pennies.
```
[north shore snow]
[northshoresnow]
"north shore snow removal"
```

### 3.8 Responsive search ads

All copy below is within Google's limits (headline ≤30, description ≤90), verified
programmatically. Pin nothing except where noted — Google's rotation beats hand-pinning.

<details>
<summary><b>S1 · Commercial Snow Removal</b> → /snow-removal</summary>

Headlines: Commercial Snow Removal · North Vancouver Snow Crews · Cleared Before 6:30 AM ·
Satellite-Measured Quote · Quote Back the Same Day · Photo-Verified Every Visit · 24/7 Storm
Dispatch · Book Your 2026/27 Season · Insured + WorkSafeBC · No Site Visit Needed ·
Automatic Snowfall Dispatch · Seasonal or Per-Event · Call (604) 990-7072 · Parking Lots &
Sidewalks · Local North Shore Crews

Descriptions:
1. Parking lots, sidewalks and loading zones cleared before your doors open. Fully insured.
2. We measure your property from satellite imagery. Most quotes are ready the same day.
3. Every visit is GPS-logged and photo-documented, so your service record builds itself.
4. Seasonal and per-event contracts across North Van, West Van and Downtown. Book now.
</details>

<details>
<summary><b>S1 · Strata Snow Removal</b> → /strata</summary>

Headlines: Strata Snow Removal · Snow Removal for Strata · Your Council, Covered ·
Photo-Verified Every Visit · Cleared Before 6:30 AM · Satellite-Measured Quote · Same-Day
Strata Quotes · Book Your 2026/27 Season · Insured + WorkSafeBC · Common Areas & Walkways ·
Bylaw Frontage Included · Occupiers Liability Ready · 24/7 Storm Dispatch · North Shore
Strata Crews · Call (604) 990-7072

Descriptions:
1. Documented snow service for BC strata: GPS logs and photos on every single visit.
2. Your bylaw sidewalk frontage is mapped into the plan, so compliance is automatic.
3. Council-ready quotes with clear seasonal and per-event options, usually same day.
4. Multi-building strata across North Van and West Van. Fully insured, WorkSafeBC.
</details>

<details>
<summary><b>S1 · Property Managers & Portfolios</b> → /property-managers</summary>

Headlines: One Winter Contract · Snow for Every Property · Property Manager Snow ·
Portfolio-Wide Coverage · One Invoice, Every Site · Photo-Verified Every Visit · Named
Escalation Contact · Satellite-Measured Quote · Book Your 2026/27 Season · Cleared Before
6:30 AM · Insured + WorkSafeBC · Same-Day Quotes · 24/7 Storm Dispatch · North Shore &
Downtown · Call (604) 990-7072

Descriptions:
1. One contract, one invoice and one contact for every property you manage. Insured.
2. Every site GPS-logged and photo-documented, so tenant disputes answer themselves.
3. We measure each property from satellite imagery. Most quotes are ready same day.
4. Written response targets and a named escalation contact in your winter contract.
</details>

<details>
<summary><b>S1 · Parking Lot Plowing</b> → /snow-plowing</summary>

Headlines: Parking Lot Snow Plowing · Lot Cleared by 6:30 AM · Commercial Snow Plowing ·
Truck Plows & Sidewalk Crews · Automatic Snowfall Dispatch · Snow Hauling & Removal ·
Satellite-Measured Quote · Book Your 2026/27 Season · Photo-Verified Every Visit · Insured +
WorkSafeBC · 24/7 Storm Dispatch · North Vancouver Plowing · Loading Zones & Ramps ·
Same-Day Quotes · Call (604) 990-7072

Descriptions:
1. Full-size plow trucks on your lot before the morning rush, salting on the same pass.
2. Parkade ramps, loading zones and fire exits included, not billed as extras later.
3. Snow loaded and hauled off-site when your lot runs out of room to stack it.
4. We measure your lot from satellite imagery and price on real serviceable area.
</details>

<details>
<summary><b>S1 · De-Icing & Salting</b> → /de-icing</summary>

Headlines: De-Icing & Anti-Icing · Commercial Salting · Ice Melt & Salting · Treated Before
It Freezes · Anti-Icing Before the Storm · Calibrated Salt Application · Ice Management
Services · Photo-Verified Every Visit · Satellite-Measured Quote · Book Your 2026/27 Season ·
Insured + WorkSafeBC · 24/7 Freeze Monitoring · North Shore De-Icing · Same-Day Quotes ·
Call (604) 990-7072

Descriptions:
1. Liquid and granular treatment at 0C, stopping ice before it forms on your lot.
2. Calibrated application with per-visit records that document your duty of care.
3. Black ice is the North Shore hazard that outlasts the snow. We treat for it.
4. De-icing quoted as its own service, never bundled into a snow number you cannot read.
</details>

<details>
<summary><b>S2 · Residential Snow Removal</b> → /residential</summary>

Headlines: Residential Snow Removal · Driveway Snow Clearing · Cleared Before Your Day ·
North Shore Driveways · Automatic When It Snows · No Alarm, No Shovelling · Book Your Winter
Plan · Per-Visit or Seasonal · Driveway, Walks & Steps · Photo Confirmation · Sidewalk Bylaw
Covered · Steep Driveways Welcome · Local North Shore Crews · Simple 30-Day Cancellation ·
Call (604) 990-7072

Descriptions:
1. Driveway, walkways and steps cleared automatically when it snows. No call needed.
2. Your sidewalk frontage is covered, so the 10am bylaw is handled without an alarm.
3. Per-visit or a fixed seasonal plan billed monthly, October through April.
4. Steep North Shore driveways are our home ground. Lynn Valley to the British Properties.
</details>

<details>
<summary><b>S3 · Emergency Snow Removal</b> → /contact · plus a call-only ad</summary>

Headlines: Emergency Snow Removal · Snow Removal Today · Crews Out Right Now · Call (604)
990-7072 · North Shore Snow Crews · 24/7 Storm Response · Same-Day Snow Clearing · Plowing &
Salting Now · Commercial & Residential · Local, Not a Call Centre · Lot Cleared Today · Ice &
Black Ice Treatment

Descriptions:
1. Storm crews are out across the North Shore right now. Call and we will route to you.
2. Plowing, shovelling and salting today. Commercial lots and residential driveways.
3. Local North Vancouver crews and equipment, not a dispatch centre in another city.
4. Ice and black ice treated on the same visit. Call (604) 990-7072.
</details>

<details>
<summary><b>S4 · Brand</b> → /</summary>

Headlines: North Shore Snow · Official Site · Commercial Snow Removal · North Vancouver
Based · Call (604) 990-7072 · Get a Free Quote · Satellite-Measured Quote · 5.0 Stars on
Google · Book Your 2026/27 Season

Descriptions:
1. The official site for North Shore Snow. Commercial and residential snow removal.
2. Based in Lower Lonsdale, serving North Van, West Van and Downtown Vancouver.
3. Satellite-measured quotes, usually back the same day. Call (604) 990-7072.
4. Rated 5.0 on Google. Fully insured and WorkSafeBC registered.
</details>

### 3.9 Extensions (assets) — apply at account level

**Call extension:** (604) 990-7072, scheduled 24/7. Enable call reporting so calls from ads
are counted as conversions.

**Sitelinks**

| Text | Line 1 | Line 2 | URL |
|---|---|---|---|
| Get a Free Quote | Satellite-measured, no site visit | Most quotes back the same day | `/contact#quote` |
| Strata Snow Removal | Documented service for BC strata | Council-ready quotes and records | `/strata` |
| For Property Managers | One contract for every property | One invoice and one contact | `/property-managers` |
| De-Icing & Salting | Treated before ice ever forms | Calibrated, documented salting | `/de-icing` |
| Residential Driveways | Automatic clearing when it snows | Per-visit or seasonal plans | `/residential` |
| Areas We Cover | North Van, West Van, Downtown | Response times by area | `/service-areas` |

**Callouts:** Cleared before 6:30 AM · Photo-verified visits · Fully insured · WorkSafeBC
registered · 24/7 storm dispatch · Same-day quotes · No site visit needed · Locally owned ·
Seasonal or per-event · GPS-logged service

**Structured snippets**
- *Services:* Snow removal, Snow plowing, De-icing, Salting, Snow hauling, Anti-icing
- *Property types:* Strata, Retail, Industrial, Offices, Residential, Medical

**Location extension:** link the Google Business Profile (place_id
`ChIJWQ-g9MNEf2oRhmrru26SGtc`). This also feeds seller ratings from your 5.0/26 reviews.

---

## 4. Meta

### 4.1 Special Ad Category — declare NONE

Meta's Housing category covers *housing opportunities*: sale and rental listings, real
estate services, mortgages. A snow removal contractor sells a maintenance service and
should declare **NONE**. Some agency writing disagrees, so confirm in Ads Manager before
building.

This is worth real money. If the account gets flagged as Housing, Meta forces a **25 km
minimum radius**, bans location exclusions, blocks lookalikes, and removes detailed
targeting. A 25 km radius from North Vancouver sweeps in Vancouver, Burnaby, Richmond and
part of the Tri-Cities — most of the budget would land outside your service area. If Meta
auto-flags it, strip any copy implying property sale, rental or value, and appeal.

### 4.2 Campaigns

**M1 — Commercial & Strata (launch now, $20/day)**
Objective: Leads. Placements: Advantage+ placements, then exclude Audience Network after a
week if quality is poor. Geo: North Vancouver, West Vancouver + 5 km, plus Downtown
Vancouver.

Audiences, in priority order:
1. **Lookalike 1% from your customer list** — upload the 100+ commercial sites' contacts.
   This is the strongest asset you have and nothing else on Meta comes close.
2. Interest stack: Property management, Strata title, Commercial property, Facility
   management, Real estate — narrowed by job title where available.
3. Retargeting: site visitors 180 days, excluding anyone who reached `/thank-you`.

**M2 — Residential Pre-Season (launch ~Oct 1, $25/day)**
Geo: North Shore only, tight. Audience: homeowners 30–65+, plus a lookalike from residential
leads once you have 100. Best creative window is the first cold snap forecast, not a date.

**M3 — Storm Surge (build now, keep OFF)**
Turn on with a snowfall warning. Objective: Calls or Leads. Broad targeting — in a storm
everyone is in market. Budget $50/day for 24–72 hours.

### 4.3 Creative

Run **three angles** per campaign and let Meta allocate. Video and photo of real crews and
real North Shore properties will beat stock badly — you already have the photo library.

**Commercial angle 1 — liability.** *Primary text:* "A slip-and-fall claim lands on your
desk in March. Can you produce the service record from January 14th? Every North Shore Snow
visit is GPS-logged and photo-documented, so the file builds itself. Satellite-measured
quotes for strata and commercial properties, usually back the same day." *Headline:* "Your
snow file, already organized" *CTA:* Get quote

**Commercial angle 2 — the deadline nobody knows.** *Primary text:* "Most North Shore
owners think they have until 10am to clear their sidewalk. That is the rule for houses. In
the District of North Vancouver, commercial, industrial and multi-family property has no
grace period at all. We map your bylaw frontage into the service plan so it is cleared on
the first pass." *Headline:* "The 10am rule is not your rule" *CTA:* Learn more →
`/strata`

**Commercial angle 3 — book the season.** *Primary text:* "Winter contracts for 2026/27 are
being signed now, and we cap our client list to the capacity of our fleet — so a 40 cm dump
never turns into a three-day backlog. Satellite-measured quote, no site visit, usually back
the same day." *Headline:* "Book your 2026/27 season" *CTA:* Get quote

**Residential angle 1 — the morning.** *Primary text:* "It snowed overnight. Your driveway,
walkway and steps are already done, and so is the sidewalk the bylaw makes you responsible
for. No alarm, no shovel, no phone call — we dispatch automatically at 2 cm. Per-visit or a
fixed seasonal plan billed monthly." *Headline:* "Cleared before your day starts" *CTA:*
Get quote

**Residential angle 2 — the hill.** *Primary text:* "Lynn Valley, Edgemont, Seymour, the
British Properties: it can be raining at the waterfront while you are under 15 cm. We quote
on your driveway's real elevation and grade, not a regional average. Steep driveways are our
home ground." *Headline:* "Built for North Shore hills" *CTA:* Get quote

Add UTMs to every Meta link so attribution lands in Icey:
`?utm_source=meta&utm_medium=paid_social&utm_campaign=m1_commercial&utm_content=liability`

---

## 5. Conversion tracking — the part that must be done first

The tracking code is **built and committed** (`feat(tracking)`, commit `288eb8a`) but stays
completely inert until the IDs are set. Nothing measures until this section is done.

### 5.1 In Google Ads
1. Create conversion action **"Quote Request"** — category Submit lead form, value $400 CAD,
   count *One*. Copy the conversion ID (`AW-…`) and label.
2. Create conversion action **"Phone Call Click"** — category Contact, value $120 CAD.
3. Turn on **Enhanced conversions for leads** on the Quote Request action and accept the
   customer-data terms. The site already SHA-256 hashes the email before sending.
4. Mark Quote Request as the **only** Primary conversion. Phone Call Click stays Secondary
   until you trust the volume, otherwise bidding chases cheap taps.

### 5.2 In Meta
Create the pixel in Events Manager, copy the ID. The `Lead` event and its dedup `eventID`
are already wired.

### 5.3 On Render → static site `northshoresnow` (srv-d6ktcmk50q8c73ecs1l0)
These are **build-time** variables — a redeploy is required, not just a restart.

```
PUBLIC_GA4_ID=G-…
PUBLIC_GOOGLE_ADS_ID=AW-…
PUBLIC_GOOGLE_ADS_LEAD_LABEL=…      # the part after the slash in AW-123/abcDEF
PUBLIC_GOOGLE_ADS_CALL_LABEL=…
PUBLIC_GOOGLE_ADS_ENHANCED=true     # only after step 5.1.3
PUBLIC_META_PIXEL_ID=…
```

### 5.4 Verify before spending a dollar
Submit a real test quote and confirm: Google Tag Assistant shows `generate_lead` **and**
`conversion` on `/thank-you`; Meta Test Events shows `Lead`; the lead arrives in Icey with a
**Marketing attribution** block at the bottom; a `tel:` tap fires `click_to_call`. Then
refresh `/thank-you` and confirm **nothing fires twice**.

### 5.5 Offline conversion import — the highest-leverage step, done monthly
This is why the click ID travels with the lead. A quote request is not revenue; a signed
contract is. Once a month, export won deals from Icey with their `gclid` and contract value
and upload to Google Ads as offline conversions. Bidding then optimises toward signed
seasonal contracts rather than form fills — which matters enormously here, because a
residential driveway lead and a 12-building strata lead look identical to Google otherwise.

---

## 6. Launch checklist

Only Ben can do the first four.

- [ ] Google Ads account created + billing (CAD)
- [ ] Meta Business Manager + ad account + pixel
- [ ] Google Business Profile linked to Google Ads (enables location extension + seller ratings)
- [ ] Customer list exported from Icey for the Meta lookalike — commercial contacts
- [ ] Conversion actions created (§5.1), pixel created (§5.2)
- [ ] Render env vars set + redeploy (§5.3)
- [ ] Tracking verified end to end (§5.4)
- [ ] Global Excludes negative list built and attached to all campaigns (§3.2)
- [ ] **Location option set to "Presence"** on every campaign (§3.1)
- [ ] Auto-applied recommendations turned OFF
- [ ] S1 + S4 live; S2 built and scheduled for ~Sep 15; S3 built and PAUSED
- [ ] Meta M1 live; M2 built for Oct 1; M3 built and OFF

## 7. What to watch, and when to kill

**Week 1–2:** search terms report daily, not weekly. Every irrelevant term becomes a
negative. This is where a new account leaks the most money.

**Week 3–4:** cut any ad group over $250 spend with zero conversions. Check that
`/thank-you` conversions roughly match leads arriving in Icey — a gap means the tag is
missing some path.

**Ongoing:** the real metric is **cost per signed contract**, not cost per lead. A $150
commercial lead that closes a $9,000 seasonal contract is excellent; a $40 residential lead
that closes $600 may not be. Offline conversion import (§5.5) is what makes this visible.

**Kill criteria:** if S1 has spent $1,500 with no commercial quote request by mid-September,
the problem is the landing pages or the offer, not the bids — stop and fix before spending
more. The commercial window closes at that point anyway.

---

## 8. Known gaps worth fixing before heavy spend

Found during the site audit, in rough order of impact on ad performance:

1. **Only two forms exist sitewide** — the homepage and `/contact`. Every service, area and
   industry page (18 of 20 audited) converts only by a click through to `/contact`. Ad
   traffic landing on `/strata` has to make an extra hop. Embedding the quote form on the
   S1 landing pages is the single biggest conversion-rate win available.
2. **The homepage form does not submit a lead** — it redirects to `/contact` with prefill.
   Every homepage form-start is a two-step funnel with a guaranteed drop-off.
3. **Mobile header hides the phone number and the quote button** behind the hamburger, and
   there is no sticky call bar. On a phone the first screen offers no way to convert. This
   matters most for S3, where the intent is to call immediately.
4. **No phone field on the quote form** — email only. Commercial buyers often prefer a call
   back, and a phone number materially improves enhanced-conversion match rates.
5. **Four placeholder "Client Logo 1–4" images** are live on the homepage logo wall.
6. **Reviews are plain text**, with no `Review`/`aggregateRating` schema — so the 5.0/26
   cannot produce stars. Seller ratings in ads will have to come from the GBP instead.
7. **Insurance/WorkSafeBC appears on one page only** (homepage FAQ), absent from every page
   a paid click actually lands on — while competitors put $5M CGL in their headline.
