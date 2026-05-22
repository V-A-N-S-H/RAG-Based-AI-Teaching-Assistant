from flask import Flask, render_template, request, jsonify
import joblib
import requests
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os

app = Flask(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
EMBEDDING_MODEL = "bge-m3"
LLM_MODEL = "llama3.2"
TOP_K = 5

# ── Load embeddings at startup ─────────────────────────────────────────────────
df = None
try:
    embeddings_path = os.path.join(os.path.dirname(__file__), "embeddings.joblib")
    df = joblib.load(embeddings_path)
    print(f"✅ Loaded {len(df)} embeddings from embeddings.joblib")
except FileNotFoundError:
    print("❌ embeddings.joblib not found. Run 04_preprocess_json.py first.")
except Exception as e:
    print(f"❌ Error loading embeddings: {e}")


# ── Helper functions ───────────────────────────────────────────────────────────
def create_embedding(text_list):
    """Create vector embeddings using Ollama's bge-m3 model."""
    r = requests.post(
        f"{OLLAMA_BASE_URL}/api/embed",
        json={"model": EMBEDDING_MODEL, "input": text_list},
        timeout=30,
    )
    r.raise_for_status()
    payload = r.json()

    if isinstance(payload, dict):
        if "embeddings" in payload:
            return payload["embeddings"]
        if "data" in payload and isinstance(payload["data"], list):
            return [item.get("embedding") for item in payload["data"]]

    raise ValueError(f"Unexpected embedding response from Ollama: {payload}")


def run_inference(prompt):
    """Run LLM inference using Ollama's llama3.2 model."""
    r = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
        timeout=120,
    )
    r.raise_for_status()
    payload = r.json()

    if isinstance(payload, dict):
        if "response" in payload:
            return payload["response"]
        if "text" in payload:
            return payload["text"]
        if "result" in payload:
            return payload["result"]
        if "outputs" in payload and isinstance(payload["outputs"], list) and payload["outputs"]:
            first = payload["outputs"][0]
            return first.get("output") or first.get("response") or str(first)

    raise ValueError(f"Unexpected inference response from Ollama: {payload}")


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
def ask():
    if df is None:
        return jsonify({
            "error": "Embeddings not loaded. Please run 04_preprocess_json.py first to build the knowledge base."
        }), 500

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    question = data.get("question", "").strip()
    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400

    try:
        # Step 1 — Embed the incoming question
        q_embedding = create_embedding([question])[0]

        # Step 2 — Cosine similarity search over stored embeddings
        sims = cosine_similarity(
            np.vstack(df["embedding"]), [q_embedding]
        ).flatten()
        top_idx = sims.argsort()[::-1][:TOP_K]
        top_df = df.iloc[top_idx]
        top_sims = sims[top_idx]

        # Step 3 — Build sources payload for the frontend
        sources = []
        for i, (_, row) in enumerate(top_df.iterrows()):
            sources.append({
                "title": row["title"],
                "number": str(row["number"]),
                "start": float(row["start"]),
                "end": float(row["end"]),
                "text": str(row["text"]).strip(),
                "similarity": round(float(top_sims[i]) * 100, 1),
            })

        # Step 4 — Build the RAG prompt
        context_json = top_df[
            ["title", "number", "start", "end", "text"]
        ].to_json(orient="records")

        prompt = (
            "You are a helpful and friendly AI Teaching Assistant for the "
            "Sigma Web Development Course.\n"
            "Below are the most relevant transcript excerpts from the course videos "
            "(video title, number, start/end time in seconds, and text):\n\n"
            f"{context_json}\n\n"
            "---\n"
            f'Student question: "{question}"\n\n'
            "Answer the student's question in a clear, friendly, and encouraging tone. "
            "Always mention which video(s) cover the topic and at what timestamp "
            "so the student can jump directly to that part. "
            "Format your answer with short paragraphs. "
            "If the question is completely unrelated to web development or the course, "
            "politely explain that you can only help with course-related topics."
        )

        # Step 5 — LLM inference
        answer = run_inference(prompt)

        return jsonify({"response": answer, "sources": sources})

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": (
                "Cannot connect to Ollama at localhost:11434. "
                "Please start Ollama and make sure bge-m3 and llama3.2 are pulled."
            )
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "The request timed out. The model may still be loading — try again in a moment."
        }), 504

    except Exception as exc:
        return jsonify({"error": f"Unexpected error: {str(exc)}"}), 500


@app.route("/health")
def health():
    """Quick health-check endpoint polled by the frontend."""
    ollama_ok = False
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        ollama_ok = r.status_code == 200
    except Exception:
        pass

    return jsonify({
        "status": "ok",
        "embeddings_loaded": df is not None,
        "embedding_count": int(len(df)) if df is not None else 0,
        "ollama_connected": ollama_ok,
    })


# if __name__ == "__main__":
#     app.run(debug=True, port=5000)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
