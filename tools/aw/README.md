# Ariel Williams — condensed GitHub Pages site

A single-page, zero-build static site for Ariel Williams.

## Deploy to GitHub Pages

1. Create or open the repository that will host the site.
2. Upload `index.html`, `favicon.svg`, `assets/`, and `.nojekyll` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, then choose `main` and `/ (root)`.

## Custom domain

Rename `CNAME.example` to `CNAME` after the domain is configured in GitHub Pages.

## Form behavior

The questionnaire posts to Formspree endpoint `meeyovgj`, which forwards submissions to Ariel without requiring the visitor to have a local email application. JavaScript submits with `fetch` and shows an inline success or failure message; without JavaScript, the browser performs a normal Formspree POST. The other actions copy the completed brief or show Ariel's full email address as direct fallbacks.

## Theme

The site defaults to a charcoal/slate dark theme with cyan actions and restrained violet highlights. The header includes a light-theme toggle. The choice is kept only for the current page view; it is not written to cookies or local storage.

## Codex activity field

The **Practice** section contains a GitHub-style activity calendar built from Ariel's recorded daily Codex token usage. The bundled dataset covers August 30, 2025 through July 12, 2026: 317 days, 305 active days, and 29.8894773 billion tokens total.

- `assets/signal-field.css` contains the scoped dark/light component styling.
- `assets/signal-field.js` contains the dataset, derived summary metrics, canvas rendering, tooltips, keyboard exploration, and daily-data table.
- Idle clusters use slow shared currents and individual particle orbits. The field pauses offscreen, pauses when the browser tab is hidden, has an explicit animation toggle, and renders a static frame for `prefers-reduced-motion`.
- Add `?snapshot=1` to the page URL for a deterministic static field during visual checks.

The visualization makes no API or network requests. Update the `codexUsage` array in `assets/signal-field.js` to extend the record; the visible total, date range, peak, average, and day counts are derived automatically.

## Hosting and console warnings

Serve the site directly from GitHub Pages or the configured custom domain. Embedding it inside Google Sites adds a separate sandboxed iframe and can produce `allow-scripts` / `allow-same-origin` and parent Content Security Policy warnings that this repository cannot control.

This site's JavaScript does not use `eval()`, `new Function()`, or string-based timers, and it does not need CSP `unsafe-eval`. Do not weaken the parent page's CSP to silence an embed or browser-extension warning. Errors mentioning `test?authuser=0` or a closed extension message channel are not emitted by this source.

## Editing

The page structure, offer styling, and form behavior are contained in `index.html`; the activity field is split into the two files listed above. Search for:

- `$500` to change the offer price.
- `fromariel@gmail.com` to change the contact address.
- `AI readiness session` to change the offer wording.
- `28M+` or `6×` to update public credentials.

## Privacy

No analytics, cookies, tracking, or external fonts are included. The page loads no third-party scripts. Form answers are sent to Formspree only when a visitor submits the readiness questionnaire.
