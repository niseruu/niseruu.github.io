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

## Deployment (GitHub Pages)

The workflow in `.github/workflows/deploy-pages.yml` builds `dist/` and deploys it to GitHub Pages.
In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** so GitHub does not also launch its legacy Jekyll build.

## Contact form

The production form uses FormSubmit because GitHub Pages cannot run `/api/contact` or other server functions:

- JavaScript submissions use FormSubmit's cross-origin AJAX endpoint.
- The form action uses the regular FormSubmit endpoint when JavaScript is unavailable.
- A prefilled `mailto:` link preserves the visitor's message if the relay cannot confirm delivery.
- The hidden `_honey` field provides basic bot filtering; FormSubmit provides its own spam controls.

After deploying, submit the form once and confirm the activation email sent to `shafrisyamsuddin@gmail.com`. FormSubmit retains submissions made before confirmation and delivers them after activation.

The existing `functions/api/contact.js` remains available as an optional Resend-based alternative if the site is moved to Cloudflare Pages later.
