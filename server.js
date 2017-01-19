var http = require("http");
var url = require("url");
function start() {

	var express = require('express');
	app = express();
	var bodyParser = require('body-parser')
	
	
	

	app.use(express.static(__dirname + '/statics'));

	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/statics/index.html')
	});
	app.get('/aboutMe', function (req, res) {
		res.sendFile(__dirname + '/statics/aboutMe.html')
	});

	
	
	var port = 8080;
	if(process.platform == "linux"){
		port = 80
	}

	var server = app.listen(port);
	

	
	console.log("Server has started");
}

exports.start = start;