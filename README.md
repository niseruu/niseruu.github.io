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

The AssistX case study uses a cropped copy of the public AssistX wordmark published on [assistxenterprise.ai](https://assistxenterprise.ai/); it does not expose internal product artwork or customer material.

### Confidential work

For employer work covered by confidentiality obligations, keep the public case study capability-focused: public product names and material already published by the employer (such as the [AssistX Suite overview](https://assistxenterprise.ai/product/assistx-suite)) may be linked, but omit internal product names, customer data, private URLs, repository identifiers, and screenshots. Use `links: []` when a case has no approved public resources; the case-study template renders an access-restricted note instead of an empty resource block. A public repository's existing Git history is not a secrecy boundary, so review history before publishing any branch that previously contained sensitive wording.

## CV rebuild

`cv/m-shafri-syamsuddin.tex` is the editable CV source and `public/docs/m-shafri-syamsuddin-cv.pdf` is the file linked by the site. After editing the source, run:

```bash
npm run cv
```

The command uses `latexmk` when available, or falls back to `pdflatex` (two passes), then copies the generated PDF into `public/docs/`. A LaTeX toolchain is required; this environment does not currently have `latexmk` or `pdflatex`, so `npm run cv` reports that prerequisite instead of pretending to rebuild the PDF.

## Deployment (Cloudflare Pages)

Connect the repository through **Workers & Pages → Create application → Pages → Import an existing Git repository** with:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank

Cloudflare automatically deploys the root `functions/` directory as Pages Functions alongside the static Astro build.

## Contact form

The production form uses three progressively safer delivery paths:

- Primary: the Cloudflare Pages Function at `/api/contact`, which sends through Resend.
- Automatic fallback: FormSubmit's cross-origin AJAX endpoint.
- Final fallback: a prefilled `mailto:` link that preserves the visitor's message.
- Without JavaScript, the form's native action submits directly to FormSubmit.

Configure these variables under **Cloudflare Pages → Settings → Variables and Secrets**:

- `RESEND_API_KEY` — required secret from Resend.
- `CONTACT_TO_EMAIL` — optional; defaults to `shafrisyamsuddin@gmail.com`.
- `CONTACT_FROM_EMAIL` — optional; defaults to `Portfolio Contact <onboarding@resend.dev>`. Use a verified sender domain for normal production delivery.

Also submit the deployed form once and confirm FormSubmit's activation email so the backup relay is ready if the Cloudflare API is unavailable.
