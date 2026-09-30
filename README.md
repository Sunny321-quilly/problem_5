# Student Scholarship Monitoring and Academic Compliance System

Systems Analysis and Design — Scholarship Monitoring System Laboratory
**Part I:** Requirements Analysis and Use Case Modeling · **Part II:** 2.5-Hour System Development

**Stack:** HTML / CSS / JavaScript (vanilla) + Supabase (PostgreSQL + Auth) + GitHub Pages

---

## 1. Repository Contents

```
ScholarshipMonitoringSystem/
├── README.md
├── Part1-Analysis/
│   ├── 01-requirements-analysis.md     (Sections A–G: problems, stakeholders, interviews, FR, NFR, BR, statuses)
│   ├── 02-use-case-modeling.md         (Section H: actors, 17 use cases, include/extend)
│   ├── 03-detailed-use-cases.md        (Section I: 4 detailed use cases)
│   ├── 04-traceability.md              (Section J + Section XVII implementation check)
│   ├── use-case-diagram.mmd            (Mermaid use case diagram)
│   ├── use-case-diagram.puml           (PlantUML use case diagram)
│   └── ERD.mmd                         (Mermaid ERD — Section IV database structure)
├── Part2-Development/
│   ├── login.html                      Module 1 — Authentication
│   ├── index.html                      Module 5 — Compliance Dashboard
│   ├── scholars.html                   Module 2 — Scholar Management
│   ├── programs.html                   Module 3 — Scholarship Requirements
│   ├── submissions.html                Module 4 — Grade Submission & Verification
│   ├── compliance.html                 Module 5 — Compliance Monitoring / Reports
│   ├── css/styles.css
│   ├── js/config.js                    ← put your Supabase URL + anon key here
│   ├── js/client.js                    auth guard, helpers, compliance rule
│   ├── js/dashboard.js · scholars.js · programs.js · submissions.js · compliance.js
│   └── sql/
│       ├── schema.sql                    full database script (tables, RLS, sample programs)
│       └── demo_account.sql              demo logins + demo scholars/submissions
├── Tests/functional-tests.md           TC-01 … TC-10 results
└── docs/
    ├── requirements-to-implementation.md
    └── screenshots/                    add your workflow screenshots here
```

## 2. Setup (≈15 minutes)

1. **Create a Supabase project** at https://supabase.com → New project.
2. Open **SQL Editor**, paste the contents of `Part2-Development/sql/schema.sql`, and **Run**.
   This creates `profiles`, `scholarship_programs`, `scholars`, `grade_submissions`,
   `compliance_evaluations`, row-level security policies, and 4 sample scholarship programs.
3. In the same SQL Editor run `Part2-Development/sql/demo_account.sql`. It creates the two demo
   logins and a few sample scholars, submissions and evaluations.
4. In **Authentication → Providers → Email**, keep Email enabled, turn **off** "Confirm email" for
   fast lab testing, and turn **off** "Allow new users to sign up" — accounts are provisioned by
   the registrar, not self-registered (FR-14).
5. In **Project Settings → API**, copy the Project URL and `anon` public key into
   `Part2-Development/js/config.js`.
6. Open `login.html` in a browser (or run `npx serve Part2-Development`) and sign in.

### Demo accounts (from `sql/demo_account.sql`)

| Role | Email | Password | Sees |
|---|---|---|---|
| Admin | `admin@demo.scholarship.app` | `DemoAdmin123` | Everything, plus profile role management |
| Staff | `staff@demo.scholarship.app` | `DemoStaff123` | Full scholar/program/submission access |
| Scholar 1 | `2026001@demo.scholarship.app` | `DemoScholar123` | Own record only (Ana Reyes, Compliant) |
| Scholar 2 | `2026002@demo.scholarship.app` | `DemoScholar123` | Own record only (Bruno Santos, With Deficiency) |

`login.html` has one-click buttons for all four. The scholar logins use the student ID as the
email prefix because the RLS policies match a signed-in scholar to their record by
`student_id = split_part(email, '@', 1)`.

> The `anon` key is safe to expose in client code — all tables are protected by Row Level Security.

## 3. Compliance Rule (documented, not assumed)

