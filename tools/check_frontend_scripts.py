#!/usr/bin/env python3
"""Offline browser-script syntax extraction. No backend access or network requests."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess, sys, tempfile

class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.active = False
        self.buf = []
    def handle_starttag(self, tag, attrs):
        if tag == "script":
            a = dict(attrs)
            self.active = not bool(a.get("src")) and a.get("type", "text/javascript") in ("text/javascript", "module", "")
            self.buf = []
    def handle_data(self, data):
        if self.active: self.buf.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            self.scripts.append("".join(self.buf))
            self.active = False

def check(source, label):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", encoding="utf-8") as f:
        f.write(source)
        f.flush()
        r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
        if r.returncode:
            print("FAIL:",label, r.stderr[-1200:])
            return False
        print("PASS:",label)
        return True

def main():
    p = InlineScripts()
    p.feed(Path("index.html").read_text(encoding="utf-8"))
    if not p.scripts:
        print("FAIL: No inline scripts detected"); return 1
    ok = all(check(s, f"inline script {i}") for i,s in enumerate(p.scripts,1))
    for path in ("portal-v1767.js","sticky-v1767.js"):
        ok = check(Path(path).read_text(encoding="utf-8"),path) and ok
    print("Live user, browser, Drive and Apps Script tests remain mandatory.")
    return 0 if ok else 1

if __name__ == "__main__": raise SystemExit(main())
