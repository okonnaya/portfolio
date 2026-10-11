#!/usr/bin/env bash
# Запуск после направления DNS всех трёх имён на новую ВМ.
# CERTBOT_EMAIL обязателен при первом выпуске сертификата.
set -euo pipefail

DOMAIN="${DOMAIN:-okonnaya.com}"
KINOPOISK_DOMAIN="${KINOPOISK_DOMAIN:-kinopoisk.okonnaya.com}"
WEB_ROOT="${WEB_ROOT:-/var/www/portfolio}"
KINOPOISK_WEB_ROOT="${KINOPOISK_WEB_ROOT:-/var/www/portfolio-kinopoisk}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ "$EUID" -eq 0 ]] || { echo 'Запусти через sudo'; exit 1; }
: "${CERTBOT_EMAIL:?Укажи CERTBOT_EMAIL для уведомлений о сертификате}"

certbot certonly --webroot --non-interactive --agree-tos \
  --email "$CERTBOT_EMAIL" --cert-name "$DOMAIN" \
  -w "$WEB_ROOT" -d "$DOMAIN" -d "www.$DOMAIN" \
  -w "$KINOPOISK_WEB_ROOT" -d "$KINOPOISK_DOMAIN"

site=/etc/nginx/sites-available/portfolio
backup="$(mktemp)"
cp "$site" "$backup"
sed -e "s#__PRIMARY_DOMAIN__#$DOMAIN#g" \
  -e "s#__KINOPOISK_DOMAIN__#$KINOPOISK_DOMAIN#g" \
  -e "s#__WEB_ROOT__#$WEB_ROOT#g" \
  -e "s#__KINOPOISK_WEB_ROOT__#$KINOPOISK_WEB_ROOT#g" \
  "$SCRIPT_DIR/nginx.conf" > "$site"
if ! nginx -t; then
  cp "$backup" "$site"
  rm "$backup"
  exit 1
fi
rm "$backup"
systemctl reload nginx
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'nginx -t && systemctl reload nginx' \
  > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
systemctl enable --now certbot.timer
