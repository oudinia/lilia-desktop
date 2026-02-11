export interface Template {
  id: string;
  title: string;
  description: string;
  category: "academic" | "professional" | "personal";
  fileName: string;
  content: string;
}

export const templates: Template[] = [
  {
    id: "blank",
    title: "Blank Document",
    description: "Start from scratch with a minimal document structure.",
    category: "personal",
    fileName: "Untitled.lml",
    content: `@document
title: Untitled Document
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

# Introduction

Start writing here...
`,
  },
  {
    id: "article",
    title: "Article",
    description: "Academic article with abstract, sections, and bibliography.",
    category: "academic",
    fileName: "Article.lml",
    content: `@document
title: Article Title
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

@abstract
This paper presents our findings on the topic. We describe our methodology, present the results, and discuss their implications.

@toc

# Introduction

Introduce the problem, motivation, and research questions here.

# Background

Review related work and theoretical foundations.

## Prior Work

Describe existing approaches and their limitations.

## Theoretical Framework

Outline the theoretical basis for your work.

# Methodology

Describe the methods used in your study.

@equation(label: eq:main, mode: display)
f(x) = \\int_{a}^{b} g(t) \\, dt

# Results

Present your findings with data and analysis.

@table
| Metric | Baseline | Ours |
|--------|----------|------|
| Accuracy | 85.2% | 92.1% |
| F1 Score | 0.83 | 0.91 |
| Runtime | 120s | 45s |

# Discussion

Interpret the results and discuss implications.

# Conclusion

Summarize key findings and suggest future work.

@bibliography
[1] Author A. Title of the first reference. Journal Name, 2024.
[2] Author B. Title of the second reference. Conference, 2023.
`,
  },
  {
    id: "report",
    title: "Report",
    description: "Structured report with table of contents and appendix.",
    category: "professional",
    fileName: "Report.lml",
    content: `@document
title: Project Report
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

@toc

# Executive Summary

Provide a high-level overview of the report's findings and recommendations.

# Introduction

## Background

Describe the context and background for this report.

## Objectives

- Objective 1: ...
- Objective 2: ...
- Objective 3: ...

# Analysis

## Data Collection

Describe how data was gathered.

## Findings

@alert(info)
Key finding: summarize the most important discovery here.

### Finding 1

Detail the first major finding.

### Finding 2

Detail the second major finding.

# Recommendations

@list
- Recommendation 1: description
- Recommendation 2: description
- Recommendation 3: description

# Conclusion

Summarize the report and next steps.

# Appendix

## Additional Data

@table
| Item | Value | Notes |
|------|-------|-------|
| A | 100 | Baseline |
| B | 150 | +50% |
| C | 200 | +100% |
`,
  },
  {
    id: "thesis",
    title: "Thesis",
    description: "Master's or PhD thesis with chapters, theorems, and proofs.",
    category: "academic",
    fileName: "Thesis.lml",
    content: `@document
title: Thesis Title
language: en
paperSize: a4
fontFamily: charter
fontSize: 12

@abstract
This thesis investigates the problem of... We propose a novel approach based on... Our contributions include...

@toc

# Introduction

## Motivation

Explain why this research is important.

## Problem Statement

Formally define the problem being addressed.

## Contributions

@list
- Contribution 1: ...
- Contribution 2: ...
- Contribution 3: ...

## Thesis Outline

Chapter 2 covers... Chapter 3 presents... Chapter 4 evaluates...

# Literature Review

## Foundational Concepts

Define key terms and concepts.

@definition(title: Key Term)
A formal definition of the central concept in this work.

## Related Work

Review and compare existing approaches.

# Proposed Method

## Overview

Describe the overall approach at a high level.

## Formal Framework

@theorem(title: Main Result, label: thm:main)
State the main theoretical result of your thesis.

@proof
Provide the proof here.

## Algorithm

@code(python)
def algorithm(input):
    # Step 1: Initialize
    result = initialize(input)
    # Step 2: Process
    result = process(result)
    # Step 3: Return
    return result

# Experiments

## Experimental Setup

Describe datasets, baselines, and evaluation metrics.

## Results

@table
| Method | Dataset A | Dataset B |
|--------|-----------|-----------|
| Baseline 1 | 72.3 | 68.1 |
| Baseline 2 | 78.5 | 74.2 |
| **Ours** | **85.1** | **82.7** |

## Discussion

Analyze results, ablation studies, and failure cases.

# Conclusion

## Summary

Recap the thesis contributions.

## Future Work

Suggest directions for future research.

@bibliography
[1] Author A. Foundational paper. Journal, 2020.
[2] Author B. Related work paper. Conference, 2022.
[3] Author C. Another reference. Arxiv preprint, 2023.
`,
  },
  {
    id: "letter",
    title: "Letter",
    description: "Formal letter with header, body, and signature.",
    category: "professional",
    fileName: "Letter.lml",
    content: `@document
title: Formal Letter
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

@center
**Your Name**
Your Address Line 1
Your City, State ZIP
your.email@example.com

@date(long)

@divider(line)

**Recipient Name**
Recipient Title
Organization Name
Organization Address

Dear Recipient Name,

I am writing to express my interest in... / I am writing regarding...

In the first body paragraph, introduce the main purpose of the letter. Provide context and any necessary background information.

In subsequent paragraphs, elaborate on your points. Include specific details, examples, or supporting information as needed.

In the closing paragraph, summarize your request or main point. Include any next steps or call to action.

Thank you for your time and consideration. I look forward to hearing from you.

Sincerely,

**Your Name**
Your Title
`,
  },
  {
    id: "lab-notebook",
    title: "Lab Notebook",
    description: "Scientific lab notebook entry with protocol and observations.",
    category: "academic",
    fileName: "Lab-Notebook.lml",
    content: `@document
title: Lab Notebook Entry
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

# Lab Notebook — @date(long)

## Experiment: Experiment Title

**Researcher:** Your Name
**Lab:** Lab Name
**Supervisor:** Supervisor Name

---

## Objective

State the purpose of today's experiment.

## Materials

@list
- Material 1 (quantity, supplier)
- Material 2 (quantity, supplier)
- Equipment: instrument name, model

## Protocol

@list(ordered)
1. Step 1: Prepare samples by...
2. Step 2: Set instrument parameters to...
3. Step 3: Run measurement for...
4. Step 4: Record data in...

## Observations

@alert(note)
Record any unexpected observations or deviations from the protocol here.

### Raw Data

@table
| Sample | Trial 1 | Trial 2 | Trial 3 | Mean |
|--------|---------|---------|---------|------|
| Control | 0.52 | 0.48 | 0.51 | 0.50 |
| Sample A | 1.23 | 1.19 | 1.25 | 1.22 |
| Sample B | 0.87 | 0.91 | 0.85 | 0.88 |

### Calculations

@equation(label: eq:result, mode: display)
\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i

## Results & Discussion

Interpret the data. Compare with expected values. Note any anomalies.

## Conclusion

Summarize findings and plan for next experiment.

## Next Steps

@list
- Repeat with larger sample size
- Test additional conditions
- Consult with supervisor about results
`,
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Structured meeting notes with attendees, agenda, and actions.",
    category: "professional",
    fileName: "Meeting-Notes.lml",
    content: `@document
title: Meeting Notes
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

# Meeting Notes — @date(long)

**Meeting Title:** Weekly Team Sync
**Time:** 10:00 AM - 11:00 AM
**Location:** Conference Room / Video Call

---

## Attendees

@list
- Person 1 (Role)
- Person 2 (Role)
- Person 3 (Role)
- Person 4 (Role)

## Agenda

@list(ordered)
1. Review of last week's action items
2. Project status updates
3. Upcoming deadlines
4. Open discussion

---

## Discussion

### 1. Action Item Review

@table
| Action Item | Owner | Status |
|-------------|-------|--------|
| Task from last week | Person 1 | Completed |
| Another task | Person 2 | In progress |
| Third task | Person 3 | Blocked |

### 2. Project Updates

**Project A:**
Summary of progress, blockers, and next steps.

**Project B:**
Summary of progress, blockers, and next steps.

### 3. Upcoming Deadlines

@alert(warning)
Deadline approaching: describe the upcoming deadline and what needs to happen.

### 4. Open Discussion

Notes from open discussion items.

---

## Action Items

@table
| Action | Owner | Due Date |
|--------|-------|----------|
| Action 1 | Person 1 | Date |
| Action 2 | Person 2 | Date |
| Action 3 | Person 3 | Date |

## Next Meeting

**Date:** Next Week
**Time:** Same time
**Agenda Items for Next Meeting:**

@list
- Follow up on blocked items
- Demo of new feature
`,
  },
  {
    id: "cheat-sheet",
    title: "Cheat Sheet",
    description: "Quick reference with compact sections and examples.",
    category: "personal",
    fileName: "Cheat-Sheet.lml",
    content: `@document
title: Quick Reference
language: en
paperSize: a4
fontFamily: charter
fontSize: 10

# Quick Reference — Topic Name

## Basics

@table
| Syntax | Description | Example |
|--------|-------------|---------|
| Item 1 | What it does | \`example\` |
| Item 2 | What it does | \`example\` |
| Item 3 | What it does | \`example\` |

## Common Patterns

### Pattern 1

@code(text)
template or code example here

### Pattern 2

@code(text)
another template or code example

## Key Formulas

@equation(label: eq:1, mode: display)
E = mc^2

@equation(label: eq:2, mode: display)
F = ma

## Tips & Tricks

@alert(tip)
Helpful tip that saves time or avoids common mistakes.

@alert(warning)
Common pitfall to watch out for.

## Quick Reference Table

@table
| Shortcut | Action |
|----------|--------|
| @kbd(Ctrl+C) | Copy |
| @kbd(Ctrl+V) | Paste |
| @kbd(Ctrl+Z) | Undo |
| @kbd(Ctrl+S) | Save |

## Resources

@list
- @link(Resource 1, https://example.com)
- @link(Resource 2, https://example.com)
- @link(Resource 3, https://example.com)
`,
  },
];
