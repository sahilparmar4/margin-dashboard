# Margin Dashboard

A local-first financial analytics dashboard for understanding project
profitability, employee utilization, departmental costs, and monthly
financial performance.

The application processes timesheet, salary, and project-pricing data,
applies cost-allocation assumptions, and presents financial summaries
and drill-down reports.

> **Documentation note:** This README reflects the code and requirements
> reviewed so far. Confirm commands, environment variables, input
> schemas, and end-to-end behavior against the current repository before
> final submission.

## Overview

Margin Dashboard is intended to help users understand: - Revenue, cost,
profit, and margin for a reporting period. - Project-level profitability
and cost allocation. - Employee billable hours and
productivity/utilization. - Cost and hours distribution by department
and work category. - Missing data that may affect financial
interpretation. - Whether modeled cost reconciles with payroll and
overhead.

## Implemented Functionality

Based on the supplied implementation:

-   Dashboard summaries with available-period discovery and year/month
    filtering.
-   Monthly trend data for a selected year.
-   Project list and project detail reports, including hours, price,
    cost, profit, margin, department breakdowns, and employee
    contributions.
-   Employee productivity calculations and employee-category hours
    matrix.
-   Department summaries and employee-level department details.
-   Upload parsing and validation for timesheet, salary, and
    project-pricing files.
-   Gap reporting for missing salary data, unpriced projects, and months
    without billable hours.
-   Cost reconciliation helper comparing modeled cost with payroll and
    overhead.
-   Search/sort support in reporting APIs where implemented.

