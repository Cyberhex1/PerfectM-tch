# PerfectMatch

A personal face profile that finds your foundation shade and suggests makeup and skincare. It also tracks
which ingredients your skin doesn't like, and gets more accurate every time you log a product.

**How it works**

1. **Photo in natural light.** Your skin's depth and undertone are read on your device, with redness, shine,
   uneven tone and texture flagged as hints. The photo is never uploaded. You can optionally ask Google Gemini
   for a second opinion.
2. **Quiz.** Skin type, sensitivity, concerns, ingredients you react to, undertone clues and the finish you
   like. It ends with two free-form boxes: products you've tried and liked, and products you've disliked.
   Foundation names and shades are recognised automatically (e.g. "Fenty Pro Filt'r 240"). Reactions like
   "too pink" or "broke me out" are picked up from what you type.
3. **Budget vs. quality sliders.** Every recommendation is weighed against both.
4. **Your profile.** Foundation matches across 314 formulas and about 6,700 real shades, makeup colours,
   an AM/PM skincare routine, and an ingredient radar.

**Skincare grounded in science.** Every skincare recommendation and ingredient warning is tied to published
dermatology research: AAD clinical guidelines, randomized trials and reviews. Each one carries an evidence
grade (strong, moderate, limited or expert consensus) and links to PubMed. Products are ranked by the
strength of the evidence that their active ingredients help *your* concerns. All 43 sources in
`src/lib/evidence.ts` were checked against their PubMed records. Their sources and grading are explained at
`/science`. Tests in `tests/evidence.test.ts` make sure every claim cites a real source.

**How it gets better over time.** Shades you've actually worn count about 3× more than the photo. "Too light",
"too pink" and similar feedback shifts your target colour and rules out shades that were wrong. Ingredient
lists from products that didn't work are compared against ones that did, so repeat offenders get flagged
before you buy. The profile shows a *match confidence* meter and tells you what to log next.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests for colour science, matching, ingredients and learning
```

It works with **no configuration at all**. Without any keys it runs in guest mode, saving the profile in the
browser, and uses on-device photo analysis. The two optional integrations below add accounts and AI.

Copy `.env.example` to `.env.local` and fill in whichever you want.

## Free services used

| What | Service | Key needed? |
|---|---|---|
| Foundation shades | [The Pudding foundation dataset](https://github.com/the-pudding/data/tree/master/foundation-names) (MIT), bundled in `public/data/foundations.json` | No |
| Ingredient lists | [Open Beauty Facts](https://world.openbeautyfacts.org) (free, open data, ODbL) | No |
| Skin colour analysis | Runs in the browser (`src/lib/skinAnalysis.ts`) | No |
| AI skin read (optional) | Google Gemini API, free tier | `GEMINI_API_KEY` |
| Accounts + sync (optional) | Supabase, free tier | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

To refresh the shade data: `npm run data:foundations`.

## Accounts (Supabase, replacing Firebase)

Supabase's free tier covers this app's needs: 50k monthly users and a Postgres database. It's simpler than
Firebase here because the whole profile is one JSON row per user, protected by row-level security.

1. Create a project at [supabase.com](https://supabase.com) (free).
2. Go to **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. Go to **Project Settings → API**. Copy the *Project URL* and the *anon / publishable* key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # or sb_publishable_...
   ```
4. Go to **Authentication → URL Configuration**. Set *Site URL* to your deployed URL and add
   `http://localhost:3000/**` to *Redirect URLs*. This is what makes confirmation and magic-link emails come
   back to the right place.
5. Restart `npm run dev`. A **Sign in** button appears in the header.

People can start as guests. When they create an account, everything they've done so far is merged into it.

**Common gotchas** (the app shows friendly messages for these):
- *"Email not confirmed"*: Supabase requires email confirmation by default. Turn it off for testing under
  Authentication → Providers → Email.
- *"profiles table is missing"*: step 2 wasn't run.
- Free projects **pause after a week of inactivity**. Un-pause from the dashboard.
- The free email sender is rate-limited to a few emails per hour. Add custom SMTP for production.

## AI skin analysis (Google Gemini): what usually goes wrong, and the fixes built in

The on-device analysis always works. Gemini is an optional extra the user has to opt into for each photo,
because on the free tier Google may use submitted content to improve its products. The app tells the user
this before anything is sent.

1. Get a key at **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**. Use AI Studio, not the
   Google Cloud console; it enables the right API for you.
2. Put it in `.env.local` as `GEMINI_API_KEY=...`. Optionally set `GEMINI_MODEL` to pin a model.

`src/lib/server/gemini.ts` is written to avoid the usual failures:

| Symptom | Cause | Fix in this app |
|---|---|---|
| CORS errors, or your key visible in the browser | Calling Gemini from client code | Only the server route `/api/analyze-skin` calls Gemini |
| `400 INVALID_ARGUMENT` on images | Sending `data:image/jpeg;base64,...` as inline data | The prefix is stripped; raw base64 is sent |
| `404 model not found` | Model names get retired | Tries `GEMINI_MODEL`, then `gemini-flash-latest`, `gemini-2.5-flash`, `gemini-2.0-flash` |
| `403 PERMISSION_DENIED` | Key restricted to HTTP referrers, or API not enabled | Clear error with hint. Server calls send no referrer, so remove referrer restrictions |
| `429 RESOURCE_EXHAUSTED` | Free-tier rate limit | Clear message; on-device results are kept |
| `400 FAILED_PRECONDITION` / "location not supported" | Free tier not offered in the server's region | Clear message |
| `JSON.parse` errors | Replies wrapped in Markdown fences | Uses JSON mode with a response schema *and* strips fences |

Check what's switched on at `GET /api/status`.

## Deploy

Push to GitHub and import the repo at [vercel.com](https://vercel.com) (free hobby tier). Add the same
environment variables under Project → Settings → Environment Variables, then add the deployed URL to
Supabase's redirect URLs.

## Project map

```
src/lib/color.ts          CIELAB conversion, CIEDE2000, depth/undertone from colour
src/lib/skinAnalysis.ts   on-device photo analysis (face region, sampling, lighting checks, concerns)
src/lib/foundations.ts    shade library, fuzzy product/shade recognition, ranking
src/lib/learning.ts       combines photo + quiz + worn shades into one skin model; profile strength
src/lib/ingredients.ts    INCI parsing, irritant knowledge base, personal pattern detection
src/lib/evidence.ts       graded claims + verified citations behind all skincare advice
src/lib/skincare.ts       evidence-ranked routine builder + curated product catalog
src/lib/makeup.ts         concealer/blush/bronzer/lip/eye suggestions
src/lib/recommend.ts      turns logged feedback into ranking constraints
src/lib/server/*          Gemini + Open Beauty Facts (server-only)
src/components/ProfileProvider.tsx   local storage + Supabase sync
supabase/schema.sql       database table + row-level security
```

## Caveats

- Shade swatches come from 2018 retailer images. They're approximations, and some ranges have changed since.
  Logging what you've worn corrects for this.
- Photo colour depends heavily on lighting and camera. The app scores lighting quality and lowers the photo's
  weight when it's poor.
- Skincare prices are approximate and formulas change. Use the ingredient lookup to check the current list.
- This gives cosmetic suggestions, not medical advice.
