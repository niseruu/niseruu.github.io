export type JourneyEntry = {
  period: string;
  title: string;
  description: string;
  kind: "ROLE" | "EDUCATION" | "LEADERSHIP";
};

export const journey: JourneyEntry[] = [
  {
    period: "Sep 2025 - Present",
    title: "Research Assistant, Universitas Gadjah Mada (Remote Part Time)",
    description:
      "Feature enhancement of medical images and training YOLOv11 with it. Further details can't be mentioned.",
    kind: "ROLE",
  },
  {
    period: "2023 - 2025",
    title: "Master of Computer Science, Universitas Gadjah Mada",
    description:
      "Thesis on malaria parasite detection using YOLO and Faster R-CNN; GPA 3.73/4.00. Led research warehouse analytics projects and hotel pricing studies.",
    kind: "EDUCATION",
  },
  {
    period: "2024 - 2025",
    title: "Data Scientist Trainee, Rakamin Academy",
    description:
      "Delivered NLP-driven CV summarisation, ensemble model experiments, and MLOps practices across regression, classification, and deep learning tracks.",
    kind: "ROLE",
  },
  {
    period: "2022 - 2023",
    title: "Product Lead, JIWANA (UBIC Incubation)",
    description:
      "Guided a mental-health chatbot initiative, aligning stakeholders, shaping product direction, and contributing to UX and model prototyping.",
    kind: "LEADERSHIP",
  },
  {
    period: "2021 - 2022",
    title: "Junior Game Developer, CreativeBox Tech",
    description:
      "Worked on the Unity development and programming side of a Virtual Reality Education Room project, building the interactive systems and backend logic that let teachers teach using digital-twin 3D objects such as human hearts, engines, or other real-world models.",
    kind: "ROLE",
  },
  {
    period: "2020 - 2022",
    title: "Human Resource Development Staff, IMIX",
    description:
      "Designed growth programs, facilitated training, and built a high-performing student community through structured evaluations.",
    kind: "LEADERSHIP",
  },
  {
    period: "2020 - 2022",
    title: "Bachelor of Engineering in Informatics, Double Degree Scholar, Nanjing Xiaozhuang University (NXU)",
    description:
      "Completed the international informatics engineering track with GPA 3.68/4.00, expanding cross-cultural collaboration and applied coursework experience.",
    kind: "EDUCATION",
  },
  {
    period: "2018 - 2022",
    title: "Sarjana Komputer, Universitas Islam Indonesia",
    description:
      "Graduated with GPA 3.68/4.00; built an educational game that teaches algorithmic thinking and contributed to multiple applied research projects.",
    kind: "EDUCATION",
  },
];
