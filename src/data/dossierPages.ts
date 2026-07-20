export type DossierPage = {
  id: string;
  hash: string;
  section: "hero" | "projects" | "publications" | "journey" | "tech-stack" | "scores" | "contact";
  chapter: string;
  title: string;
  code: string;
};

export const dossierPages: DossierPage[] = [
  { id: "identity", hash: "hero", section: "hero", chapter: "Identity", title: "Operator Profile", code: "ID-00" },
  { id: "project-malaria", hash: "projects", section: "projects", chapter: "Case Studies", title: "Malaria Detection", code: "CS-01" },
  { id: "project-visionserve", hash: "project-visionserve", section: "projects", chapter: "Case Studies", title: "VisionServe", code: "CS-02" },
  { id: "project-sentiment", hash: "project-sentiment", section: "projects", chapter: "Case Studies", title: "Sentiment Intelligence", code: "CS-03" },
  { id: "research", hash: "publications", section: "publications", chapter: "Research", title: "Published Work", code: "RS-01" },
  { id: "journey-1", hash: "journey", section: "journey", chapter: "Journey", title: "Current Operations", code: "JR-01" },
  { id: "journey-2", hash: "journey-2", section: "journey", chapter: "Journey", title: "Product Direction", code: "JR-02" },
  { id: "journey-3", hash: "journey-3", section: "journey", chapter: "Journey", title: "Foundation", code: "JR-03" },
  { id: "journey-4", hash: "journey-4", section: "journey", chapter: "Journey", title: "Education", code: "JR-04" },
  { id: "capabilities-1", hash: "tech-stack", section: "tech-stack", chapter: "Capabilities", title: "Modeling & Serving", code: "CP-01" },
  { id: "capabilities-2", hash: "capabilities-2", section: "tech-stack", chapter: "Capabilities", title: "Data & Tools", code: "CP-02" },
  { id: "scores", hash: "scores", section: "scores", chapter: "Scores", title: "Verified Signals", code: "SC-01" },
  { id: "contact", hash: "contact", section: "contact", chapter: "Contact", title: "Open Channel", code: "CT-01" },
  { id: "contact-form", hash: "contact-form", section: "contact", chapter: "Contact", title: "Secure Message", code: "CT-02" },
];

export const dossierChapterTargets = [
  { label: "Identity", target: "identity", code: "00" },
  { label: "Cases", target: "project-malaria", code: "01" },
  { label: "Research", target: "research", code: "02" },
  { label: "Journey", target: "journey-1", code: "03" },
  { label: "Capabilities", target: "capabilities-1", code: "04" },
  { label: "Scores", target: "scores", code: "05" },
  { label: "Contact", target: "contact", code: "06" },
] as const;
