#!/usr/bin/env node
const volante = require('volante');

// create the volante hub
let hub = new volante.Hub();
// load config file
hub.loadConfig('config.json');
// start the http server
hub.emit('VolanteExpress.start');
