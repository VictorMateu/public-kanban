#!/usr/bin/env bash
set -euo pipefail

repo=${GITHUB_REPOSITORY:?GitHub repository is required}
base="repos/$repo"
lockfile=${MERGE_LOCKFILE:?Lockfile is required}
read -ra workflows <<< "${MERGE_CHECK_WORKFLOWS:?Checks are required}"
bot='dependabot[bot]'
version='(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})'
subject="^[^:]+: bump ([a-zA-Z0-9_.@/-]+) from v?($version) to v?($version)$"

api() {
  gh api --hostname github.com -H 'X-GitHub-Api-Version: 2022-11-28' "$@"
}

main_sha() {
  api "$base/git/ref/heads/main" | jq -er '.object.sha | select(test("^[0-9a-f]{40}$"))'
}

stable_update() {
  local message=$1
  [[ $message =~ $subject ]] || return 1
  local old_major=${BASH_REMATCH[3]} old_minor=${BASH_REMATCH[4]} old_patch=${BASH_REMATCH[5]}
  local new_major=${BASH_REMATCH[7]} new_minor=${BASH_REMATCH[8]} new_patch=${BASH_REMATCH[9]}
  (( old_major > 0 && new_major == old_major &&
     (new_minor > old_minor || (new_minor == old_minor && new_patch > old_patch)) ))
}

