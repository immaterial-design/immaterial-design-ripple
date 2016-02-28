var path = require('path');
var packageJson = require('./package');

var init = {
  webpack: {
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel',
          exclude: /node_modules/,
        },
        {
          test: /\.json$/,
          loader: 'json',
        },
      ],
    },
    resolve: {
      extensions: ['', '.js', '.json'],
    },
    devtool: 'inline-source-map',
  },
  webpackMiddleware: {
    noInfo: true,
  },

  files: [
    'test/index.js',
  ],
  preprocessors: {
    'test/**/*.js': ['webpack', 'sourcemap'],
  },

  colors: true,
  browsers: ['Chrome'],
  frameworks: ['mocha'],
  client: {
    mocha: {
      timeout: 10000,
    },
  },
  reporters: ['mocha'],

  plugins: [
    'karma-chrome-launcher',
    'karma-sauce-launcher',
    'karma-mocha',

    'karma-webpack',
    'karma-sourcemap-loader',

    'karma-mocha-reporter',
    'karma-coverage',
  ],
};

switch (process.env.npm_lifecycle_event) {
  case 'test':
    init.singleRun = true;
    init.webpack.module.loaders.push({
      test: /\.js$/,
      loader: 'isparta',
      include: path.resolve('src'),
    });
    init.reporters.push('coverage');
    init.coverageReporter = {
      reporters: [
        {
          type: 'lcov',
          dir: 'coverage',
          subdir: '.',
        },
        {
          type: 'text',
        },
      ],
    };
    break;

  case 'test-cloud':
    init.singleRun = true;
    init.reporters = ['dots', 'saucelabs'];
    init.customLaunchers = {
      sl_chrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: '35',
      },
      sl_firefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: '40',
      },
      sl_ios_safari: {
        base: 'SauceLabs',
        browserName: 'iphone',
        version: '7.1',
      },
      sl_android: {
        base: 'SauceLabs',
        browserName: 'android',
        version: '4.4',
      },
      sl_ie: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        version: '10',
      },
    };
    init.browsers = Object.keys(init.customLaunchers);
    init.sauceLabs = {
      recordVideo: true,
      recordScreenshots: true,
      testName: packageJson.name,
    };
    init.browserNoActivityTimeout = 1000000;
    break;
}

module.exports = (config) => {
  config.set(init);
};
