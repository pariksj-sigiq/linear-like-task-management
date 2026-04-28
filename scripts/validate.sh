#!/usr/bin/env bash
# Intentionally not using pipefail: several `find ... | head -1` uses
# below rely on find being terminated by SIGPIPE, which is expected.
set -eu

echo "=== Clone Template Validation ==="

errors=0

check() {
  if [ ! -e "$1" ]; then
    echo "FAIL: Missing $1"
    errors=$((errors + 1))
  else
    echo "  OK: $1"
  fi
}

check_any() {
  # check_any "label" path1 path2 ...
  # passes if any of the paths exists
  local label="$1"
  shift
  for p in "$@"; do
    if [ -e "$p" ]; then
      echo "  OK: $label -> $p"
      return 0
    fi
  done
  echo "FAIL: $label not found. Tried:"
  for p in "$@"; do
    echo "       - $p"
  done
  errors=$((errors + 1))
}

# ── Detect layout variant ────────────────────────────────────────────────
# vite (default):  app/server.py + app/frontend/ (React + Vite)
# next:            backend/app/main.py + src/app/ (Next.js App Router)

variant="vite"
if [ -f "backend/app/main.py" ] && [ -d "src/app" ]; then
  variant="next"
fi
echo "Detected layout variant: $variant"

echo ""
echo "--- Required files ($variant) ---"

if [ "$variant" = "next" ]; then
  check_any "FastAPI entrypoint" "backend/app/main.py"
  check_any "ORM models"         "backend/app/models.py"
  check_any "Pydantic schemas"   "backend/app/schemas.py" "backend/app/schema.py"
  check_any "Seed script"        "backend/seed.py" "backend/app/seed.py" "backend/app/seed/seed_app.py"
  check_any "Frontend package"   "package.json"
  check_any "Frontend entry"     "src/app/layout.tsx" "src/app/page.tsx"
  check_any "Backend tests"      "backend/tests"
  check_any "Compose file"       "docker-compose.yml" "docker-compose.dev.yml"
else
  check "app/server.py"
  check "app/models.py"
  check "app/schema.py"
  check "app/postgres/init.sql"
  check_any "Seed script" \
    "app/seed/seed_app.py" \
    "app/seed/seed.py" \
    "app/seed.py"
  # Accept either app/frontend/package.json or a nested variant
  # (some clones put the SPA in app/frontend/<name>/).
  fe_pkg=$(find app/frontend -maxdepth 3 -name 'package.json' 2>/dev/null | head -1)
  check_any "Frontend package" \
    "app/frontend/package.json" \
    "${fe_pkg:-/dev/null/missing}"
  fe_app=$(find app/frontend -maxdepth 4 -name 'App.tsx' 2>/dev/null | head -1)
  check_any "Frontend entry" \
    "app/frontend/src/App.tsx" \
    "${fe_app:-/dev/null/missing}"
  # Design tokens: accept the canonical filename, a close variant, or
  # whatever global stylesheet the clone actually uses (index.css,
  # App.css, globals.css).
  fe_tokens=$(find app/frontend -maxdepth 4 \
    \( -name 'design-tokens.css' -o -name 'design_tokens.css' \
       -o -name 'tokens.css' -o -name 'globals.css' \
       -o -name 'index.css' -o -name 'App.css' \) \
    -not -path '*/node_modules/*' 2>/dev/null | head -1)
  check_any "Design tokens / global stylesheet" \
    "app/frontend/src/design-tokens.css" \
    "${fe_tokens:-/dev/null/missing}"
  # Accept either a canonical test_tools.py or any test_*.py under
  # app/tests/ (some clones shard tests across many files).
  tests_any=$(find app/tests -maxdepth 2 -name 'test_*.py' 2>/dev/null | head -1)
  check_any "Tool tests" \
    "app/tests/test_tools.py" \
    "${tests_any:-/dev/null/missing}"
  check "docker-compose.dev.yml"
fi

