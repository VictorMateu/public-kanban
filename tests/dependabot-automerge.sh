#!/usr/bin/env bash
set -euo pipefail

GITHUB_REPOSITORY=test/repository
MERGE_LOCKFILE=package-lock.json
MERGE_CHECK_WORKFLOWS=ci.yml
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/ci/dependabot-automerge.sh"

stable_update 'chore(deps): bump thing from 7.2.0 to 7.2.1'
stable_update 'chore(deps): bump thing from 7.2.9 to 7.3.0'
for versions in '7.2.0 to 8.0.0' '0.2.1 to 0.2.2' '1.0.0 to 1.0.1-beta.1' '1.0.2 to 1.0.1'; do
  if stable_update "chore(deps): bump thing from $versions"; then
    printf 'Accepted an ineligible update: %s\n' "$versions" >&2
    exit 1
  fi
done

old_pin='      - uses: actions/checkout@1111111111111111111111111111111111111111 # v4.0.0'
new_pin='      - uses: actions/checkout@2222222222222222222222222222222222222222 # v4.0.1'
workflow_diff() {
  jq -nc --arg patch "-$old_pin"$'\n'"+$1" \
    '[{filename: ".github/workflows/ci.yml", status: "modified", additions: 1, deletions: 1, patch: $patch}]'
}

allowed_files "$(workflow_diff "$new_pin")" github_actions actions/checkout
for line in '      - run: npm test' "  $new_pin" "${new_pin/actions\/checkout/actions\/setup-node}"; do
  if allowed_files "$(workflow_diff "$line")" github_actions actions/checkout; then
    printf 'Accepted a workflow change beyond an action pin update.\n' >&2
    exit 1
  fi
done

npm_files='[{"filename":"package-lock.json","status":"modified"},{"filename":"package.json","status":"modified"}]'
allowed_files "$npm_files" npm_and_yarn thing
if allowed_files '[{"filename":"package.json","status":"modified"}]' npm_and_yarn thing; then
  printf 'Accepted an npm update without a lockfile change.\n' >&2
  exit 1
fi

printf 'Dependabot version and file policy tests passed.\n'
