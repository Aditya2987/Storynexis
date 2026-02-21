# Storynexis — Technical Reference

> Complete technical documentation covering the AI model, backend architecture, API endpoints, data model, frontend features, and how every part of the system works.

---

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [AI Model Details](#ai-model-details)
3. [Story Generation Pipeline](#story-generation-pipeline)
4. [Quality Control System](#quality-control-system)
5. [Story Bible Extraction Pipeline](#story-bible-extraction-pipeline)
6. [Backend Architecture & API Endpoints](#backend-architecture--api-endpoints)
7. [Authentication System](#authentication-system)
8. [Database (Firestore) Schema](#database-firestore-schema)
9. [Frontend Architecture](#frontend-architecture)
10. [Feature Reference](#feature-reference)

---

## Tech Stack Overview

| Layer | Technology |
|-------|-----------|
| **AI Model** | Qwen 2.5-1.5B-Instruct (local, self-hosted) |
| **Backend** | Python 3.x + FastAPI + Uvicorn |
| **ML Framework** | HuggingFace Transformers + PyTorch |
| **Database** | Google Firestore (NoSQL) |
| **Auth** | Firebase Authentication |
| **Frontend** | React 18 + Vite |
| **Rich Text Editor** | TipTap (ProseMirror-based) |
| **Hosting** | Firebase Hosting (frontend) + local server (backend) |
| **Export** | PDF + ePub (via backend utilities) |

---

## AI Model Details

### Model Identity
- **Name:** Qwen 2.5-1.5B-Instruct
- **Publisher:** Alibaba Cloud (Qwen Team)
- **Type:** Instruction-tuned Causal Language Model (decoder-only transformer)
- **Parameters:** 1.5 billion
- **Local Path:** `D:\Story\Model\Qwen2.5-1.5B-Instruct`
- **HuggingFace ID:** `Qwen/Qwen2.5-1.5B-Instruct`

### No Custom Training
The model is used **as-is** from HuggingFace. There is **no fine-tuning, LoRA, or RLHF training** done in this project. All intelligence comes from Qwen's pre-training and instruction tuning by Alibaba Cloud.

### Hardware Setup
```
At startup:
├── Checks for CUDA (NVIDIA GPU)
├── If GPU found:
│   ├── Loads with torch_dtype=float16  (half precision — uses ~3 GB VRAM)
│   └── device_map="auto"              (auto-distributes across GPUs if multiple)
└── If CPU only:
    └── Loads in full float32 precision (slow but functional)
```

### Loading (Startup Sequence)
1. **FastAPI lifespan hook** fires on server start
2. Firebase is initialized (for auth/DB)
3. PyTorch checks `torch.cuda.is_available()`
4. Model + tokenizer are loaded from local disk via `AutoModelForCausalLM.from_pretrained()`
5. Tokenizer `pad_token` is set to `eos_token` if missing
6. Model is set to `eval()` mode (disables dropout, gradient tracking)
7. Model is attached to `app.state.model` and `app.state.tokenizer`

### Generation Parameters

| Parameter | Story Continuation | Bible Extraction |
|-----------|-------------------|-----------------|
| `temperature` | 0.65–0.75 (tone-dependent) | 0.3 (structured output) |
| `top_p` | 0.85 | — |
| `top_k` | 30 | — |
| `repetition_penalty` | 1.12 | — |
| `max_new_tokens` | 100–2000 (user-controlled) | 1000 |
| `do_sample` | True | True |

### Tone-to-Temperature Mapping
```
Dark          → 0.65  (deterministic, atmospheric)
Emotional     → 0.70
Mysterious    → 0.70
Romantic      → 0.70
Inspirational → 0.65
Humorous      → 0.75  (more creative/random)
Adaptive      → 0.68  (default)
```

### Token Length Presets
```
Short  → 100 tokens  (~75 words)
Medium → 200 tokens  (~150 words)
Long   → 800 tokens  (~600 words)
Max    → 2000 tokens (initial story generation + full rewrites)
```

### Context Truncation
- The model has a limited context window
- Story content is truncated to the **last ~750 words** before sending to avoid overflow
- Starts at a sentence boundary for better coherence

---

## Story Generation Pipeline

### Flow 1: Initial Story Generation (Homepage → Editor)

```
User fills form (title, genre, prompt) on Homepage
        ↓
Frontend calls:  POST /generate/stream
        ↓
Backend builds Qwen chat-template prompt:
  [system]  "You are a creative story writer..."
  [user]    "Continue this story. {tone_instructions}\n\nStory so far:\n{content}"
  [assistant] (empty — model fills this in)
        ↓
Model generates tokens one-by-one via TextIteratorStreamer
        ↓
Backend yields Server-Sent Events (SSE):
  data: {"type": "chunk", "text": "Once upon..."}  ← real-time
  data: {"type": "done",  "fullText": "...", "quality": {...}}
        ↓
Frontend (api.js generateContinuationStream) reads SSE stream
        ↓
Each chunk → append to `accumulatedText` → convert to HTML paragraphs
        ↓
setContent() → React re-renders → TipTap editor shows text word-by-word
        ↓
On 'done' event:
  1. Auto-save story to Firestore (POST /stories)
  2. Auto-extract Story Bible (POST /stories/{id}/bible/generate)
  3. Refresh lore panel
```

### Flow 2: Regenerate Story (In-Editor)

```
User clicks "✨ Regenerate Story"
        ↓
Frontend sends lore-aware prompt:
  - Fetches all Bible items from loreItems state
  - Filters items whose name appears in the current story text
  - Builds context: "Story Context:\n- [Character] Aria: ..."
  - Full prompt: "{loreContext}\nPlease rewrite the entire story...\n\n{plainText}"
        ↓
POST /generate/stream  (max_length=2000)
        ↓
Same SSE streaming flow → renders in modal as it generates
        ↓
User previews result; clicks "Use This Version"
        ↓
setContent(formatted) → editor updates
        ↓
After 500ms delay: auto-save + re-extract Bible items
```

### Flow 3: Non-Streaming Generation (POST /generate)

Used when multiple options (1-3) are needed simultaneously.
Each option is generated sequentially in a background thread using `TextIteratorStreamer`. Client disconnect is checked between options and mid-stream. Results are returned as a JSON array.

### Text Post-Processing (`clean_and_complete_text`)
After every generation, the raw model output is cleaned:
1. Strips meta-commentary (e.g., "Here's the continuation:", "Let me...")
2. Finds the last complete sentence (ends in `.`, `!`, `?`, or `"`)
3. If no sentence ending is found, appends `.` at a natural break point (comma, "and", "but")
4. Returns clean, publication-ready text

---

## Quality Control System

Every generation run through `/generate/stream` and `/generate/variations` gets a quality score from `quality_control.py`.

### Scoring Dimensions (each 0–1, higher is better)

| Dimension | What it measures | Weight |
|-----------|-----------------|--------|
| **repetition** | Unique 3-word phrase ratio (no repetitive loops) | 30% |
| **coherence** | Type-token ratio (vocabulary diversity) | 30% |
| **length** | Ideal length (penalizes <20 words or >500 words) | 20% |
| **variety** | Variance in sentence lengths | 20% |

### How it's used
- The `overall` score (weighted average) is sent back in the `done` SSE event
- For `/generate/variations`: 2–3 variations are generated and **sorted by `overall` score descending** so the best option appears first

---

## Story Bible Extraction Pipeline

The Story Bible is an AI-maintained wiki of characters, locations, items, and lore extracted directly from the story text.

### When it runs
- **Automatically**: After initial story generation completes
- **Automatically**: After a user chooses a regenerated story option
- **Manually**: When user clicks the "🔄 Sync" button in the Bible tab

### How it works

```
POST /stories/{story_id}/bible/generate?sync=true|false
        ↓
1. Fetch full story content from Firestore
2. Strip HTML tags to get clean plaintext → truncate to ~3000 tokens
3. Fetch existing Bible items (to avoid duplicates)
4. Build extraction prompt:
   [system] "You are an expert literary analyst..."
   [user]   "Analyze this story and return JSON with:
             - items: [{name, category, description, attributes}]
             - obsolete: [names no longer relevant]
             Story: {content}"
   [assistant] "```json"  ← primes model to output JSON
5. Model generates JSON at low temperature (0.3) for consistency
6. extract_json_from_text() parses the response:
   - Searches for ```json ... ``` blocks first
   - Falls back to first { ... } in output
7. Validates each item has name, category, description
8. Normalizes category to: Character | Location | Item | Lore
9. Tags each item as autoGenerated: true
10. Deduplication check (case-insensitive name matching)
11. Saves new items to Firestore subcollection: stories/{id}/items
12. If sync=true: deletes items AI marked as obsolete
    (ONLY if item.autoGenerated === true, protecting manual edits)
```

### Item Structure (Firestore)
```json
{
  "id": "abc123",
  "name": "Aria",
  "category": "Character",
  "description": "A young mage who discovered her powers at age 12...",
  "attributes": { "Role": "Protagonist", "Power": "Telekinesis" },
  "autoGenerated": true,
  "createdAt": "2026-02-21T10:00:00Z",
  "updatedAt": "2026-02-21T10:00:00Z"
}
```

---

## Backend Architecture & API Endpoints

### Server
- **Framework:** FastAPI
- **ASGI server:** Uvicorn
- **Port:** 8000
- **Startup:** `python main.py` or via `restart-backend.ps1`

### CORS Configuration
Allowed origins are set via the `ALLOWED_ORIGINS` environment variable in `.env`. Default includes localhost and the Firebase hosting domains.

### All API Endpoints

#### General
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/` | No | Health check + model status |
| GET | `/health` | No | Returns model loaded status + device |
| GET | `/user/me` | Yes | Returns current user info |

#### AI Generation
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/generate` | Yes | Non-streaming generation (1 option) |
| POST | `/generate/stream` | No* | SSE streaming generation → word-by-word |
| POST | `/generate/variations` | No* | 2–3 ranked variations |
| POST | `/rewrite` | No* | Rewrite selected text with instruction |

*Note: These endpoints accept auth but don't strictly require it for the generation itself. Stories are saved separately via the `/stories` endpoint.

#### Story Management
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/stories` | Yes | Create new story |
| POST | `/stories?story_id={id}` | Yes | Update existing story |
| GET | `/stories` | Yes | List all stories (paginated, no content) |
| GET | `/stories/{id}` | Yes | Get full story with content |
| DELETE | `/stories/{id}` | Yes | Delete a story |

#### Story Bible
| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/stories/{id}/bible/generate` | Yes | AI-extract Bible items from story |
| POST | `/stories/{id}/bible/generate?sync=true` | Yes | Extract + prune obsolete items |
| GET | `/stories/{id}/items` | Yes | List Bible items (optional ?category= filter) |
| POST | `/stories/{id}/items` | Yes | Manually create a Bible item |
| PUT | `/stories/{id}/items/{item_id}` | Yes | Update a Bible item |
| DELETE | `/stories/{id}/items/{item_id}` | Yes | Delete a Bible item |

### Request/Response Models
All request and response bodies are Pydantic models. Key models:
- `GenerateRequest`: `{prompt, tone, length, count, max_length, temperature, top_p}`
- `StoryCreate`: `{title, genre, content, chapters, settings, status}`
- `BibleItemCreate`: `{name, category, description, attributes, imageUrl}`

---

## Authentication System

### How it works
1. **Firebase Auth** handles user login/signup (Google OAuth + Email/Password)
2. After login, Firebase issues a **JWT ID token** to the frontend
3. Every protected API call includes: `Authorization: Bearer <token>`
4. Backend's `firebase_auth.py` calls `firebase_admin.auth.verify_id_token()` to verify
5. If token is expired: frontend calls `user.getIdToken(true)` to **force-refresh** and retries
6. If user is not found or token is invalid: returns `401 Unauthorized`

### Auth Retry Logic (Frontend `api.js`)
```
Request fails with 401
        ↓
forceTokenRefresh = true
        ↓
Retry the same request with a fresh token (up to 3 attempts)
        ↓
If still failing after 3 retries: throw ApiError(401)
```

### Story Ownership
Every story document stores a `userId` field matching the Firebase UID. All story/bible endpoints enforce: **you can only read/write your own stories**.

---

## Database (Firestore) Schema

```
Firestore Root
├── stories/                        (Collection)
│   └── {storyId}/                  (Document)
│       ├── userId: string          — Firebase UID of owner
│       ├── title: string
│       ├── genre: string
│       ├── content: string         — HTML content (legacy / legacy compat)
│       ├── chapters: Array         — [{id, title, content, order, status, metadata}]
│       ├── status: string          — "draft" | "complete"
│       ├── settings: Object        — reserved for future settings
│       └── metadata: Object
│           ├── wordCount: number   — computed from content (HTML stripped)
│           ├── characterCount: number
│           ├── chapterCount: number
│           ├── createdAt: ISO8601 string
│           ├── updatedAt: ISO8601 string
│           └── lastEditedAt: ISO8601 string
│
│       └── items/                  (Sub-collection — Story Bible)
│           └── {itemId}/           (Document)
│               ├── name: string
│               ├── category: "Character" | "Location" | "Item" | "Lore"
│               ├── description: string
│               ├── attributes: Object  — {"Trait": "Value", ...}
│               ├── autoGenerated: boolean
│               ├── imageUrl: string (optional)
│               ├── createdAt: ISO8601 string
│               └── updatedAt: ISO8601 string
```

### Firestore Indexes
Defined in `firestore.indexes.json`. Key composite index:
- Collection: `stories`, fields: `userId` (ASC) + `metadata.updatedAt` (DESC)
  - Allows efficient listing of a user's stories sorted by most recently edited

### Firestore Security Rules (`firestore.rules`)
- Users can only `read`, `write`, `create`, `update`, `delete` documents where `userId == request.auth.uid`
- All operations require a valid Firebase session

---

## Frontend Architecture

### Project Structure
```
Frontend/src/
├── components/
│   ├── Editor.jsx          — Main writing editor (1000 lines)
│   ├── Editor.css          — Editor styles (~2600 lines)
│   ├── RichTextEditor.jsx  — TipTap wrapper component
│   ├── StoryBible.jsx      — Bible item panel
│   ├── AmbientPlayer.jsx   — Background sound player
│   ├── Dashboard.jsx       — User story library
│   ├── GenerationProgress.jsx — Streaming progress UI
│   └── ...
├── contexts/
│   └── AuthContext.jsx     — Firebase auth context (user, login, logout)
├── hooks/
│   └── useTTS.js           — Text-to-speech hook (Web Speech API)
├── utils/
│   ├── api.js              — All backend API calls + auth retry logic
│   ├── exportUtils.js      — PDF + ePub export functions
│   └── textUtils.js        — stripHtml, word count helpers
└── constants/
    └── landingPageData.js  — Genre lists, tone palettes, shortcuts
```

### State Management
No external state library (no Redux/Zustand). Uses React `useState` and `useContext` for:
- **AuthContext**: current user globally
- **Editor**: all story state (title, content, genre, saveStatus, AI generation state, etc.)

### Auto-Save Logic
```
User types → handleContentChange() → setContent(newHtml)
        ↓
useEffect watches [title, content, genre, user]
        ↓
Clears previous timer → sets 3-second debounce timer
        ↓
After 3 seconds of no typing: saveToCloud() fires
        ↓
POST /stories or POST /stories?story_id={id}
        ↓
setSaveStatus('saved'), setLastSaved(new Date())
```

### Session Backup
Every content change is also **immediately** backed up to `sessionStorage` as a JSON blob. This protects against browser crashes without needing to wait for the cloud save.

---

## Feature Reference

### ✍️ Rich Text Editor (TipTap)
- **Engine:** TipTap v2 (ProseMirror underneath)
- **Extensions:** StarterKit, Placeholder, Highlight, BubbleMenu
- **Output format:** HTML strings stored in React state + Firestore
- **Controlled updates:** An `editorUpdateTrigger` counter forces TipTap to re-sync when content is set programmatically (e.g., after AI regeneration)

### 🔊 Text-to-Speech (TTS)
- **API:** Browser Web Speech API (`SpeechSynthesisUtterance`)
- **Hook:** `useTTS.js` — exposes `speak`, `pause`, `resume`, `stop`
- **Behaviour:** Strips HTML → speaks the plain text
- **Controls in toolbar:** Read Aloud / Pause / Resume / Stop ⏹

### 🎵 Ambient Sound Player
- **Component:** `AmbientPlayer.jsx`
- **Sounds:** Rain, Fireplace, Café, Forest
- **Playback:** HTML5 `<audio>` element with looping
- **Position:** Top-right of the editor navbar

### 📄 Export
| Format | How |
|--------|-----|
| **PDF** | Via `exportUtils.js` → calls backend or browser print API |
| **ePub** | Via `exportUtils.js` → POST to `/epub/generate` endpoint |

### 🌙 Themes
Three visual themes switchable from the editor toolbar:
- **Light** (default)
- **Dark** (dark background, muted text)
- **Sepia** (warm cream tones, reading-optimized)

### 🔎 Focus Mode (`Ctrl+F`)
Hides the sidebar and navbar, leaving only the editor and a minimal toolbar. Press `Esc` to exit.

### ↩️ Undo / Redo
- **Type:** In-memory ring buffer (`history` array + `historyIndex`)
- **Shortcuts:** `Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`
- **Scope:** Tracks content changes within the current session

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Manual save to Firestore |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Toggle Focus Mode |
| `Esc` | Exit Focus Mode / close modals |

### 📖 Story Bible (Lore-Aware Generation)
- Users can view, create, edit, and delete Bible items in the sidebar
- The Bible is loaded automatically when a `storyId` is set
- During regeneration, `loreItems` matching names in the current story text are injected into the AI prompt as **story context**, giving the model awareness of existing characters and world-building

### 📊 Story Stats
Calculated client-side on every content change:
- **Words** (`text.split(/\s+/).length`)
- **Characters** (text length after HTML stripping)
- **Paragraphs** (double newline splits)
- **Sentences** (`.!?` splits)
- **Reading Time** (`words / 200` minutes, rounded up)

---

## Environment Variables

### Backend (`.env`)
```env
ALLOWED_ORIGINS=http://localhost:5173,https://storynexis.web.app
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

### Frontend (`.env.development` / `.env.production`)
```env
VITE_API_URL=http://localhost:8000         # development
VITE_API_URL=https://your-backend.url     # production
```

---

## Running the Project

### Backend
```bash
cd Backend
python -m venv venv_gpu
venv_gpu\Scripts\activate
pip install -r requirements.txt
python main.py
# Server starts at http://localhost:8000
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
# App starts at http://localhost:5173
```

---

*Generated: February 2026 — Storynexis v1.0*
