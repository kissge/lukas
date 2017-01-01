module Lukas
  require 'sinatra/base'

  class App < Sinatra::Base
    require 'sinatra/reloader' if development?

    configure :development do
      register Sinatra::Reloader
    end

    get '/' do
      'ruby sucks.'
    end
  end
end
