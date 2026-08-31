#!/usr/bin/env bash
# Replaces the plain index line in each workflow module file with a linked
# "where this is built" block. Run once; it is a one-shot upgrade, not a
# regenerator.
set -euo pipefail
REPO="$1"; WF="$REPO/docs/plan/workflows"
TMP="${TMPDIR:-/tmp}"

ROWS='source:M-02:06,07,08,09,10,11:SCR-053 to SCR-058, SCR-086, SCR-103
duty:M-03:16,17,18,19,20:SCR-043 to SCR-050
control:M-04:12,13,14,15:SCR-020 to SCR-027
evidence:M-05:03,21:SCR-068, SCR-069, SCR-100, SCR-101
risk:M-06:25,26,27,28:SCR-011 to SCR-019
remediation:M-07:23,24:SCR-066, SCR-067
incident:M-08:31,32:SCR-037, SCR-038, SCR-097 to SCR-099
assurance:M-09:29,30:SCR-062 to SCR-065
policy:M-10:22:SCR-035, SCR-036
campaign:M-11:35,36,37:SCR-030 to SCR-034
third-party:M-12:34:SCR-028, SCR-029
reg-change:M-13:33:SCR-051, SCR-052
investigations:M-14:40,41,42:SCR-039 to SCR-042
data-governance:M-15:38,39:SCR-060, SCR-061
administration:M-16:43,44,45:SCR-070 to SCR-079
pack:M-18:46,47,48:SCR-059, SCR-090, SCR-091, SCR-102'

while IFS=':' read -r file mod slices screens; do
  [ -z "${file:-}" ] && continue
  f="$WF/$file.md"
  [ -f "$f" ] || { echo "missing $f" >&2; continue; }
  sl=""
  IFS=',' read -ra ss <<< "$slices"
  for s in "${ss[@]}"; do [ -n "$sl" ] && sl="$sl, "; sl="$sl[[SLICE-$s]]"; done

  blk="$TMP/wfblock.$$"
  {
    printf '**Module** [[%s]] · **Index** [[workflows]] · **Matrix** [[traceability]]\n\n' "$mod"
    printf '**Where this is built** %s\n\n' "$sl"
    printf '**Screens it drives** %s, in [[screen-inventory#1. Screens]]\n\n' "$screens"
    printf '**Entities it moves** listed on [[%s]], defined in [[data-model#1. Entities]]\n\n' "$mod"
    printf '**Rules that span entities** [[workflows#3. Explicitly illegal moves that span entities]] ·\n'
    printf '**derived states** [[workflows#2. Derived states, displayed and never stored]] ·\n'
    printf '**chasing** [[workflows#5. Time-driven behaviour]]\n'
  } > "$blk"

  awk -v b="$blk" '
    /^Module M-[0-9][0-9]\. Index: / { while ((getline l < b) > 0) print l; close(b); next }
    { print }
  ' "$f" > "$f.new" && mv "$f.new" "$f"
  rm -f "$blk"
  echo "patched $file.md"
done <<< "$ROWS"
