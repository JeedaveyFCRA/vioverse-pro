#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FCRA Tradeline Violations — Litigation-Hardened (Serious/Severe/Extreme only)

Removals vs prior draft:
- ❌ SER-003 (Account fragment mismatch) removed from violations. It can be emitted as an audit note only.

What remains (kept for litigation value):
- Extreme: Post-discharge balances/past-due/charge-off; bankruptcy misclassification; post-discharge payments/activity.
- Severe: Closed-but-still-reporting; frozen updates with ongoing derogatory; obsolete DoFD; removal-date > 7y+180d; re-aging; cross-bureau
  inconsistencies (material fields only).
- Serious: Missing DoFD while derogatory; derogatory remarks post-discharge.

Usage:
    python fcra_detect_tradeline_violations_litigation.py input.csv \
        --out violations_serious_plus.csv \
        --discharge 2024-02-09 \
        --audit-out audit_notes.csv   # optional
"""

import argparse
import csv
import datetime as dt
import json
import re
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

DEFAULT_DISCHARGE_DATE = "2024-02-09"

BANKRUPTCY_TOKENS = [
    "included in chapter 13", "included in bankruptcy", "bankruptcy", "ch 13", "chapter 13"
]
DISMISS_CLOSE_TOKENS = [
    "dismissed", "closed (without discharge)", "closed no discharge"
]
DEROG_REMARK_TOKENS = [
    "charge-off", "charge off", "late", "30 days late", "60 days late", "90 days late",
    "collection", "collections", "account closed by credit grantor"
]

def _strip(s: Optional[str]) -> str:
    return (s or "").strip()

def parse_money(val: Any) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.upper() in {"NA", "N/A", "[NOT PROVIDED]"}:
        return None
    s = s.replace("$", "").replace(",", "")
    m = re.search(r"-?\d+(\.\d+)?", s)
    if not m:
        return None
    try:
        return float(m.group(0))
    except:
        return None

def parse_date(val: Any) -> Optional[dt.date]:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.upper() in {"NA", "N/A", "[NOT PROVIDED]"}:
        return None
    fmts = ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%m/%Y", "%Y-%m", "%Y/%m"]
    for f in fmts:
        try:
            d = dt.datetime.strptime(s, f)
            if f in ("%m/%Y", "%Y-%m", "%Y/%m"):
                return dt.date(d.year, d.month, 1)
            return d.date()
        except:
            pass
    if re.fullmatch(r"\d{4}", s):
        return dt.date(int(s), 1, 1)
    if re.fullmatch(r"\d{6}", s):
        return dt.date(int(s[:4]), int(s[4:6]), 1)
    return None

def after(a: Optional[dt.date], b: Optional[dt.date]) -> bool:
    return a is not None and b is not None and a > b

def on_or_after(a: Optional[dt.date], b: Optional[dt.date]) -> bool:
    return a is not None and b is not None and a >= b

def any_token_in(text: str, tokens: List[str]) -> bool:
    t = (text or "").lower()
    return any(tok in t for tok in tokens)

@dataclass
class Violation:
    rule_id: str
    rule_name: str
    severity: str  # "Serious", "Severe", "Extreme"
    statutes: List[str]
    explanation: str
    creditor_code: str
    creditor_full_name: str
    bureau: str
    report_date: str
    png_file_start: str
    row_index: int
    fields: Dict[str, Any]

@dataclass
class AuditNote:
    note_id: str
    note_name: str
    explanation: str
    creditor_code: str
    creditor_full_name: str
    bureau: str
    report_date: str
    png_file_start: str
    row_index: int
    fields: Dict[str, Any]

def normalize_creditor_name(name: str) -> str:
    """Normalize creditor names to standard format."""
    if not name:
        return name

    n = str(name).strip()

    # Remove trailing masked/ID fragments like " 70050149****", " ****1234", " XXXXX1234", " 12345678"
    n = re.sub(r'\s+([xX*#]{2,}\d{2,}|\d{4,}\*{2,}|\d{4,})$', '', n)
    n = re.sub(r'\s+[0-9]{4,}$', '', n)

    # Strip explicit CLOSED markers
    n = re.sub(r'\s*\((?i:closed)\)\s*$', '', n, flags=re.I)   # "(CLOSED)"
    n = re.sub(r'\s*-\s*(?i:closed)\s*$', '', n, flags=re.I)   # "- Closed"

    # Normalize spacing around slashes: "BEST BUY /CBNA" -> "BEST BUY/CBNA"
    n = re.sub(r'\s*/\s*', '/', n)

    # Collapse extra spaces
    n = re.sub(r'\s{2,}', ' ', n).strip()

    # Convert to uppercase for comparison
    u = n.upper()

    # Comprehensive mapping for all variations
    # Check for partial matches first, then exact matches

    # Ally Financial variations
    if "ALLY FINANCIAL" in u:
        return "Ally Financial"

    # Bank of America variations
    if "BANK OF AMERICA" in u:
        return "Bank of America"

    # Barclays variations
    if "BARCLAYS BANK DELAWARE" in u or "BARCLAYS" in u:
        return "Barclays"

    # Best Buy variations
    if "BEST BUY" in u and ("CBNA" in u or "CB NA" in u):
        return "Best Buy/CBNA"

    # Citizens Bank variations
    if "CITIZENS BANK" in u or "CITIZENS BK" in u:
        return "Citizens Bank"

    # Cornerstone variations
    if "CORNERSTONE COMMUNITY FCU" in u or "CORNERSTONE COMMUN FCU" in u:
        return "Cornerstone FCU"

    # Discover Bank variations
    if "DISCOVER BANK" in u:
        return "Discover Bank"

    # Discover Personal Loans variations
    if "DISCOVER PERSONAL LOANS" in u:
        return "Discover Loans"

    # JPMCB variations
    if "JPMCB" in u:
        return "JPMCB"

    # Mariner Finance variations
    if "MARINER FINANCE" in u:
        return "Mariner Finance"

    # Sears variations
    if "SEARS" in u and ("CBNA" in u or "CB NA" in u):
        return "Sears/CBNA"

    # Home Depot/THD variations
    if ("THD" in u and "CBNA" in u) or ("HOME DEPOT" in u and ("CITIBANK" in u or "CBNA" in u)):
        return "THD/CBNA"

    # If no match found, return the cleaned original name
    return n

def evaluate_row_rules(row: Dict[str, str], idx: int, discharge_date: dt.date) -> Tuple[List[Violation], List[AuditNote]]:
    violations: List[Violation] = []
    audits: List[AuditNote] = []

    report_date = parse_date(row.get("report_date"))
    if not report_date:
        return violations, audits

    bal = parse_money(row.get("balance"))
    rbal = parse_money(row.get("reported_balance"))
    past_due = parse_money(row.get("amount_past_due"))
    chgoff = parse_money(row.get("charge_off_amount"))

    acct_status = _strip(row.get("account_status")).lower()
    remarks = _strip(row.get("remarks_multi"))
    bky_notes = _strip(row.get("bankruptcy_notes"))
    last_upd = parse_date(row.get("date_reported_last_updated"))
    last_pmt = parse_date(row.get("date_of_last_payment"))
    last_act = parse_date(row.get("date_of_last_activity"))
    dofd = parse_date(row.get("date_of_first_delinquency"))
    first_delinq_flag = parse_date(row.get("delinquency_first_reported"))
    date_closed = parse_date(row.get("date_closed"))
    removal = parse_date(row.get("estimated_removal_date"))

    common = dict(
        creditor_code=row.get("creditor_code", ""),
        creditor_full_name=row.get("creditor_full_name", ""),
        bureau=row.get("bureau", ""),
        report_date=row.get("report_date", ""),
        png_file_start=row.get("png_file_start", ""),
        row_index=idx,
    )

    def add(rule_id, name, severity, statutes, explanation, fields):
        violations.append(Violation(rule_id, name, severity, statutes, explanation, fields=fields, **common))

    def audit(note_id, name, explanation, fields):
        audits.append(AuditNote(note_id, name, explanation, fields=fields, **common))

    # EXTREME — Post-discharge financials
    if after(report_date, discharge_date):
        if (bal is not None and bal > 0) or (rbal is not None and rbal > 0):
            add("EXT-001", "Post-Discharge Balance > 0", "Extreme",
                ["§1681e(b)", "§1681c(f)"], "Balance reported > $0 after discharge.",
                {"balance": bal, "reported_balance": rbal})
        if past_due is not None and past_due > 0:
            add("EXT-002", "Post-Discharge Past Due > 0", "Extreme",
                ["§1681e(b)", "§1681c(f)"], "Amount past due reported after discharge.",
                {"amount_past_due": past_due})
        if chgoff is not None and chgoff > 0:
            add("EXT-003", "Post-Discharge Charge-Off Amount", "Extreme",
                ["§1681e(b)", "§1681c(f)"], "Charge-off amount reported after discharge.",
                {"charge_off_amount": chgoff})

    # EXTREME — Bankruptcy misclassification/persistence
    if after(report_date, discharge_date):
        if any_token_in(acct_status, BANKRUPTCY_TOKENS) or any_token_in(remarks, BANKRUPTCY_TOKENS):
            add("EXT-004", "Bankruptcy Status Persisting Post-Discharge", "Extreme",
                ["§1681e(b)", "§1681c(f)"], "Account still reported as bankruptcy/Chapter 13 post-discharge.",
                {"account_status": row.get("account_status"), "remarks_multi": remarks})
        if any_token_in(bky_notes, DISMISS_CLOSE_TOKENS):
            add("EXT-005", "Discharge Misclassified as Dismissed/Closed", "Extreme",
                ["§1681e(b)", "§1681c(f)"], "Bankruptcy notes misclassify a discharged case as dismissed/closed.",
                {"bankruptcy_notes": row.get("bankruptcy_notes")})

    # EXTREME — Post-discharge payment/activity
    if last_pmt and on_or_after(last_pmt, discharge_date) and on_or_after(report_date, discharge_date):
        add("EXT-006", "Post-Discharge Payment Activity", "Extreme",
            ["§1681e(b)"], "Last payment is on/after discharge while reporting persists.",
            {"date_of_last_payment": row.get("date_of_last_payment")})
    if last_act and on_or_after(last_act, discharge_date) and on_or_after(report_date, discharge_date):
        add("EXT-007", "Post-Discharge Account Activity", "Extreme",
            ["§1681e(b)"], "Last activity is on/after discharge, inconsistent with discharged debt.",
            {"date_of_last_activity": row.get("date_of_last_activity")})

    # SEVERE — Closed but still reporting
    if date_closed and report_date and on_or_after(report_date, date_closed):
        if (bal and bal > 0) or (rbal and rbal > 0) or (past_due and past_due > 0):
            add("SEV-001", "Closed Account Reporting Balance/Past Due", "Severe",
                ["§1681e(b)"], "Account shows Date Closed but still reports balance/past due.",
                {"date_closed": row.get("date_closed"),
                 "balance": bal, "reported_balance": rbal, "amount_past_due": past_due})

    # SEVERE — Frozen/stale update + derogatory persists (post-discharge)
    if last_upd and report_date and after(report_date, discharge_date) and last_upd < discharge_date:
        derog_persists = any([
            (bal and bal > 0), (past_due and past_due > 0), (chgoff and chgoff > 0),
            any_token_in(acct_status, BANKRUPTCY_TOKENS),
            any_token_in(remarks, DEROG_REMARK_TOKENS)
        ])
        if derog_persists:
            add("SEV-002", "Frozen/Stale Update With Ongoing Derogatory", "Severe",
                ["§1681e(b)"], "Status not updated post-discharge while derogatory elements persist.",
                {"date_reported_last_updated": row.get("date_reported_last_updated"),
                 "account_status": row.get("account_status"),
                 "remarks_multi": remarks,
                 "balance": bal, "amount_past_due": past_due, "charge_off_amount": chgoff})

    # SEVERE — Obsolete DoFD & late removal date
    if dofd and report_date:
        if (report_date - dofd).days > (7 * 365 + 180):
            add("SEV-003", "Obsolete Delinquency Beyond 7y+180d", "Severe",
                ["§1681c"], "Date of First Delinquency is too old for continued reporting.",
                {"date_of_first_delinquency": row.get("date_of_first_delinquency")})
    if dofd and removal:
        limit = dofd + dt.timedelta(days=(7 * 365 + 180))
        if removal > limit:
            add("SEV-004", "Estimated Removal Date Too Late", "Severe",
                ["§1681c"], "Estimated removal exceeds 7 years + 180 days from DoFD.",
                {"date_of_first_delinquency": row.get("date_of_first_delinquency"),
                 "estimated_removal_date": row.get("estimated_removal_date")})

    # SEVERE — Re-aging indicators
    first_flag = parse_date(row.get("delinquency_first_reported"))
    if dofd and first_flag and dofd > first_flag:
        add("SEV-005", "Re-Aging (DoFD Pushed Later)", "Severe",
            ["§1681e(b)"], "DoFD occurs after the first reported delinquency flag (suggests re-aging).",
            {"delinquency_first_reported": row.get("delinquency_first_reported"),
             "date_of_first_delinquency": row.get("date_of_first_delinquency")})

    # SERIOUS — Missing DoFD while reporting derogatory
    derog_present = any([
        any_token_in(acct_status, ["charge-off", "collection", "late"]),
        any_token_in(remarks, DEROG_REMARK_TOKENS),
        (past_due and past_due > 0),
        (chgoff and chgoff > 0),
    ])
    if derog_present and not dofd:
        add("SER-001", "Missing DoFD While Reporting Derogatory", "Serious",
            ["§1681e(b)"], "Derogatory reported but Date of First Delinquency is missing.",
            {"account_status": row.get("account_status"),
             "remarks_multi": remarks,
             "amount_past_due": past_due,
             "charge_off_amount": chgoff})

    # SERIOUS — Derogatory remarks post-discharge
    if after(report_date, discharge_date) and any_token_in(remarks, DEROG_REMARK_TOKENS):
        add("SER-002", "Derogatory Remarks Post-Discharge", "Serious",
            ["§1681e(b)", "§1681c(f)"], "Remarks include derogatory terms inconsistent with a discharge.",
            {"remarks_multi": remarks})

    # AUDIT NOTE (optional export) — Account fragment mismatch (not a violation)
    if row.get("account_number_masked") and row.get("account_last4"):
        m = re.search(r"(\d{4})\s*$", row["account_number_masked"])
        if m and m.group(1) != _strip(row["account_last4"]):
            audit("AUD-001", "Account Number Fragment Mismatch",
                  "Masked account digits do not match last4; keep for impeachment/QC, not as a claim.",
                  {"account_number_masked": row.get("account_number_masked"),
                   "account_last4": row.get("account_last4")})

    return violations, audits

CRITICAL_FIELDS_FOR_XBUREAU = [
    "account_status", "balance", "amount_past_due", "charge_off_amount", "remarks_multi"
]

def evaluate_cross_bureau(rows: List[Dict[str, str]]) -> List[Violation]:
    out: List[Violation] = []
    buckets: Dict[Tuple[str, str, str], List[Tuple[int, Dict[str,str]]]] = defaultdict(list)

    def acct_key(r):
        # ensure normalized for grouping
        norm_name = normalize_creditor_name(_strip(r.get("creditor_full_name")))
        last4 = _strip(r.get("account_last4"))
        if last4:
            return (_strip(r.get("creditor_code")), norm_name, last4)
        return (_strip(r.get("creditor_code")), norm_name, "NA")

    for i, r in enumerate(rows):
        rd = _strip(r.get("report_date"))
        if not rd:
            continue
        buckets[(acct_key(r)[0], acct_key(r)[1], rd)].append((i, r))

    for (_cc, _name, rd), group in buckets.items():
        if len(group) < 2:
            continue
        for fld in CRITICAL_FIELDS_FOR_XBUREAU:
            values = set()
            for _, r in group:
                v = r.get(fld)
                if fld in {"balance", "amount_past_due", "charge_off_amount"}:
                    v = parse_money(v)
                v = str(v)
                values.add(v)
            nonblank = {v for v in values if v not in {"", "None"}}
            if len(nonblank) > 1:
                idx0, r0 = group[0]
                bureau_vals = { _strip(r.get("bureau")): r.get(fld) for _, r in group }
                out.append(Violation(
                    rule_id="SEV-XB-001",
                    rule_name=f"Cross-Bureau Inconsistency: {fld}",
                    severity="Severe",
                    statutes=["§1681e(b)"],
                    explanation=f"Critical field '{fld}' differs across bureaus on the same report_date.",
                    creditor_code=_strip(r0.get("creditor_code")),
                    creditor_full_name=_strip(r0.get("creditor_full_name")),
                    bureau=_strip(r0.get("bureau")),
                    report_date=_strip(r0.get("report_date")),
                    png_file_start=_strip(r0.get("png_file_start")),
                    row_index=idx0,
                    fields={"field": fld, "bureau_values": bureau_vals}
                ))
    return out

def read_csv(path: str) -> List[Dict[str,str]]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def write_violations_csv(path: str, violations: List[Violation]) -> None:
    fieldnames = [
        "rule_id","rule_name","severity","statutes","explanation",
        "creditor_code","creditor_full_name","bureau","report_date","png_file_start","row_index","fields_json"
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for v in violations:
            d = asdict(v)
            w.writerow({
                "rule_id": d["rule_id"],
                "rule_name": d["rule_name"],
                "severity": d["severity"],
                "statutes": ";".join(d["statutes"]),
                "explanation": d["explanation"],
                "creditor_code": d["creditor_code"],
                "creditor_full_name": d["creditor_full_name"],
                "bureau": d["bureau"],
                "report_date": d["report_date"],
                "png_file_start": d["png_file_start"],
                "row_index": d["row_index"],
                "fields_json": json.dumps(d["fields"], ensure_ascii=False),
            })

def write_audit_csv(path: str, audits: List[AuditNote]) -> None:
    fieldnames = [
        "note_id","note_name","explanation",
        "creditor_code","creditor_full_name","bureau","report_date","png_file_start","row_index","fields_json"
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for a in audits:
            d = asdict(a)
            w.writerow({
                "note_id": d["note_id"],
                "note_name": d["note_name"],
                "explanation": d["explanation"],
                "creditor_code": d["creditor_code"],
                "creditor_full_name": d["creditor_full_name"],
                "bureau": d["bureau"],
                "report_date": d["report_date"],
                "png_file_start": d["png_file_start"],
                "row_index": d["row_index"],
                "fields_json": json.dumps(d["fields"], ensure_ascii=False),
            })

def main():
    ap = argparse.ArgumentParser(description="Detect Serious/Severe/Extreme FCRA violations (litigation-hardened).")
    ap.add_argument("csv_in", help="Input CSV path")
    ap.add_argument("--out", default="violations_serious_plus.csv", help="Output CSV of violations")
    ap.add_argument("--audit-out", default=None, help="Optional CSV for audit notes (non-claims)")
    ap.add_argument("--discharge", default=DEFAULT_DISCHARGE_DATE, help="Discharge date YYYY-MM-DD")
    args = ap.parse_args()

    discharge_date = parse_date(args.discharge)
    if not discharge_date:
        raise SystemExit(f"Invalid discharge date: {args.discharge}")

    rows = read_csv(args.csv_in)

    violations: List[Violation] = []
    audits: List[AuditNote] = []

    for idx, row in enumerate(rows):
        # Normalize creditor name for consistency
        row["creditor_full_name"] = normalize_creditor_name(row.get("creditor_full_name", ""))

        v, a = evaluate_row_rules(row, idx, discharge_date)
        violations.extend(v)
        audits.extend(a)

    violations.extend(evaluate_cross_bureau(rows))
    write_violations_csv(args.out, violations)

    if args.audit_out:
        write_audit_csv(args.audit_out, audits)

    by_sev = defaultdict(int)
    by_rule = defaultdict(int)
    for v in violations:
        by_sev[v.severity] += 1
        by_rule[v.rule_id] += 1

    print(f"Detected {len(violations)} violations (Serious+).")
    print("By severity:", dict(sorted(by_sev.items())))
    print("Top rules:", dict(sorted(by_rule.items(), key=lambda x: x[1], reverse=True)[:10]))
    if args.audit_out:
        print(f"Audit notes written: {len(audits)}")

if __name__ == "__main__":
    main()