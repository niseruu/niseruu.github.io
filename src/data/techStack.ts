export type StackItem = { name: string; icon: string };
export type StackCategory = {
  title: string;
  domain: string;
  status: "LOADED";
  tier: "CORE" | "SUPPORTING";
  items: StackItem[];
};

export const techStack: StackCategory[] = [
  {
    title: "AI Product Engineering",
    domain: "RAG / DOCUMENT INTELLIGENCE",
    status: "LOADED",
    tier: "CORE",
    items: [
      { name: "FastAPI", icon: "fastapi.svg" },
      { name: "React", icon: "react.svg" },
      { name: "PostgreSQL", icon: "postgresql.svg" },
      { name: "SQL", icon: "sql.svg" },
      { name: "Docker", icon: "docker.svg" },
      { name: "Git", icon: "git.svg" },
    ],
  },
  {
    title: "AI Model Development",
    domain: "COMPUTER VISION / NLP / DATA SCIENCE",
    status: "LOADED",
    tier: "CORE",
    items: [
      { name: "Python", icon: "python.svg" },
      { name: "PyTorch", icon: "pytorch.svg" },
      { name: "Hugging Face Transformers", icon: "hugging-face.svg" },
      { name: "scikit-learn", icon: "scikit-learn.svg" },
      { name: "TensorFlow", icon: "tensorflow.svg" },
      { name: "Keras", icon: "keras.svg" },
    ],
  },
  {
    title: "Evaluation & Delivery",
    domain: "TESTING / OBSERVABILITY",
    status: "LOADED",
    tier: "CORE",
    items: [
      { name: "MLflow", icon: "mlflow.svg" },
      { name: "Jenkins", icon: "jenkins.svg" },
      { name: "GitHub Actions", icon: "github-actions.svg" },
      { name: "Apache Airflow", icon: "apache-airflow.svg" },
      { name: "Flask", icon: "flask.svg" },
      { name: "ONNX", icon: "onnx.svg" },
    ],
  },
  {
    title: "Applied AI Surfaces",
    domain: "VISION / ANALYTICS",
    status: "LOADED",
    tier: "SUPPORTING",
    items: [
      { name: "OpenCV", icon: "opencv.svg" },
      { name: "Streamlit", icon: "streamlit.svg" },
      { name: "Plotly", icon: "plotly.svg" },
      { name: "Power BI", icon: "power-bi.svg" },
      { name: "Tableau", icon: "tableau.svg" },
      { name: "Unity (VR/AR)", icon: "unity.svg" },
    ],
  },
];
