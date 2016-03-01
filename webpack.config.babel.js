import webpack from 'webpack';

const config = {
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
      },
    ],
  },
  resolve: {
    extensions: ['', '.js', '.json'],
  },
};

switch (process.env.npm_lifecycle_event) {
  case 'release':
    config.plugins = [
      new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } }),
    ];

    config.entry = './src';
    config.output = {
      path: `${__dirname}/release/`,
      filename: 'immaterial-design-ripple.min.js',
      library: 'ImdRipple',
      libraryTarget: 'umd',
    };
    config.devtool = '#source-map';
    break;

  default:
    config.devtool = 'inline-source-map';
}

export default config;
