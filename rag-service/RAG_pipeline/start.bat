@echo off
cd /d C:\Users\91901\OneDrive\Desktop\OS\FAQ1\rag-service\RAG_pipeline
venv\Scripts\python.exe -m uvicorn rag_api:app --host 0.0.0.0 --port 8000 --reload
