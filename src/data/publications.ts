export type Publication = {
  title: string;
  description: string;
  image: string;
  kind: "Paper" | "Certificate";
  source: string;
  year: string;
  status: "Published" | "Available";
  linkLabel: string;
  linkHref: string;
};

export const publications: Publication[] = [
  {
    title: "AMLDS 2025 · Tokyo",
    description:
      "Presented findings on LAB color-space augmentation for malaria diagnostics, alongside the YOLO + Faster R-CNN ensemble workflow.",
    image: "/publications/amlds-doc-2.jpg",
    kind: "Paper",
    source: "IEEE Xplore",
    year: "2025",
    status: "Published",
    linkLabel: "Read the paper",
    linkHref: "https://ieeexplore.ieee.org/document/11159455",
  },
  {
    title: "Conference Proceedings & Certificate",
    description:
      "Official documentation from the AMLDS 2025 proceedings, supporting ongoing IP work on malaria parasite detection tooling.",
    image: "/publications/amlds-certificate.jpg",
    kind: "Certificate",
    source: "AMLDS 2025",
    year: "2025",
    status: "Available",
    linkLabel: "View certificate",
    linkHref: "/publications/amlds-certificate.jpg",
  },
];
