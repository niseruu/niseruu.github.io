import type { ImageMetadata } from "astro";
import safeListeningPreview from "../assets/images/safe-listening-preview.png";

export type Tool = {
  name: string;
  preview: ImageMetadata;
  previewAlt: string;
  description: string;
  tags: string[];
  href: string;
  sourceHref: string;
};

export const tools: Tool[] = [
  {
    name: "Safe Listening Calculator",
    preview: safeListeningPreview,
    previewAlt: "The Safe Listening Calculator: six numbered steps, the estimated level in dB SPL and a chart of volume curves.",
    description:
      "Estimates how loud your headphones really get and how long that level is safe. The volume slider follows the curves Windows, Android, Apple and Linux use, not a straight line.",
    tags: ["Audio", "Hearing safety", "Vanilla JS"],
    href: "/tools/safe-listening/",
    sourceHref: "https://github.com/niseruu/Safe-Audio",
  },
];
