#!/usr/bin/env python3
"""Validate a proposed OFFICE INSTANCE (not a live deployment).
Usage: python3 tools/validate_instance_config.py config/office-instance.example.json
Checks structure and obvious mixing risks. Does NOT create Sheets, folders, users or deployments.
"""
import json, re, sys
from pathlib import Path

ALLOWED_MODES = {"PUBLIC_VIEW", "LOGIN_REQUIRED", "ADMIN_ONLY"}
ALLOWED_CYCLES = {"MONTHLY", "QUARTERLY", "FORTNIGHTLY", "ONE_TIME"}
REQUIRED_TRUE = ("requiresDedicatedDatabase", "requiresDedicatedDriveRoot", "requiresDedicatedAppsScriptDeployment")
REQUIRED_FALSE = ("copiesProductionCredentials", "copiesProductionData")
IDENTIFIER = re.compile(r"^[A-Z][A-Z0-9_]{2,63}$")

def validate(data):
    issues = []
    def check(test, message):
        if not test: issues.append(message)
    check(isinstance(data, dict), "Configuration must be a JSON object")
    if not isinstance(data, dict): return issues
    check(data.get("schemaVersion") == 1, "schemaVersion must equal 1")
    check(isinstance(data.get("instanceId"), str) and bool(IDENTIFIER.fullmatch(data.get("instanceId", ""))), "Invalid instanceId")
    check(isinstance(data.get("displayName"), str) and 4 <= len(data.get("displayName", "")) <= 120, "Invalid displayName")
    check(data.get("environment") in ("staging", "production"), "Invalid environment")
    check(data.get("timeZone") == "Asia/Kolkata", "Expected explicit Asia/Kolkata timeZone")
    check(data.get("publicMode") in ALLOWED_MODES, "Invalid publicMode")
    for key in REQUIRED_TRUE: check(data.get(key) is True, key + " must be true")
    for key in REQUIRED_FALSE: check(data.get(key) is False, key + " must be false")
    offices = data.get("offices")
    check(isinstance(offices, list) and 1 <= len(offices) <= 40, "Need 1-40 office records")
    if isinstance(offices, list):
        seen = set()
        for i, office in enumerate(offices):
            if not isinstance(office, dict):
                issues.append(f"Office {i} must be an object"); continue
            oid = office.get("id")
            check(isinstance(oid, str) and bool(IDENTIFIER.fullmatch(oid or "")), f"Invalid office ID at {i}")
            if oid in seen: issues.append(f"Duplicate office ID at {i}")
            seen.add(oid)
            check(isinstance(office.get("name"), str) and bool(office.get("name", "").strip()), f"Invalid office name at {i}")
            check(isinstance(office.get("active"), bool), f"Invalid active flag at {i}")
    cycles = data.get("reportCycles")
    check(isinstance(cycles, list) and bool(cycles) and all(x in ALLOWED_CYCLES for x in cycles), "Invalid reportCycles")
    sensitive_keys = ("password", "secret", "token", "folderId", "spreadsheetId", "scriptUrl", "deploymentId", "email")
    for key in data:
        if any(s.lower() in key.lower() for s in sensitive_keys):
            issues.append("Potentially sensitive key in public example: " + key)
    return issues

def main(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    issues = validate(data)
    if issues:
        for issue in issues: print("FAIL:", issue)
        return 1
    print("PASS: Instance configuration is structurally valid.")
    print("NOT DEPLOYED: Security, permissions and database isolation still require live tests.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv)>1 else "config/office-instance.example.json"))
