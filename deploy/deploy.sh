#!/usr/bin/env bash
# Сборка и выкладка портфолио на nginx.
#
# Запуск:
#   bash deploy/deploy.sh
# или на сервере:
#   sudo bash /var/www/portfolio-src/deploy/deploy.sh
#
# Переменные:
#   APP_DIR   — путь к репозиторию
#   WEB_ROOT  — каталог, откуда nginx раздаёт файлы
#   KINOPOISK_WEB_ROOT — каталог для kinopoisk.okonnaya.com
#   BRANCH    — ветка для деплоя
#   SITE_URL  — основной публичный адрес
#   KINOPOISK_SITE_URL — публичный адрес Kinopoisk-версии
#   DEPLOY_KINOPOISK=0 — не выкладывать Kinopoisk-версию

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
WEB_ROOT="${WEB_ROOT:-/var/www/portfolio}"
KINOPOISK_WEB_ROOT="${KINOPOISK_WEB_ROOT:-/var/www/portfolio-kinopoisk}"
BRANCH="${BRANCH:-main}"
SITE_URL="${SITE_URL:-https://okonnaya.com}"
KINOPOISK_SITE_URL="${KINOPOISK_SITE_URL:-https://kinopoisk.okonnaya.com}"
DEPLOY_KINOPOISK="${DEPLOY_KINOPOISK:-1}"

build_frontend() {
  local variant="$1"
  local site_url="$2"

  echo "==> Сборка фронтенда ($variant)"
  cd "$APP_DIR/client"
  VITE_PORTFOLIO_VARIANT="$variant" VITE_SITE_URL="$site_url" npm run build
}

publish_dist() {
  local web_root="$1"

  echo "==> Публикация в $web_root"
  mkdir -p "$web_root"
  rsync -a --delete "$APP_DIR/client/dist/" "$web_root/"
}

echo "==> Обновление кода ($BRANCH)"
cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Установка зависимостей фронтенда"
cd "$APP_DIR/client"
npm ci

build_frontend "main" "$SITE_URL"
publish_dist "$WEB_ROOT"

if [[ "$DEPLOY_KINOPOISK" != "0" ]]; then
  build_frontend "kinopoisk" "$KINOPOISK_SITE_URL"
  publish_dist "$KINOPOISK_WEB_ROOT"
fi

if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx
    echo "==> nginx перезагружен"
  fi
fi

echo "==> Деплой завершён ($(git -C "$APP_DIR" rev-parse --short HEAD))"
