# портфолио

Персональное портфолио. Архитектура:

- **Бэкенд** — Ruby on Rails 7 в режиме **API-only** (отдаёт JSON под `/api/*`).
- **Фронтенд** — Vite + React + TypeScript в папке [`client/`](client/).

В деве это два процесса: Rails на `:3000`, Vite на `:5173`. Vite проксирует
`/api` → Rails, так что фронт ходит по относительным путям и CORS в деве не мешает.

## Требования

- Ruby `3.2.3` (см. `.ruby-version`; ставится через rbenv)
- Node.js 20+ (проверено на 22)

## Запуск (dev)

Самый простой способ — один скрипт из корня, поднимает оба процесса,
Ctrl+C гасит оба:

```sh
bin/dev                    # Rails :3000 + Vite :5173
PORT=3001 bin/dev          # если нужен другой порт бэка
```

Перед первым запуском: `bundle install`, `bin/rails db:create`,
`cd client && npm install`.

<details>
<summary>Или вручную, в двух терминалах</summary>

**Терминал 1 — бэкенд:**

```sh
bundle install        # один раз
bin/rails db:create   # один раз (БД пустая, моделей пока нет)
bin/rails s           # http://localhost:3000
```

> Если `ruby -v` показывает не 3.2.3, активируйте rbenv:
> `export PATH="$HOME/.rbenv/shims:$HOME/.rbenv/bin:$PATH"; eval "$(rbenv init - zsh)"`

**Терминал 2 — фронтенд:**

```sh
cd client
npm install           # один раз
npm run dev           # http://localhost:5173
```

</details>

Откройте http://localhost:5173 — страница покажет статус подключения к API
(`GET /api/health`). Это подтверждает рабочую связку фронт↔бэк.

## Проверка API

```sh
curl localhost:3000/api/health
# => {"status":"ok","time":"..."}
```

## Сборка фронта

```sh
cd client && npm run build   # → client/dist
```

## Что дальше (не сделано намеренно)

- UI-библиотеки (Lottie, p5, анимации) — будут подобраны позже.
- Роутинг и страницы портфолио — структура ещё не определена.
- Модели/эндпоинты под реальный контент — добавляются с нуля по мере надобности.
