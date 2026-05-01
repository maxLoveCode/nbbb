#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${SYNC_ENV_FILE:-$ROOT_DIR/.env.sync}"
BACKUP_DIR="${SYNC_BACKUP_DIR:-$ROOT_DIR/backups/db-sync}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

DEFAULT_TABLES=(
  category_management
  listed_products
  product_extras
  category_page_categories
  category_page_products
  category_page_cards
  homepage_banners
  homepage_lower_swiper
  homepage_three_images
  system_configs
)

usage() {
  cat <<'USAGE'
Sync selected production PostgreSQL tables into staging.

Usage:
  scripts/sync_prod_to_staging.sh [--apply]

By default this is a dry run. Pass --apply to actually truncate staging tables
and restore production data.

Configuration:
  Create .env.sync from .env.sync.example, or set SYNC_ENV_FILE=/path/to/file.

Optional:
  SYNC_TABLES="table_a table_b"   Override the default table list.
  SYNC_BACKUP_DIR=backups/db-sync Override backup/dump output directory.
USAGE
}

APPLY=false
for arg in "$@"; do
  case "$arg" in
    --apply)
      APPLY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Missing config file: $ENV_FILE" >&2
  echo "Copy .env.sync.example to .env.sync and fill in database credentials." >&2
  exit 1
fi

required_vars=(
  PROD_DB_HOST PROD_DB_NAME PROD_DB_USER PROD_DB_PASSWORD
  STAGING_DB_HOST STAGING_DB_NAME STAGING_DB_USER STAGING_DB_PASSWORD
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

PROD_DB_PORT="${PROD_DB_PORT:-5432}"
STAGING_DB_PORT="${STAGING_DB_PORT:-5432}"

if [[ -n "${SYNC_TABLES:-}" ]]; then
  # Intentionally split on whitespace for a simple env-file table list.
  read -r -a TABLES <<< "$SYNC_TABLES"
else
  TABLES=("${DEFAULT_TABLES[@]}")
fi

if [[ "${#TABLES[@]}" -eq 0 ]]; then
  echo "No tables selected for sync." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

table_filter_sql() {
  local table_names
  table_names="$(printf ",%s" "${TABLES[@]}")"
  table_names="${table_names:1}"

  printf "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY(string_to_array('%s', ',')) ORDER BY tablename;" "$table_names"
}

check_tables_exist() {
  local host="$1"
  local port="$2"
  local db="$3"
  local user="$4"
  local password="$5"

  PGPASSWORD="$password" psql \
    -h "$host" \
    -p "$port" \
    -U "$user" \
    -d "$db" \
    -t \
    -A \
    -c "$(table_filter_sql)"
}

mapfile -t PROD_EXISTING < <(check_tables_exist "$PROD_DB_HOST" "$PROD_DB_PORT" "$PROD_DB_NAME" "$PROD_DB_USER" "$PROD_DB_PASSWORD")
mapfile -t STAGING_EXISTING < <(check_tables_exist "$STAGING_DB_HOST" "$STAGING_DB_PORT" "$STAGING_DB_NAME" "$STAGING_DB_USER" "$STAGING_DB_PASSWORD")

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

SYNC_EXISTING=()
MISSING=()
for table in "${TABLES[@]}"; do
  if contains "$table" "${PROD_EXISTING[@]}" && contains "$table" "${STAGING_EXISTING[@]}"; then
    SYNC_EXISTING+=("$table")
  else
    MISSING+=("$table")
  fi
done

if [[ "${#SYNC_EXISTING[@]}" -eq 0 ]]; then
  echo "None of the selected tables exist in both production and staging." >&2
  exit 1
fi

if [[ "${#MISSING[@]}" -gt 0 ]]; then
  echo "Skipping tables missing from production or staging: ${MISSING[*]}"
fi

echo "Tables selected for sync: ${SYNC_EXISTING[*]}"

if [[ "$APPLY" != true ]]; then
  echo "Dry run only. Re-run with --apply to sync staging."
  exit 0
fi

PROD_DUMP="$BACKUP_DIR/prod_selected_${TIMESTAMP}.dump"
STAGING_BACKUP="$BACKUP_DIR/staging_before_sync_${TIMESTAMP}.dump"

TABLE_ARGS=()
TRUNCATE_TABLES=()
for table in "${SYNC_EXISTING[@]}"; do
  TABLE_ARGS+=(--table="public.$table")
  TRUNCATE_TABLES+=("\"public\".\"$table\"")
done

TRUNCATE_SQL="TRUNCATE TABLE $(IFS=,; echo "${TRUNCATE_TABLES[*]}") RESTART IDENTITY CASCADE;"

echo "Backing up selected staging tables to $STAGING_BACKUP"
PGPASSWORD="$STAGING_DB_PASSWORD" pg_dump \
  -h "$STAGING_DB_HOST" \
  -p "$STAGING_DB_PORT" \
  -U "$STAGING_DB_USER" \
  -d "$STAGING_DB_NAME" \
  --format=custom \
  --data-only \
  "${TABLE_ARGS[@]}" \
  -f "$STAGING_BACKUP"

echo "Dumping selected production tables to $PROD_DUMP"
PGPASSWORD="$PROD_DB_PASSWORD" pg_dump \
  -h "$PROD_DB_HOST" \
  -p "$PROD_DB_PORT" \
  -U "$PROD_DB_USER" \
  -d "$PROD_DB_NAME" \
  --format=custom \
  --data-only \
  "${TABLE_ARGS[@]}" \
  -f "$PROD_DUMP"

echo "Truncating staging tables"
PGPASSWORD="$STAGING_DB_PASSWORD" psql \
  -h "$STAGING_DB_HOST" \
  -p "$STAGING_DB_PORT" \
  -U "$STAGING_DB_USER" \
  -d "$STAGING_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "$TRUNCATE_SQL"

echo "Restoring production data into staging"
PGPASSWORD="$STAGING_DB_PASSWORD" pg_restore \
  -h "$STAGING_DB_HOST" \
  -p "$STAGING_DB_PORT" \
  -U "$STAGING_DB_USER" \
  -d "$STAGING_DB_NAME" \
  --data-only \
  --disable-triggers \
  "$PROD_DUMP"

echo "Sync complete."
echo "Staging backup: $STAGING_BACKUP"
echo "Production dump: $PROD_DUMP"