# Required in both variants. Accept either the canonical location
# (spec/FEATURES.md), the convention some clones adopted (FEATURES.md at
# root), or the template's .example before a clone is bootstrapped.
check_any "Feature spec" \
  "spec/FEATURES.md" \
  "FEATURES.md" \
  "spec/FEATURES.md.example"

echo ""
echo "--- Seed data ---"
if [ "$variant" = "next" ]; then
  # Next.js variant typically seeds from a single script, not a seed_data/ dir
  if [ -f "backend/seed.py" ] || [ -f "backend/app/seed.py" ]; then
    echo "  OK: seed script present"
  else
    seed_files=$(find . -maxdepth 4 -path '*/seed_data/*.json' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$seed_files" -eq "0" ]; then
      echo "FAIL: No seed script and no seed_data/*.json files"
      errors=$((errors + 1))
    else
      echo "  OK: $seed_files seed data file(s) found"
    fi
  fi
else
  seed_files=$(find app/seed_data -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$seed_files" -eq "0" ]; then
    echo "FAIL: No seed data JSON files in app/seed_data/"
    errors=$((errors + 1))
  else
    echo "  OK: $seed_files seed data file(s) found"
  fi
fi

echo ""
echo "--- Frontend pages ---"
if [ "$variant" = "next" ]; then
  page_files=$(find src/app -name 'page.tsx' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$page_files" -lt "2" ]; then
    echo "FAIL: Expected at least 2 page.tsx files under src/app/, found $page_files"
    errors=$((errors + 1))
  else
    echo "  OK: $page_files Next.js page(s) found"
  fi
else
  # Accept either a conventional pages/ directory OR any .tsx components
  # under app/frontend/**/src/ (minus node_modules). This keeps clones
  # that route via a components/ folder from failing needlessly.
  page_files=$(find app/frontend -path '*/src/pages/*.tsx' \
    -not -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$page_files" -lt "2" ]; then
    page_files=$(find app/frontend -path '*/src/*.tsx' \
      -not -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' ')
  fi
  if [ "$page_files" -lt "2" ]; then
    echo "FAIL: Expected at least 2 .tsx components under app/frontend/**/src/, found $page_files"
    errors=$((errors + 1))
  else
    echo "  OK: $page_files .tsx component(s) found"
  fi
fi

echo ""
echo "--- Tool count ---"
# Pick the file most likely to hold the tool registry for this variant.
tool_source=""
if [ "$variant" = "next" ]; then
  for candidate in backend/app/tools.py backend/app/tools/__init__.py; do
    if [ -f "$candidate" ]; then
      tool_source="$candidate"
      break
    fi
  done
else
  if [ -f "app/server.py" ]; then
    tool_source="app/server.py"
  fi
fi

if [ -n "$tool_source" ] && command -v python3 &>/dev/null; then
  tool_count=$(python3 -c "
import re
try:
    with open('$tool_source') as f:
        source = f.read()
    # Take the max across the common registration patterns so we pick up
    # whichever shape the clone actually uses (dict list, ToolDef(...),
    # ToolSpec(...), etc.).
    patterns = [
        r'^\s*\{\s*\"name\":',
        r'^\s*\"name\":',
        r'\bToolDef\(',
        r'\bToolSpec\(',
    ]
    count = max((len(re.findall(p, source, re.MULTILINE)) for p in patterns), default=0)
    match = re.search(r'TOOL_DEFS\s*:.*?=\s*\[(.*?)^\]', source, re.MULTILINE | re.DOTALL)
    if match:
        count = max(count, len(re.findall(r'^\s*\(', match.group(1), re.MULTILINE)))
    print(count)
except Exception:
    print(0)
  ")
  if [ "$tool_count" -lt "2" ]; then
    echo "WARN: Only $tool_count tools defined in $tool_source (expected 30-50 for production)"
  else
    echo "  OK: $tool_count tools defined in $tool_source"
  fi
else
  echo "WARN: Could not locate tool registry source file for variant=$variant"
fi

echo ""
if [ "$errors" -gt "0" ]; then
  echo "FAILED: $errors validation error(s)"
  exit 1
else
  echo "PASSED: All checks passed (variant=$variant)"
fi
