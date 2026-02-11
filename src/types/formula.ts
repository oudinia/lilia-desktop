export interface Formula {
  id: string;
  name: string;
  description: string | null;
  latex_content: string;
  lml_content: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  is_favorite: boolean;
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFormula {
  id: string;
  name: string;
  description: string | null;
  latex_content: string;
  lml_content: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  is_favorite: boolean;
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateFormula {
  name?: string;
  description?: string;
  latex_content?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
}

export const FORMULA_CATEGORIES = [
  { id: "math", label: "Mathematics", icon: "Sigma" },
  { id: "physics", label: "Physics", icon: "Atom" },
  { id: "chemistry", label: "Chemistry", icon: "FlaskConical" },
  { id: "statistics", label: "Statistics", icon: "BarChart3" },
  { id: "computer-science", label: "Computer Science", icon: "Cpu" },
  { id: "engineering", label: "Engineering", icon: "Wrench" },
  { id: "other", label: "Other", icon: "MoreHorizontal" },
] as const;

export const FORMULA_SUBCATEGORIES: Record<string, { id: string; label: string }[]> = {
  math: [
    { id: "algebra", label: "Algebra" },
    { id: "calculus", label: "Calculus" },
    { id: "trigonometry", label: "Trigonometry" },
    { id: "linear-algebra", label: "Linear Algebra" },
    { id: "set-theory", label: "Set Theory" },
  ],
  physics: [
    { id: "mechanics", label: "Mechanics" },
    { id: "electromagnetism", label: "Electromagnetism" },
    { id: "thermodynamics", label: "Thermodynamics" },
    { id: "quantum-mechanics", label: "Quantum Mechanics" },
    { id: "relativity", label: "Relativity" },
    { id: "optics", label: "Optics" },
  ],
  chemistry: [
    { id: "general-chemistry", label: "General Chemistry" },
    { id: "physical-chemistry", label: "Physical Chemistry" },
  ],
  statistics: [
    { id: "probability", label: "Probability" },
    { id: "distributions", label: "Distributions" },
  ],
  "computer-science": [
    { id: "information-theory", label: "Information Theory" },
    { id: "algorithms", label: "Algorithms" },
  ],
};

export const CATEGORY_COLORS: Record<string, string> = {
  math: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  physics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  chemistry: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  statistics: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "computer-science": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  engineering: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};
