# PART I — Use Case Modeling (Sections H–I)

**System:** Student Scholarship Monitoring and Academic Compliance System

---

## H. Use Case Analysis

### Actors

| Actor | Description |
|---|---|
| Scholar | Submits semester grades and views own status/requirements |
| Scholarship Staff | Registers scholars, creates/monitors submissions, verifies grades |
| Scholarship Coordinator | Configures requirements, evaluates compliance, processes renewals |
| System Administrator | Manages accounts, roles, and reference data |

### Use Cases (17)

| ID | Use Case | Primary Actor | Brief Description |
|----|----------|---------------|-------------------|
| UC-01 | Login | All actors | Authenticate to access protected functions |
| UC-02 | Register Scholar | Scholarship Staff | Create a scholar record with Student ID, name, degree, year, program |
| UC-03 | Assign Scholarship | Scholarship Staff | Associate a scholar with a scholarship program |
| UC-04 | Configure Scholarship Requirements | Coordinator | Create/update GWA, minimum units, failing-grade policy per program |
| UC-05 | View Requirements | Scholar / Staff | Read the academic requirements of a program |
| UC-06 | Submit Grades | Scholar / Staff | Record GWA, units, failed and incomplete subjects for a semester |
| UC-07 | Verify Grade Submission | Scholarship Staff | Mark a pending submission as Verified (or Returned) |
| UC-08 | Evaluate Academic Compliance | Coordinator | Compare a verified submission against program requirements |
| UC-09 | Record Deficiency | Coordinator | Register the specific requirement the scholar failed |
| UC-10 | View Deficiency | Scholar / Staff | Read recorded deficiencies and reasons |
| UC-11 | Update Scholar Status | Coordinator | Change the scholar's status based on evaluation results |
| UC-12 | Process Scholarship Renewal | Coordinator | Decide renewal for compliant scholars at cycle end |
| UC-13 | Search Scholar | Scholarship Staff | Find a scholar by Student ID or name |
| UC-14 | Filter Scholars | Scholarship Staff | Narrow the scholar list by program or status |
| UC-15 | Generate Compliance Report | Coordinator | Produce compliance counts/list for the committee |
| UC-16 | View Dashboard | All actors | See live counts of scholars, pending, verified, compliant, deficient |
| UC-17 | Logout | All actors | End the authenticated session |

### Relationships

**`<<include>>` (at least three):**
- UC-02 Register Scholar `<<include>>` UC-01 Login
- UC-06 Submit Grades `<<include>>` UC-01 Login
- UC-07 Verify Grade Submission `<<include>>` UC-01 Login
- UC-08 Evaluate Academic Compliance `<<include>>` UC-05 View Requirements
- UC-12 Process Scholarship Renewal `<<include>>` UC-08 Evaluate Academic Compliance
- UC-15 Generate Compliance Report `<<include>>` UC-08 Evaluate Academic Compliance

**`<<extend>>` (at least two):**
- UC-09 Record Deficiency `<<extend>>` UC-08 Evaluate Academic Compliance (when a requirement fails)
- UC-11 Update Scholar Status `<<extend>>` UC-08 Evaluate Academic Compliance (after evaluation completes)
- UC-14 Filter Scholars `<<extend>>` UC-13 Search Scholar (optional refinement)

### Use Case Diagram

Source files:
- `use-case-diagram.mmd` (Mermaid — renders on GitHub/mermaid.live)
- `use-case-diagram.puml` (PlantUML — renders with PlantUML)
- ASCII fallback below

```text
                                 +--------------------------------------------------+
                                 |   Student Scholarship Monitoring and              |
   +--------+                    |   Academic Compliance System                      |
   | Scholar |                   |                                                  |
   +--------+                    |  UC-01 Login  <----------- UC-02 Register Scholar|
     |  |                         |                            UC-06 Submit Grades  |
     |  +---- UC-06 Submit Grades |  UC-05 View Requirements                        |
     |  +---- UC-10 View Deficiency|  UC-07 Verify Grade Submission                 |
     |                           |  UC-08 Evaluate Academic Compliance             |
 +---+------------+              |    UC-09 Record Deficiency      [<<extend>>]    |
 | Scholarship Staff|            |    UC-11 Update Scholar Status   [<<extend>>]    |
 +---+------------+              |  UC-12 Process Scholarship Renewal              |
   |  |                          |  UC-13 Search Scholar  <--- UC-14 Filter [ext]  |
   |  +-- UC-02 Register Scholar |  UC-15 Generate Compliance Report               |
   |  +-- UC-03 Assign Scholarship| UC-16 View Dashboard                           |
   |  +-- UC-07 Verify Submission | UC-17 Logout                                    |
   |  +-- UC-13 Search Scholar   |                                                  |
 +---+----------------+          +--------------------------------------------------+
 | Scholarship Coordinator|
 +---+----------------+
   |  +-- UC-04 Configure Requirements
   |  +-- UC-08 Evaluate Compliance
   |  +-- UC-11 Update Status
   |  +-- UC-12 Process Renewal
   |  +-- UC-15 Generate Report
 +---+----------------------+
 | System Administrator      |  UC-01 Login, UC-17 Logout, user/role management
 +---------------------------+
```
