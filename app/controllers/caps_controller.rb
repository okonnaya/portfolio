class CapsController < ApplicationController
  def show
    @cap_samples = Cap.all
  end
end
