#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAG_DIR="$SCRIPT_DIR/rag-service/RAG_pipeline"

echo "🚀 Starting both servers..."

# Start RAG API in background with virtual environment
(
    cd "$RAG_DIR"
    
    # Create venv if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
        ./venv/bin/pip install -r requirements.txt
    fi
    
    echo "🐍 Activating virtual environment and starting RAG API on port 8000..."
    source venv/bin/activate
    uvicorn rag_api:app --host 0.0.0.0 --port 8000 &
    RAG_PID=$!
    echo "RAG API started with PID: $RAG_PID"
    
    # Wait for RAG process
    wait $RAG_PID
) &

# Give RAG a moment to start
sleep 3

# Start Next.js dev server
echo "🌐 Starting FAQ Web on port 3000..."
cd "$SCRIPT_DIR/faq-web" && npm run dev