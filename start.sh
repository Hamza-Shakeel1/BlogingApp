#!/bin/bash
# Install dependencies
pip install -r requirements.txt

# Start FastAPI app
python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
