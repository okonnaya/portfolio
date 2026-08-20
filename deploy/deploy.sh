#!/usr/bin/env bash
# Сборка и выкладка портфолио на nginx.
#
# Запуск:
#   bash deploy/deploy.sh
# или на сервере:
#   sudo bash /var/www/portfolio-src/deploy/deploy.sh
#
# Переменные:
#   APP_DIR   — путь к репозиторию
#   WEB_ROOT  — каталог, откуда nginx раздаёт файлы
#   BRANCH    — ветка для деплоя

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
WEB_ROOT="${WEB_ROOT:-/var/www/portfolio}"
BRANCH="${BRANCH:-main}"

echo "==> Обновление кода ($BRANCH)"
cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Сборка фронтенда"
cd "$APP_DIR/client"
npm ci
npm run build

echo "==> Публикация в $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx
    echo "==> nginx перезагружен"
  fi
fi

echo "==> Деплой завершён ($(git -C "$APP_DIR" rev-parse --short HEAD))"
