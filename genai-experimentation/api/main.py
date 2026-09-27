"""Reference FastAPI service for the GenAI Experimentation platform.

This file is intentionally provider-agnostic. API keys and model clients are injected
through environment/configuration in a real deployment; no secrets belong in the repo.
"""

from typing import Any
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="GenAI Experimentation & Causal Evaluation API", version="0.1.0")


class ChatRequest(BaseModel):
    user_id: str
    query: str
    prompt_version: str = "v1"
    experiment_arm: str = "control"


class Trace(BaseModel):
    user_id: str
    prompt_version: str
    experiment_arm: str
    retrieved_documents: list[str] = Field(default_factory=list)
    response: str
    citations: list[str] = Field(default_factory=list)
    input_tokens: int
    output_tokens: int
    latency_ms: int
    estimated_cost_usd: float


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=Trace)
def chat(request: ChatRequest) -> Trace:
    # Replace this deterministic response with a retrieval + LLM implementation.
    # The trace contract is the important interface consumed by the evaluation layer.
    response = (
        f"Demo response for prompt={request.prompt_version}; "
        f"experiment_arm={request.experiment_arm}."
    )
    return Trace(
        user_id=request.user_id,
        prompt_version=request.prompt_version,
        experiment_arm=request.experiment_arm,
        retrieved_documents=["demo://policy/1", "demo://faq/7"],
        response=response,
        citations=["demo://policy/1"],
        input_tokens=len(request.query.split()) + 32,
        output_tokens=34,
        latency_ms=620,
        estimated_cost_usd=0.0084,
    )


@app.post("/evaluate")
def evaluate(trace: Trace) -> dict[str, Any]:
    # Production: call the evaluation registry (Ragas/DeepEval/custom judges),
    # retain per-example scores, judge version and evaluation-set version.
    return {
        "trace_id": trace.user_id,
        "metrics": {
            "faithfulness": 0.92,
            "relevance": 0.90,
            "citation_correctness": 0.94,
            "hallucination": 0.04,
        },
        "judge_version": "demo-judge-v1",
    }
