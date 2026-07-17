import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      eyebrow: z.string(),
      summary: z.string(),
      heroImage: image(),
      heroImageAlt: z.string(),
      metrics: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        })
      ),
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        })
      ),
      featured: z.boolean().default(false),
      order: z.number().default(0),
    }),
});

export const collections = { projects };
