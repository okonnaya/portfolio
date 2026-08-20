# GitHub Actions автодеплой

Workflow `.github/workflows/deploy.yml` запускается после каждого push в `main`
и выполняет:

1. `npm ci` в `client/`
2. `npm run build`
3. `rsync --delete client/dist/` на сервер в `/var/www/portfolio/`

На сервере исходники не нужны: nginx раздаёт готовую статику из
`/var/www/portfolio`.

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