Institutional grading: **1.00 = highest, 5.00 = failing** (lower GWA is better).

A **verified** submission is:

```
COMPLIANT  ⟺  GWA ≤ program.required_gwa
          AND units_enrolled ≥ program.min_units
          AND (program.allow_failing_grade OR failed_subjects = 0)
          AND incomplete_subjects = 0
otherwise WITH DEFICIENCY (each failed condition is listed as a reason)
```

Rules are stored **per scholarship program** (`scholarship_programs`), never hard-coded —
change a program's GWA/units/policy in **Scholarship Programs** and re-verify/re-evaluate to see
new results. Implemented in `js/client.js → evaluateSubmission()` and executed only when a
submission reaches `Verified` status (**BR-05**).

## 4. End-to-End Workflow (the graded path)

1. Log in (staff) → `login.html` → **Staff** one-click button **[TC-01]**
2. Register a scholar + assign a scholarship program → `scholars.html` **[TC-02, TC-03]**
3. Create a semester grade submission → saved as **Pending / For Verification** **[TC-04]**
4. Verify the submission (staff only) → **Verified**, `verified_by/verified_at` recorded **[TC-05]**
5. System auto-evaluates against the program rules → **Compliant** or **With Deficiency** **[TC-06, TC-07]**
6. Dashboard counters and Scholar Status Board update live → `index.html`, `compliance.html`
7. Search by Student ID/name and filter by program/status → `scholars.html` **[TC-08, TC-09]**

Seeded by `sql/demo_account.sql`: Ana Reyes (Compliant), Bruno Santos (With Deficiency), Carla
Mendoza (Pending — verify her to run the rule live), Diego Lim (Active, no submission yet).

## 5. Deploy to GitHub Pages

```bash
cd Part2-Development
git init
git add . && git commit -m "Initialize scholarship monitoring system"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

Suggested commits (minimum four):

1. `Initialize scholarship monitoring system`
2. `Create scholar and scholarship database modules`
3. `Implement grade submission and verification`
4. `Add compliance evaluation dashboard and deployment`

Then: GitHub → **Settings → Pages → Source: Deploy from a branch → main / root** → Save.
Live URL: `https://<your-username>.github.io/<repo>/` (start at `login.html`).

## 6. Instructor Demonstration Script

| Ask | Do this |
|---|---|
| Register a new scholar | Scholars → fill form → Save |
| Assign a scholarship program | Choose it in the scholar's Scholarship Program select |
| Create a semester grade submission | Grade Submissions → fill form → Save (status = Pending) |
| Show a Pending submission | Queue shows badge **Pending**; dashboard "Pending Submissions" ≥ 1 |
| Verify the submission | Click **Verify** (staff account only) |
| Show a Compliant scholar | Use GWA ≤ required GWA, enough units, 0 failed, 0 incomplete → **Compliant** |
| Make the scholar With Deficiency | Edit data: e.g. GWA 2.90 for a 1.75 program, or 1 failed subject → re-verify a new term → **With Deficiency** with reasons |
| Search for a scholar | Scholars page → search box (Student ID or name) |
| Which FR produced this feature? | See `Part1-Analysis/04-traceability.md` |
| Which BR controls the compliance decision? | **BR-06** (+ BR-02, BR-05, BR-07) — shown in `evaluateSubmission()` in `js/client.js` |

## 7. Submission Checklist

- [x] GitHub repository URL — *(add after pushing)*
- [x] Live deployed system URL — *(add after enabling Pages)*
- [x] Use Case Diagram — `Part1-Analysis/use-case-diagram.mmd` / `.puml`
- [x] Final Functional Requirements — `Part1-Analysis/01-requirements-analysis.md`
- [x] Database / ERD — `Part1-Analysis/ERD.mmd` + `Part2-Development/sql/schema.sql`
- [x] Four meaningful Git commits — see §5
- [x] Functional test results — `Tests/functional-tests.md`
- [x] Requirements-to-Implementation table — `docs/requirements-to-implementation.md`
- [x] Screenshots of the core workflow — save to `docs/screenshots/` (login, submission Pending,
      verification, compliant/deficiency result, dashboard)
