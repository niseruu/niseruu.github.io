export type Score = {
  name: string;
  value: string;
  numericValue: number;
  issuer: string;
  issuedAt: string;
  reportHref: string;
};

export const scores: Score[] = [
  {
    name: "TOEFL ITP",
    value: "637",
    numericValue: 637,
    issuer: "ETS",
    issuedAt: "Issued Mar 2025",
    reportHref: "/docs/toefl-itp-2025.pdf",
  },
  {
    name: "TPA",
    value: "591",
    numericValue: 591,
    issuer: "UUO PT BAPPENAS",
    issuedAt: "Issued Jun 2025",
    reportHref: "/docs/tpa-online-2025.pdf",
  },
];
