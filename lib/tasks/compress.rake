require 'image_optim'
require 'mini_magick'

namespace :assets do
  desc 'Compress and resize images in app/assets/images'
  task :optimize => :environment do
    image_optim = ImageOptim.new(:pngout => false, :svgo => false)

    max_width, max_height = 1920, 1080  # Specifies the max dimensions we want. Adjust accordingly.

    Dir.glob(Rails.root.join('app', 'assets', 'images', '**', '*.{png,jpg,jpeg,gif}')) do |img_path|
      img = MiniMagick::Image.open(img_path)

      puts "Optimizing: #{img_path}"

      # Resize if necessary
      if img.width > max_width || img.height > max_height
        img.resize "#{max_width}x#{max_height}"
        img.write img_path
        puts "Resized to #{max_width}x#{max_height}: #{img_path}"
      end

      original_size = File.size(img_path)

      begin
        image_optim.optimize_image!(img_path)
      rescue Exception => e
        puts "Unable to optimize: #{img_path}"
        next
      end

      final_size = File.size(img_path)
      size_diff = original_size - final_size

      puts "Optimized. Size reduced by #{size_diff} bytes"
    end
  end
end