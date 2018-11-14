var http = require("http");
var url = require("url");
var request = require("request");
var fs = require('fs');
function start() {

	var express = require('express');
	app = express();
	var bodyParser = require('body-parser')
	
	
	

	app.use(express.static(__dirname + '/statics'));
	app.use(express.static(__dirname + '/grandma'));

	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/statics/index.html')
	});
	app.get('/aboutMe', function (req, res) {
		res.sendFile(__dirname + '/statics/aboutMe.html')
	});

	app.get('/resume', function(req,res) {
		//request('http://docs.google.com/document/d/1UfJi7kSP_alS7ct90PUQOBx-cXET3iEQP7ekGsALA8Q/export?format=pdf', function (error, response, body) {
		  //res.send('<iframe style="width:100%;height:100%;" src="https://docs.google.com/document/d/e/2PACX-1vTREC1lQp039_osbBKFMggbx2jg9BfyppUcSOQUcImKLypc74TexY2W5Opd3IqI3Y8_cKlpiR6y4QcD/pub?embedded=true"></iframe>')
		  res.sendFile(__dirname + '/statics/resume.html')

		  // if (!error && response.statusCode == 200) {
		  // 	fs.writeFileSync("statics/resume.pdf", body,'base64');
		  // 	res.send("<html><script>window.location='/resume.pdf'</script></html>")
		  // }
		  // //   string = body; // Show the HTML for the Google homepage.
		  // //   var d = new Date() 
		  // //   console.log("got new resume on " + d )
		  // //   res.send(body)
		  // // }
		  // else {
		  //   console.log("Error "+response.statusCode)
		  //   string = "error"
		  //   res.send("Whoops there was an error. Download my resume here <a href='http://docs.google.com/document/d/1UfJi7kSP_alS7ct90PUQOBx-cXET3iEQP7ekGsALA8Q/export?format=html'>here</a>")
		  // }
		//})


		
	})
	app.get('/grandma',function(req,res){
		res.sendFile(__dirname + '/grandma/index.html')
	})
	
	var port = 8080;
	if(process.platform == "linux"){
		port = 8088
	}

	var server = app.listen(port);
	

	
	console.log("Server has started");
}

exports.start = start;