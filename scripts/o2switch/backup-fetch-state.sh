#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/o2switch/backup-fetch-state.sh
#
# Optional env vars:
#   O2_HOST, O2_USER, SSH_KEY
#   REMOTE_BACKEND_DIR, REMOTE_BACKUP_DIR
#   LOCAL_BACKUP_DIR

O2_HOST="${O2_HOST:-sobek.o2switch.net}"
O2_USER="${O2_USER:-mcxk1700}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_codex}"

REMOTE_BACKEND_DIR="${REMOTE_BACKEND_DIR:-/home/${O2_USER}/api.nexusforge.en-ligne.fr/backend}"
REMOTE_DATA_FILE="${REMOTE_DATA_FILE:-${REMOTE_BACKEND_DIR}/data/state.json}"
REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-/home/${O2_USER}/private_backups/nexusforge}"

LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-$HOME/nexusforge-prod-backups}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE_NAME="state-${TS}.tar.gz"
REMOTE_ARCHIVE="${REMOTE_BACKUP_DIR}/${ARCHIVE_NAME}"
LOCAL_ARCHIVE="${LOCAL_BACKUP_DIR}/${ARCHIVE_NAME}"

mkdir -p "${LOCAL_BACKUP_DIR}"

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${O2_USER}@${O2_HOST}" \
  "set -e;
   mkdir -p '${REMOTE_BACKUP_DIR}';
   if [ -f '${REMOTE_DATA_FILE}' ]; then
     tar -czf '${REMOTE_ARCHIVE}' -C '$(dirname "${REMOTE_DATA_FILE}")' '$(basename "${REMOTE_DATA_FILE}")';
   else
     tmpdir=\$(mktemp -d);
     echo '{\"warning\":\"state.json not found\"}' > \"\$tmpdir/state.json\";
     tar -czf '${REMOTE_ARCHIVE}' -C \"\$tmpdir\" state.json;
     rm -rf \"\$tmpdir\";
   fi;
   ls -lh '${REMOTE_ARCHIVE}'"

scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${O2_USER}@${O2_HOST}:${REMOTE_ARCHIVE}" "${LOCAL_ARCHIVE}"

echo "Backup downloaded: ${LOCAL_ARCHIVE}"
