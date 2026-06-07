module Api
  class HealthController < ApplicationController
    # GET /api/health — проверка, что бэкенд жив и связка фронт↔бэк работает.
    def show
      render json: { status: "ok", time: Time.current }
    end
  end
end
