Rails.application.routes.draw do
  get 'happiness/show'
  get 'welcome/index'
  get 'happiness/show'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  root "welcome#index"

  
  resources :happiness, only: [:show, :index]
  resources :caps, only: [:show]

  resources :reviews, only: [:show, :new, :create]
  
  get 'caps', to: 'caps#show'
  get 'offtop', to: 'offtop#index'
  get 'work', to: 'work#index'
  get 'work/rasklad', to: 'work#rasklad'
  get 'work/lutok', to: 'work#lutok'
  get 'work/tinder', to: 'work#tinder'
  get 'work/hackathon', to: 'work#hackathon'
  get 'work/portfolio', to: 'work#portfolio'
end
