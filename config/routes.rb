Rails.application.routes.draw do
  get 'happiness/show'
  get 'caps/show'
  get 'welcome/index'
  get 'happiness/show'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  root "welcome#index"

  
  resources :happiness, only: [:show, :index]
  resources :caps, only: [:show]
  

  get 'offtop', to: 'offtop#index'
  get 'work', to: 'work#index'
end
