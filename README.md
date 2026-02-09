
---

# **iVisit-Doc Full Technical Documentation**

## **1️⃣ Overview**

**Project:** `/ivisit-doc`
**Purpose:**

* Generate business, legal, and technical documents automatically from all iVisit-related codebases.
* Use **Claude Opus API** to create `.docx` or `.md` documents.
* Optional memory layer via **Supabase** to store project chunks for incremental updates.

**Key Features:**

* Recursively read all project folders (`../ivisit-app`, `../ivisit`, `../ivisit-console`)
* Exclude irrelevant directories (`node_modules`, `.git`, `dist`, `build`)
* Chunk large files for Claude token limits
* Query memory for prompt-specific content
* Output `.docx` or `.md` into `docs/` folder
* CLI accepts user prompts like:

  * “Generate a business proposal”
  * “Generate privacy policy”
  * “Generate PRD for backend APIs”

---

## **2️⃣ Folder Structure**

```
/ivisit-app
/ivisit            <- website
/ivisit-console
/ivisit-doc
    index.js       <- CLI entry point
    claude.js      <- API calls to Claude
    supabase.js    <- Optional memory storage
    docs/          <- generated documents (.docx / .md)
    package.json
    .env.example   <- environment variables
```

---

## **3️⃣ Environment Variables**

**`.env.example`**

```env
# Claude Opus API Key
ANTHROPIC_API_KEY=sk-your-anthropic-api-key

# Supabase backend (service role) — for CLI indexing
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional frontend keys (React / Next)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key

# Output folder for generated documents
OUTPUT_DIR=docs

# Max tokens for Claude
MAX_TOKENS=8000
```

---

## **4️⃣ Technical Workflow**

### **Step 1: Indexing files**

* CLI scans all sibling projects: `../ivisit-app`, `../ivisit`, `../ivisit-console`
* Recursively reads all files excluding unnecessary folders
* Splits large files into chunks (~1k–2k lines per chunk for token safety)
* Optional: inserts chunks into Supabase for memory

---

### **Step 2: User prompt**

* CLI accepts a natural language request:

  ```bash
  node index.js "Generate a business proposal"
  ```
* CLI determines relevant chunks to send to Claude:

  * If Supabase is used, query memory for keyword relevance
  * Otherwise, send all chunks (with truncation for token limits)

---

### **Step 3: Claude Opus API**

* API call includes:

  * `model`: `claude-3-opus-20240229`
  * `max_tokens`: from env (`MAX_TOKENS`)
  * Messages payload includes:

    * System prompt: “You are a startup, business, and legal expert…”
    * User prompt + relevant chunks

* Expected output: JSON containing:

  ```json
  { 
    "title": "Business Proposal",
    "content": "Full Markdown or text content"
  }
  ```

---

### **Step 4: Output document**

* Convert response into **Markdown** or **DOCX**
* Save in `docs/` folder:

  ```
  /ivisit-doc/docs/Business_Proposal.docx
  ```
* CLI logs confirmation to user

---

### **Step 5: Optional Supabase memory**

* Store indexed chunks: `{ file_path, content, timestamp }`
* Query relevant chunks per prompt for faster and cheaper API calls
* Supports incremental updates: only new/changed files sent to Claude

---

## **5️⃣ CLI Commands**

| Command                                         | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| `node index.js "Generate a business proposal"`  | Generate a specific document          |
| `node index.js "Index all files into Supabase"` | Index or update Supabase memory       |
| `node index.js "Generate privacy policy"`       | Generate privacy document             |
| `node index.js "Generate PRD"`                  | Generate product requirement document |

---

## **6️⃣ Code Modules**

| File                    | Responsibility                                                 |
| ----------------------- | -------------------------------------------------------------- |
| `index.js`              | CLI entry point, handles prompt, calls generator, saves output |
| `claude.js`             | Communicates with Claude Opus API, returns JSON content        |
| `supabase.js`           | Handles chunk storage and retrieval for memory                 |
| `docs/`                 | Generated `.docx` / `.md` documents                            |
| `.env` / `.env.example` | Configuration variables                                        |

---

## **7️⃣ Dependencies**

* `node-fetch` → API requests
* `docx` → generate Word documents
* `dotenv` → load environment variables
* `@supabase/supabase-js` → optional memory storage

Install with:

```bash
npm install node-fetch docx dotenv @supabase/supabase-js
```

---

## **8️⃣ Notes / Best Practices**

1. **Chunking**: Avoid sending entire repo at once — respect token limits.
2. **Supabase memory**: Speeds up repeated document generation.
3. **Output folder**: Keep all documents in `docs/` to avoid clutter.
4. **Security**: Use service role key **only in CLI**, never expose in frontend.
5. **Incremental updates**: Only index changed files to reduce API calls.

---

## **9️⃣ Future Enhancements**

* Interactive **mini web UI** for document requests
* Auto-update documents when code changes
* Support multiple output formats: PDF, HTML
* Include project diagrams from codebase automatically

---
