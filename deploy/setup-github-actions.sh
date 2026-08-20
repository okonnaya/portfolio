#!/usr/bin/env bash
# One-time setup for GitHub Actions deployment secrets.

set -euo pipefail

REPO="${REPO:-okonnaya/portfolio}"
VPS_HOST="${VPS_HOST:-111.88.159.139}"
VPS_USER="${VPS_USER:-okonnaya}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required. Install GitHub CLI first."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login -h github.com"
  exit 1
fi

if ! command -v ssh-keygen >/dev/null 2>&1; then
  echo "ssh-keygen is required."
  exit 1
fi

key_dir="$(mktemp -d)"
key_file="$key_dir/github-actions-deploy-key"
trap 'rm -rf "$key_dir"' EXIT

ssh-keygen -t ed25519 -C "github-actions-${REPO}" -f "$key_file" -N ""

ssh "${VPS_USER}@${VPS_HOST}" 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
ssh "${VPS_USER}@${VPS_HOST}" \
  "grep -qxF '$(cat "$key_file.pub")' ~/.ssh/authorized_keys 2>/dev/null || printf '%s\n' '$(cat "$key_file.pub")' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

gh secret set VPS_HOST --repo "$REPO" --body "$VPS_HOST"
gh secret set VPS_USER --repo "$REPO" --body "$VPS_USER"
gh secret set VPS_SSH_KEY --repo "$REPO" < "$key_file"

echo "GitHub Actions deploy secrets are configured for $REPO."
