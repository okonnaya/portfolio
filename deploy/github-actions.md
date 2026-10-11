# GitHub Actions автодеплой

Workflow `.github/workflows/deploy.yml` запускается после каждого push в `main`
и выполняет:

1. `npm ci` в `client/`
2. сборку основного портфолио с `VITE_SITE_URL=https://okonnaya.com`
3. `rsync --delete client/dist/` на сервер в `/var/www/portfolio/`
4. сборку Kinopoisk-версии с `VITE_PORTFOLIO_VARIANT=kinopoisk`
5. `rsync --delete client/dist/` на сервер в `/var/www/portfolio-kinopoisk/`

GitHub Actions обновляет полный checkout в `/var/www/portfolio-src`. Сборка выполняется в GitHub; nginx раздаёт готовую статику из
`/var/www/portfolio` для основного домена и из `/var/www/portfolio-kinopoisk`
для `kinopoisk.okonnaya.com`.

## Поддомен `kinopoisk.okonnaya.com`

Для уже настроенного VPS один раз выполнить на сервере:

```sh
sudo mkdir -p /var/www/portfolio-kinopoisk
sudo chown -R okonnaya:okonnaya /var/www/portfolio-kinopoisk
```

Потом обновить nginx-конфиг из `deploy/nginx.conf`, заменив плейсхолдеры:
`__PRIMARY_DOMAIN__` → `okonnaya.com`, `__KINOPOISK_DOMAIN__` →
`kinopoisk.okonnaya.com`, `__WEB_ROOT__` → `/var/www/portfolio`,
`__KINOPOISK_WEB_ROOT__` → `/var/www/portfolio-kinopoisk`.

После DNS A-записи на IP VPS:

```sh
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d okonnaya.com -d kinopoisk.okonnaya.com
```

## Secrets

В репозитории GitHub нужны четыре Actions secret:

| Secret | Значение |
| --- | --- |
| `VPS_HOST` | `135.106.219.98` |
| `VPS_USER` | `portfolio-deploy` |
| `VPS_SSH_KEY` | приватный SSH-ключ, публичная часть которого добавлена в `~/.ssh/authorized_keys` на сервере |

| `VPS_KNOWN_HOSTS` | проверенная запись SSH host key новой ВМ |

## Перенос на Selectel

Сервер `portfolio-prod`, Ubuntu 24.04, ru-7a. Пользователь `portfolio-deploy` владеет каталогами сайта и исходников, sudo ему не требуется. Nginx настраивается администратором отдельно от деплоя; workflow не перезаписывает сертификаты и конфигурацию.

На свежем сервере сначала используется HTTP-часть `nginx.conf` (до `# BEGIN TLS`). После направления DNS `okonnaya.com`, `www.okonnaya.com` и `kinopoisk.okonnaya.com` на новую ВМ выполнить `sudo CERTBOT_EMAIL=<email> bash deploy/enable-tls.sh`. Скрипт выпускает сертификат, включает HTTPS и перезагрузку nginx при продлении. В Cloudflare использовать Full (strict) после проверки сертификата.

## Первичная настройка ключа

Автоматически:

```sh
gh auth login -h github.com
bash deploy/setup-github-actions.sh
```

Или вручную с локальной машины:

```sh
ssh-keygen -t ed25519 -C "github-actions-okonnaya.com" -f /tmp/okonnaya_com_github_actions -N ""
ssh okonnaya@135.106.219.98 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
cat /tmp/okonnaya_com_github_actions.pub | ssh okonnaya@135.106.219.98 'cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Потом добавить secrets:

```sh
gh secret set VPS_HOST --body '135.106.219.98'
gh secret set VPS_USER --body 'okonnaya'
gh secret set VPS_SSH_KEY < /tmp/okonnaya_com_github_actions
```

Если `gh auth status` показывает невалидный токен, сначала выполнить:

```sh
gh auth login -h github.com
```

После успешного добавления `VPS_SSH_KEY` удалить локальную копию приватного ключа:

```sh
rm /tmp/okonnaya_com_github_actions /tmp/okonnaya_com_github_actions.pub
```
