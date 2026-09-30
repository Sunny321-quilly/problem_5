# PART I — Requirements Analysis (Sections A–G)

**System:** Student Scholarship Monitoring and Academic Compliance System

---

## A. Problem Analysis

At least eight problems in the manual/fragmented scholarship-monitoring process:

| No. | Problem | Cause | Effect |
|-----|---------|-------|--------|
| 1 | Scholar records are scattered across Excel files and paper folders | No single database of scholars | Staff cannot produce a reliable list of active scholars; duplicate and outdated records |
| 2 | Semester grades are submitted via paper forms or informal chat threads | No standardized submission channel | Lost submissions, unclear cut-off, no audit trail of who submitted what and when |
| 3 | Scholarship-specific academic rules (GWA, units, failing grades) are kept in separate memos | Rules are not encoded in the process | Staff manually re-check each rule, causing inconsistent compliance judgments |
| 4 | Grade submissions are not verified before being used | No verification step or status flag | Unverified or erroneous grades are used for renewal decisions |
| 5 | Compliance checking is done manually per scholar per semester | Evaluation is not systematic | Slow, error-prone, and scholars learn of deficiencies very late |
| 6 | Scholar status (Compliant, With Deficiency, Probationary) is not updated consistently | Status is tracked in a separate, unlinked sheet | Reports and the actual standing of a scholar contradict each other |
| 7 | Pending grade submissions are unknown until a deadline passes | No monitoring view | Follow-ups are reactive; scholars miss deadlines without warning |
| 8 | Reports are re-created from scratch every semester | No consolidated reporting facility | Wasted staff effort and delayed management reports to the committee |
| 9 | Anyone who opens the shared file can change verified grades | No access control or role separation | Data-integrity and privacy risks; BR-04 and BR-10 are violated |
| 10 | Renewal decisions are re-discussed because previous evaluations cannot be traced | No history of corrections | BR-08 (traceability of changes) cannot be satisfied |

---

## B. Stakeholder and Actor Analysis

| Stakeholder | Information Needed | Responsibility | Actor? | Why |
|---|---|---|---|---|
| Scholar | Own status, requirements, submission deadlines, deficiencies | Submits grades and supporting documents; complies with program rules | Yes | Directly uses the system to submit grades and view status |
| Scholarship Staff | Scholar records, pending submissions, verification queue | Registers scholars, verifies grade submissions, records deficiencies | Yes | Performs the daily transaction work of the system |
| Scholarship Coordinator | Compliance results, deficiencies, program requirements | Evaluates compliance, approves status changes, processes renewals | Yes | Owns compliance evaluation and renewal decisions |
| Scholarship Committee | Aggregate reports, compliance statistics, disqualification cases | Approves policies and final decisions on status and renewal | No | Consumes reports; does not transact in the prototype |
| Registrar | Official grades, academic year/semester calendar | Supplies official academic records used for verification | No | External data source; no direct system access in scope |
| System Administrator | User accounts, roles, program configuration | Manages authentication, roles, and reference data | Yes | Configures the system and access control |

---

## C. Requirements Elicitation (Interview Questions)

1. How are scholar records created and stored today, and who is allowed to update them?
2. What details must be captured when registering a scholar (student ID, degree program, year level, scholarship)?
3. How does a scholar submit grades each semester — paper, email, or an online form?
4. What fields appear on the grade submission form (GWA, units enrolled, failed subjects, incomplete subjects)?
5. What are the official academic year and semester formats used by the institution?
6. Who reviews a grade submission before it is accepted, and what makes a submission "verified"?
7. What are the academic requirements of each scholarship program (required GWA, minimum units, failing-grade policy)?
8. Are these requirements different per program, and who is authorized to change them?
9. What happens when a scholar misses the submission deadline or submits incomplete information?
10. How is a deficiency identified, recorded, and communicated to the scholar?
11. What conditions allow a scholar to be renewed, placed on probation, or disqualified?
12. What reports must be produced for the committee each semester, and how quickly must they be available?
13. Who is allowed to see grades and compliance results, and who is not?
14. Must corrections to an already-verified grade be traceable — who corrected what and when?
15. How should the dashboard indicate pending, verified, compliant, and deficient records?

---

