🤖 RAG-Based AI Teaching Assistant

An intelligent **Retrieval-Augmented Generation (RAG)** system that converts video lectures into a searchable knowledge base and answers user queries with precise video references and timestamps.

---

🚀 Features

* 🎬 Convert videos to audio (MP3)
* 🧠 Transcribe audio using Whisper
* ✂️ Split transcription into meaningful chunks
* 🔗 Merge chunks for better context
* 📊 Generate embeddings using Ollama (bge-m3 model)
* 🔍 Perform semantic search using cosine similarity
* 🤖 Generate human-like answers using LLM (LLaMA 3)
* 🎯 Returns **exact video + timestamp guidance**

---

🛠️ Tech Stack

* Python
* Whisper (Speech-to-Text)
* Ollama (Embeddings + LLM)
* Pandas & NumPy
* Scikit-learn (Cosine Similarity)
* FFmpeg

---

📂 Project Structure

```id="p9k2sx"
├── Videos/                  # Input video files
├── Audios/                  # Converted audio files
├── jsons/                   # Raw transcription chunks
├── newjsons/                # Merged chunks
├── embeddings.joblib        # Stored embeddings

├── 01_process_video(mp4_to_mp3).py
├── 02_Creating_Chunks(mp3_to_Json).py
├── 03_mege_chunks.py
├── 04_read_chunks.py
├── 05_process_incoming.py

├── prompt.txt
├── response.txt
```

---

⚙️ Setup Instructions

# 1️⃣ Install Dependencies

```id="v3d7aa"
pip install whisper pandas numpy scikit-learn joblib requests
```

# 2️⃣ Install FFmpeg

Download and install FFmpeg, then add it to your system PATH.

# 3️⃣ Install & Run Ollama

```id="m8sj21"
ollama run llama3.2
ollama pull bge-m3
```

---

🔄 Workflow

# Step 1: Convert Video → Audio

* Script: `01_process_video(mp4_to_mp3).py`

# Step 2: Audio → Transcription

* Script: `02_Creating_Chunks(mp3_to_Json).py`

# Step 3: Merge Chunks

* Script: `03_mege_chunks.py`

### Step 4: Create Embeddings

* Script: `04_read_chunks.py`

# Step 5: Ask Questions (RAG Pipeline)

* Script: `05_process_incoming.py`

**Pipeline Flow:**

1. User query → embedding
2. Retrieve top relevant chunks
3. Provide context to LLM
4. Generate accurate answer with timestamps

---

💡 How RAG Works in This Project

* 📚 **Retrieval:** Finds relevant lecture chunks using embeddings
* 🧠 **Augmentation:** Adds context to prompt
* 🤖 **Generation:** LLM generates human-like answers

---

🧪 Example

**Input:**

```id="z2c4lq"
Where is CSS taught in the course?
```

**Output:**

* 📺 Video number
* ⏱️ Timestamp
* 🧠 Explanation

Generated files:

* `prompt.txt`
* `response.txt`

---

⚠️ Notes

* Ensure Ollama runs on:

  ```
  http://localhost:11434
  ```
* Whisper large model requires good system performance
* Proper file naming is required

---

🔮 Future Improvements

* 🌐 Web UI (Streamlit / React)
* 📹 YouTube video ingestion
* 🔍 Vector database (FAISS / Pinecone)
* 🧠 Improved chunking strategies
* 🗣️ Multi-language support

---

👨‍💻 Author

**Vansh Kashyap**

---

⭐ Support

If you like this project, give it a ⭐ on GitHub!
