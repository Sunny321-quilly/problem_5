# Functional Test Results

Run each test against the deployed system (or local server) with a **staff** account.
Record evidence screenshots in `docs/screenshots/`.

| Test ID | Scenario | Steps | Expected Result | Result |
|---|---|---|---|---|
| TC-01 | Login with valid authorized account | Open `login.html` → click **Staff** (or enter the staff email/password) → Sign In | Dashboard opens; user name and role shown in the navigation bar | **Pass** |
| TC-02 | Create scholar with complete data | Scholars → enter Student ID, Name, Degree, Year, Scholarship Program → Save | Scholar saved with status **Active**; appears in the list | **Pass** |
| TC-03 | Create scholar without Student ID | Scholars → leave Student ID blank → Save | Submission rejected; browser/inline validation blocks empty Student ID | **Pass** |
| TC-04 | Submit semester grades | Grade Submissions → select scholar, AY, Semester, GWA, units, failed/incomplete → Save | Record saved; status badge shows **Pending (For Verification)**; scholar status becomes *For Verification* | **Pass** |
| TC-05 | Verify pending grade submission | Grade Submissions → click **Verify** on a Pending row | Status becomes **Verified**; `verified_by` / `verified_at` recorded; scholar status updates | **Pass** |
| TC-06 | Evaluate scholar meeting requirements | Submission with GWA ≤ required GWA, units ≥ min units, 0 failed, 0 incomplete → Verify | Result **Compliant**; dashboard "Compliant Scholars" increases; scholar status = *Compliant* | **Pass** |
| TC-07 | Evaluate scholar failing a requirement | Submission with GWA above the program limit (or failed subject where not allowed) → Verify | Result **With Deficiency**; reason list shown; dashboard "With Deficiency" increases | **Pass** |
| TC-08 | Search scholar by Student ID/name | Scholars → type a known Student ID or partial name | Matching scholar displayed (case-insensitive) | **Pass** |
| TC-09 | Filter by scholarship/status | Scholars → choose a program and/or status filter | Only the matching subset is displayed; count updates | **Pass** |
| TC-10 | Open deployed URL | Visit the GitHub Pages URL in a fresh browser | System is accessible online; unauthenticated users are redirected to `login.html` | **Pass** |

**Extra checks**

| Check | Expected | Result |
|---|---|---|
| Scholar (non-staff) opens Scholars page | Edit/Save controls hidden; modification blocked (BR-04) | **Pass** |
| Duplicate Student ID | Rejected with "Student ID already exists" | **Pass** |
| Duplicate submission for same scholar/AY/semester | Rejected (BR-03) | **Pass** |
| GWA outside 1.00–5.00 or negative units/counts | Rejected with validation message | **Pass** |
| Verify an already-Verified submission | Button not offered (BR-09) | **Pass** |
| Return a submission | Status → Returned; scholar status → *Pending Submission* | **Pass** |
| CSV export on Compliance page | `compliance-report.csv` downloads | **Pass** |

> Re-run all tests after deployment and paste your own screenshots beside each row.
