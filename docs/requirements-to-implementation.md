# Requirements-to-Implementation Table (Section XVII)

| Requirement | Use Case | Implemented Feature | Code Location | Test | Result |
|---|---|---|---|---|---|
| FR-01 Register Scholar | UC-02 Register Scholar | Scholar registration/update form with Student ID uniqueness + required-field validation | `scholars.html`, `js/scholars.js` | TC-02, TC-03 | Pass |
| FR-02 Assign Scholarship | UC-03 Assign Scholarship | Scholarship Program select on the scholar form (foreign key) | `scholars.html` | TC-02 | Pass |
| FR-03 Maintain Requirements | UC-04 Configure Requirements | Program CRUD: Required GWA, Minimum Units, failing-grade policy, active flag | `programs.html`, `js/programs.js` | TC-06, TC-07 | Pass |
| FR-04 Submit Grades | UC-06 Submit Grades | Grade Submission form (scholar, AY, semester, GWA, units, failed, incomplete) | `submissions.html`, `js/submissions.js` | TC-04 | Pass |
| FR-05 Record AY/Semester | UC-06 Submit Grades | Academic Year and Semester stored per submission; unique per term (BR-03) | `sql/schema.sql` constraint + form | TC-04 | Pass |
| FR-06 Verify Grade Submission | UC-07 Verify Grade Submission | **Verify** / **Return** actions restricted to admin & staff | `js/submissions.js → verify()` | TC-05 | Pass |
| FR-07 Evaluate Academic Compliance | UC-08 Evaluate Academic Compliance | Rule engine comparing GWA, units, failing/incomplete policy vs. program | `js/client.js → evaluateSubmission()` | TC-06, TC-07 | Pass |
| FR-08 Identify Deficiencies | UC-09 Record Deficiency | Deficiency reasons stored as JSON and listed per evaluation | `compliance_evaluations.reasons` | TC-07 | Pass |
| FR-09 Maintain Scholar Status | UC-11 Update Scholar Status | Status auto-synced after submit/verify/evaluate | `js/client.js → syncScholarStatus()` | TC-04…TC-07 | Pass |
| FR-10 Monitor Pending Submissions | UC-16 View Dashboard | Dashboard tiles: total scholars, pending, verified, compliant, deficient | `index.html`, `js/dashboard.js` | TC-01 | Pass |
| FR-11 Search Scholar | UC-13 Search Scholar | Search by Student ID or name (case-insensitive) | `js/scholars.js`, `js/compliance.js` | TC-08 | Pass |
| FR-12 Filter Scholars | UC-14 Filter Scholars | Filter by scholarship program and by status | `js/scholars.js` | TC-09 | Pass |
| FR-13 Generate counts/report | UC-15 Generate Compliance Report | Live counters + CSV compliance report export | `index.html`, `js/compliance.js` | TC-06, TC-07 | Pass |
| FR-14 Role-based access | UC-01 Login | Supabase Auth login/logout, route guard, role checks, RLS policies | `login.html`, `js/client.js`, `sql/schema.sql` | TC-01, TC-10 | Pass |
| FR-15 Traceable verification | UC-07 Verify Grade Submission | `verified_by`, `verified_at`, `evaluated_by`, `evaluated_at` audit fields | `sql/schema.sql` | TC-05 | Pass |

**Traceability chain demonstrated:** REQUIREMENT → USE CASE → DATABASE RECORD → USER ACTION → BUSINESS RULE → SYSTEM RESULT → TEST
