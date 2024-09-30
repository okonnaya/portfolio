Rails.application.routes.draw do
  get 'welcome/index'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  root "welcome#index"

  

  
  get 'caps', to: 'caps#show'
  get 'offtop', to: 'offtop#index'
  get 'offtop/links', to: 'offtop#links'
  get 'reviews', to: 'reviews#show'
  get 'happinesses', to: 'happinesses#show'
  get 'work', to: 'work#index'
  get 'work/rasklad', to: 'work#rasklad'
  get 'work/lootok', to: 'work#lootok'
  get 'work/tinder', to: 'work#tinder'
  get 'work/vtoroe', to: 'work#vtoroe'
end
