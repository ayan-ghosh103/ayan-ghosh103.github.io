# Intervention Decision Studio

A browser-based decision-support proof-of-work that starts with a messy business brief and ends with an explicit intervention policy.

## The interaction

You can paste a paragraph such as:

> I have 100,000 customers. We want to send a $4 retention offer to customers likely to churn. A saved customer is worth $60, we have a $150,000 budget and can contact at most 30% of customers.

The intake layer extracts the decision variables it can identify:

- population
- intervention cost
- value of an incremental outcome
- budget
- operational capacity
- scenario / objective

Anything missing is surfaced as a question or highlighted field. The user can then provide it in the controls and recalculate.

This is intentionally **not** an LLM pretending to know missing business facts. The natural-language layer translates stated information into a structured decision problem; the policy engine makes the economics explicit.

## Real-world scenarios

The demo includes:

- retention offers
- voucher / incentive targeting
- support automation

The same decision layer can be adapted to other interventions where the business has a measurable incremental outcome, an intervention cost and constraints.

## Decision formulation

For customer $i$:

**Expected Net Value = τ_i × V − C**

where:

- $τ_i$ = estimated incremental treatment effect
- $V$ = value of one incremental outcome
- $C$ = intervention cost

The engine then applies budget and operational capacity constraints.

## What the interface demonstrates

1. **Natural-language intake** — turn a business note into explicit assumptions.
2. **Missing-value handling** — ask for required information rather than silently invent it.
3. **Scenario controls** — change costs, value, budget, capacity and model quality.
4. **Customer-level policy explorer** — inspect likelihood, incremental effect and expected economics.
5. **Policy comparison** — target everyone, propensity, uplift and economic policy.
6. **Sensitivity analysis** — see how intervention cost changes the economics.
7. **Decision output** — show targeted population, incremental outcomes, value, spend, net value and ROI.

## Synthetic data

The browser demo uses deterministic synthetic customers. Propensity and treatment effect are heterogeneous and deliberately imperfectly correlated. This lets the interface demonstrate why:

**high likelihood ≠ high incremental value ≠ best business decision**

The numbers are not estimates for a real company or customer population.

## Production path

A production implementation can replace the synthetic layer with:

- an existing propensity/risk score
- validated CATE/uplift estimates
- customer economics
- policy guardrails
- treatment capacity and budget
- historical treatment/outcome data for policy evaluation

For causal estimation, the appropriate design would depend on treatment assignment, overlap, outcome definition, interference/SUTVA considerations and available labels. Policy value can then be evaluated using appropriate experimental, inverse-propensity or doubly robust methods.

A practical extension is CSV ingestion with columns such as:

`customer_id, propensity, uplift, customer_value, intervention_cost, segment`

The decision engine can then operate on model outputs without pretending that it estimated causal effects itself.

## Why this matters

The important architectural boundary is:

**business brief → structured assumptions → model evidence → economic policy → constrained action**

The ML model produces evidence. The decision layer owns the allocation decision.