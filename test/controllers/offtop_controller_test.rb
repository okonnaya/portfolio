require "test_helper"

class OfftopControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get offtop_index_url
    assert_response :success
  end
end
