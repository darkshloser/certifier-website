// Copyright 2017 Parity Technologies (UK) Ltd.

const config = require('config');
const proxy = require('http-proxy-middleware');
const express = require('express');
const path = require('path');
const ProgressBar = require('progress');
const webpack = require('webpack');
const WebpackStats = require('webpack/lib/Stats');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const webpackConfig = require('./webpack.config');

/**
 * Add webpack hot middleware to each entry in the config
 * and HMR to the plugins
 */
(function updateWebpackConfig () {
  webpackConfig.performance = { hints: false };

  Object.keys(webpackConfig.entry).forEach((key) => {
    const entry = webpackConfig.entry[key];

    webpackConfig.entry[key] = [].concat(
      'react-hot-loader/patch',
      'webpack-hot-middleware/client?reload=true',
      entry
    );
  });

  webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
  webpackConfig.plugins.push(new webpack.NamedModulesPlugin());
  webpackConfig.plugins.push(new webpack.NoEmitOnErrorsPlugin());

  webpackConfig.plugins.push(new webpack.ProgressPlugin(
    (percentage, message) => {
      progressBar.update(percentage, { message: message });
    }
  ));
})();

const app = express();
const progressBar = new ProgressBar('  [:bar] :percent :etas - :message', {
  total: 100,
  width: 20
});
const compiler = webpack(webpackConfig);

app.use(webpackHotMiddleware(compiler, {
  log: console.log
}));

app.use(webpackDevMiddleware(compiler, {
  noInfo: true,
  quiet: false,
  progress: true,
  publicPath: webpackConfig.output.publicPath,
  stats: {
    colors: true
  },
  reporter: function (data) {
    // @see https://github.com/webpack/webpack/blob/324d309107f00cfc38ec727521563d309339b2ec/lib/Stats.js#L790
    // Accepted values: none, errors-only, minimal, normal, verbose
    const options = WebpackStats.presetToOptions('minimal');

    options.colors = true;
    options.timings = true;

    const output = data.stats.toString(options);

    process.stdout.write('\n');
    process.stdout.write(output);
    process.stdout.write('\n\n');
  }
}));

app.use(express.static(path.resolve(__dirname, 'dist')));

app.use('/api', proxy({
  target: `http://${config.get('http.hostname')}:${config.get('http.port')}`,
  changeOrigin: true
}));

app.listen(8081, () => {
  console.log('server started');
});
