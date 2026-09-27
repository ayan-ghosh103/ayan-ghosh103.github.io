# Decision Engine

A browser-based proof-of-work exploring the path from an ML prediction to an economically constrained intervention policy.

## Why I built it

A common failure mode in applied ML is to stop at predictive performance. A strong propensity model can rank customers who are likely to convert, but that does not establish that an intervention caused the conversion or that spending the intervention budget on those customers creates value.

This project deliberately separates three layers:

1. **Prediction** — estimate outcome propensity.
2. **Incrementality** — estimate the conditional treatment effect.
3. **Decisioning** — combine treatment effect with unit economics and operational constraints.

The result is a policy simulator rather than another model dashboard.

## Decision formulation

For customer i, let:

- p_i = predicted probability of the outcome
- τ_i = estimated incremental effect of the intervention
- V = value of one incremental outcome
- C = intervention cost

The simplified expected net value is:

**ENVi = τ_i × V − C**

The policy ranks customers by expected net value and applies a capacity constraint. This makes the final intervention rule explicit.

## What the simulator demonstrates

- Propensity and incremental effect can disagree.
- A high-propensity customer is not automatically a high-value treatment target.
- Model quality changes the ordering of customers and therefore the economics of the policy.
- Unit economics can change the optimal targeting threshold even when the predictive model is unchanged.
- Capacity constraints turn a continuous scoring problem into a ranking / allocation problem.
- Business value should be evaluated on incremental outcomes, not gross conversions attributed to treated customers.

## Controls

The simulator exposes population size, intervention cost, value per incremental conversion, targeting threshold, model precision and operational capacity.

The comparison table evaluates several targeting thresholds under the same economic assumptions.

## Technical notes

The browser app uses a deterministic synthetic population with heterogeneous baseline propensity and treatment effect. The propensity score is intentionally noisy; the precision control changes ranking noise. Treatment effect is heterogeneous by construction so that propensity and uplift are not perfectly correlated.

This is deliberately a simulation rather than a claim about a real customer population. In a production system, τ(X) would need to come from an appropriate causal/uplift design, with treatment assignment, overlap/positivity, outcome definitions, uncertainty and policy evaluation specified before deployment.

## Production extension

A production implementation could ingest historical treatment/outcome data, estimate CATE/uplift with cross-fitting or a validated uplift learner, evaluate policy value with inverse-propensity weighting or doubly robust estimators, add customer-risk guardrails, and optimise under a real intervention budget.

The important architectural boundary is that the ML model produces evidence; the policy layer owns the business decision.