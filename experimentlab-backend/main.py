from __future__ import annotations

from typing import Any, Literal

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import stats


app = FastAPI(
    title="ExperimentLab Statistical Engine",
    version="1.0.0",
    description="Python analytical backend for the ExperimentLab portfolio demo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ayan-ghosh103.github.io",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


MetricType = Literal["binary", "continuous", "revenue", "ratio"]


class MetricConfig(BaseModel):
    name: str = "Metric"
    column: str
    type: MetricType = "continuous"
    denominator: str | None = None
    role: Literal["Primary", "Secondary", "Guardrail"] = "Primary"


class ExperimentRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=2)
    metrics: list[MetricConfig] = Field(min_length=1)
    treatment_column: str = "treatment"
    alpha: float = Field(default=0.05, gt=0, lt=1)
    bootstrap_reps: int = Field(default=2000, ge=200, le=10000)
    expected_treatment_share: float = Field(default=0.5, gt=0, lt=1)


class DataQuality(BaseModel):
    input_rows: int
    rows_used: int
    rows_excluded: int
    missing_values: int
    invalid_values: int
    duplicate_rows: int
    warnings: list[str] = Field(default_factory=list)


class MetricResult(BaseModel):
    name: str
    role: str
    metric_type: str
    control_n: int
    treatment_n: int
    control: float | None = None
    treatment: float | None = None
    absolute_effect: float | None = None
    relative_lift: float | None = None
    standard_error: float | None = None
    p_value: float | None = None
    ci95: list[float | None] = [None, None]
    bootstrap_ci95: list[float | None] = [None, None]


class ExperimentResponse(BaseModel):
    status: Literal["ok", "warning", "error"]
    data_quality: DataQuality
    metrics: list[MetricResult]
    health: dict[str, Any]
    engine: dict[str, str]


class MetricAnalyzer:
    """Strategy interface for metric-specific treatment effect estimation."""

    def __init__(self, alpha: float, bootstrap_reps: int) -> None:
        self.alpha = alpha
        self.bootstrap_reps = bootstrap_reps

    def analyze(self, control: np.ndarray, treatment: np.ndarray) -> dict[str, Any]:
        raise NotImplementedError

    @staticmethod
    def _bootstrap_difference(
        control: np.ndarray, treatment: np.ndarray, reps: int
    ) -> tuple[float, float]:
        rng = np.random.default_rng(20260927)
        control_idx = rng.integers(0, len(control), size=(reps, len(control)))
        treatment_idx = rng.integers(0, len(treatment), size=(reps, len(treatment)))
        diffs = (
            treatment[treatment_idx].mean(axis=1)
            - control[control_idx].mean(axis=1)
        )
        return float(np.quantile(diffs, 0.025)), float(np.quantile(diffs, 0.975))


class BinaryMetricAnalyzer(MetricAnalyzer):
    def analyze(self, control: np.ndarray, treatment: np.ndarray) -> dict[str, Any]:
        c, t = float(control.mean()), float(treatment.mean())
        diff = t - c
        se = float(np.sqrt(c * (1 - c) / len(control) + t * (1 - t) / len(treatment)))
        z = diff / se if se > 0 else 0.0
        p = float(2 * stats.norm.sf(abs(z)))
        zcrit = float(stats.norm.ppf(1 - self.alpha / 2))
        boot_lo, boot_hi = self._bootstrap_difference(
            control, treatment, self.bootstrap_reps
        )
        return {
            "control": c,
            "treatment": t,
            "absolute_effect": diff,
            "relative_lift": diff / c if c else None,
            "standard_error": se,
            "p_value": p,
            "ci95": [diff - zcrit * se, diff + zcrit * se],
            "bootstrap_ci95": [boot_lo, boot_hi],
        }


