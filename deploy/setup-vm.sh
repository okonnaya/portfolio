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
#   DOMAIN     — домен для nginx (portfolio.example.com)
#   APP_DIR    — где хранить исходники (/var/www/portfolio-src)
#   WEB_ROOT   — откуда nginx раздаёт статику (/var/www/portfolio)

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/okonnaya/portfolio.git}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-portfolio.example.com}"
APP_DIR="${APP_DIR:-/var/www/portfolio-src}"
WEB_ROOT="${WEB_ROOT:-/var/www/portfolio}"

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
mkdir -p "$APP_DIR" "$WEB_ROOT"
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$APP_DIR" "$WEB_ROOT" 2>/dev/null || true

echo "==> Клонирование репозитория"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
else
  echo "    репозиторий уже есть в $APP_DIR"
fi

echo "==> nginx"
NGINX_SITE="/etc/nginx/sites-available/portfolio"
sed "s/portfolio.example.com/${DOMAIN}/g" "$APP_DIR/deploy/nginx.conf" > "$NGINX_SITE"
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
echo "  Исходники: $APP_DIR"
echo "  Сайт:     http://${DOMAIN}"
echo ""
echo "Дальше:"
echo "  1. Настрой DNS A-запись на IP виртуалки"
echo "  2. SSL: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d ${DOMAIN}"
echo "  3. Обновления: sudo bash $APP_DIR/deploy/deploy.sh"
