class HappinessController < ApplicationController
  def show
    @happiness_samples = Happiness.all
  end
end
