#!/usr/bin/env python3
"""Read-only ADG(B) portal pre-release source checker.

Usage: python3 tools/preflight_check.py [path/to/index.html] [path/to/Code.gs]
This is a STATIC checker, not a security audit or a live deployment test.
Does not connect to Apps Script or Google Drive.
"""
from pathlib import Path
from collections import Counter
from html.parser import HTMLParser
import re, sys

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.script_sources = []
        self.controls = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "script" and a.get("src"):
            self.script_sources.append(a["src"])
        if tag in {"button","input","select","textarea"} and a.get("id"):
            self.controls.add(a["id"])

def run(index_path, backend_path=None):
    page = index_path.read_text(encoding="utf-8")
    p = PageParser()
    p.feed(page)
    failures, warnings = [], []
    duplicate = sorted(k for k,v in Counter(p.ids).items() if v > 1)
    if duplicate: failures.append("Duplicate static HTML ids: " + ", ".join(duplicate[:15]))
    critical = [
        "matrixContent","officeCycleList","adgbControlSave",
        "adgbControlSaveBottom","adgbNoticeStrip","adgbExpandMatrix",
        "adgbFullOfficeSummary","adgbHealthPanel"
    ]
    for key in critical:
        if key not in p.ids: failures.append("Missing critical UI element: " + key)
    for key in ["adgbControlSave","adgbControlSaveBottom","adgbExpandMatrix"]:
        if "getElementById('"+key+"')" not in page:
            warnings.append("No detected JS binding reference for "+key)
    if not p.script_sources:
        failures.append("No external JavaScript assets detected")
    if "isRecognizedAsAdmin()" not in page:
        warnings.append("Frontend administrator UI guard not detected")
    if "aria-label" not in page:
        warnings.append("Accessible control labels not detected")
    if re.search(r"ROOT_FOLDER_ID\s*:",page):
        failures.append("Backend Drive folder configuration appears in public HTML")
    if backend_path:
        backend = backend_path.read_text(encoding="utf-8")
        for sig in ["requirePortalAdminSession_","requirePortalSession_","handleUpload_","handleRemoveSubmission_","getDatabase_"]:
            if sig not in backend: failures.append("Missing backend hook: "+sig)
        if "SpreadsheetApp.create" in backend:
            warnings.append("Database auto-creation path exists; DO NOT execute discovery via setup")
        if "ANYONE_WITH_LINK" in backend:
            warnings.append("A link-sharing path exists: review office document exposure")
        if "OFFICES = Object.freeze" in backend:
            warnings.append("Fixed office registry detected: cannot clone without configuration work")
    print("ADG(B) PORTAL STATIC PRE-FLIGHT")
    print("HTML ids:",len(p.ids),"script assets:",len(p.script_sources))
    print("Source checks: NO credentials, PDFs, files or Sheets are accessed.")
    for item in failures: print("FAIL:",item)
    for item in warnings: print("REVIEW:",item)
    if not failures: print("PASS: specified static structure checks")
    print("LIVE TESTS STILL REQUIRED: login, office isolation, upload, PDF sharing, data, device UX, rollback.")
    return 1 if failures else 0

if __name__ == "__main__":
    if len(sys.argv) not in (1,2,3):
        raise SystemExit("Usage: python3 tools/preflight_check.py [index.html] [Code.gs]")
    idx = Path(sys.argv[1]) if len(sys.argv)>1 else Path("index.html")
    b = Path(sys.argv[2]) if len(sys.argv)>2 else None
    if not idx.exists(): raise SystemExit("Missing file: "+str(idx))
    if b and not b.exists(): raise SystemExit("Missing backend file: "+str(b))
    raise SystemExit(run(idx,b))
