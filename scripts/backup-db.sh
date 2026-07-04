#!/bin/bash
# ═══════════════════════════════════════════════════════════
# ZapFlow — PostgreSQL Backup Script
# ═══════════════════════════════════════════════════════════
# Designed to run inside a Docker container (postgres:16-alpine).
# Executes pg_dump on a configurable schedule, compresses with
# custom format, rotates old backups, and optionally uploads to S3.
#
# Environment variables (all optional with safe defaults):
#   POSTGRES_HOST           = postgres (container name)
#   POSTGRES_PORT           = 5432
#   POSTGRES_USER           = zapflow
#   POSTGRES_PASSWORD       = (required)
#   POSTGRES_DB             = zapflow
#   BACKUP_DIR              = /backups
#   BACKUP_RETENTION_DAYS   = 30
#   BACKUP_SCHEDULE_HOUR    = 3   (3 AM daily)
#   BACKUP_SCHEDULE_MINUTE  = 0
#   BACKUP_PLAIN_SQL        = false
#   BACKUP_S3_ENABLED       = false
#   S3_BUCKET               = (optional)
#   S3_ENDPOINT             = (optional, for S3-compatible like Backblaze/Wasabi)
#   S3_ACCESS_KEY           = (optional)
#   S3_SECRET_KEY           = (optional)
#   BACKUP_NOTIFY_WEBHOOK   = (optional, Discord/Slack webhook for failure alerts)
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ──────────────────────────────
HOST="${POSTGRES_HOST:-postgres}"
PORT="${POSTGRES_PORT:-5432}"
USER="${POSTGRES_USER:-zapflow}"
PASSWORD="${POSTGRES_PASSWORD}"
DB="${POSTGRES_DB:-zapflow}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
SCHEDULE_HOUR="${BACKUP_SCHEDULE_HOUR:-3}"
SCHEDULE_MINUTE="${BACKUP_SCHEDULE_MINUTE:-0}"
PLAIN_SQL="${BACKUP_PLAIN_SQL:-false}"
S3_ENABLED="${BACKUP_S3_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${S3_SECRET_KEY:-}"
NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-}"

# ─── Colors ─────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log_info()  { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }

# ─── Conditional: install curl if webhook is set ──
install_curl_if_needed() {
  if [ -n "$NOTIFY_WEBHOOK" ] && ! command -v curl &>/dev/null; then
    apk add --no-cache curl 2>/dev/null || log_warn "Failed to install curl; notifications disabled"
  fi
}

# ─── Failure notification ───────────────────────
notify_failure() {
  local message="$1"
  log_error "$message"

  if [ -n "$NOTIFY_WEBHOOK" ] && command -v curl &>/dev/null; then
    local payload
    payload=$(cat <<JSON
{
  "text": "🚨 *ZapFlow Backup Failed*\n\n$message\n\nHost: \`$HOST\`\nDatabase: \`$DB\`\nTime: \`$(date '+%Y-%m-%d %H:%M:%S UTC')\`"
}
JSON
)
    curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$NOTIFY_WEBHOOK" > /dev/null 2>&1 || true
  fi
}

# ─── Validate ────────────────────────────────────
if [ -z "$PASSWORD" ]; then
  notify_failure "POSTGRES_PASSWORD is not set. Backup aborted."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
install_curl_if_needed

# ─── Perform Backup ──────────────────────────────
perform_backup() {
  local timestamp
  timestamp=$(date '+%Y%m%d_%H%M%S')
  # Formato custom do pg_dump → extensão .dump
  local filename="${DB}_${timestamp}.dump"
  local filepath="${BACKUP_DIR}/${filename}"
  local filesize

  log_info "Starting backup: $DB@$HOST:$PORT..."

  export PGPASSWORD="$PASSWORD"

  # pg_dump: stdout → arquivo .dump, stderr → log separado
  # ⚠️  NÃO usar 2>&1 no final — isso misturaria stderr no backup!
  if pg_dump \
    --host="$HOST" \
    --port="$PORT" \
    --username="$USER" \
    --dbname="$DB" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-acl \
    > "${filepath}" \
    2>"${BACKUP_DIR}/last_dump.log"; then

    filesize=$(du -h "$filepath" | cut -f1)
    log_info "Backup complete: $filename ($filesize)"

    # Latest symlink (usado pelo health check)
    ln -sf "$filename" "${BACKUP_DIR}/latest.dump"

    # Plain SQL copy (opcional, útil para inspeção manual)
    if [ "$PLAIN_SQL" = "true" ]; then
      log_info "Generating plain SQL copy..."
      pg_dump \
        --host="$HOST" \
        --port="$PORT" \
        --username="$USER" \
        --dbname="$DB" \
        --format=plain \
        --no-owner \
        --no-acl \
        2>/dev/null | gzip -9 > "${BACKUP_DIR}/${DB}_latest_plain.sql.gz"
      log_info "Plain SQL copy saved"
    fi

    # S3 upload
    if [ "$S3_ENABLED" = "true" ] && [ -n "$S3_BUCKET" ]; then
      upload_to_s3 "$filepath" "$filename"
    fi

    # Rotação
    cleanup_old_backups

    return 0
  else
    local error_log
    error_log=$(tail -20 "${BACKUP_DIR}/last_dump.log" 2>/dev/null || echo "No log available")
    notify_failure "pg_dump failed for $DB@$HOST:$PORT\n\n\`\`\`\n$error_log\n\`\`\`"
    return 1
  fi
}

