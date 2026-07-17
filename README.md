# M Shafri Syamsuddin Portfolio

Personal portfolio site built with [Astro](https://astro.build), React islands, Tailwind CSS v4, GSAP, and Framer Motion. Case studies are authored as MDX content collections.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Content

- `src/content/projects/*.mdx` — case studies (frontmatter defines metrics/links, body is the narrative).
- `src/data/*.ts` — journey timeline, tech stack, scores, publications, socials.
- `src/assets/images/` — photos/screenshots optimized via `astro:assets`.
- `public/` — static files served as-is (icons, PDFs, favicon).

## Deployment (Cloudflare Pages)

This project is set up for [Cloudflare Pages](https://developers.cloudflare.com/pages/):

1. In the Cloudflare dashboard, create a Pages project connected to this GitHub repo.
2. Build command: `npm run build` — Output directory: `dist`.
3. Cloudflare auto-detects the `functions/` directory for the contact form's serverless endpoint (`functions/api/contact.js`).
4. Set these environment variables/secrets on the Pages project for the contact form to actually send email (via [Resend](https://resend.com)):
   - `RESEND_API_KEY` — your Resend API key.
   - `CONTACT_TO_EMAIL` — where messages are delivered (defaults to shafrisyamsuddin@gmail.com).
   - `CONTACT_FROM_EMAIL` — verified sender address (defaults to Resend's sandbox sender).
5. Point your custom domain at the Cloudflare Pages project (or use the `*.pages.dev` URL) — this replaces GitHub Pages as the host.

Without `RESEND_API_KEY` set, the contact form shows a friendly error and visitors can still reach out via the mailto link.
