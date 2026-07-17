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
  const categories = useMemo(() => ["All", ...new Set(projects.map((p) => p.category))], [projects]);
  const [active, setActive] = useState("All");

  const visible = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <div>
      <div className="mb-12 flex flex-wrap gap-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActive(category)}
            className={`border-2 px-5 py-2 font-display text-sm font-bold transition-colors ${
              active === category
                ? "border-accent/60 bg-accent/15 text-ink"
                : "border-border text-muted hover:text-ink"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <LayoutGroup>
        <motion.div layout className="grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visible.map((project) => (
              <motion.a
                key={project.id}
                layout
                href={`/projects/${project.id}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="glass-panel group block overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={project.imageSrc}
                    alt={project.imageAlt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-3 p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{project.eyebrow}</p>
                  <h3 className="font-display text-xl font-bold text-ink">{project.title}</h3>
                  <p className="text-muted">{project.summary}</p>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
