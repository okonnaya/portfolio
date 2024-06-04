require "test_helper"

class HappinessControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get happiness_show_url
    assert_response :success
  end
end
