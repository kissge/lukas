require 'bundler/setup'

ENV['RACK_ENV'] ||= 'development'
Bundler.require(:default, ENV['RACK_ENV'])

module Lukas
  require 'sinatra/base'

  class App < Sinatra::Base
    require 'sinatra/asset_pipeline'
    require 'sinatra/reloader' if development?

    Tilt.register Tilt::ERBTemplate, 'html.erb'

    configure do
      set :assets_css_compressor, :sass
      register Sinatra::AssetPipeline

      RailsAssets.load_paths.each do |path|
        settings.sprockets.append_path(path)
      end
    end

    configure :development do
      register Sinatra::Reloader
    end

    get '/' do
      erb :index
    end
  end
end
