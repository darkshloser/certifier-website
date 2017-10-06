const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

const analyze = !!process.env.ANALYZE_ENV;
const ENV = process.env.NODE_ENV || 'development';
const isProd = ENV === 'production';

const webpackConfig = {
  cache: !isProd,
  devtool: isProd ? '#eval' : '#source-map',

  entry: {
    app: [
      path.resolve(__dirname, 'src/main.js')
    ],
    vendor: [
      '@parity/ethkey.js',
      '@parity/wordlist',
      'bignumber.js',
      'country-data',
      'datamaps',
      'mobx',
      'onfido-sdk-ui',
      'react',
      'react-dom'
    ]
  },

  output: {
    path: path.resolve(__dirname, 'dist-build'),
    filename: '[name].[hash:10].js',
    publicPath: '/'
  },

  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.jsx?$/,
        include: /parity-reactive-ui/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: isProd
          ? ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: 'css-loader'
          })
          : [ 'style-loader', 'css-loader' ]
      },

      { test: /\.md$/, loader: 'babel-loader!react-markdown-loader' },
      { test: /\.(png|woff|woff2|eot|ttf|svg)(\?|$)/, loader: 'file-loader?limit=100000' }
    ]
  },

  resolve: {
    modules: [
      path.resolve('src'),
      'node_modules'
    ],
    extensions: ['.js', '.json', '.jsx'],
    mainFields: ['jsnext:main', 'browser', 'module', 'main']
  },

  plugins: [
    new FaviconsWebpackPlugin(path.resolve(__dirname, './src/images/logo.png')),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(ENV)
      }
    }),

    new HtmlWebpackPlugin({
      title: 'PICOPS - Parity ICO Passport Service',
      template: path.resolve(__dirname, './src/index.ejs')
    })
  ]
};

if (analyze) {
  webpackConfig.plugins.push(
    new BundleAnalyzerPlugin()
  );
}

if (isProd) {
  webpackConfig.plugins.push(
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),

    new webpack.optimize.UglifyJsPlugin({
      compress: {
        unused: true,
        dead_code: true,
        warnings: false
      }
    }),

    new ExtractTextPlugin('[name].[contenthash:10].css')
  );
}

module.exports = webpackConfig;
