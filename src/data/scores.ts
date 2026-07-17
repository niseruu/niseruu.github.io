export type Score = {
  name: string;
  value: string;
  numericValue: number;
  meta: string;
  reportHref: string;
};

export const scores: Score[] = [
  {
    name: "TOEFL ITP",
    value: "637",
    numericValue: 637,
    meta: "Issued Mar 2025 by ETS",
    reportHref: "/docs/toefl-itp-2025.pdf",
  },
  {
    name: "TPA",
    value: "591",
    numericValue: 591,
    meta: "Issued Jun 2025 by UUO PT BAPPENAS",
    reportHref: "/docs/tpa-online-2025.pdf",
  },
];
