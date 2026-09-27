"""Reference FastAPI service for an agentic GenAI experimentation platform.

The implementation is provider-agnostic and deterministic by default. Replace the
demo planner / agent functions with real model and tool adapters in deployment.
"""

from typing import Any, Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="GenAI Agentic Experimentation API", version="0.2.0")


class ChatRequest(BaseModel):
    user_id: str
    query: str
    prompt_version: str = "v1"
    experiment_arm: str = "control"


class ToolCall(BaseModel):
    tool: str
    status: Literal["ok", "error"] = "ok"
    latency_ms: int = 0


class Trace(BaseModel):
    run_id: str
    user_id: str
    agent: str
    agent_version: str = "portfolio-agent-v1"
    model: str = "provider-agnostic"
    prompt_version: str
    experiment_arm: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    tool_calls: list[ToolCall] = Field(default_factory=list)
    retrieved_documents: list[str] = Field(default_factory=list)
    response: str = ""
    citations: list[str] = Field(default_factory=list)
    output: dict[str, Any] = Field(default_factory=dict)
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    estimated_cost_usd: float = 0.0
    validation_status: str = "unvalidated"


class BusinessBrief(BaseModel):
    question: str
    experiment_id: str = "demo-experiment"
    constraints: dict[str, Any] = Field(default_factory=dict)


class AgentStep(BaseModel):
    agent: str
    purpose: str
    tool_calls: list[ToolCall] = Field(default_factory=list)


class AgentRun(BaseModel):
    run_id: str
    question: str
    plan: list[AgentStep]
    status: str = "planned"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=Trace)
def chat(request: ChatRequest) -> Trace:
    # Production adapter: retrieval → tools → LLM → citation verifier → escalation.
    return Trace(
        run_id=f"chat-{request.user_id}",
        user_id=request.user_id,
        agent="product_agent",
        prompt_version=request.prompt_version,
        experiment_arm=request.experiment_arm,
        inputs={"query": request.query},
        tool_calls=[
            ToolCall(tool="vector_search", latency_ms=80),
            ToolCall(tool="policy_lookup", latency_ms=45),
            ToolCall(tool="citation_verify", latency_ms=35),
        ],
        retrieved_documents=["demo://policy/1", "demo://faq/7"],
        response="Deterministic portfolio response with verified demo citation.",
        citations=["demo://policy/1"],
        output={"task_completed": True},
        input_tokens=len(request.query.split()) + 32,
        output_tokens=34,
        latency_ms=620,
        estimated_cost_usd=0.0084,
        validation_status="validated",
    )


@app.post("/plan", response_model=AgentRun)
def plan(request: BusinessBrief) -> AgentRun:
    # Production: planner agent selects workflow from available tools and policies.
    steps = [
        AgentStep(
            agent="product_agent",
            purpose="Execute the AI product workflow and emit trace data.",
            tool_calls=[ToolCall(tool="retrieval"), ToolCall(tool="tool_router")],
        ),
        AgentStep(
            agent="evaluation_agent",
            purpose="Evaluate quality and calibrate automated judging.",
            tool_calls=[ToolCall(tool="llm_judge"), ToolCall(tool="calibration_set")],
        ),
        AgentStep(
            agent="experiment_agent",
            purpose="Define estimand, metrics, arms and monitoring.",
            tool_calls=[ToolCall(tool="metric_registry"), ToolCall(tool="experiment_registry")],
        ),
        AgentStep(
            agent="causal_agent",
            purpose="Diagnose identification and estimate incremental impact.",
            tool_calls=[ToolCall(tool="pretrend_check"), ToolCall(tool="causal_estimator")],
        ),
        AgentStep(
            agent="causal_ml_agent",
            purpose="Estimate heterogeneous treatment effects and policy value.",
            tool_calls=[ToolCall(tool="cate_model"), ToolCall(tool="policy_value")],
        ),
        AgentStep(
            agent="policy_agent",
            purpose="Apply cost, capacity, latency and risk constraints.",
            tool_calls=[ToolCall(tool="cost_model"), ToolCall(tool="constraint_solver")],
        ),
    ]
    return AgentRun(run_id="demo-run-001", question=request.question, plan=steps)


@app.post("/evaluate")
def evaluate(trace: Trace) -> dict[str, Any]:
    # Production: Ragas/DeepEval/custom evaluators + human calibration registry.
    return {
        "run_id": trace.run_id,
        "agent": trace.agent,
        "metrics": {
            "faithfulness": 0.92,
            "relevance": 0.90,
            "citation_correctness": 0.94,
            "hallucination": 0.04,
        },
        "judge_version": "demo-judge-v1",
        "validation_status": "calibrated_against_human_subset",
    }


@app.post("/trace/validate")
def validate_trace(trace: Trace) -> dict[str, Any]:
    required = {
        "agent",
        "agent_version",
        "model",
        "tool_calls",
        "latency_ms",
        "input_tokens",
        "output_tokens",
        "estimated_cost_usd",
    }
    payload = trace.model_dump()
    missing = sorted(k for k in required if k not in payload)
    return {
        "valid": not missing,
        "missing_fields": missing,
        "trace_id": trace.run_id,
    }