## D. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | The system shall allow authorized staff to register scholar records. |
| FR-02 | The system shall associate a scholar with a scholarship program. |
| FR-03 | The system shall maintain academic requirements for each scholarship program. |
| FR-04 | The system shall allow semester grade submission. |
| FR-05 | The system shall record the academic year and semester of every submission. |
| FR-06 | The system shall allow authorized staff to verify a grade submission. |
| FR-07 | The system shall evaluate verified academic information against scholarship requirements. |
| FR-08 | The system shall identify deficiencies. |
| FR-09 | The system shall maintain scholar status. |
| FR-10 | The system shall identify pending grade submissions. |
| FR-11 | The system shall allow users to search scholars by Student ID or scholar name. |
| FR-12 | The system shall filter scholars by scholarship program or scholar status. |
| FR-13 | The system shall generate dashboard and compliance counts (total scholars, pending, verified, compliant, with deficiency). |
| FR-14 | The system shall restrict system access according to user roles (admin, staff, scholar). |
| FR-15 | The system shall record who verified a submission and when, so changes to academic records are traceable. |

---

## E. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Security | Only authenticated users may access the system; passwords are managed by Supabase Authentication and access is enforced by role-based row-level security. |
| NFR-02 | Privacy | Grade and compliance information is visible only to authorized roles; scholar accounts may view only their own records (BR-10). |
| NFR-03 | Usability | A staff member can register a scholar, submit grades, and verify a submission in three clicks or fewer from the main navigation; forms provide inline validation messages. |
| NFR-04 | Performance | Dashboard counts and list views respond within 3 seconds on a standard connection for up to 1,000 scholar records. |
| NFR-05 | Reliability | Data is persisted in Supabase PostgreSQL with daily backups; failed operations display a recoverable error message instead of losing entered data. |
| NFR-06 | Data Integrity | Referential integrity is enforced through foreign keys; unique constraints prevent duplicate Student IDs and duplicate submissions per scholar/academic year/semester (BR-03). |

---

## F. Business Rules

| ID | Business Rule | Implementation Note |
|----|---------------|---------------------|
| BR-01 | Every scholar must be assigned to an active scholarship program. | `scholars.scholarship_id` is a required foreign key; program must exist and be active. |
| BR-02 | Every scholarship program must define its academic requirements. | `scholarship_programs.required_gwa`, `min_units`, `allow_failing_grade` are NOT NULL. |
| BR-03 | A grade submission must belong to one scholar, academic year, and semester. | Unique constraint on `(scholar_id, academic_year, semester)`. |
| BR-04 | Only authorized personnel may verify submitted grades. | Verification action is restricted to `admin` and `staff` roles. |
| BR-05 | Only verified submissions may be used for final compliance evaluation. | Evaluation runs only when `submission_status = 'Verified'`. |
| BR-06 | A scholar cannot be marked Compliant while mandatory requirements are incomplete. | Compliance = GWA rule AND unit rule AND failing-grade policy all satisfied. |
| BR-07 | Scholar status must be based on the rules of the assigned scholarship program. | Evaluation reads the requirements of the scholar's assigned program. |
| BR-08 | Changes to verified academic records must be traceable. | `verified_by`, `verified_at`, and `compliance_evaluations` history are stored. |
| BR-09 | A submission cannot be verified twice without an authorized correction process. | Verify action is disabled unless status is `Pending`; corrections use a `Returned` status. |
| BR-10 | Sensitive grade information must only be visible to authorized users. | Row-level security policies restrict scholar-role reads to their own records. |

---

## G. Required Scholar Statuses

| Status | Condition |
|--------|-----------|
| Active | Registered scholar with no submission for the current evaluation cycle. |
| Pending Submission | Scholar has an outstanding or returned submission that must be (re)submitted. |
| For Verification | A grade submission has been saved and is awaiting staff verification. |
| Compliant | The latest verified submission satisfies every requirement of the assigned program. |
| With Deficiency | The latest verified submission fails at least one requirement of the assigned program. |
| Probationary | Scholar failed to comply in the previous cycle but is granted one remediation term by the coordinator. |
| For Renewal | Compliant scholar whose renewal period has arrived and is awaiting coordinator action. |
| Renewed | The coordinator approved renewal for the next academic year. |
| Disqualified | The scholar violated a mandatory condition (e.g., failing grade where prohibited) and the committee approved termination. |
