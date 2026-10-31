# Document & Text Cleaner


Document & Text Cleaner is a Windows desktop application for inspecting and cleaning supported documents and text. It combines an Electron, React, and TypeScript interface with a local Python service. Core cleaning runs on your computer; optional text rewriting connects to a local Ollama instance.

## Download

[Download the Windows installer from GitHub Releases](https://github.com/hzaid01/AI-watermark-remover/releases/latest).


## Features


- Inspect and clean supported files, with a report of detected findings and applied changes.
- Remove invisible Unicode characters and selected text watermarking artifacts.
- Scrub metadata and AI-related properties from supported document formats.
- Optionally rewrite pasted text with a locally installed Ollama model.
- Preserve the original file and save a `.cleaned` copy by default.
- Run the Python service on loopback (`127.0.0.1`) by default.


Cleaning reduces selected metadata and watermark signals; it cannot guarantee that every watermark or provenance signal has been detected or removed.


## Supported desktop file types


| Format | Desktop support |
| --- | --- |
| DOCX | Document properties, custom metadata, and supported text cleanup |
| PDF | Metadata cleanup; install `qpdf` and `exiftool` for the strongest available cleanup |
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
- `qpdf` and `exiftool` are optional system tools that improve PDF cleanup.
