Rails.application.routes.draw do
  # JSON API. Фронтенд (React/Vite) живёт отдельно в client/.
  namespace :api do
    get "health", to: "health#show"
  end
end
