const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/build.jsx',
  mode: 'production',
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  output: {
    filename: 'imgUpload.js',
    libraryExport: 'default',
    libraryTarget: 'var',
    library: 'reactImgUpload',
    path: path.resolve(__dirname, './dist/lib'),
  },
  node: {
    fs: 'empty',
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
      },
    }, {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    }],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.browser': 'true',
    }),
  ],
};