class ContinuousMetricAnalyzer(MetricAnalyzer):
    def analyze(self, control: np.ndarray, treatment: np.ndarray) -> dict[str, Any]:
        c, t = float(control.mean()), float(treatment.mean())
        diff = t - c
        c_var, t_var = float(control.var(ddof=1)), float(treatment.var(ddof=1))
        se = float(np.sqrt(c_var / len(control) + t_var / len(treatment)))
        df_num = (c_var / len(control) + t_var / len(treatment)) ** 2
        df_den = (
            (c_var / len(control)) ** 2 / max(len(control) - 1, 1)
            + (t_var / len(treatment)) ** 2 / max(len(treatment) - 1, 1)
        )
        df = df_num / df_den if df_den > 0 else max(len(control) + len(treatment) - 2, 1)
        p = float(2 * stats.t.sf(abs(diff / se), df)) if se > 0 else 0.0
        zcrit = float(stats.t.ppf(1 - self.alpha / 2, df))
        boot_lo, boot_hi = self._bootstrap_difference(
            control, treatment, self.bootstrap_reps
        )
        return {
            "control": c,
            "treatment": t,
            "absolute_effect": diff,
            "relative_lift": diff / c if c else None,
            "standard_error": se,
            "p_value": p,
            "ci95": [diff - zcrit * se, diff + zcrit * se],
            "bootstrap_ci95": [boot_lo, boot_hi],
        }


class RatioMetricAnalyzer(MetricAnalyzer):
    """Delta-method-style ratio estimator using row-level numerator/denominator pairs."""

    def analyze(self, control: np.ndarray, treatment: np.ndarray) -> dict[str, Any]:
        # Arrays are shape (n, 2): numerator, denominator.
        c_num, c_den = control[:, 0], control[:, 1]
        t_num, t_den = treatment[:, 0], treatment[:, 1]
        c_ratio = float(c_num.sum() / c_den.sum())
        t_ratio = float(t_num.sum() / t_den.sum())
        diff = t_ratio - c_ratio

        c_psi = c_num - c_ratio * c_den
        t_psi = t_num - t_ratio * t_den
        c_var = float(c_psi.var(ddof=1) / (c_den.mean() ** 2) / len(c_psi))
        t_var = float(t_psi.var(ddof=1) / (t_den.mean() ** 2) / len(t_psi))
        se = float(np.sqrt(max(c_var + t_var, 0)))
        z = diff / se if se > 0 else 0.0
        p = float(2 * stats.norm.sf(abs(z)))
        zcrit = float(stats.norm.ppf(1 - self.alpha / 2))

        rng = np.random.default_rng(20260927)
        c_idx = rng.integers(0, len(control), size=(self.bootstrap_reps, len(control)))
        t_idx = rng.integers(0, len(treatment), size=(self.bootstrap_reps, len(treatment)))
        c_boot = c_num[c_idx].sum(axis=1) / c_den[c_idx].sum(axis=1)
        t_boot = t_num[t_idx].sum(axis=1) / t_den[t_idx].sum(axis=1)
        boot = t_boot - c_boot

        return {
            "control": c_ratio,
            "treatment": t_ratio,
            "absolute_effect": diff,
            "relative_lift": diff / c_ratio if c_ratio else None,
            "standard_error": se,
            "p_value": p,
            "ci95": [diff - zcrit * se, diff + zcrit * se],
            "bootstrap_ci95": [
                float(np.quantile(boot, 0.025)),
                float(np.quantile(boot, 0.975)),
            ],
        }


ANALYZERS: dict[str, type[MetricAnalyzer]] = {
    "binary": BinaryMetricAnalyzer,
    "continuous": ContinuousMetricAnalyzer,
    "revenue": ContinuousMetricAnalyzer,
    "ratio": RatioMetricAnalyzer,
}


def _finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if np.isfinite(number) else None


