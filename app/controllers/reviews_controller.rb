class ReviewsController < ApplicationController
    def show
      @review_samples = Review.all
    end
  
  end
  

  