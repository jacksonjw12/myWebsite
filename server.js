var http = require("http");
var url = require("url");
var request = require("request");
var fs = require('fs');
function start() {

	var express = require('express');
	app = express();
	// var bodyParser = require('body-parser')
	
	
	

	// app.use(express.static(__dirname + '/grandma'));

	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/statics/index.html')
	});
	app.use(express.static(__dirname + '/statics'));

	app.get('/aboutMe', function (req, res) {
		res.sendFile(__dirname + '/statics/aboutMe.html')
	});

	app.get('/resume', function(req,res) {
	
		  res.sendFile(__dirname + '/statics/resume.html')
		
	})
	
	
	var port = 8080;
	if(process.platform == "linux"){
		port = 8088
	}

	var server = app.listen(port);
	

	
	console.log("Server has started");
}

exports.start = start;