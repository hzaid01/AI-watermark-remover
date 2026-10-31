# Document & Text Cleaner

Document & Text Cleaner is a Windows desktop application for inspecting and cleaning supported documents and text. It combines an Electron, React, and TypeScript interface with a local Python service. Core cleaning runs on your computer; optional text rewriting connects to a local Ollama instance.

## Download

[Download the Windows installer from GitHub Releases](https://github.com/hzaid01/AI-watermark-remover/releases/latest).

## Features

- Inspect and clean supported files, with a report of detected findings and applied changes.
- Remove invisible Unicode characters and selected text watermarking artifacts.
- Scrub metadata and AI-related properties from supported document formats.
- Optionally rewrite pasted text with a locally installed Ollama model.
- Preserve the original file and save a .cleaned copy by default.
- Run the Python service on loopback (127.0.0.1) by default.

Cleaning reduces selected metadata and watermark signals; it cannot guarantee that every watermark or provenance signal has been detected or removed.

## Supported desktop file types

| Format | Desktop support |
| --- | --- |
| DOCX | Document properties, custom metadata, and supported text cleanup |
| PDF | Metadata cleanup; install qpdf and exiftool for the strongest available cleanup |
| ODT | Document metadata and supported text cleanup |
| HTML / HTM | AI-related metadata and supported text cleanup |
| Markdown / MD | Selected YAML frontmatter metadata and supported text cleanup |
| TXT | Invisible Unicode and supported text cleanup |

Other formats are rejected by the desktop app. The backend contains additional inspection and cleaning code, but that does not make those formats available in the desktop file picker.

## Requirements

- Windows 10 or later (the packaged installer targets Windows x64).
- Node.js 20 LTS or later and npm for development and packaging.
- Python 3.10 or later for running the backend from source and building its standalone executable.
- Ollama is optional and is needed only for Rewrite Mode.
- qpdf and exiftool are optional system tools that improve PDF cleanup.

## Install and run

Install the JavaScript dependencies:

    npm install

Start the Vite frontend by itself:

    npm run dev

Start the full Electron development app (the backend is started by Electron):

    npm run dev:electron

When running from source, Electron uses the Python backend script if a local resources/bin/server.exe is not available. Make sure Python is on PATH.

## Build

Install the Python build dependency and create the standalone backend:

    python -m pip install -r requirements.txt
    npm run build:backend

Build the frontend and Electron main process:

    npm run build

Create the Windows x64 installer and portable executable:

    npm run dist

Build outputs are written to release/. The backend builder produces a Windows executable when run on Windows.

## Python dependencies

The core Python backend uses only the Python standard library. The root requirements.txt contains PyInstaller for creating the standalone backend executable.

Optional research and model integrations have separate environment requirements. Install them only when you need the corresponding integration:

- CtrlRegen: service/scripts/requirements-ctrlregen.txt
- MarkDiffusion: service/scripts/requirements-markdiffusion.txt
- MarkLLM: service/scripts/requirements-markllm.txt
- Reverse SynthID scorer: service/scripts/requirements-synthid-scorer.txt

These profiles may install large machine-learning packages and are intentionally not combined with the core or build requirements. Use the associated setup scripts in service/scripts/ to configure the optional integrations.

## Local service

The Python service can also be run directly:

    python service/scripts/server.py

By default it listens on 127.0.0.1:8765. Set WATERMARKS_SERVER_HOST and WATERMARKS_SERVER_PORT, or pass --host and --port, to change the bind address and port. The service provides health, capability, inspection, detection, cleaning, and OpenAPI endpoints. See the service's /openapi.json endpoint for the API schema.

Keep the service on loopback unless you understand the security implications of exposing it to other machines. If you configure a non-loopback bind address, protect access appropriately; the service supports an optional bearer API key through WATERMARKS_SERVER_API_KEY or --api-key.

## Ollama Rewrite Mode

Rewrite Mode is optional and uses Ollama's local HTTP API. Install and start Ollama, then download a model, for example:

    ollama pull llama3.2

The app checks the configured Ollama URL (default http://127.0.0.1:11434) for installed models. Rewriting is best-effort and does not guarantee removal of statistical or token-sampling watermarks.

## PDF tools

PDF cleanup may be degraded when qpdf or exiftool is unavailable. Install them and ensure they are on PATH:

- [qpdf releases](https://github.com/qpdf/qpdf/releases)
- [ExifTool](https://exiftool.org/)

The app displays a warning when these tools are not detected. PDF cleanup behavior depends on which tools are available.

## Privacy

The app and core backend process files locally. The desktop app contacts the local backend over loopback and, when Rewrite Mode is used, sends text to the configured Ollama endpoint. Use a local Ollama instance if you want rewriting to remain on your device. Optional integrations may download models or communicate with their configured services; review their setup and configuration before enabling them.

## License

The package metadata declares the MIT license. Confirm the license terms with the project maintainer before redistributing.
