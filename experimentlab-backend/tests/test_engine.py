from main import ExperimentRequest, MetricConfig, analyze


def test_binary_known_answer():
    rows = [
        {"treatment": 0, "conversion": 1},
        {"treatment": 0, "conversion": 0},
        {"treatment": 0, "conversion": 1},
        {"treatment": 0, "conversion": 0},
        {"treatment": 0, "conversion": 0},
        {"treatment": 1, "conversion": 1},
        {"treatment": 1, "conversion": 1},
        {"treatment": 1, "conversion": 1},
        {"treatment": 1, "conversion": 0},
        {"treatment": 1, "conversion": 1},
    ]
    response = analyze(
        ExperimentRequest(
            rows=rows,
            metrics=[MetricConfig(name="Conversion", column="conversion", type="binary")],
        )
    )
    result = response.metrics[0]
    assert result.control == 0.4
    assert result.treatment == 0.8
    assert result.absolute_effect == 0.4


def test_missing_values_are_accounted_for():
    rows = [
        {"treatment": 0, "conversion": 1},
        {"treatment": 0, "conversion": None},
        {"treatment": 0, "conversion": 0},
        {"treatment": 1, "conversion": 1},
        {"treatment": 1, "conversion": "not-a-number"},
        {"treatment": 1, "conversion": 0},
    ]
    response = analyze(
        ExperimentRequest(
            rows=rows,
            metrics=[MetricConfig(name="Conversion", column="conversion", type="binary")],
        )
    )
    assert response.data_quality.missing_values == 2
    assert response.data_quality.rows_used == 4
    assert response.data_quality.rows_excluded == 2


def test_ratio_rejects_non_positive_denominator():
    rows = [
        {"treatment": 0, "orders": 10, "exposures": 100},
        {"treatment": 0, "orders": 10, "exposures": 0},
        {"treatment": 1, "orders": 15, "exposures": 100},
        {"treatment": 1, "orders": 12, "exposures": 120},
    ]
    response = analyze(
        ExperimentRequest(
            rows=rows,
            metrics=[
                MetricConfig(
                    name="Order rate",
                    column="orders",
                    denominator="exposures",
                    type="ratio",
                )
            ],
        )
    )
    assert response.data_quality.invalid_values == 1
    assert response.metrics[0].control_n == 1
    assert response.metrics[0].treatment_n == 2
