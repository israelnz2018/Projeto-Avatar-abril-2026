# AI Continuous Improvement Copilot - System Design Blueprint

## 1. System Architecture Diagram

```text
[Frontend: React SPA]
      |
      | (HTTP/JSON)
      v
[Backend: Express API] <------> [PostgreSQL Database]
      |                             - Users, Projects, Datasets
      |                             - Conversations, Video Chunks
      |
      +------> [AI Orchestrator: Gemini API]
      |             - System Prompt
      |             - Tool Execution
      |             - Memory Management
      |
      +------> [External Statistical API] (Simulated)
      |             - Descriptive Stats, Regression, etc.
      |
      +------> [Vector Search Engine] (Simulated)
                    - Video Transcript Embeddings
```

## 2. Database Schema (PostgreSQL)

### Tables

- **users**: `id (UUID)`, `email (String)`, `name (String)`, `created_at (Timestamp)`
- **projects**: `id (UUID)`, `user_id (FK)`, `name (String)`, `problem (Text)`, `goal (Text)`, `scope (Text)`, `current_phase (Enum: DMAIC)`, `updated_at (Timestamp)`
- **datasets**: `id (UUID)`, `project_id (FK)`, `name (String)`, `storage_path (String)`, `columns (JSONB)`, `created_at (Timestamp)`
- **analysis_runs**: `id (UUID)`, `dataset_id (FK)`, `type (String)`, `parameters (JSONB)`, `results (JSONB)`, `created_at (Timestamp)`
- **ai_conversations**: `id (UUID)`, `user_id (FK)`, `project_id (FK)`, `created_at (Timestamp)`
- **ai_messages**: `id (UUID)`, `conversation_id (FK)`, `role (Enum: user/assistant)`, `content (Text)`, `tool_calls (JSONB)`, `created_at (Timestamp)`
- **video_chunks**: `id (UUID)`, `video_id (String)`, `title (String)`, `url (String)`, `topic (String)`, `dmaic_phase (Enum: DMAIC)`, `text (Text)`, `embedding (Vector[768])`, `timestamp (Int)`

### Indexes
- `projects.user_id`
- `datasets.project_id`
- `analysis_runs.dataset_id`
- `ai_messages.conversation_id`
- `video_chunks.embedding` (HNSW index for vector search)

## 3. API Endpoints

- `POST /api/projects`: Create a new DMAIC project.
- `GET /api/projects/:id`: Get project details and context.
- `POST /api/datasets/upload`: Upload CSV and extract metadata.
- `POST /api/analysis/run`: Trigger statistical analysis via external API.
- `POST /api/chat`: Send message to AI Assistant (Orchestrator).
- `GET /api/learning/search`: Search for relevant video chunks.

## 4. Tool Definitions (JSON Schema)

### `run_analysis`
```json
{
  "name": "run_analysis",
  "description": "Execute a statistical analysis on a dataset.",
  "parameters": {
    "type": "object",
    "properties": {
      "dataset_id": { "type": "string" },
      "analysis_type": { "enum": ["descriptive", "regression", "hypothesis_test", "capability"] },
      "columns": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["dataset_id", "analysis_type", "columns"]
  }
}
```

### `recommend_video`
```json
{
  "name": "recommend_video",
  "description": "Search for and recommend a learning video based on the current context.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "dmaic_phase": { "type": "string" }
    },
    "required": ["query"]
  }
}
```

## 5. AI Prompt Design (System Prompt)

```text
You are the AI Continuous Improvement Copilot. Your goal is to guide professionals through Lean Six Sigma and DMAIC projects.

ALWAYS structure your responses as follows:
1. Diagnosis: Briefly state the current situation or problem.
2. Recommended Action: What should the user do next?
3. Execution: If a tool was called, explain what it did.
4. Business Interpretation: What do these results mean for the business?
5. Learning Recommendation: Suggest a specific video chunk for deeper understanding.

Tone: Professional, data-driven, and encouraging.
```

## 6. Vector Search Design

- **Chunk Size**: 500 characters with 50-character overlap to maintain context.
- **Metadata**: `video_id`, `timestamp_seconds`, `dmaic_phase`.
- **Similarity Search**: Use `pgvector` with Cosine Similarity.
- **Flow**: User query -> Embedding -> Vector Search -> Top 3 chunks -> AI Context.

## 7. MVP Build Plan

1. **Phase 1: Foundation (Week 1)**
   - Set up Express + React boilerplate.
   - Implement basic Project and Dataset management.
2. **Phase 2: AI Orchestration (Week 1-2)**
   - Integrate Gemini with function calling.
   - Implement the structured response logic.
3. **Phase 3: Analysis & Learning (Week 2)**
   - Simulate the Statistical API.
   - Implement mock vector search for video chunks.
4. **Phase 4: UI/UX Polish (Week 3)**
   - Build the Chat interface and Dashboard.
   - Add data visualization for analysis results.
