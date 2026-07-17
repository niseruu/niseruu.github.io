import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

type ProjectCard = {
  id: string;
  title: string;
  eyebrow: string;
  category: string;
  summary: string;
  imageSrc: string;
  imageAlt: string;
};

export default function ProjectFilter({ projects }: { projects: ProjectCard[] }) {
  const categories = useMemo(() => ["All", ...new Set(projects.map((project) => project.category))], [projects]);
  const [active, setActive] = useState("All");
  const visible = active === "All" ? projects : projects.filter((project) => project.category === active);

  return (
    <div className="project-archive">
      <div className="archive-filter" role="group" aria-label="Filter case studies">
        <span>FILTER // DISCIPLINE</span>
        <div>
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              aria-pressed={active === category}
              onClick={() => setActive(category)}
              className={active === category ? "is-active" : ""}
            >
              <small>{String(index).padStart(2, "0")}</small>{category}
            </button>
          ))}
        </div>
      </div>

      <LayoutGroup>
        <motion.div layout className="archive-grid">
          <AnimatePresence mode="popLayout">
            {visible.map((project, index) => (
              <motion.a
                key={project.id}
                layout
                href={`/projects/${project.id}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="archive-card"
              >
                <div className="archive-card-image">
                  <img src={project.imageSrc} alt={project.imageAlt} />
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>↗</span>
                </div>
                <div className="archive-card-copy">
                  <p>{project.eyebrow}</p>
                  <h2>{project.title}</h2>
                  <div><span>{project.summary}</span><b>OPEN CASE ↗</b></div>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
