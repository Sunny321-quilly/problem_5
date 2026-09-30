# PART I — Detailed Use Cases (Section I)

---

## UC-06: Submit Grades

| Element | Description |
|---|---|
| **Use Case ID** | UC-06 |
| **Primary Actor** | Scholar (or Scholarship Staff on behalf of the scholar) |
| **Goal** | Record the scholar's grades for a specific academic year and semester so compliance can be evaluated |
| **Preconditions** | Actor is logged in; scholar record exists and is assigned to an active scholarship program (BR-01) |
| **Trigger** | Scholar opens the Grade Submission form for the current semester |
| **Main Flow** | 1. Actor selects a scholar. 2. Actor enters academic year, semester, GWA, units enrolled, failed subjects, and incomplete subjects. 3. System validates all fields (valid GWA range, non-negative counts). 4. System checks that no submission exists for the same scholar/academic year/semester (BR-03). 5. System saves the submission with status **Pending (For Verification)**. 6. System sets the scholar status to *For Verification*. 7. System confirms "Submission saved." |
| **Alternative Flow** | A1. If a returned submission exists for the same term, the actor edits and resubmits it; status returns to Pending. |
| **Exception Flow** | E1. Student ID/scholar not selected → validation error. E2. GWA outside 1.00–5.00 or negative units → validation error; data preserved. E3. Duplicate submission for the same term → error message referencing BR-03. E4. Session expired → redirect to Login (UC-01). |
| **Postconditions** | A `grade_submissions` row exists with `submission_status = 'Pending'`; scholar status = *For Verification*. |
| **Related Requirements** | FR-04, FR-05, FR-10 |
| **Business Rules** | BR-01, BR-03, BR-05 |

---

## UC-07: Verify Grade Submission

| Element | Description |
|---|---|
| **Use Case ID** | UC-07 |
| **Primary Actor** | Scholarship Staff |
| **Goal** | Confirm that a pending grade submission is complete and accurate so it may be used for compliance evaluation |
| **Preconditions** | Actor is logged in with `staff` or `admin` role (BR-04); a submission with status *Pending* exists |
| **Trigger** | Staff opens the verification queue and selects a pending submission |
| **Main Flow** | 1. System `<<include>>` Login (UC-01). 2. System displays pending submissions. 3. Staff selects a submission. 4. Staff compares submitted data with official records. 5. Staff clicks **Verify**. 6. System sets `submission_status = 'Verified'`, records `verified_by` and `verified_at` (BR-08). 7. System automatically triggers UC-08 Evaluate Academic Compliance. |
| **Alternative Flow** | A1. Staff clicks **Return** with a reason → status becomes *Returned*, scholar status becomes *Pending Submission* for resubmission. |
| **Exception Flow** | E1. Actor has scholar role → access denied (NFR-01/BR-04). E2. Submission already Verified → verify action disabled (BR-09). E3. Submission not found → error message. |
| **Postconditions** | Submission is Verified and traceable to the verifying user; evaluation has been performed. |
| **Related Requirements** | FR-06, FR-15 |
| **Business Rules** | BR-04, BR-05, BR-08, BR-09, BR-10 |

---

## UC-08: Evaluate Academic Compliance

| Element | Description |
|---|---|
| **Use Case ID** | UC-08 |
| **Primary Actor** | Scholarship Coordinator (automatically invoked after verification) |
| **Goal** | Determine whether the verified semester grades satisfy the assigned scholarship program's requirements |
| **Preconditions** | Submission status is *Verified* (BR-05); scholar is assigned to a program with defined requirements (BR-02) |
| **Trigger** | Verification completes, or coordinator requests re-evaluation |
| **Main Flow** | 1. System `<<include>>` View Requirements (UC-05) to fetch the program's required GWA, minimum units, and failing-grade policy. 2. System compares submitted GWA ≤ required GWA. 3. System compares units enrolled ≥ minimum units. 4. System checks failed-subject count against `allow_failing_grade`. 5. System checks incomplete-subject count. 6. If all conditions hold → result **Compliant**; otherwise → **With Deficiency** with the failing reasons. 7. Evaluation record is stored with timestamp and evaluator. 8. UC-11 Update Scholar Status `<<extend>>` executes. |
| **Alternative Flow** | A1. If program requirements were updated, the coordinator re-runs evaluation and a new evaluation record replaces the current standing. |
| **Exception Flow** | E1. Submission not verified → evaluation refused (BR-05/BR-06). E2. Program requirements missing → error referencing BR-02. E3. Unchanged rules → identical result reproduced (deterministic). |
| **Postconditions** | A `compliance_evaluations` row exists with result *Compliant* or *With Deficiency*; scholar status updated. |
| **Related Requirements** | FR-07, FR-08, FR-09 |
| **Business Rules** | BR-02, BR-05, BR-06, BR-07 |

---

## UC-12: Process Scholarship Renewal

| Element | Description |
|---|---|
| **Use Case ID** | UC-12 |
| **Primary Actor** | Scholarship Coordinator |
| **Goal** | Decide whether a scholar's scholarship is renewed for the next academic year |
| **Preconditions** | Coordinator logged in; renewal cycle open; scholar has compliance history |
| **Trigger** | Coordinator opens the renewal queue at end of the academic year |
| **Main Flow** | 1. System `<<include>>` UC-08 Evaluate Academic Compliance to confirm the latest standing. 2. System lists scholars marked *For Renewal* (compliant scholars at cycle end). 3. Coordinator reviews compliance history and any recorded deficiencies. 4. Coordinator approves renewal → status *Renewed*. 5. System records the decision with date and evaluator. |
| **Alternative Flow** | A1. Scholar has one recorded deficiency → coordinator may set status *Probationary* for one remediation term. |
| **Exception Flow** | E1. Scholar not compliant and not eligible for probation → status *Disqualified* requires committee approval and is blocked in the prototype. E2. No compliance history → renewal blocked with a prompt to run evaluation first. |
| **Postconditions** | Scholar status is *Renewed*, *Probationary*, or unchanged; decision is traceable (BR-08). |
| **Related Requirements** | FR-07, FR-09 |
| **Business Rules** | BR-07, BR-08 |

---

## Exception-flow summary table

| Use Case | Key Exception | System Response |
|---|---|---|
| UC-06 | Invalid GWA / negative units / duplicate term | Reject with inline message; preserve input |
| UC-07 | Unauthorized role / already verified | Deny action; enforce BR-04, BR-09 |
| UC-08 | Unverified submission / missing requirements | Refuse evaluation; cite BR-05, BR-02 |
| UC-12 | No evaluation history | Block renewal; require UC-08 first |
