# Luna Soul Sound Healing

A responsive four-page website built with semantic HTML, CSS, and vanilla JavaScript. Original brand artwork and photography are preserved; optimized WebP derivatives support faster loading. No frontend framework, build step, database, or runtime package installation is required.

## Structure

- `index.html`, `services.html`, `gallery.html`, `contact.html`: website pages
- `css/styles.css`: shared colors, layout, motion, and responsive components
- `js/main.js`: navigation, lightbox, video, and contact interactions
- `js/config.js`: production origin, video activation, and confirmed service options
- `js/gallery.json`: reference manifest for the nine gallery images
- `assets/images/`, `assets/videos/`: original media; `assets/optimized/`: derivatives
- `assets/icons/`: Simple Icons brand SVGs and CC0 license
- `functions/api/contact.js`: Cloudflare Pages email endpoint
- `_headers`: Cloudflare security headers; `tests/`: endpoint tests

## Local development

Use the existing checkout; cloud tasks are isolated and do not require a new Git worktree.

```sh
cd /workspace/LunaSoulSoundHealing
python3 -m http.server 8000 --bind 127.0.0.1
```

Python 3.12 and Node 24 are available in the prepared cloud environment. The static server serves every page and asset, but does **not** execute Pages Functions. The contact form accurately reports that delivery is unavailable there. Cloud command sandboxing may require supported escalation for localhost sockets and network access.

For full local Functions testing, install Wrangler outside the checkout (or use an existing trusted installation), then run from the repository:

```sh
npx wrangler pages dev . --ip 127.0.0.1 --port 8788
```

Copy `.dev.vars.example` to ignored `.dev.vars` and securely fill in values. Never commit credentials. Production Turnstile keys must allow your production hostname; use Cloudflare's documented testing keys for local integration testing only. The Function also verifies the returned hostname, so mock verification in unit tests instead of weakening production checks.

Run meaningful endpoint tests with `node tests/contact.test.mjs`. With the static server running, `python3 tests/browser.py` exercises all pages at 375, 430, 768, 1024, 1440, and 1920px, gallery keyboard interactions, navigation, form states, and reduced motion. This browser check uses the cloud environment’s existing Python Playwright and `/usr/bin/chromium`. They mock external services; live email delivery still requires configuration and a real delivery check.

## Cloudflare Pages deployment

Connect `tehPsycho/LunaSoulSoundHealing` in Cloudflare Pages, select `main`, leave the build command empty, and set the output directory to the repository root (`.`). Pages discovers `functions/` automatically. Deploy using Git integration or `wrangler pages deploy . --project-name YOUR_PROJECT`. Do not upload `.dev.vars`, local tools, or test output. Wrangler excludes Pages Functions from static uploads. No deployment was performed as part of implementation.

### Contact delivery

Create a Resend account, verify a sender domain, and create Cloudflare Turnstile keys restricted to the deployed hostname. In Cloudflare Pages → Settings → Variables and Secrets, set these separately for production and preview as needed:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Secret Resend email-send key |
| `CONTACT_TO_EMAIL` | Actual recipient email address |
| `CONTACT_FROM_EMAIL` | Sender address on your verified Resend domain |
| `TURNSTILE_SECRET_KEY` | Secret Cloudflare verification key |
| `TURNSTILE_SITE_KEY` | Public widget key for this hostname |

Redeploy after configuration. The browser obtains only the public site key and availability from `GET /api/contact`. The Function uses server-only secrets, validates fields and payload size, rejects cross-origin requests and the honeypot, and requires verified Turnstile tokens with matching hostnames. No sensitive payloads are logged. Email is plain text. Success appears only after Resend returns an accepted message ID; acceptance does not guarantee inbox arrival. Provider errors return a visible failure and retain the user's message. Verify inbox arrival with a real submission before launch. Consider Cloudflare rate limiting if abuse warrants it; Turnstile and a honeypot provide the baseline spam strategy.

Until **all five values** are set, submissions receive HTTP 503 and the site directs visitors to social channels. No submissions are stored or silently discarded. Missing credentials are an intentional pre-launch limitation.

## Updating content

### Services

The four displayed categories are **proposed**, not confirmed business offerings. Verify them with the owner. Edit the cards in `services.html`, then update `js/config.js` and mark only verified categories `confirmed: true`. Remove proposed labels and the confirmation note only after verification. Confirmed entries populate the contact dropdown. Unconfirmed card inquiries keep the dropdown on General Inquiry and prefill an availability question. Do not add unverified prices, credentials, duration, location, or availability.

### Gallery and images

Keep originals in `assets/images/`. Add optimized WebP sizes (640px and 1200px) without overwriting originals. Add a matching button to `.gallery-grid` in `gallery.html`, using the same markup and a descriptive, factual alt attribute. The lightbox discovers these buttons in document order. Keep `js/gallery.json` in sync as an editorial reference; it is not fetched at runtime. Gallery images lazy-load; originals remain intact.

### Homepage video

The supplied `assets/videos/soundhealing_video.mp4` is **two bytes and is not playable media**. The hero therefore deliberately uses the existing moonlit banner, not a remote replacement. Add a valid, compressed H.264 MP4 at that exact path, then set `videoReady: true` in `js/config.js`. Video autoplays muted with loop and playsinline, object-fit cover, and a play/pause control. Reduced-motion, small screens (600px or below), and data-saving connections use the static poster without a video download. Playback failure also restores the poster. Verify real playback and looping after replacing the file; this cannot be verified with the supplied file.

### Social links

Edit the footer in each page and the cards on `contact.html` together. Cash App must retain the literal `$` in `https://cash.app/$emilyvlove`. Cash App is a payment link, not a booking system. Brand SVGs come from Simple Icons (CC0); trademarks belong to their owners. Body typography uses local system sans serif fonts and Georgia for editorial headings, avoiding remote font requests.

## Before launch

1. Confirm the services and business copy with the owner.
2. Configure email delivery and Turnstile; send a real test and check receipt.
3. Replace the invalid video if a moving hero is desired. Static fallback is already supported.
4. Run `node scripts/configure-domain.mjs https://YOUR_REAL_DOMAIN` to generate static canonical/social metadata, sitemap, robots.txt, and the shared site origin. The command rejects non-HTTPS URLs and can be rerun. Alternatively, set `siteUrl` in `js/config.js` to the real HTTPS origin. For best crawler support, also add matching static canonical and `og:url` tags to each HTML head and make each `og:image` absolute. Runtime canonical tags are a convenience for browsers, not a substitute for server-rendered social metadata.
5. Replace relative `<loc>` values in `sitemap.xml` with absolute production URLs and add `Sitemap: https://YOUR_REAL_DOMAIN/sitemap.xml` to `robots.txt`. No domain has been invented; the sitemap is a documented pre-launch template.
6. Test the deployed site, security headers, social previews, form delivery, keyboard navigation, reduced motion, and mobile layouts. Publish through Cloudflare Pages only when ready.
