class AddDateToHappiness < ActiveRecord::Migration[7.0]
  def change
    add_column :happinesses, :date, :date
  end
end
