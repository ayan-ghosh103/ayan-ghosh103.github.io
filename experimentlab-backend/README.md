# ExperimentLab Python Statistical Engine

The browser interface remains HTML/CSS/JavaScript, but the analytical engine is implemented as a typed FastAPI service.

## Architecture

Browser UI → FastAPI → metric analyzer strategy → statistical estimate → JSON → browser visualization.

The backend explicitly accounts for missing and invalid observations rather than silently dropping them. Every analysis returns input rows, rows used/excluded, missing values, invalid values, duplicate rows, warnings, treatment allocation and SRM diagnostics.

## Deployment

This service is designed for Render's free Python Web Service.

- Root directory: `experimentlab-backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

The service intentionally has no database and no persistent state. It receives experiment data in the request and returns analysis results.

## Important portfolio note

The statistical results are computed by Python when the frontend is configured with the deployed API URL. The UI itself necessarily remains browser-side HTML/CSS/JavaScript.
