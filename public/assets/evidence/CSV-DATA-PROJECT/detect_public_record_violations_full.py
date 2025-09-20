#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
detect_public_record_violations_full.py
Full diagnostics detector for PUBLIC RECORDS (Minor+Moderate+Serious+Severe+Extreme).
Reads: public_records.csv (or a provided CSV path), case_context_public_full.yaml, public_record_rules_full.yaml
Writes: public_record_violations_full.csv
"""
import argparse, json, re
import pandas as pd
import yaml
from datetime import datetime, timedelta

# ---------- helpers ----------

def parse_date(s, fmts):
    if s is None:
        return None
    t = str(s).strip()
    if not t or t.lower() in {"not reported","none","[not provided]","na","n/a"}:
        return None
    # try direct formats
    for f in fmts:
        try:
            return datetime.strptime(t, f)
        except Exception:
            pass
    # try a few common fallbacks
    for f in ("%Y/%m/%d","%m/%d/%Y","%Y-%m-%d","%Y-%m","%m/%Y","%b %d, %Y","%b %Y"):
        try:
            d = datetime.strptime(t, f)
            # if year-month only, set day=1
            if f in ("%Y-%m","%m/%Y","%b %Y"):
                return datetime(d.year, d.month, 1)
            return d
        except Exception:
            continue
    return None

def to_num(x):
    if x is None:
        return None
    t = str(x).replace("$","").replace(",","").strip()
    if t == "":
        return None
    try:
        return float(t)
    except:
        return None

def get(row, col):
    v = row.get(col, None)
    if pd.isna(v):
        return None
    return v

def contains_any(text, keywords):
    t = (text or "").lower()
    return any(k.lower() in t for k in keywords)

def any_contains(fields, row, keywords):
    for f in fields:
        if contains_any(get(row, f), keywords):
            return True
    return False

def not_any_contains(fields, row, keywords):
    return not any_contains(fields, row, keywords)

def is_month_only(s: str) -> bool:
    """True if value looks like YYYY-MM or MM/YYYY with no day."""
    if not s:
        return False
    t = str(s).strip()
    return bool(re.fullmatch(r"\d{4}-\d{2}", t) or re.fullmatch(r"\d{2}/\d{4}", t))

def any_contains_glob(row: dict, pattern: str, keywords: list) -> bool:
    """True if ANY column whose name matches the regex contains ANY keyword."""
    if not keywords:
        return False
    try:
        rx = re.compile(pattern, flags=re.IGNORECASE)
    except re.error:
        return False
    for col, val in row.items():
        if rx.search(str(col or "")) and str(val or "").strip():
            v = str(val).lower()
            if any(k.lower() in v for k in keywords):
                return True
    return False

def not_any_contains_glob(row: dict, pattern: str, keywords: list) -> bool:
    """True if NO column whose name matches the regex contains ANY keyword."""
    return not any_contains_glob(row, pattern, keywords)

def normalize_bureau_name(bureau):
    """Normalize bureau codes to full names."""
    if not bureau:
        return bureau

    b = str(bureau).strip().upper()

    # Map codes to full names
    bureau_mapping = {
        "EQ": "Equifax",
        "EX": "Experian",
        "TU": "TransUnion",
        # Keep full names as-is if they're already normalized
        "EQUIFAX": "Equifax",
        "EXPERIAN": "Experian",
        "TRANSUNION": "TransUnion"
    }

    return bureau_mapping.get(b, bureau)

# ---------- rule evaluation ----------

def eval_rule(row, rule, ctx):
    # convenience
    discharge = ctx["discharge_date"]
    d60 = ctx.get("discharge_date_plus_60")
    fmts = ctx["date_formats"]
    # pre-parsed date/money fields used in rules
    parsed = {}
    def date_of(col):
        if col not in parsed:
            parsed[col] = parse_date(get(row, col), fmts)
        return parsed[col]
    def num_of(col):
        if col not in parsed:
            parsed[col] = to_num(get(row, col))
        return parsed[col]

    def get_value(token):
        if token == "{{discharge_date}}":
            return discharge
        if token == "{{discharge_date_plus_60}}":
            return d60
        return token

    def cmp_simple(cond):
        field = cond["field"]
        op = cond["op"]
        value = get_value(cond.get("value"))
        allow_missing = cond.get("allow_missing", False)

        # parse dates if possible
        v = get(row, field)
        dv = date_of(field)
        nv = num_of(field)
        # Choose typed value
        if dv is not None:
            vv = dv
            # convert value to date
            if isinstance(value, str) and re.match(r"\d{4}-\d{2}-\d{2}", value):
                value_dt = datetime.strptime(value, "%Y-%m-%d")
            else:
                value_dt = parse_date(value, fmts) if isinstance(value, str) else value
            cmp_left, cmp_right = vv, value_dt
        elif nv is not None:
            vv = nv
            cmp_left, cmp_right = vv, float(value) if value is not None else None
        else:
            vv = v
            cmp_left, cmp_right = (vv if vv is not None else None), value

        if op == "exists":
            return (get(row, field) is not None) and (str(get(row, field)).strip() != "")
        if op == "not_exists":
            return (get(row, field) is None) or (str(get(row, field)).strip() == "")
        if cmp_left is None:
            return allow_missing

        if op == ">=":
            return cmp_left >= cmp_right
        if op == ">":
            return cmp_left > cmp_right
        if op == "<":
            return cmp_left < cmp_right
        if op == "!=":
            return cmp_left != cmp_right
        if op == "==":
            return cmp_left == cmp_right
        if op == "contains":
            return contains_any(str(cmp_left), [str(cmp_right)])

        # added operators for full-mode
        if op == "not_contains":
            return str(cmp_left).lower().find(str(cmp_right).lower()) == -1

        if op == "contains_any":
            # value may be a list; if it's a key referencing context, handle that in eval_when instead
            vals = cond.get("value", [])
            if isinstance(vals, str):
                vals = [vals]
            return any(v.lower() in str(cmp_left).lower() for v in vals)

        if op == "month_only":
            return is_month_only(v)

        return False

    def cmp_gt_years_from(cond):
        field = cond["field"]
        ref_field = cond["ref_field"]
        years = float(cond["years"])
        d_field = date_of(field)
        d_ref = date_of(ref_field)
        if d_field is None or d_ref is None:
            return False
        compare = datetime(d_ref.year + int(years), d_ref.month, 1)
        target = datetime(d_field.year, d_field.month, 1)
        return target > compare

    def cmp_date_diff_gt_days(cond, date_of_fn):
        """
        Compare absolute day difference between two date-like fields.
        Expects: { op: "date_diff_gt_days", field: <date1>, ref_field: <date2>, days: <int> }
        """
        field = cond["field"]
        ref_field = cond["ref_field"]
        days = int(cond["days"])
        d1 = date_of_fn(field)
        d2 = date_of_fn(ref_field)
        if d1 is None or d2 is None:
            return False
        return abs((d1 - d2).days) > days

    def cmp_any_contains(cond):
        return any_contains(cond["fields"], row, cond.get("keywords", []) or ctx.get(cond.get("keywords_from",""), []))

    def cmp_not_any_contains(cond):
        return not_any_contains(cond["fields"], row, cond.get("keywords", []) or ctx.get(cond.get("keywords_from",""), []))

    # support: all / any / not_any_contains / any_contains / simple / gt_years_from / date_diff_gt_days / glob
    def eval_when(node):
        if "all" in node:
            return all(eval_when(c) for c in node["all"])
        if "any" in node:
            return any(eval_when(c) for c in node["any"])
        if "any_contains" in node:
            return cmp_any_contains(node["any_contains"])
        if "not_any_contains" in node:
            return cmp_not_any_contains(node["not_any_contains"])
        if "any_contains_glob" in node:
            spec = node["any_contains_glob"]
            return any_contains_glob(row, spec["pattern"], spec.get("keywords", []) or ctx.get(spec.get("keywords_from",""), []))
        if "not_any_contains_glob" in node:
            spec = node["not_any_contains_glob"]
            return not_any_contains_glob(row, spec["pattern"], spec.get("keywords", []) or ctx.get(spec.get("keywords_from",""), []))
        if node.get("op") == "gt_years_from":
            return cmp_gt_years_from(node)
        if node.get("op") == "date_diff_gt_days":
            return cmp_date_diff_gt_days(node, date_of)
        return cmp_simple(node)

    return eval_when(rule["when"])

def main():
    ap = argparse.ArgumentParser(description="Public Records — Full Diagnostics (Minor+Moderate+Serious+Severe+Extreme)")
    ap.add_argument("csv_in", nargs="?", default="public_records.csv")
    ap.add_argument("--context", default="case_context_public_full.yaml")
    ap.add_argument("--rules", default="public_record_rules_full.yaml")
    ap.add_argument("--out", default="public_record_violations_full.csv")
    args = ap.parse_args()

    with open(args.context, "r", encoding="utf-8") as f:
        ctx = yaml.safe_load(f)
    # expand helper dates
    ctx["date_formats"] = ctx.get("date_formats", ["%Y-%m-%d"])
    discharge = datetime.strptime(ctx["discharge_date"], "%Y-%m-%d")
    ctx["discharge_date_plus_60"] = (discharge + timedelta(days=60)).strftime("%Y-%m-%d")

    with open(args.rules, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    rules = cfg.get("rules", [])

    df = pd.read_csv(args.csv_in)

    # Normalize bureau names in the dataframe
    if 'bureau' in df.columns:
        df['bureau'] = df['bureau'].apply(normalize_bureau_name)

    violations = []

    for idx, row in df.iterrows():
        row = dict(row)  # pandas series to dict
        for rule in rules:
            try:
                matched = eval_rule(row, rule, ctx)
            except Exception as e:
                matched = False
            if matched:
                violations.append({
                    "row_index": idx,
                    "bureau": normalize_bureau_name(row.get("bureau","")),  # Apply normalization here too
                    "reference_or_case": row.get("reference_number", row.get("case_number","")),
                    "png_file_start": row.get("png_file_start",""),
                    "png_file_end": row.get("png_file_end",""),
                    "rule_id": rule["id"],
                    "rule_name": rule.get("name",""),
                    "statutes": ";".join(rule.get("statutes", [])),
                    "severity": rule.get("severity",""),
                    "explanation": rule.get("explain","")
                })

    out_cols = ["row_index","bureau","reference_or_case","png_file_start","png_file_end","rule_id","rule_name","statutes","severity","explanation"]
    pd.DataFrame(violations, columns=out_cols).to_csv(args.out, index=False)
    print(f"Done. Found {len(violations)} violations. Wrote {args.out}")

if __name__ == "__main__":
    main()