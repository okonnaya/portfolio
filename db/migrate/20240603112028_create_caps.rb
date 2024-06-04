class CreateCaps < ActiveRecord::Migration[7.0]
  def change
    create_table :caps do |t|
      t.string :heading
      t.text :text

      t.timestamps
    end
  end
end
