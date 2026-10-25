#!/usr/bin/env python3
"""Validate case cards against schema/case_card.json plus checks JSON Schema can't express.

Usage:
    python3 schema/validate.py                 # validate every cases/*.json and schema/examples/*.json
    python3 schema/validate.py path/to/card.json [...]

Checks:
  1. JSON Schema (draft 2020-12, with date formats).
  2. taxonomy.md codes == intervention_type enum in the schema.
  3. Referential integrity: every source/actor/intervention/geo-unit id that is
     referenced is defined, and defined ids are unique.
  4. meta.case_id matches the file name.
"""
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schema" / "case_card.json"
TAXONOMY_PATH = ROOT / "schema" / "taxonomy.md"

# Keys whose values are references to ids defined elsewhere in the card.
REF_KEYS = {
    "sources": "source", "evidence_sources": "source", "supporting_sources": "source",
    "actor_ids": "actor", "lead_actor_ids": "actor", "partner_actor_ids": "actor",
    "author_actor_ids": "actor", "actor_id": "actor",
    "intervention_ids": "intervention", "linked_intervention_ids": "intervention",
    "activated_by_intervention_ids": "intervention", "intervention_id": "intervention",
    "geo_unit_id": "geo_unit",
}


def check_taxonomy(schema):
    enum = set(schema["$defs"]["intervention_type"]["enum"])
    documented = set(re.findall(r"^### ([a-z_]+)\s*$", TAXONOMY_PATH.read_text(), re.M))
    errors = []
    for code in sorted(enum - documented):
        errors.append(f"taxonomy: '{code}' is in the schema enum but not documented in taxonomy.md")
    for code in sorted(documented - enum):
        errors.append(f"taxonomy: '{code}' is documented in taxonomy.md but missing from the schema enum")
    return errors


def collect_refs(node, path, out):
    if isinstance(node, dict):
        for key, value in node.items():
            kind = REF_KEYS.get(key)
            # The top-level `sources` array is the registry, not a reference list.
            if kind and not (path == "" and key == "sources"):
                for ref in value if isinstance(value, list) else [value]:
                    if isinstance(ref, str):
                        out.append((kind, ref, f"{path}/{key}"))
            collect_refs(value, f"{path}/{key}", out)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            collect_refs(item, f"{path}/{i}", out)


def check_integrity(card):
    errors = []
    defined = {
        "source": [s.get("id") for s in card.get("sources", [])],
        "actor": [a.get("id") for a in card.get("actors", [])],
        "intervention": [i.get("id") for i in card.get("interventions", [])],
        "geo_unit": [g.get("id") for g in card.get("place", {}).get("geo_units", [])],
    }
    for kind, ids in defined.items():
        dupes = {i for i in ids if ids.count(i) > 1}
        for d in sorted(dupes):
            errors.append(f"duplicate {kind} id '{d}'")
    refs = []
    collect_refs(card, "", refs)
    for kind, ref, where in refs:
        if ref not in defined[kind]:
            errors.append(f"{where}: unknown {kind} id '{ref}'")
    return errors


def validate_file(path, validator):
    errors = []
    try:
        card = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        return [f"invalid JSON: {e}"]
    for err in sorted(validator.iter_errors(card), key=lambda e: list(e.absolute_path)):
        loc = "/" + "/".join(str(p) for p in err.absolute_path)
        errors.append(f"schema {loc}: {err.message}")
    errors += check_integrity(card)
    case_id = card.get("meta", {}).get("case_id")
    if case_id and case_id != path.stem:
        errors.append(f"meta.case_id '{case_id}' does not match file name '{path.stem}'")
    return errors


def main(argv):
    schema = json.loads(SCHEMA_PATH.read_text())
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    failed = False
    for e in check_taxonomy(schema):
        print(f"FAIL {e}")
        failed = True

    paths = [Path(a) for a in argv] or sorted(
        list((ROOT / "cases").glob("*.json")) + list((ROOT / "schema" / "examples").glob("*.json"))
    )
    for path in paths:
        name = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
        errors = validate_file(path, validator)
        if errors:
            failed = True
            print(f"FAIL {name}")
            for e in errors:
                print(f"     {e}")
        else:
            print(f"ok   {name}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
