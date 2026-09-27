---
layout: default
permalink: /work/voucher-incrementality/
title: Voucher Incrementality — Causal Inference
---
<section class="case-page">
  <a class="button primary back-home" href="/">← Back to home</a>
  <div class="eyebrow">UBER · CAUSAL INFERENCE · INCREMENTALITY · VOUCHER PORTFOLIO</div>
  <h1>Measuring the incremental value of vouchers</h1>
  <p class="case-lead">Separating genuine incremental business impact from activity that would have happened anyway.</p>

  <h2>The business question</h2>
  <p>Observed trips and bookings after a voucher intervention do not automatically represent incremental value. Customers may have taken the trip without the voucher, and different voucher interventions can interact through substitution. The core question was: <b>what activity is genuinely caused by the voucher?</b></p>

  <h2>Scope</h2>
  <p>I led incrementality and causal analyses across <b>different voucher types within the broader voucher portfolio</b>. This is separate from the UberMe product experimentation work.</p>

  <h2>Choosing the causal design</h2>
  <p>The available treatment and rollout structure varied across initiatives, so I used different causal approaches rather than forcing every problem into a standard A/B test.</p>
  <ul>
    <li><b>Difference-in-Differences</b> for treatment/control comparisons over time.</li>
    <li><b>Staggered DiD</b> where treatment adoption occurred at different times.</li>
    <li><b>Synthetic Control</b> to construct a counterfactual from comparable untreated units.</li>
    <li><b>TMLE</b> for treatment-effect estimation in settings where a more flexible adjustment approach was appropriate.</li>
    <li><b>Future-treated groups and holdouts</b> where rollout structure allowed stronger counterfactual construction.</li>
  </ul>

  <h2>Triangulating evidence</h2>
  <p>The objective was not methodological complexity for its own sake. I compared evidence across designs and considered underlying trends, treatment timing and potential substitution to estimate the incremental contribution of voucher interventions.</p>

  <h2>Business impact</h2>
  <div class="impact"><b>25–36%</b> incremental Trips · <b>40–52%</b> incremental Gross Bookings</div>
  <p>The findings informed investment decisions, prioritisation and subsequent voucher initiatives across the portfolio.</p>


  <h2>Why incrementality mattered</h2>
  <p>Voucher performance can look strong in descriptive reporting even when a portion of the observed activity would have occurred without the intervention. Measuring incrementality therefore changes the decision from “how much activity did vouchers generate?” to “how much additional activity did vouchers cause?”</p>
  <p>The answer was used as decision support for voucher investment and prioritisation, making the causal estimate more useful than a simple before-and-after comparison.</p>


  <h2>Counterfactual thinking</h2>
  <p>The central analytical challenge was constructing a credible estimate of what would have happened in the absence of the voucher. The appropriate counterfactual depended on how treatment was assigned and rolled out, so the analysis had to start with the treatment structure rather than with a preferred statistical technique.</p>
  <p>For time-based comparisons, I used Difference-in-Differences and staggered DiD. Where a direct untreated comparison was weaker, Synthetic Control provided a way to construct a comparison from untreated units. TMLE provided another treatment-effect estimation approach where flexible covariate adjustment was appropriate.</p>

  <h2>Assumptions and robustness</h2>
  <p>I evaluated the underlying treatment timing, comparison groups and pre-treatment behaviour when interpreting the estimates. Where rollout structure provided future-treated groups or holdouts, those groups were useful for strengthening the counterfactual.</p>
  <p>The emphasis was on understanding what each design could credibly identify and using multiple sources of evidence rather than presenting a single causal estimate without context.</p>

  <h2>From causal estimate to product decision</h2>
  <p>The output was ultimately a business decision input. Incremental Trips and Gross Bookings were translated into evidence about the value of different voucher interventions, helping inform investment and prioritisation across the voucher portfolio.</p>

  <h2>What this demonstrates</h2>
  <ul>
    <li><b>Experimentation & causal inference:</b> matching methodology to treatment structure and assumptions.</li>
    <li><b>Product thinking:</b> connecting treatment effects to investment and prioritisation decisions.</li>
    <li><b>Analytical judgement:</b> triangulating multiple designs rather than relying on one estimate.</li>
  </ul>
</section>