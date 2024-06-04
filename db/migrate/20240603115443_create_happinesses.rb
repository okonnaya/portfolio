class CreateHappinesses < ActiveRecord::Migration[7.0]
  def change
    create_table :happinesses do |t|
      t.text :text
      t.string :image

      t.timestamps
    end
  end
end
