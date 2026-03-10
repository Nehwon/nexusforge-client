#!/usr/bin/env bash
set -euo pipefail

# Safe deployment for NexusForge on O2switch:
# 1) backup current backend state.json to local machine
# 2) build + deploy frontend
# 3) deploy backend code without deleting data/.env
# 4) restart Node app
#
# Usage:
#   bash scripts/o2switch/deploy-with-backup.sh
#
# Optional env vars:
#   O2_HOST, O2_USER, SSH_KEY
#   REMOTE_FRONTEND_DIR, REMOTE_BACKEND_DIR
#   NODE_VENV_PATH
#   LOCAL_BACKUP_DIR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
O2_HOST="${O2_HOST:-sobek.o2switch.net}"
O2_USER="${O2_USER:-mcxk1700}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_codex}"

REMOTE_FRONTEND_DIR="${REMOTE_FRONTEND_DIR:-/home/${O2_USER}/nexusforge.en-ligne.fr}"
REMOTE_BACKEND_DIR="${REMOTE_BACKEND_DIR:-/home/${O2_USER}/api.nexusforge.en-ligne.fr/backend}"
NODE_VENV_PATH="${NODE_VENV_PATH:-/home/${O2_USER}/nodevenv/api.nexusforge.en-ligne.fr/backend/20/bin/activate}"

echo "[1/4] Backup remote state.json -> local"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-$HOME/nexusforge-prod-backups}" \
O2_HOST="${O2_HOST}" O2_USER="${O2_USER}" SSH_KEY="${SSH_KEY}" \
REMOTE_BACKEND_DIR="${REMOTE_BACKEND_DIR}" \
bash "${ROOT_DIR}/scripts/o2switch/backup-fetch-state.sh"

echo "[2/4] Build frontend"
cd "${ROOT_DIR}/frontend"
npm run build

echo "[3/4] Deploy frontend"
rsync -az --delete -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
  "${ROOT_DIR}/frontend/dist/" "${O2_USER}@${O2_HOST}:${REMOTE_FRONTEND_DIR}/"

# Force SPA rewrite file on remote (safety net for refresh/F5 on nested routes)
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${O2_USER}@${O2_HOST}" \
  "cat > '${REMOTE_FRONTEND_DIR}/.htaccess' <<'HTA'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>
HTA"

echo "[4/4] Deploy backend (preserve data + .env) and restart"
rsync -az --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude data \
  --exclude backup \
  --exclude '*.log' \
  -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
  "${ROOT_DIR}/backend/" "${O2_USER}@${O2_HOST}:${REMOTE_BACKEND_DIR}/"

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${O2_USER}@${O2_HOST}" \
  "set -e;
   source '${NODE_VENV_PATH}';
   cd '${REMOTE_BACKEND_DIR}';
   npm install --omit=dev;
   mkdir -p tmp;
   touch tmp/restart.txt;
   if [ -d '/home/${O2_USER}/api.nexusforge.en-ligne.fr/tmp' ]; then
     touch '/home/${O2_USER}/api.nexusforge.en-ligne.fr/tmp/restart.txt';
   fi;
   echo 'Backend restarted.'"

echo "Deployment finished."
