const express = require('express');
const bodyParser = require('body-parser');
const amf = require('amf-client-js');
const {ParserService} = require('./parser-service');
const url = require('url');
const app = express();
const port = 8054;
const parser = new ParserService();
app.enable('trust proxy');
app.disable('etag');
app.set('x-powered-by', false);
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers',
  'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.get('/parse', (req, res) => {
  const data = url.parse(req.url, true);
  parser.parseApi(data.query.q, res);
});

amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();

amf.Core.init().then(() => {
  app.listen(port, () =>
    console.log('Server is up and running on port ' + port));
});
