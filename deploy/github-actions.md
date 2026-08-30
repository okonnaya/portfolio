# GitHub Actions автодеплой

Workflow `.github/workflows/deploy.yml` запускается после каждого push в `main`
и выполняет:

1. `npm ci` в `client/`
2. сборку основного портфолио с `VITE_SITE_URL=https://okonnaya.com`
3. `rsync --delete client/dist/` на сервер в `/var/www/portfolio/`
4. сборку Kinopoisk-версии с `VITE_PORTFOLIO_VARIANT=kinopoisk`
5. `rsync --delete client/dist/` на сервер в `/var/www/portfolio-kinopoisk/`

На сервере исходники не нужны: nginx раздаёт готовую статику из
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

В репозитории GitHub нужны три Actions secret:

| Secret | Значение |
| --- | --- |
| `VPS_HOST` | `111.88.159.139` |
| `VPS_USER` | `okonnaya` |
| `VPS_SSH_KEY` | приватный SSH-ключ, публичная часть которого добавлена в `~/.ssh/authorized_keys` на сервере |

## Первичная настройка ключа

Автоматически:

```sh
gh auth login -h github.com
bash deploy/setup-github-actions.sh
```

Или вручную с локальной машины:

```sh
ssh-keygen -t ed25519 -C "github-actions-okonnaya.com" -f /tmp/okonnaya_com_github_actions -N ""
ssh okonnaya@111.88.159.139 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
cat /tmp/okonnaya_com_github_actions.pub | ssh okonnaya@111.88.159.139 'cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Потом добавить secrets:

```sh
gh secret set VPS_HOST --body '111.88.159.139'
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
