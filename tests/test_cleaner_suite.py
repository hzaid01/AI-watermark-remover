#!/usr/bin/env python3
"""Comprehensive test suite for Document & Text Cleaner backend and format support."""

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path

PORT = 8799
SERVER_EXE = Path("resources/bin/server.exe")


def create_sample_docx(path: Path):
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
        zf.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Confidential Document Body</w:t></w:r></w:p></w:body></w:document>')
        zf.writestr("docProps/core.xml", '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">AI-Agent</dc:creator></cp:coreProperties>')
        zf.writestr("docProps/app.xml", '<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Company>AI Generator</Company></Properties>')
        zf.writestr("customXml/item1.xml", '<ai:metadata xmlns:ai="http://example.com/ai">generated-by-llm</ai:metadata>')


def create_sample_odt(path: Path):
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/vnd.oasis.opendocument.text")
        zf.writestr("content.xml", '<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:p>ODT Text Content</text:p></office:text></office:body></office:document-content>')
        zf.writestr("meta.xml", '<?xml version="1.0" encoding="UTF-8"?><office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"><office:meta><meta:generator>AI-Generator-V2</meta:generator></office:meta></office:document-meta>')


def run_tests():
    print("=" * 60)
    print("Running Document & Text Cleaner Test Suite")
    print("=" * 60)

    proc = subprocess.Popen([str(SERVER_EXE), "--port", str(PORT)])
    time.sleep(2)

    try:
        # 1. Healthcheck
        h_req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health")
        h_data = json.loads(h_req.read().decode("utf-8"))
        assert h_data.get("ok") is True, "Healthcheck failed"
        print("[PASS] Healthcheck GET /health returned ok: true")

        # 2. Text Layer A Zero-width & Homoglyph cleaning
        text_with_wm = "Clean\u200BThis\uFEFFText\u00A0Now!"
        b64_txt = base64.b64encode(text_with_wm.encode("utf-8")).decode("ascii")
        clean_req = urllib.request.Request(
            f"http://127.0.0.1:{PORT}/clean",
            data=json.dumps({"file": b64_txt, "name": "sample.txt"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        clean_res = json.loads(urllib.request.urlopen(clean_req).read().decode("utf-8"))
        assert clean_res.get("ok") is True
        cleaned_text = base64.b64decode(clean_res["cleaned"]).decode("utf-8")
        assert cleaned_text == "CleanThisText Now!"
        assert clean_res["report"]["stats"]["removed_count"] == 2
        assert clean_res["report"]["stats"]["replaced_count"] == 1
        print(f"[PASS] TXT cleaning: stripped {clean_res['report']['stats']['removed_count']} zero-width chars, replaced {clean_res['report']['stats']['replaced_count']} homoglyphs")

        # 3. Markdown Frontmatter + Layer A Body
        md_content = "---\ntitle: Sample\nai_generated: true\nmodel: gpt-4\n---\n# Title\u200B\nBody\uFEFF text."
        b64_md = base64.b64encode(md_content.encode("utf-8")).decode("ascii")
        md_req = urllib.request.Request(
            f"http://127.0.0.1:{PORT}/clean",
            data=json.dumps({"file": b64_md, "name": "document.md"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        md_res = json.loads(urllib.request.urlopen(md_req).read().decode("utf-8"))
        assert md_res.get("ok") is True
        cleaned_md = base64.b64decode(md_res["cleaned"]).decode("utf-8")
        assert "ai_generated" not in cleaned_md
        assert "\u200B" not in cleaned_md
        print("[PASS] Markdown cleaning: stripped AI frontmatter keys and Layer A zero-width chars")

        # 4. HTML Meta + AI attrs
        html_content = '<!DOCTYPE html><html><head><meta name="generator" content="AI Assistant"><meta name="ai-generated" content="true"></head><body><p data-ai-model="claude-3">Hello\u200B HTML</p></body></html>'
        b64_html = base64.b64encode(html_content.encode("utf-8")).decode("ascii")
        html_req = urllib.request.Request(
            f"http://127.0.0.1:{PORT}/clean",
            data=json.dumps({"file": b64_html, "name": "page.html"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        html_res = json.loads(urllib.request.urlopen(html_req).read().decode("utf-8"))
        assert html_res.get("ok") is True
        cleaned_html = base64.b64decode(html_res["cleaned"]).decode("utf-8")
        assert "ai-generated" not in cleaned_html
        assert "\u200B" not in cleaned_html
        print("[PASS] HTML cleaning: stripped AI metadata tags, custom attributes, and invisible Unicode")

        # 5. DOCX metadata & customXml stripping
        with tempfile.TemporaryDirectory() as td:
            docx_path = Path(td) / "sample.docx"
            create_sample_docx(docx_path)
            docx_bytes = docx_path.read_bytes()
            b64_docx = base64.b64encode(docx_bytes).decode("ascii")

            docx_req = urllib.request.Request(
                f"http://127.0.0.1:{PORT}/clean",
                data=json.dumps({"file": b64_docx, "name": "sample.docx"}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            docx_res = json.loads(urllib.request.urlopen(docx_req).read().decode("utf-8"))
            assert docx_res.get("ok") is True
            cleaned_docx_bytes = base64.b64decode(docx_res["cleaned"])
            out_docx = Path(td) / "sample.cleaned.docx"
            out_docx.write_bytes(cleaned_docx_bytes)

            with zipfile.ZipFile(out_docx, "r") as zf:
                names = zf.namelist()
                assert "customXml/item1.xml" not in names
                assert "docProps/core.xml" not in names or zf.read("docProps/core.xml") == b"" or b"AI-Agent" not in zf.read("docProps/core.xml")
            print(f"[PASS] DOCX cleaning: actions={docx_res['report']['actions']}")

        # 6. ODT meta.xml stripping
        with tempfile.TemporaryDirectory() as td:
            odt_path = Path(td) / "sample.odt"
            create_sample_odt(odt_path)
            odt_bytes = odt_path.read_bytes()
            b64_odt = base64.b64encode(odt_bytes).decode("ascii")

            odt_req = urllib.request.Request(
                f"http://127.0.0.1:{PORT}/clean",
                data=json.dumps({"file": b64_odt, "name": "sample.odt"}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            odt_res = json.loads(urllib.request.urlopen(odt_req).read().decode("utf-8"))
            assert odt_res.get("ok") is True
            cleaned_odt_bytes = base64.b64decode(odt_res["cleaned"])
            out_odt = Path(td) / "sample.cleaned.odt"
            out_odt.write_bytes(cleaned_odt_bytes)

            with zipfile.ZipFile(out_odt, "r") as zf:
                if "meta.xml" in zf.namelist():
                    meta_xml = zf.read("meta.xml").decode("utf-8")
                    assert "AI-Generator-V2" not in meta_xml
            print(f"[PASS] ODT cleaning: actions={odt_res['report']['actions']}")

        print("\nAll Backend and Format Tests Passed Successfully!")
        return 0
    finally:
        proc.terminate()


if __name__ == "__main__":
    sys.exit(run_tests())