def _prepare_metric(
    rows: list[dict[str, Any]],
    metric: MetricConfig,
    treatment_column: str,
) -> tuple[np.ndarray, np.ndarray, dict[str, int], list[str]]:
    control: list[Any] = []
    treatment: list[Any] = []
    missing = invalid = 0
    warnings: list[str] = []

    for row in rows:
        assignment = _finite(row.get(treatment_column))
        if assignment not in (0.0, 1.0):
            invalid += 1
            continue

        if metric.type == "ratio":
            numerator = _finite(row.get(metric.column))
            denominator = _finite(row.get(metric.denominator)) if metric.denominator else None
            if numerator is None or denominator is None:
                missing += 1
                continue
            if denominator <= 0:
                invalid += 1
                continue
            value = (numerator, denominator)
        else:
            value = _finite(row.get(metric.column))
            if value is None:
                missing += 1
                continue
            if metric.type == "binary" and value not in (0.0, 1.0):
                invalid += 1
                continue

        (treatment if assignment == 1.0 else control).append(value)

    if len(control) < 2 or len(treatment) < 2:
        warnings.append(
            f"{metric.name}: fewer than 2 valid observations in one experiment arm."
        )

    if metric.type == "ratio":
        return (
            np.asarray(control, dtype=float),
            np.asarray(treatment, dtype=float),
            {"missing": missing, "invalid": invalid},
            warnings,
        )

    return (
        np.asarray(control, dtype=float),
        np.asarray(treatment, dtype=float),
        {"missing": missing, "invalid": invalid},
        warnings,
    )


def _analyzer(metric: MetricConfig, alpha: float, reps: int) -> MetricAnalyzer:
    return ANALYZERS[metric.type](alpha=alpha, bootstrap_reps=reps)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engine": "python", "version": "1.0.0"}


@app.post("/analyze", response_model=ExperimentResponse)
def analyze(request: ExperimentRequest) -> ExperimentResponse:
    input_rows = len(request.rows)
    duplicate_rows = input_rows - len({repr(sorted(row.items())) for row in request.rows})
    all_missing = 0
    all_invalid = 0
    warnings: list[str] = []

    results: list[MetricResult] = []

    for metric in request.metrics:
        control, treatment, quality, metric_warnings = _prepare_metric(
            request.rows, metric, request.treatment_column
        )
        all_missing += quality["missing"]
        all_invalid += quality["invalid"]
        warnings.extend(metric_warnings)

        if len(control) < 2 or len(treatment) < 2:
            results.append(
                MetricResult(
                    name=metric.name,
                    role=metric.role,
                    metric_type=metric.type,
                    control_n=len(control),
                    treatment_n=len(treatment),
                )
            )
            continue

        try:
            estimate = _analyzer(metric, request.alpha, request.bootstrap_reps).analyze(
                control, treatment
            )
        except (FloatingPointError, ValueError, ZeroDivisionError) as exc:
            warnings.append(f"{metric.name}: analysis failed safely: {exc}")
            estimate = {}

        results.append(
            MetricResult(
                name=metric.name,
                role=metric.role,
                metric_type=metric.type,
                control_n=len(control),
                treatment_n=len(treatment),
                **estimate,
            )
        )

    treatment_assignments = [_finite(r.get(request.treatment_column)) for r in request.rows]
    valid_assignments = [x for x in treatment_assignments if x in (0.0, 1.0)]
    treatment_share = (
        float(np.mean(valid_assignments)) if valid_assignments else None
    )
    srm_ratio = (
        abs(treatment_share - request.expected_treatment_share)
        / request.expected_treatment_share
        if treatment_share is not None
        else None
    )

    if srm_ratio is not None and srm_ratio > 0.10:
        warnings.append(
            "Sample-ratio mismatch: observed treatment allocation differs from expected by more than 10%."
        )

    rows_used = max(
        [max(result.control_n, 0) + max(result.treatment_n, 0) for result in results]
        or [0]
    )
    quality = DataQuality(
        input_rows=input_rows,
        rows_used=rows_used,
        rows_excluded=max(input_rows - rows_used, 0),
        missing_values=all_missing,
        invalid_values=all_invalid,
        duplicate_rows=duplicate_rows,
        warnings=warnings,
    )

    return ExperimentResponse(
        status="warning" if warnings else "ok",
        data_quality=quality,
        metrics=results,
        health={
            "treatment_share": treatment_share,
            "expected_treatment_share": request.expected_treatment_share,
            "srm_ratio": srm_ratio,
            "srm_status": "review" if srm_ratio is not None and srm_ratio > 0.10 else "pass",
        },
        engine={
            "language": "Python",
            "framework": "FastAPI",
            "estimators": "metric-specific normal theory + deterministic bootstrap",
            "data_quality": "explicit missing/invalid-value accounting",
        },
    )