allowed_files() {
  local files=$1 ecosystem=$2 dependency=$3
  case "$ecosystem" in
    npm_and_yarn)
      jq -e --arg lock "$lockfile" '
        length > 0 and any(.[]; .filename == $lock) and
        all(.[]; .status == "modified" and (.filename == "package.json" or .filename == $lock))
      ' <<< "$files" >/dev/null
      ;;
    github_actions)
      jq -e --arg dependency "$dependency" '
        def pins($marker):
          split("\n") | map(select(startswith($marker))) | map(.[1:]);
        def valid_pin:
          capture("^\\s*- uses: (?<action>[^@ ]+)@[a-f0-9]{40}(?:\\s+# v?[0-9]+(?:\\.[0-9]+){0,2})?\\s*$") |
          .action == $dependency;
        def without_version:
          sub("@[a-f0-9]{40}"; "@SHA") | sub("# v?[0-9.]+"; "# VERSION");
        length > 0 and all(.[];
          ((.patch // "") | pins("-")) as $removed |
          ((.patch // "") | pins("+")) as $added |
          .status == "modified" and (.filename | test("^\\.github/workflows/[^/]+\\.ya?ml$")) and
          .deletions == .additions and .additions > 0 and
          ($removed | length) == .deletions and ($added | length) == .additions and
          all(($removed + $added)[]; [valid_pin] == [true]) and
          ($removed | map(without_version)) == ($added | map(without_version))
        )
      ' <<< "$files" >/dev/null
      ;;
    *) return 1 ;;
  esac
}

passed_checks() {
  local sha=$1 workflow
  for workflow in "${workflows[@]}"; do
    api "$base/actions/workflows/$workflow/runs?event=pull_request&head_sha=$sha&per_page=1" |
      jq -e --arg sha "$sha" '
        .workflow_runs[0] | .head_sha == $sha and .event == "pull_request" and
        .status == "completed" and .conclusion == "success"
      ' >/dev/null || return 1
  done
  if [[ ${MERGE_REQUIRE_VERCEL:-false} == true ]]; then
    api "$base/commits/$sha/status" | jq -e '
      any(.statuses[]; .context == "Vercel" and .state == "success")
    ' >/dev/null || return 1
  fi
}

base64url() {
  openssl base64 -A | tr '+/' '_-' | tr -d '='
}

merge_pr() (
  local number=$1 sha=$2 ecosystem=$3 expected_base=$4
  local now claims jwt installation token permissions latest
  : "${MERGE_APP_ID:?GitHub App ID is required}" "${MERGE_APP_PRIVATE_KEY:?GitHub App private key is required}"
  [[ $MERGE_APP_ID =~ ^[0-9]+$ ]]
  now=$(date +%s)
  claims=$(jq -nc --arg iss "$MERGE_APP_ID" --argjson iat "$((now - 60))" --argjson exp "$((now + 540))" \
    '{iss: $iss, iat: $iat, exp: $exp}' | base64url)
  jwt="$(printf '%s' '{"alg":"RS256","typ":"JWT"}' | base64url).$claims"
  jwt="$jwt.$(printf '%s' "$jwt" | openssl dgst -sha256 -sign <(printf '%s\n' "$MERGE_APP_PRIVATE_KEY") | base64url)"
  installation=$(GH_TOKEN="$jwt" api "$base/installation" | jq -er '.id | numbers')

  permissions='{"contents":"write","pull_requests":"read"}'
  if [[ $ecosystem == github_actions ]]; then
    permissions='{"contents":"write","pull_requests":"read","workflows":"write"}'
  fi
  token=$(jq -nc --arg name "${repo#*/}" --argjson permissions "$permissions" \
    '{repositories: [$name], permissions: $permissions}' |
    GH_TOKEN="$jwt" api --method POST "app/installations/$installation/access_tokens" --input - |
    jq -er '.token | strings | select(length > 0)')
  trap 'GH_TOKEN="$token" api --method DELETE installation/token >/dev/null 2>&1 || true' EXIT

  latest=$(main_sha)
  if [[ $latest != "$expected_base" ]]; then
    printf 'Main advanced during the scan. The next run will recheck eligibility.\n'
    return 0
  fi
  GH_TOKEN="$token" api --method PUT "$base/pulls/$number/merge" -f sha="$sha" -f merge_method=squash |
    jq -e '.merged == true' >/dev/null
  printf '#%s merged. Remaining updates will be checked against the new main on the next run.\n' "$number"
)

scan() {
  local current prs number pr head commit message dependency ecosystem files
  current=$(main_sha)
  prs=$(api --paginate --slurp "$base/pulls?state=open&base=main&sort=created&direction=asc&per_page=100" |
    jq -er --arg bot "$bot" '[.[][] | select(.user.login == $bot and .draft == false) | .number] | join("\n")')

  while IFS= read -r -u 3 number; do
    number=${number%$'\r'}
    [[ $number =~ ^[0-9]+$ ]] || continue
    pr=$(api "$base/pulls/$number")
    head=$(jq -er --arg bot "$bot" --arg repo "$repo" '
      select(.user.login == $bot and .head.repo.full_name == $repo and
        .base.ref == "main" and .state == "open" and .draft == false and .commits == 1) |
      .head.sha | select(test("^[0-9a-f]{40}$"))
    ' <<< "$pr") || { printf '#%s requires review (pull request provenance).\n' "$number"; continue; }
    commit=$(api "$base/commits/$head")
    message=$(jq -er --arg bot "$bot" '
      select(.author.login == $bot and .committer.login == "web-flow" and .commit.verification.verified == true) |
      .commit.message | split("\n")[0]
    ' <<< "$commit") || { printf '#%s requires review (commit provenance).\n' "$number"; continue; }
    if ! stable_update "$message"; then
      printf '#%s requires review (outside the stable patch and minor policy).\n' "$number"
      continue
    fi
    [[ $message =~ $subject ]]
    dependency=${BASH_REMATCH[1]}
    ecosystem=$(jq -r '.head.ref | split("/") | select(.[0] == "dependabot") | .[1]' <<< "$pr")
    files=$(api --paginate --slurp "$base/pulls/$number/files?per_page=100" | jq -ce 'add')
    if ! allowed_files "$files" "$ecosystem" "$dependency"; then
      printf '#%s requires review (unexpected file changes).\n' "$number"
      continue
    fi
    if ! jq -e --arg current "$current" '.parents | length == 1 and .[0].sha == $current' <<< "$commit" >/dev/null; then
      printf '#%s is within version policy and is waiting for a rebase onto main.\n' "$number"
      continue
    fi
    if ! jq -e '.mergeable == true and .mergeable_state == "clean"' <<< "$pr" >/dev/null || ! passed_checks "$head"; then
      printf '#%s is waiting for merge readiness or successful checks.\n' "$number"
      continue
    fi

    if [[ ${MERGE:-false} != true ]]; then
      printf '#%s is eligible for automatic merge.\n' "$number"
      continue
    fi
    merge_pr "$number" "$head" "$ecosystem" "$current"
    return
  done 3<<< "$prs"
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  scan
fi
