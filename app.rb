require 'bundler/setup'

ENV['RACK_ENV'] ||= 'development'
Bundler.require(:default, ENV['RACK_ENV'])

module Lukas
  require 'fileutils'
  require 'sinatra/base'
  require 'sinatra/json'

  class App < Sinatra::Base
    require 'sinatra/asset_pipeline'
    require 'sinatra/reloader' if development?

    Tilt.register Tilt::ERBTemplate, 'html.erb'

    configure do
      set :assets_css_compressor, :sass
      register Sinatra::AssetPipeline

      set :erb, :escape_html => true

      RailsAssets.load_paths.each do |path|
        settings.sprockets.append_path(path)
      end
    end

    configure :development do
      register Sinatra::Reloader
    end

    helpers do
      def h(text)
        Rack::Utils.escape_html(text)
      end
    end

    get '/' do
      erb :index
    end

    get '/list' do
      documents = document_list
      annotations = documents.map{|d|
        [
          d,
          Dir.glob("data/annotations/#{d}/*.lukas.ann").map do |filename|
            {
              filename: filename.gsub("data/annotations/#{d}/", "").gsub(".lukas.ann", ""),
              modified: File.mtime(filename)
            }
          end
        ]
      }.to_h

      tree = {}
      documents.each do |d|
        cur = tree
        path = d.split('/')
        name = path.pop
        path.each do |dir|
          cur[dir] = {} unless cur.has_key? dir
          cur = cur[dir]
        end
        cur[name] = d
      end

      erb :tree, :locals => {tree: tree, annotations: annotations}
    end

    post '/open' do
      validation!

      document = open('data/documents/' + params[:document] + '.lukas.doc') do |io|
        JSON.load io
      end

      begin
        annotation = open('data/annotations/' + params[:document] + '/' + params[:annotation] + '.lukas.ann') do |io|
          JSON.load io
        end
      rescue
        annotation = nil
      end

      document[:annotation] = annotation

      dir = params[:document].split('/')[0...-1]
      siblings = document_list.select {|path| path.split('/')[0...-1] == dir}
      index = siblings.index params[:document]
      document[:prev] = index > 0 ? siblings[index - 1] : nil
      document[:next] = siblings[index + 1]

      json document
    end

    post '/save' do
      validation!

      dir = 'data/annotations/' + params[:document]
      FileUtils.mkdir_p dir unless File.directory? dir

      open(dir + '/' + params[:annotation] + '.lukas.ann', 'w') do |io|
        io.write params[:annotations]
      end

      200
    end

    def document_list
      Dir.glob("data/documents/**/*.lukas.doc").sort.map do |filename|
        filename.gsub("data/documents/", "").gsub(".lukas.doc", "")
      end
    end

    def validation!
      halt 400 unless document_list.include? params[:document]
      halt 400 if /[^-a-zA-Z0-9_.]/.match params[:annotation]
    end
  end
end
