# GenAI Experimentation & Causal Evaluation Platform

A flagship portfolio project demonstrating how I would evaluate a GenAI product from model quality through causal business impact and rollout policy.

## Core question

> When we ship a GenAI feature, does it improve the product, for whom, by how much, and is the incremental value greater than the cost of running it?

The example product is an **AI Customer Support Assistant**. The demo is intentionally synthetic and deterministic so it can run on GitHub Pages without exposing an API key.

## System layers

1. **GenAI product** — FastAPI, retrieval, vector index, LLM, prompt/version registry and structured traces.
2. **Evaluation engineering** — faithfulness, relevance, completeness, citation correctness, hallucination, latency and cost; pairwise prompt evaluation.
3. **Judge calibration** — compare LLM-as-a-judge against a human-labelled subset; inspect agreement, false positives/negatives and disagreement slices.
4. **Prompt experimentation** — paired per-example differences with bootstrap confidence intervals and effect size.
5. **Product experimentation** — randomized A/B where feasible; CUPED where a valid pre-treatment covariate can reduce variance.
6. **Causal identification** — staggered DiD/event studies for rollout timing; synthetic control where its design requirements are satisfied.
7. **GenAI economics** — token, retrieval, infrastructure and escalation cost connected to incremental contribution.
8. **Causal ML** — out-of-sample CATE/uplift estimates and policy-value evaluation.
9. **Policy optimization** — route traffic when estimated incremental contribution exceeds AI cost, subject to budget, capacity, latency and risk constraints.

## Why the layers are separate

Offline response quality answers whether the system produces better answers. It does **not** establish incremental customer or revenue impact.

Causal estimation answers the product-effect question. It does **not** establish whether the feature is economically worthwhile unless operating costs are included.

CATE estimates answer who benefits. They do **not** automatically produce a safe rollout policy; the policy must incorporate cost, capacity, latency and risk constraints.

## Causal methodology

The synthetic rollout contains geography-specific adoption dates and heterogeneous treatment effects. The intended analysis checks pre-trends, overlap and cohort timing before estimating a staggered treatment effect. The interface exposes event-study coefficients to make the identification logic inspectable.

A standard two-way fixed-effects regression is not treated as a universal solution for staggered adoption with heterogeneous effects. A production implementation would use an estimator appropriate to the treatment-timing structure and report sensitivity across reasonable specifications.

## LLM-as-a-judge

The judge is treated as a measurement instrument rather than ground truth. A human-labelled calibration set is used to quantify agreement and disagreement. Evaluation-set versioning, judge drift and failure-mode analysis would be part of a production pipeline.

## CUPED

CUPED is not applied to arbitrary LLM evaluation scores. It is demonstrated conceptually at the product-experiment layer where a pre-treatment covariate is correlated with the outcome and is unaffected by treatment. The variance-reduction benefit should be measured on the experiment metric itself.

## Economic decision

For a user (i):

**Expected incremental contribution = τᵢ × Vᵢ − Cᵢ**

where τᵢ is an estimated causal treatment effect, Vᵢ is contribution per incremental outcome, and Cᵢ is AI/operational cost.

A constrained routing policy can then solve for the eligible set subject to traffic, budget, latency and safety constraints.

## Production architecture

```
                    FastAPI / AI PRODUCT
                            |
                 +----------v----------+
                 | RAG / Agent + Trace |
                 +----------+----------+
                            |
                 +----------v----------+
                 | Evaluation Engine   |
                 | Judge + Calibration |
                 +----------+----------+
                            |
                 +----------v----------+
                 | Experiment Engine   |
                 | A/B / Bootstrap     |
                 | CUPED               |
                 +----------+----------+
                            |
                 +----------v----------+
                 | Causal Engine       |
                 | DiD / Event Study   |
                 | Synthetic Control   |
                 +----------+----------+
                            |
                 +----------v----------+
                 | Causal ML           |
                 | CATE / Uplift       |
                 +----------+----------+
                            |
                 +----------v----------+
                 | Policy Optimizer    |
                 | Cost / Risk / SLA   |
                 +---------------------+
```

## Static demo vs production code

The GitHub Pages interface is a deterministic synthetic visualization. A production implementation would connect the UI to a FastAPI service and replace synthetic traces with application telemetry.

The important engineering boundary is preserved:

**application trace → evaluation → experiment → causal estimate → economics → policy**

No real company/customer data is included.