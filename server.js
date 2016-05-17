var express = require('express');
var server = express();
server.use('/', express.static('./webapp'));
server.listen(8080);
