# Sourced by scripts/deploy.sh: applies .dockerignore to a throwaway copy of the build context.
# Only plain root-level patterns (names and single-level globs such as *.md) are supported. Every
# line is validated before anything is deleted; each match is resolved and must lie inside the copy.

# Prints why a .dockerignore line cannot be mirrored safely, or nothing when it can.
#   $1 - the line, without line ending
_dockerignore_bezwaar() {
  case "$1" in
    /*) echo "leading / (path from the context root)" ;;
    '!'*) echo "leading ! (exception)" ;;
    *'**'*) echo "** (any depth)" ;;
    ..|../*|*/..|*/../*) echo ".. path segment" ;;
    *[[:space:]]*) echo "whitespace" ;;
    *\\*) echo "backslash" ;;
  esac
}

# Deletes from directory $1 everything its .dockerignore excludes. Fails (exit status 1, nothing
# deleted) when a line uses a form this function cannot mirror the way Docker applies it.
#   $1 - the copy of the build context; must contain .dockerignore
spiegel_dockerignore() (
  set -euo pipefail
  cd "$1"
  local kopie patroon bezwaar pad echt
  kopie=$(pwd -P)
  # 1. Validate every line first.
  while IFS= read -r patroon || [ -n "$patroon" ]; do
    patroon="${patroon%$'\r'}"
    case "$patroon" in ''|'#'*) continue ;; esac
    bezwaar=$(_dockerignore_bezwaar "$patroon")
    if [ -n "$bezwaar" ]; then
      echo "Gate: .dockerignore line '$patroon' is not supported by the gate ($bezwaar); nothing was deleted." >&2
      echo "Gate: extend scripts/_dockerignore-spiegel.sh before using this form." >&2
      exit 1
    fi
  done < .dockerignore
  # 2. Delete, but only paths that resolve to inside the copy (defence in depth).
  while IFS= read -r patroon || [ -n "$patroon" ]; do
    patroon="${patroon%$'\r'}"
    case "$patroon" in ''|'#'*) continue ;; esac
    for pad in $patroon; do   # unquoted on purpose: root-level globs, as Docker applies them
      [ -e "$pad" ] || [ -L "$pad" ] || continue
      echt=$(realpath -s -- "$kopie/$pad")
      case "$echt" in
        "$kopie"/*) rm -rf -- "$echt" ;;
        *) echo "Gate: '$pad' resolves outside the copy ($echt); refusing to delete." >&2; exit 1 ;;
      esac
    done
  done < .dockerignore
)
