module ApplicationHelper
        def random_image_from_caps
          images = Dir[Rails.root.join('app', 'assets', 'images', 'caps', '*')]
          "caps/#{File.basename(images.sample)}" unless images.empty?
        end
      
end
