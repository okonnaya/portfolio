class WelcomeController < ApplicationController
  def index
    @happiness_samples = Happiness.order("RANDOM()").limit(5) # Выберите нужное количество записей
  end
end
