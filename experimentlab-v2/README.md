# ExperimentLab

ExperimentLab is a public, browser-based experimentation workbench built as proof-of-work for product data science, experimentation and causal inference.

## Live interface

- Expanded workbench: /experimentlab-v2/
- Existing portfolio entry: /experimentlab/

All computations run locally in the browser; uploaded datasets are not sent to a backend.

## Metric types

The analysis is configured around the primary metric rather than assuming every experiment is conversion-based.

### Binary metrics
Example: conversion rate, activation, retention flag.

Reports:
- Control and treatment rates
- Absolute difference in percentage points
- Relative lift
- Normal-theory 95% CI
- Two-sided p-value
- Bootstrap percentile CI

### Continuous metrics
Example: average Gross Bookings, revenue, order value, session duration.

Reports:
- Control and treatment means in the original unit
- Absolute mean difference
- Relative lift
- Welch-style normal-theory uncertainty
- Bootstrap percentile CI

Revenue and Gross Bookings are treated as continuous monetary outcomes. The estimand is the average treatment effect on the metric scale.

## Experiment configuration

The configuration layer makes these assumptions explicit:
- metric type
- metric column
- pre-period covariate
- expected treatment allocation
- alpha
- target power
- target MDE
- bootstrap resample count

## Power / MDE

The planning module provides approximate normal-theory MDE calculations for binary conversion rates and continuous outcomes.

These are planning approximations and should be validated with a specialised power package for production decisions, especially with low rates, heavy-tailed monetary metrics or unequal allocation.

## Bootstrap

Treatment and control observations are independently resampled within arm. The percentile interval is shown alongside the normal-theory interval as a robustness/sensitivity check.

## CUPED-style adjustment

A pre-treatment metric can be used to estimate a common linear adjustment coefficient. The purpose is variance reduction. The pre-period covariate must be measured before treatment and should not itself be affected by treatment.

## Causal design modules

### Difference-in-Differences
Computes:

(Treatment post − Treatment pre) − (Control post − Control pre)

Key assumption: parallel trends in the absence of treatment, alongside appropriate timing and no differential concurrent shocks.

### Staggered DiD
The design explorer identifies treatment cohorts and explicitly warns against interpreting a naive two-way fixed-effects estimate as automatically valid when treatment timing varies. Cohort/event-time estimators are the intended next inference layer.

### Synthetic Control
The module makes the required design inputs visible: treated unit, donor pool, time, pre-treatment period, outcome and pre-period fit diagnostics.

A production implementation should optimise donor weights and include placebo diagnostics.

### TMLE
The configuration captures treatment, binary outcome and covariates. A production TMLE implementation should define the estimand, estimate treatment/outcome nuisance functions, address positivity and consistency, use cross-fitting where appropriate, and obtain uncertainty from the efficient influence curve.

## Reporting

The workbench can:
- download the current rendered analysis as HTML
- use the browser print dialog to save a PDF
- preserve metric configuration and methodology context alongside results

## Assumptions / limitations

This is an independent proof-of-work project, not a replacement for a production experimentation platform.

Important limitations:
- the SRM check is a simple allocation diagnostic, not proof that randomisation was valid
- normal approximations can be inappropriate for extreme binary rates or highly skewed monetary outcomes
- bootstrap intervals are a sensitivity analysis, not a universal solution to dependence or clustering
- subgroup results are exploratory unless pre-specified
- multiple testing and sequential peeking require explicit control
- advanced causal modules are currently design/inference scaffolding rather than a full causal inference library

## Roadmap

1. Better metric-aware power/sample-size calculations
2. Revenue distributions, winsorisation and ratio metrics
3. Cluster/geo experiments and clustered standard errors
4. Bootstrap diagnostics and visual distributions
5. Full cohort/event-study staggered DiD
6. Synthetic-control donor-weight optimisation and placebo tests
7. Production-quality TMLE with cross-fitting
8. Automated experiment report with charts and assumptions
9. Dedicated PDF generation
10. Richer interactive visualisations
