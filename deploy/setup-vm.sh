#!/usr/bin/env bash
# Одноразовая настройка Ubuntu/Debian VPS под портфолио.
#
# Запуск на свежей виртуалке (от root или через sudo):
#   curl -fsSL https://raw.githubusercontent.com/okonnaya/portfolio/main/deploy/setup-vm.sh | sudo bash
# или после git clone:
#   sudo bash deploy/setup-vm.sh
#
# Переменные (опционально):
#   REPO_URL   — репозиторий (по умолчанию github.com/okonnaya/portfolio)
#   BRANCH     — ветка (main)
#   DOMAIN     — основной домен для nginx (okonnaya.com)
#   KINOPOISK_DOMAIN — поддомен для версии под Kinopoisk
#   APP_DIR    — где хранить исходники (/var/www/portfolio-src)
#   WEB_ROOT   — откуда nginx раздаёт статику (/var/www/portfolio)
#   KINOPOISK_WEB_ROOT — откуда nginx раздаёт Kinopoisk-версию

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/okonnaya/portfolio.git}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-okonnaya.com}"
KINOPOISK_DOMAIN="${KINOPOISK_DOMAIN:-kinopoisk.okonnaya.com}"
APP_DIR="${APP_DIR:-/var/www/portfolio-src}"
WEB_ROOT="${WEB_ROOT:-/var/www/portfolio}"
KINOPOISK_WEB_ROOT="${KINOPOISK_WEB_ROOT:-/var/www/portfolio-kinopoisk}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Запусти от root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Обновление пакетов"
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Базовые утилиты"
apt-get install -y -qq git curl ca-certificates rsync nginx

echo "==> Node.js 22 (через NodeSource)"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "    node $(node -v), npm $(npm -v)"

echo "==> Chromium для og.jpg и cv.pdf при сборке (необязательно, но желательно)"
apt-get install -y -qq chromium-browser || apt-get install -y -qq chromium || true

echo "==> Каталоги"
mkdir -p "$APP_DIR" "$WEB_ROOT" "$KINOPOISK_WEB_ROOT"
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$APP_DIR" "$WEB_ROOT" "$KINOPOISK_WEB_ROOT" 2>/dev/null || true

echo "==> Клонирование репозитория"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
else
  echo "    репозиторий уже есть в $APP_DIR"
fi

echo "==> nginx"
NGINX_SITE="/etc/nginx/sites-available/portfolio"
sed \
  -e "s#__PRIMARY_DOMAIN__#${DOMAIN}#g" \
  -e "s#__KINOPOISK_DOMAIN__#${KINOPOISK_DOMAIN}#g" \
  -e "s#__KINOPOISK_WEB_ROOT__#${KINOPOISK_WEB_ROOT}#g" \
  -e "s#__WEB_ROOT__#${WEB_ROOT}#g" \
  "$APP_DIR/deploy/nginx.conf" > "$NGINX_SITE"
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/portfolio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Первый деплой"
bash "$APP_DIR/deploy/deploy.sh"

echo ""
echo "Готово."
echo "  Статика:  $WEB_ROOT"
echo "  Kinopoisk: $KINOPOISK_WEB_ROOT"
echo "  Исходники: $APP_DIR"
echo "  Сайт:     http://${DOMAIN}"
echo "  Kinopoisk: http://${KINOPOISK_DOMAIN}"
echo ""
echo "Дальше:"
echo "  1. Настрой DNS A-записи на IP виртуалки: ${DOMAIN}, ${KINOPOISK_DOMAIN}"
echo "  2. SSL: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d ${DOMAIN} -d ${KINOPOISK_DOMAIN}"
echo "  3. Обновления: sudo bash $APP_DIR/deploy/deploy.sh"
