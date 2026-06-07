# Be sure to restart your server when you modify this file.

# Разрешаем кросс-доменные запросы от фронтенда (Vite dev-сервер в client/).
# Origins можно переопределить через ENV FRONTEND_ORIGINS (через запятую).
# В деве Vite ходит на API через proxy, так что это страховка для прямых запросов
# и для прод-сценариев, где фронт раздаётся с другого домена.
origins = ENV.fetch("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
            .split(",").map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*origins)

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head]
  end
end
