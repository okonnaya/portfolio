class CapsController < ApplicationController
  def show
    @cap = Cap.find(params[:id])
  end
end
