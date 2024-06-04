require "test_helper"

class CapsControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get caps_show_url
    assert_response :success
  end
end
