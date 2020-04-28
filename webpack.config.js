const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  entry: './src/javascripts/index.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
     contentBase: './dist',
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(require('./package.json').version)
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      filename: './app.css',
      ignoreOrder: false // Enable to remove warnings about conflicting order
    })
  ],
  devtool: 'source-map',
  resolve: {
    alias: {
      '%': path.resolve(__dirname, 'src/templates'),
      '@': path.resolve(__dirname, 'src/javascripts'),
      '@Controllers': path.resolve(__dirname, 'src/javascripts/controllers')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../', // The base assets directory in relation to the stylesheets
              hmr: process.env.NODE_ENV === 'development'
            }
          },
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ]
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'ng-cache-loader',
            options: {
              prefix: 'templates:**'
            }
          }
        ]
      },
      {
        test: /\.pug$/,
        use: [
          {
            loader: 'apply-loader'
          },
          {
            loader: 'pug-loader'
          }
        ]
      }
    ]
  }
};
