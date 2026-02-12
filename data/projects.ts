export type Project = {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  tech: string[];
  url: string;
};

export const projects: Project[] = [
  {
    id: 1,
    title: "Restaurant Le Palmier",
    category: "Site vitrine",
    description: "Création d’un site moderne avec menu en ligne et réservation.",
    image: "/images/palmier.jpg",
    tech: ["Next.js", "Tailwind"],
    url: "https://example.com",
  },
  {
    id: 2,
    title: "Coach Fitness Pro",
    category: "Landing page",
    description: "Landing page optimisée pour la prise de rendez-vous.",
    image: "/images/coach.jpg",
    tech: ["React", "Framer Motion"],
    url: "https://example.com",
  },
];
