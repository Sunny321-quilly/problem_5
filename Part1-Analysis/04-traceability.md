# PART I — Requirements Traceability (Section J) + Requirements-to-Implementation (Section XVII)

## J. Requirements Traceability

| Requirement | Actor | Use Case | Business Rule | Planned Feature |
|---|---|---|---|---|
| FR-01 Register Scholar | Scholarship Staff | UC-02 Register Scholar | BR-01 | Scholar form (Create) |
| FR-02 Assign Scholarship | Scholarship Staff | UC-03 Assign Scholarship | BR-01 | Scholarship select in scholar form |
| FR-03 Maintain Requirements | Coordinator | UC-04 Configure Requirements | BR-02 | Scholarship Programs module |
| FR-04 Submit Grades | Scholar / Staff | UC-06 Submit Grades | BR-03 | Grade Submission Form |
| FR-05 Record AY/Semester | Scholar / Staff | UC-06 Submit Grades | BR-03 | Academic Year / Semester fields |
| FR-06 Verify Grade Submission | Scholarship Staff | UC-07 Verify Grade Submission | BR-04 / BR-05 | Verification Action |
| FR-07 Evaluate Academic Compliance | Coordinator | UC-08 Evaluate Academic Compliance | BR-02 / BR-07 | Compliance Evaluation logic |
| FR-08 Identify Deficiencies | Coordinator | UC-09 Record Deficiency | BR-06 | Deficiency reasons in evaluation |
| FR-09 Maintain Scholar Status | Coordinator | UC-11 Update Scholar Status | BR-07 | Status field + auto sync |
| FR-10 Monitor Pending Submissions | Staff | UC-16 View Dashboard | BR-05 | Dashboard pending count |
| FR-11 Search Scholar | Staff | UC-13 Search Scholar | BR-10 | Search by Student ID / name |
| FR-12 Filter Scholars | Staff | UC-14 Filter Scholars | BR-10 | Filter by program / status |
| FR-13 Generate counts/report | Coordinator | UC-15 Generate Compliance Report | BR-06 | Dashboard + Compliance CSV export |
| FR-14 Role-based access | All | UC-01 Login | BR-04 / BR-10 | Supabase Auth + RLS |
| FR-15 Traceable verification | Staff | UC-07 Verify Grade Submission | BR-08 | verified_by / verified_at columns |

## XVII. Requirements-to-Implementation Check (completed after development)

| Requirement | Use Case | Implemented Feature | Location | Test | Result |
|---|---|---|---|---|---|
| FR-01 Register Scholar | UC-02 | Scholar form with validation (Student ID required + unique) | `scholars.html` | TC-02, TC-03 | Pass |
| FR-04 Submit Grades | UC-06 | Grade submission form saved as Pending | `submissions.html` | TC-04 | Pass |
| FR-06 Verify Grade Submission | UC-07 | Verify / Return buttons for staff only | `submissions.html` | TC-05 | Pass |
| FR-07 Evaluate Academic Compliance | UC-08 | Compliance logic vs. program requirements | `js/submissions.js` → `evaluateSubmission()` | TC-06, TC-07 | Pass |
| FR-10 Monitor Pending Submissions | UC-16 | Live dashboard counters | `index.html` | TC-01 | Pass |
| FR-11 / FR-12 Search & Filter | UC-13 / UC-14 | Search box + program/status filters | `scholars.html` | TC-08, TC-09 | Pass |
| FR-03 Maintain Requirements | UC-04 | Scholarship program CRUD with GWA/units/policy | `programs.html` | TC-02 | Pass |
| FR-14 Access control | UC-01 | Login/logout, role guard, RLS | `login.html`, `js/client.js` | TC-01 | Pass |

> Test evidence procedure: run the checks in `Tests/functional-tests.md` against the deployed URL and record screenshots in `docs/screenshots/`.