# ─── Upload to S3 ────────────────────────────────
upload_to_s3() {
  local filepath="$1"
  local filename="$2"

  if ! command -v aws &> /dev/null; then
    log_warn "aws-cli not installed, skipping S3 upload"
    return 1
  fi

  if [ -n "$S3_ENDPOINT" ]; then
    export AWS_ENDPOINT_URL="$S3_ENDPOINT"
  fi
  export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"

  log_info "Uploading to S3: s3://${S3_BUCKET}/${filename}"
  if aws s3 cp "$filepath" "s3://${S3_BUCKET}/${filename}" --only-show-errors; then
    log_info "S3 upload complete"
    aws s3 cp "$filepath" "s3://${S3_BUCKET}/latest.dump" --only-show-errors 2>/dev/null || true
  else
    log_warn "S3 upload failed, backup available locally at $filepath"
  fi
}

# ─── Cleanup Old Backups ─────────────────────────
cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."
  local count
  count=$(find "$BACKUP_DIR" -name "${DB}_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete -print 2>/dev/null | wc -l)

  # Clean old plain SQL copies too
  find "$BACKUP_DIR" -name "${DB}_*_plain.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  # Clean dump logs
  find "$BACKUP_DIR" -name "last_dump.log*" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

  if [ "$count" -gt 0 ]; then
    log_info "Removed $count old backup(s)"
  fi

  local total_count total_size
  total_count=$(find "$BACKUP_DIR" -name "${DB}_*.dump" -type f | wc -l)
  total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
  log_info "Storage: $total_count backup(s), $total_size total"
}

# ─── Verify Latest Backup ────────────────────────
verify_backup() {
  local latest
  latest=$(readlink -f "${BACKUP_DIR}/latest.dump" 2>/dev/null || echo "")

  if [ -z "$latest" ] || [ ! -f "$latest" ]; then
    log_warn "No latest backup symlink found"
    return 1
  fi

  local age_now size
  # Cross-platform stat (GNU date vs BSD date)
  age_now=$(stat -c '%Y' "$latest" 2>/dev/null || stat -f '%m' "$latest" 2>/dev/null || echo "0")
  size=$(du -h "$latest" | cut -f1)
  local now_age_hours
  now_age_hours=$(date +%s)
  age_hours=$(( (now_age_hours - age_now) / 3600 ))

  if [ "$age_hours" -gt 48 ]; then
    log_warn "Latest backup is ${age_hours}h old! Size: $size"
  else
    log_info "Latest backup is ${age_hours}h old. Size: $size"
  fi
}

# ─── Calculate seconds until next scheduled time ──
seconds_until_next_schedule() {
  local target_epoch now_epoch
  # GNU date (Linux)
  target_epoch=$(date -u -d "$SCHEDULE_HOUR:$SCHEDULE_MINUTE today" +%s 2>/dev/null)
  # BSD date (macOS) fallback
  if [ -z "$target_epoch" ]; then
    target_epoch=$(date -u -j -f "%H:%M" "$SCHEDULE_HOUR:$SCHEDULE_MINUTE" +%s 2>/dev/null)
  fi
  now_epoch=$(date -u +%s)

  if [ "$target_epoch" -le "$now_epoch" ]; then
    target_epoch=$((target_epoch + 86400))
  fi
  echo $((target_epoch - now_epoch))
}

# ═══════════════════════════════════════════════════
# ─── Main ────────────────────────────────────────
# ═══════════════════════════════════════════════════

log_info "============================================"
log_info "ZapFlow Backup Service Started"
log_info "Schedule: daily at ${SCHEDULE_HOUR}:${SCHEDULE_MINUTE} UTC"
log_info "Retention: $RETENTION_DAYS days"
log_info "Backup dir: $BACKUP_DIR"
log_info "S3 upload: $S3_ENABLED"
log_info "Plain SQL: $PLAIN_SQL"
log_info "============================================"
echo ""

# Initial backup on startup
log_info "Running initial backup..."
perform_backup || true
verify_backup || true

# Schedule loop
while true; do
  local secs
  secs=$(seconds_until_next_schedule)
  local hours minutes
  hours=$((secs / 3600))
  minutes=$(((secs % 3600) / 60))
  log_info "Next backup in ${hours}h ${minutes}m"
  echo ""
  sleep "$secs"

  log_info "⏰ Running scheduled backup..."
  perform_backup || true
  verify_backup || true
  echo ""
done
