class CreateReviews < ActiveRecord::Migration[7.0]
  def change
    create_table :reviews do |t|
      t.date :date
      t.string :author
      t.text :text

      t.timestamps
    end
  end
end
