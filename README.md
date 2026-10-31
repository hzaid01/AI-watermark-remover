# Document & Text Cleaner

Production-grade Windows desktop application built with **Electron + React + Tailwind CSS** (JARVIS dark-tech stack) wrapping the core [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) Python sanitization engine.

---

## Key Features

- **Layer A Sanitization (Default & Offline)**:
  - Strips invisible Unicode steganography (zero-width spaces `U+200B`, `U+FEFF`, `U+200C`, `U+200D`, `U+2060`, etc.).
  - Strips bidirectional formatting overrides (`LRE`, `RLE`, `LRO`, `RLO`).
  - Normalizes confusable homoglyph spaces (`U+00A0`, `U+2000`–`U+200A`, etc.) to standard spaces.
  - Scrubs document metadata and properties (Word `docProps/core.xml`, `docProps/app.xml`, `customXml/`, OpenDocument `meta.xml`, HTML AI `<meta>` tags and attributes, Markdown YAML frontmatter AI keys).
- **Layer B Rewrite Mode (Local Ollama LLM)**:
  - Defeats statistical / token-sampling watermarks by rewriting text.
  - Privacy-first: connects **only** to local Ollama (`http://127.0.0.1:11434`). No remote cloud APIs, no telemetry, no tracking.
  - Automatically discovers installed local Ollama models (`qwen`, `llama`, `gemma`, `mistral`, etc.).
- **Supported File Types**:
  - `DOCX` (Word document metadata & customXml properties)
  - `PDF` (PDF metadata strip via `exiftool` + `qpdf`)
  - `ODT` (OpenDocument text `meta.xml`)
  - `HTML` / `HTM` (AI meta tags, JSON-LD, `data-ai*` attributes, Layer A body)
  - `Markdown` / `MD` (YAML frontmatter AI keys + Layer A body)
  - `TXT` (Plaintext Layer A zero-width and homoglyphs)
- **Strict Format Guard (Client-Side Rejection)**:
  - Images (`PNG`, `JPG`, `WebP`, `SVG`, `GIF`), Audio/Video, `PPTX`, `XLSX`, and `EPUB` are rejected before any API call with:
    > *"This file type is not supported. Only DOCX, PDF, ODT, HTML, Markdown, and TXT are allowed."*

---

## Architecture & Privacy Guarantee

```
┌─────────────────────────────────────────────────────────────┐
│                 Document & Text Cleaner UI                  │
│               (React + Tailwind + TypeScript)               │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (Local IPC / Loopback HTTP)   │
               ▼                               ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     Python Core Service       │ │       Local Ollama        │
│   (127.0.0.1:8765 stdlib)     │ │   (127.0.0.1:11434)       │
│  - text_unicode.py            │ │  - Local LLM Models       │
│  - container_meta.py          │ │  - Rewrite Mode (Layer B) │
│  - rewrite_text.py            │ └───────────────────────────┘
└───────────────────────────────┘
```

> **Privacy Guarantee**: Everything runs locally on your machine. No file or text ever leaves your system. Network calls are strictly restricted to loopback interfaces `127.0.0.1` (local backend) and `127.0.0.1:11434` (Ollama).

---

## PyInstaller Backend Binary

The core backend (`service/scripts/server.py`) is compiled into a standalone, frozen Windows executable (`server.exe`) stored in `resources/bin/`.

### How It Is Built
Run the automated build script:
```bash
python scripts/build_backend.py
```
This command:
1. Validates `service/scripts/server.py`.
2. Packages standard library modules using `--onefile` into a single self-contained executable.
3. Excludes heavy optional packages (such as `torch`, `torchvision`, `numpy`, `transformers`, `diffusers`, etc.) keeping the binary lightweight (~15MB).
4. Moves the resulting binary to `resources/bin/server.exe`.

---

## Optional PDF Tools: `qpdf` & `exiftool`

PDF metadata cleaning relies on system tools for structural sanitization:
- **`exiftool`**: Strips document metadata and info dictionaries.
- **`qpdf`**: Performs structural linearizing / re-writing so metadata objects are permanently purged.

### Degraded PDF Mode
If `qpdf` or `exiftool` are not detected on the system `PATH`, the application displays a non-blocking amber warning banner:
> *"PDF cleaning will be degraded (metadata may remain recoverable) — install qpdf and exiftool for a full clean"*

Direct download links:
- [Download qpdf](https://github.com/qpdf/qpdf/releases)
- [Download exiftool](https://exiftool.org/)

---

## Local Ollama Auto-Detection

1. On launch (and when opening Preferences), the app queries `GET http://127.0.0.1:11434/api/tags`.
2. If Ollama is running, it parses the installed models and populates the model selection dropdown.
3. If Ollama is not running, Rewrite Mode is disabled with the notice:
   > *"Rewrite mode requires Ollama running locally with at least one model installed. Install from ollama.com and pull a model (e.g. `ollama pull llama3.2`), then restart this app."*

---

## Development & Build Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
# Start Vite development server
npm run dev

# Or launch full Electron development environment
npm run dev:electron
```

### 3. Build Backend Binary
```bash
npm run build:backend
```

### 4. Build Frontend & Electron Main
```bash
npm run build
```

### 5. Package Windows Installer & Portable Executable
```bash
npm run dist
```
The output installer `.exe` will be located in the `release/` directory.

### 6. Run Test Suite
```bash
python tests/test_cleaner_suite.py
```

---

## Output Naming Convention

When saving cleaned files, the original file is never overwritten by default:
- `document.docx` $\rightarrow$ `document.cleaned.docx`
- `report.pdf` $\rightarrow$ `report.cleaned.pdf`
- `article.md` $\rightarrow$ `article.cleaned.md`
- `page.html` $\rightarrow$ `page.cleaned.html`

Custom destination folders can be configured in the **Preferences** panel.
