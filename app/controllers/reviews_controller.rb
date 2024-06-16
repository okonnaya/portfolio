class ReviewsController < ApplicationController
    def show
      @review = Review.find(params[:id])
    end
  
    def new
      @review = Review.new
    end
  
    def create
      @review = Review.new(review_params)
      if @review.save
        redirect_to @review
      else
        render 'new'
      end
    end
  
    private
  
    def review_params
      params.require(:review).permit(:date, :author, :text)
    end
  end
  