require 'image_optim'

namespace :images do
  desc 'Compress images in app/assets/images'
  task :compress => :environment do
    image_optim = ImageOptim.new(:pngout => false, :svgo => false)

    Dir.glob(Rails.root.join('app', 'assets', 'images', '**', '*.{png,jpg,jpeg,gif}')) do |img|
      p "Compressing: #{img}"

      original_size = File.size(img)

      begin
        image_optim.optimize_image!(img)
      rescue Exception => e
        p "Unable to compress: #{img}"
        next
      end

      final_size = File.size(img)
      size_diff = original_size - final_size

      p "Finished. Size reduced by #{size_diff} bytes"
    end
  end
end