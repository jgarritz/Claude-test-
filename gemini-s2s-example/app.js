require('dotenv').config()
const express = require('express');
const app = express();
const {createServer} = require('http');
const {createEndpoint} = require('@jambonz/node-client-ws');
const server = createServer(app);
const makeService = createEndpoint({server});
const logger = require('pino')({level: process.env.LOGLEVEL || 'info'});
const port = process.env.PORT || process.env.WS_PORT || 3000;
const routes = require('./lib/api');

app.locals = {
  ...app.locals,
  logger
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS for Lovable dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', agent: 'Luna', lang: 'es', ws: '/google-s2s' });
});

app.use('/api', (req, res, next) => {
  next();
},routes);

require('./lib/routes')({logger, makeService});

app.post('/final', (req, res) => {
  logger.info({body: req.body}, 'POST /final');
  
  res.status(200).send();
});

app.post('/event', (req, res) => {
  logger.info({body: req.body}, 'POST /event');
  
  res.status(200).send();
});

server.listen(port, () => {
  logger.info(`jambonz websocket server listening at http://localhost:${port}`);
});
