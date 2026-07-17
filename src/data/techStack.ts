export type StackItem = { name: string; icon: string };
export type StackCategory = { title: string; items: StackItem[] };

export const techStack: StackCategory[] = [
  {
    title: "Modeling & Data Science",
    items: [
      { name: "Python", icon: "python.svg" },
      { name: "PyTorch", icon: "pytorch.svg" },
      { name: "TensorFlow", icon: "tensorflow.svg" },
      { name: "Keras", icon: "keras.svg" },
      { name: "scikit-learn", icon: "scikit-learn.svg" },
      { name: "Hugging Face", icon: "hugging-face.svg" },
    ],
  },
  {
    title: "Serving & MLOps",
    items: [
      { name: "FastAPI", icon: "fastapi.svg" },
      { name: "Docker", icon: "docker.svg" },
      { name: "Flask", icon: "flask.svg" },
      { name: "MLflow", icon: "mlflow.svg" },
      { name: "GitHub Actions", icon: "github-actions.svg" },
      { name: "Airflow", icon: "apache-airflow.svg" },
    ],
  },
  {
    title: "Data Platforms & Analytics",
    items: [
      { name: "PostgreSQL", icon: "postgresql.svg" },
      { name: "SQL", icon: "sql.svg" },
      { name: "Power BI", icon: "power-bi.svg" },
      { name: "Plotly", icon: "plotly.svg" },
      { name: "Tableau", icon: "tableau.svg" },
      { name: "Streamlit", icon: "streamlit.svg" },
    ],
  },
  {
    title: "Other Tools",
    items: [
      { name: "Unity (VR/AR)", icon: "unity.svg" },
      { name: "Figma", icon: "figma.svg" },
      { name: "Git", icon: "git.svg" },
    ],
  },
];
