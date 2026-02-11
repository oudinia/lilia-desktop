use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Formula {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub latex_content: String,
    pub lml_content: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub is_system: bool,
    pub usage_count: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct FormulaData {
    pub formulas: Vec<Formula>,
}

pub struct FormulaManager {
    path: PathBuf,
    data: FormulaData,
}

impl FormulaManager {
    pub fn new(path: PathBuf) -> Self {
        let data = Self::load_from_path(&path).unwrap_or_else(|_| {
            let seeded = FormulaData {
                formulas: Self::seed_system_formulas(),
            };
            // Save the seeded data
            if let Ok(content) = serde_json::to_string_pretty(&seeded) {
                let _ = fs::write(&path, content);
            }
            seeded
        });
        Self { path, data }
    }

    fn load_from_path(path: &PathBuf) -> io::Result<FormulaData> {
        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }

    pub fn get_all(&self) -> Vec<Formula> {
        self.data.formulas.clone()
    }

    pub fn add(&mut self, formula: Formula) -> Formula {
        self.data.formulas.push(formula.clone());
        formula
    }

    pub fn update(&mut self, id: &str, updates: FormulaUpdate) -> Option<Formula> {
        if let Some(formula) = self.data.formulas.iter_mut().find(|f| f.id == id && !f.is_system) {
            if let Some(name) = updates.name {
                formula.name = name;
            }
            if let Some(description) = updates.description {
                formula.description = Some(description);
            }
            if let Some(latex_content) = updates.latex_content {
                let slug = slugify(&formula.name);
                formula.lml_content = Some(format!(
                    "\n@equation(label: eq:{}, mode: display)\n{}\n",
                    slug, latex_content
                ));
                formula.latex_content = latex_content;
            }
            if let Some(category) = updates.category {
                formula.category = category;
            }
            if let Some(subcategory) = updates.subcategory {
                formula.subcategory = Some(subcategory);
            }
            if let Some(tags) = updates.tags {
                formula.tags = tags;
            }
            formula.updated_at = chrono::Utc::now().to_rfc3339();
            Some(formula.clone())
        } else {
            None
        }
    }

    pub fn remove(&mut self, id: &str) -> bool {
        let len_before = self.data.formulas.len();
        self.data.formulas.retain(|f| f.id != id || f.is_system);
        self.data.formulas.len() < len_before
    }

    pub fn toggle_favorite(&mut self, id: &str) -> Option<Formula> {
        if let Some(formula) = self.data.formulas.iter_mut().find(|f| f.id == id) {
            formula.is_favorite = !formula.is_favorite;
            formula.updated_at = chrono::Utc::now().to_rfc3339();
            Some(formula.clone())
        } else {
            None
        }
    }

    pub fn increment_usage(&mut self, id: &str) -> Option<Formula> {
        if let Some(formula) = self.data.formulas.iter_mut().find(|f| f.id == id) {
            formula.usage_count += 1;
            formula.updated_at = chrono::Utc::now().to_rfc3339();
            Some(formula.clone())
        } else {
            None
        }
    }

    pub fn save(&self) -> io::Result<()> {
        let content = serde_json::to_string_pretty(&self.data)?;
        fs::write(&self.path, content)
    }

    fn seed_system_formulas() -> Vec<Formula> {
        let formulas_data: Vec<(&str, &str, &str, &str, &str, Vec<&str>)> = vec![
            // Math — Algebra
            ("Quadratic Formula", "Solutions to ax² + bx + c = 0", "math", "algebra",
             r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}", vec!["roots", "polynomial"]),
            ("Binomial Theorem", "Expansion of (a + b)^n", "math", "algebra",
             r"(a + b)^n = \sum_{k=0}^{n} \binom{n}{k} a^{n-k} b^k", vec!["expansion", "combinatorics"]),
            ("Logarithm Change of Base", "Change base of logarithm", "math", "algebra",
             r"\log_b a = \frac{\ln a}{\ln b}", vec!["logarithm", "base"]),
            ("Geometric Series Sum", "Sum of infinite geometric series", "math", "algebra",
             r"\sum_{k=0}^{\infty} ar^k = \frac{a}{1-r}, \quad |r| < 1", vec!["series", "infinite"]),

            // Math — Calculus
            ("Fundamental Theorem of Calculus", "Connects differentiation and integration", "math", "calculus",
             r"\int_a^b f'(x)\,dx = f(b) - f(a)", vec!["integral", "derivative"]),
            ("Integration by Parts", "Product rule for integration", "math", "calculus",
             r"\int u\,dv = uv - \int v\,du", vec!["integral", "technique"]),
            ("Chain Rule", "Derivative of composite functions", "math", "calculus",
             r"\frac{d}{dx}[f(g(x))] = f'(g(x)) \cdot g'(x)", vec!["derivative", "composite"]),
            ("Taylor Series", "Power series expansion of a function", "math", "calculus",
             r"f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n", vec!["series", "expansion"]),
            ("L'Hôpital's Rule", "Evaluate limits of indeterminate forms", "math", "calculus",
             r"\lim_{x \to c} \frac{f(x)}{g(x)} = \lim_{x \to c} \frac{f'(x)}{g'(x)}", vec!["limit"]),
            ("Gaussian Integral", "Integral of e^(-x²)", "math", "calculus",
             r"\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}", vec!["integral", "gaussian"]),

            // Math — Trigonometry
            ("Pythagorean Identity", "Fundamental trig identity", "math", "trigonometry",
             r"\sin^2\theta + \cos^2\theta = 1", vec!["identity"]),
            ("Euler's Formula", "Complex exponential and trig", "math", "trigonometry",
             r"e^{i\theta} = \cos\theta + i\sin\theta", vec!["complex", "euler"]),
            ("Law of Cosines", "Generalized Pythagorean theorem", "math", "trigonometry",
             r"c^2 = a^2 + b^2 - 2ab\cos C", vec!["triangle"]),
            ("Double Angle (Sine)", "Sin of double angle", "math", "trigonometry",
             r"\sin 2\theta = 2\sin\theta\cos\theta", vec!["identity"]),

            // Math — Linear Algebra
            ("Matrix Determinant (2×2)", "Determinant of a 2×2 matrix", "math", "linear-algebra",
             r"\det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc", vec!["matrix", "determinant"]),
            ("Eigenvalue Equation", "Definition of eigenvalues", "math", "linear-algebra",
             r"A\mathbf{v} = \lambda\mathbf{v}", vec!["eigenvalue"]),
            ("Dot Product", "Inner product of vectors", "math", "linear-algebra",
             r"\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta", vec!["vector"]),

            // Math — Set Theory
            ("De Morgan's Laws", "Complement of union/intersection", "math", "set-theory",
             r"\overline{A \cup B} = \overline{A} \cap \overline{B}", vec!["sets"]),

            // Physics — Mechanics
            ("Newton's Second Law", "Force equals mass times acceleration", "physics", "mechanics",
             r"\mathbf{F} = m\mathbf{a}", vec!["force", "newton"]),
            ("Kinetic Energy", "Energy of motion", "physics", "mechanics",
             r"E_k = \frac{1}{2}mv^2", vec!["energy"]),
            ("Newton's Law of Gravitation", "Gravitational force between two masses", "physics", "mechanics",
             r"F = G\frac{m_1 m_2}{r^2}", vec!["gravity"]),
            ("Simple Harmonic Motion", "Position in SHM", "physics", "mechanics",
             r"x(t) = A\cos(\omega t + \phi)", vec!["oscillation"]),

            // Physics — Electromagnetism
            ("Coulomb's Law", "Electric force between charges", "physics", "electromagnetism",
             r"F = k_e \frac{q_1 q_2}{r^2}", vec!["electric", "charge"]),
            ("Maxwell's Equations (Gauss)", "Gauss's law for electric fields", "physics", "electromagnetism",
             r"\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}", vec!["maxwell"]),
            ("Ohm's Law", "Voltage, current, resistance relationship", "physics", "electromagnetism",
             r"V = IR", vec!["circuit"]),

            // Physics — Thermodynamics
            ("Ideal Gas Law", "PV = nRT", "physics", "thermodynamics",
             r"PV = nRT", vec!["gas"]),
            ("Boltzmann Entropy", "Statistical definition of entropy", "physics", "thermodynamics",
             r"S = k_B \ln \Omega", vec!["entropy"]),

            // Physics — Quantum Mechanics
            ("Schrödinger Equation", "Time-dependent Schrödinger equation", "physics", "quantum-mechanics",
             r"i\hbar\frac{\partial}{\partial t}\Psi = \hat{H}\Psi", vec!["wavefunction"]),
            ("Heisenberg Uncertainty", "Position-momentum uncertainty", "physics", "quantum-mechanics",
             r"\Delta x \, \Delta p \geq \frac{\hbar}{2}", vec!["uncertainty"]),

            // Physics — Relativity
            ("Mass-Energy Equivalence", "Einstein's famous equation", "physics", "relativity",
             r"E = mc^2", vec!["einstein"]),
            ("Lorentz Factor", "Time dilation factor", "physics", "relativity",
             r"\gamma = \frac{1}{\sqrt{1 - \frac{v^2}{c^2}}}", vec!["lorentz"]),

            // Chemistry
            ("Nernst Equation", "Electrode potential under non-standard conditions", "chemistry", "physical-chemistry",
             r"E = E^\circ - \frac{RT}{nF}\ln Q", vec!["electrochemistry"]),
            ("Arrhenius Equation", "Temperature dependence of reaction rates", "chemistry", "physical-chemistry",
             r"k = A e^{-E_a / RT}", vec!["kinetics"]),
            ("Henderson-Hasselbalch", "pH of buffer solutions", "chemistry", "general-chemistry",
             r"\text{pH} = \text{p}K_a + \log\frac{[\text{A}^-]}{[\text{HA}]}", vec!["pH", "buffer"]),
            ("Gibbs Free Energy", "Spontaneity of reactions", "chemistry", "physical-chemistry",
             r"\Delta G = \Delta H - T\Delta S", vec!["thermodynamics"]),

            // Statistics
            ("Bayes' Theorem", "Conditional probability", "statistics", "probability",
             r"P(A|B) = \frac{P(B|A)\,P(A)}{P(B)}", vec!["probability"]),
            ("Normal Distribution", "Gaussian probability density function", "statistics", "distributions",
             r"f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}", vec!["gaussian"]),
            ("Standard Deviation", "Measure of dispersion", "statistics", "distributions",
             r"\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i - \mu)^2}", vec!["variance"]),

            // Computer Science
            ("Shannon Entropy", "Information entropy", "computer-science", "information-theory",
             r"H(X) = -\sum_{i} p(x_i) \log_2 p(x_i)", vec!["information"]),
            ("Stirling's Approximation", "Approximation of factorial", "computer-science", "algorithms",
             r"\ln n! \approx n\ln n - n", vec!["factorial"]),
            ("Big-O Master Theorem", "Recurrence relation solution", "computer-science", "algorithms",
             r"T(n) = aT\!\left(\frac{n}{b}\right) + O(n^d)", vec!["complexity"]),
        ];

        formulas_data
            .into_iter()
            .map(|(name, desc, cat, subcat, latex, tags)| {
                let slug = slugify(name);
                let now = chrono::Utc::now().to_rfc3339();
                Formula {
                    id: Uuid::new_v4().to_string(),
                    name: name.to_string(),
                    description: Some(desc.to_string()),
                    latex_content: latex.to_string(),
                    lml_content: Some(format!(
                        "\n@equation(label: eq:{}, mode: display)\n{}\n",
                        slug, latex
                    )),
                    category: cat.to_string(),
                    subcategory: Some(subcat.to_string()),
                    tags: tags.into_iter().map(|t| t.to_string()).collect(),
                    is_favorite: false,
                    is_system: true,
                    usage_count: 0,
                    created_at: now.clone(),
                    updated_at: now,
                }
            })
            .collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub latex_content: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Option<Vec<String>>,
}

fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
