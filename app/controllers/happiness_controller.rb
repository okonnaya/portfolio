class HappinessController < ApplicationController
  def show
    @happiness = Happiness.find(params[:id])
  end
end