A helper or API being present does not by itself confirm that its UI
workflow is complete or has passed end-to-end testing. See [Validation
Checklist](#validation-checklist).

## Data Inputs

  -----------------------------------------------------------------------
  Input                               Purpose
  ----------------------------------- -----------------------------------
  Timesheets                          Employee hours, category,
                                      project/reference code, department,
                                      and reporting period.

  Salaries                            Salary information used for direct
                                      cost rates and payroll totals.

  Project pricing                     Project/reference-code price and
                                      related project information used
                                      for revenue and profitability.
  -----------------------------------------------------------------------

The upload service parses and validates supplied files before saving. If
validation issues are detected, the upload is rejected rather than
saving a partially parsed set. Requests with no supplied files are also
rejected.

Use the exact column names, file formats, and required fields expected
by the parsers in the repository. Those schemas should be added here
after checking the parser implementations.

## Cost Model and Calculation Logic

The calculation flow represented in the supplied code is summarized
below.

### Direct cost rate

For an employee/month combination:

`Direct hourly rate = Monthly salary / Total hours logged in the month`

Support/salaried employees with salary but no logged hours are handled
separately so their salary can be included in the indirect-cost pool.
Missing salary data is recorded as a data-quality gap.

### Non-billable cost absorption

`Absorbed non-billable cost = Non-billable hours × Direct hourly rate`

Non-billable lines are not assigned project-level cost in the same way
as billable lines; the associated cost is reflected through the
absorbed-cost pool.

### Indirect-cost pool

The pool combines support salaries, absorbed non-billable cost, and
monthly overhead assumptions.

When billable hours exist:

`Indirect rate = Indirect-cost pool / Total billable hours`

When a month has no billable hours, the indirect rate is set to zero and
the pool is reported as unallocated cost.

### Project revenue allocation

Project price is allocated across billable lines for the same project
reference code in proportion to billable hours:

`Allocated revenue = Project price × Line billable hours / Total billable hours for the project`

If project pricing is missing, the model records an unpriced-project
gap. Missing revenue is treated as zero in summary calculations, so the
gap report should be reviewed before interpreting profitability.

### Profit and margin

`Profit = Revenue − Cost`

`Margin (%) = (Profit / Revenue) × 100`

Margin is not meaningful when revenue is zero; review missing-price and
unpriced-project warnings in those cases.

## Reports and Analytics

### Period summary

The reporting layer includes total hours, billable hours, utilization,
revenue, cost, profit, margin, payroll, overhead, unpriced cost, and
unallocated cost.

### Monthly trends

Monthly series aggregate period summaries by month, optionally scoped to
a year.

### Project detail

Project detail includes project price/status where available, total
billable hours, direct cost, indirect cost, total cost, profit, margin,
hours by department, and employee-level contributions.

### Employee productivity

`Productivity (%) = Billable hours / Total hours × 100`

Confirm the UI label and percentage formatting against the
implementation. Productivity is not meaningful for an employee with zero
total hours.

### Department reporting

Department reports provide department-level hours, cost, and people
counts. Department detail includes employee hours, billable hours,
salary cost, and allocated cost.

## Data Quality and Reconciliation

### Gap reporting

The model can identify: - Employees with missing salary data. - Billable
work associated with projects that have no price. - Months without
billable hours. - Cost that cannot be allocated because a month has no
billable hours.

These warnings matter when interpreting the financial results. A report
can calculate successfully while still depending on incomplete source
data.

### Reconciliation

The reconciliation helper compares modeled cost with expected payroll
plus overhead:

`Expected cost = Payroll + Overhead`

The check is considered successful when the absolute difference between
modeled cost and expected cost is less than `0.005`.

Validate this against the complete source dataset, the intended
reporting period, and the correct overhead assumptions. A successful
arithmetic check does not independently prove that every source record
or allocation is correct.

## Technology

The supplied code indicates the use of: - Next.js and React -
TypeScript - Tailwind CSS - Node.js - ExcelJS, where spreadsheet
processing/export is used - Yup, where schema validation is used -
Vitest and `tsx`, where configured - PostgreSQL (`pg`), where database
access is configured

Confirm actual dependency versions and available scripts in
`package.json` before treating this as the final technology inventory.

## Getting Started

### Prerequisites

-   A Node.js version supported by the repository.
-   npm or the package manager used by the project.
-   Local data/database configuration required by the current
    implementation, if applicable.

### Install dependencies

``` bash
npm install
```

### Configure environment

If the application uses environment variables, create the local
environment file expected by the project and configure the required
values. Never commit credentials or sensitive business data.

The exact environment-variable names were not present in the code
snippets reviewed for this README. Confirm them from the repository's
database configuration and persistence implementation.

### Run locally

For a standard Next.js setup:

``` bash
npm run dev
```

Open the local URL printed by the development server (commonly
`http://localhost:3000`).

Use `package.json` as the source of truth. If the repository defines
different commands, follow those. Similarly, run `npm run build`,
`npm run lint`, or test commands only if those scripts exist.

## Typical Workflow

1.  Prepare timesheet, salary, and project-pricing files in the formats
    expected by the parsers.
2.  Upload the required files through the application's upload workflow.
3.  Resolve validation errors before retrying.
4.  Select the reporting year and month where period filters are
    available.
5.  Review summary metrics and monthly trends.
6.  Open project, employee, or department details to investigate costs
    and productivity.
7.  Review missing-data gaps, unpriced projects, and unallocated cost.
8.  Reconcile the complete reporting period against payroll and
    overhead.

Navigation labels may differ from this sequence; follow the pages
implemented in the current repository.

## API Overview

The supplied code includes API behavior for the following reporting
areas. This is a functional summary, not a complete route inventory;
verify exact paths and HTTP methods in the repository.

  -----------------------------------------------------------------------
  Area                                Purpose
  ----------------------------------- -----------------------------------
  Dashboard                           Period summary, category hours,
                                      reconciliation, monthly series,
                                      available periods, and data gaps.

  Projects                            Project list, project-specific
                                      details, and list search/sorting.

  Employees                           Employee productivity/category
                                      breakdown and employee-specific
                                      detail requests.

  Departments                         Department list and
                                      department-specific employee
                                      details.

  Upload                              Parses and validates supplied
                                      timesheet, salary, and project
                                      files before saving.
  -----------------------------------------------------------------------

## Validation Checklist

Before final delivery, verify the following against the full repository
and representative source data.

### Calculations

-   [ ] Check direct rates against salary and logged hours by
    employee/month.
-   [ ] Check non-billable absorbed cost and indirect-cost pool.
-   [ ] Check project revenue allocation against project price and
    billable hours.
-   [ ] Verify profit and margin for priced projects.
-   [ ] Verify behavior when revenue is zero or project price is
    missing.
-   [ ] Verify months with no billable hours and unallocated cost.
-   [ ] Reconcile the complete reporting period against payroll plus
    overhead.

### Data ingestion

-   [ ] Upload valid input files.
-   [ ] Confirm invalid file shapes are rejected with useful messages.
-   [ ] Confirm a request with no files is rejected.
-   [ ] Test re-upload behavior and determine whether existing data is
    replaced, merged, or versioned.
-   [ ] Verify data is saved and reloaded as expected.

### Reporting and UI

-   [ ] Verify year/month filters affect the intended metrics.
-   [ ] Verify project, employee, and department drill-down navigation.
-   [ ] Check sort fields against fields actually returned by each API.
-   [ ] Check empty and API error states.
-   [ ] Verify CSV/Excel exports wherever implemented.
-   [ ] Confirm data-quality warnings are visible and understandable.

### Delivery

-   [ ] Confirm install, development, build, lint, and test commands in
    `package.json`.
-   [ ] Run available automated tests.
-   [ ] Add representative tests for allocation and reconciliation
    calculations.
-   [ ] Confirm the application runs locally from a clean checkout.
-   [ ] Ensure credentials and sensitive business data are not
    committed.

## Known Follow-up Checks

Based on the code reviewed so far:

1.  **Department detail UI mapping:** The calculation returns
    `employeeNo`, `name`, `hours`, `billableHours`, `salaryCost`, and
    `allocatedCost`. Ensure the page does not expect fields such as
    designation, total cost, or productivity unless the API is extended.
2.  **Project list sorting:** The project list response includes fields
    such as `price` and `hours`. Ensure allowed sort fields match the
    returned shape; unsupported fields such as `category` or `revenue`
    should be added to the response or removed from the sort allowlist.
3.  **Projects without billable lines:** The current project-list helper
    derives projects from billable lines. Decide whether projects
    present in the pricing input but without billable hours should also
    appear.
4.  **Missing salary data:** Review missing-salary warnings carefully
    because incomplete salary data affects the meaning of costs and
    reconciliation.
5.  **End-to-end verification:** Test calculation helpers and API
    responses with the complete dataset and through the actual UI.
6.  **Documentation details:** Confirm input schemas, environment
    variables, scripts, export behavior, and persistence/re-upload
    semantics from the repository.

These are follow-up checks, not confirmed defects unless reproduced in
the running application.

## Local Data and Privacy

The problem statement calls for a local-only workflow. Keep source data
and credentials in the intended local environment, avoid adding
third-party data transmission unless explicitly required, and do not
commit sensitive input files or environment secrets.

Verify the final implementation for unexpected network calls, telemetry,
or external services before claiming that all processing remains local.
Document only the environment variables and services actually required
by the repository.
