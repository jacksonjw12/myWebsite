//I refuse to download jQuery 
console.log("who needs jquery when you have spaghetti code");
var current = "main";
var inTransition = "none";
function turnTransOff(){
	inTransition = "none";
}
var transitionSpeed = {"x":0,"y":0}

function aboutMe(){
	
	var aboutMe = document.getElementById("aboutMe");
	if(current != "aboutMe"){
		inTransition = "left";
		aboutMe.classList.remove('slideOn')
		aboutMe.classList.remove('slideRight')
		document.getElementById("mainPage").classList.remove('slideOn');


		mainPageSlideLeft()


		aboutMe.classList.add('slideLeft')

		aboutMe.classList.remove('hidden')
		current = "aboutMe";
	}
	else{
		inTransition = "right";
		aboutMe.classList.remove('slideRight')

		aboutMe.classList.add('slideOn')
		mainPageSlideOn()
		current = "main";


	}
	window.setTimeout(turnTransOff, 1400);

}
function contactMe(){
	inTransition = true;

	var contactMe = document.getElementById("contactMe");
	if(current != "contactMe"){
		inTransition = "right";

		contactMe.classList.remove('slideLeft')
		contactMe.classList.remove('slideRight')
		document.getElementById("mainPage").classList.remove('slideOn');


		mainPageSlideRight()


		contactMe.classList.add('slideRight')

		contactMe.classList.remove('hidden')
		current = "contactMe";
	}
	else{
		inTransition = "left";

		contactMe.classList.add('slideLeft')
		mainPageSlideOn()
		current = "main";


	}
	window.setTimeout(turnTransOff, 1400);
}
function projects(){
	inTransition = true;
	console.log(123);
	var projects = document.getElementById("projects");
	if(current != "projects"){
		inTransition = "down";

		projects.classList.remove('slideOn')
		//projects.classList.remove('slideRight')
		document.getElementById("mainPage").classList.remove('slideOn');


		mainPageSlideDown()


		projects.classList.add('slideDown')

		projects.classList.remove('hidden')
		current = "projects";
	}
	else{
		inTransition = "up";
		projects.classList.remove('slideDown')
		//projects.classList.remove('slideRight')
		projects.classList.add('slideOn')

		mainPageSlideOn()
		current = "main";


	}
	window.setTimeout(turnTransOff, 1400);

}


function mainPageSlideRight(){
	document.getElementById("mainPage").classList.add('slideRight');

}
function mainPageSlideLeft(){
	document.getElementById("mainPage").classList.add('slideLeft');

}
function mainPageSlideUp(){
	document.getElementById("mainPage").classList.add('slideUp');

}
function mainPageSlideDown(){
	document.getElementById("mainPage").classList.add('slideDown');

}
function mainPageSlideOn(){
	document.getElementById("mainPage").classList.add('slideOn');
	document.getElementById("mainPage").classList.remove('slideRight');
	document.getElementById("mainPage").classList.remove('slideLeft');

	document.getElementById("mainPage").classList.remove('slideDown');

	window.setTimeout(function(){document.getElementById("mainPage").classList.remove('slideOn');},1400)


}



var canvas = {"width":window.innerWidth,"height":window.innerHeight,"context":null}
	var c = document.getElementById("canvas")
	c.width = canvas.width;
	c.height = canvas.height;
	canvas.context = c.getContext('2d');
	canvas.context.fillStyle = 'black'
	canvas.context.fillRect(0,0,canvas.width,canvas.height);
	var points = [{"x":100,"y":100,"velX":0,"velY":0,"speed":1,"radius":4}];
	var mousePos = {"x":120,"y":100};

	var time = {"sinceLastStep":0,"lastStep":Date.now(),"startDate":Date.now()}
	var stepTimer = 0;

	for(var i = 0; i<80; i++){
			points.push({"x":Math.random()*canvas.width,"y":Math.random()*canvas.width,"velX":0,"velY":0,"speed":1,"radius":4+ Math.random()})
		}
	function updateCoords(event){
		mousePos.x = event.clientX;
    	mousePos.y = event.clientY;
	}

	function step(){
		
		
		doPhysics();
		renderScene();
		stepTimer++;
		window.setTimeout(step,20)
	}

	function doPhysics(){
		
		var now = Date.now();
		time.sinceLastStep = (now-time.lastStep)/1;
		if(inTransition != "none"){
			if(inTransition == "left"){
				transitionSpeed.x = -300;

			}
			else if(inTransition == "right"){
				transitionSpeed.x = 300;

			}
			else if(inTransition == "up"){
				transitionSpeed.y = -300;

			}
			else if(inTransition == "down"){
				transitionSpeed.y = 300;

			}
			/*for(var p = 0; p< points.length; p++){
				if(inTransition == "left"){
					points[p].velX = -300;

				}
				else if(inTransition == "right"){
					points[p].velX = 300;

				}
				else if(inTransition == "up"){
					points[p].velY = -300;

				}
				else if(inTransition == "down"){
					points[p].velY = 300;

				}
				var dx = -mousePos.x +points[p].x;
				var dy = -mousePos.y + points[p].y;
				if(dx == 0){dx = .01;}
				if(dy == 0){dy = .01;}
				
				var unitX = dy
				var unitY = -dx;
				var rad = Math.sqrt(dx*dx+dy*dy)
				points[p].radius = rad/100// 800/(rad+40)
				points[p].x += points[p].velX *1* time.sinceLastStep/1000 * points[p].speed*2;
				points[p].y += points[p].velY *1* time.sinceLastStep/1000 * points[p].speed*2;
				if(points[p].x > canvas.width){points[p].x = points[p].x % canvas.width}
				else if(points[p].x < 0){points[p].x = canvas.width + points[p].x}
				if(points[p].y > canvas.height){points[p].y = points[p].y % canvas.height}
				else if(points[p].y < 0){points[p].y = canvas.height + points[p].y}



					
			}*/
		}
		
		for(var p = 0; p< points.length; p++){
			var dx = -mousePos.x +points[p].x;
			var dy = -mousePos.y + points[p].y;
			if(dx == 0){dx = .01;}
			if(dy == 0){dy = .01;}
			
			var unitX = dy
			var unitY = -dx;
			var rad = Math.sqrt(dx*dx+dy*dy)
			points[p].radius = rad/100// 800/(rad+40)

			if(rad < 3000){
				points[p].velX = unitX/rad*20 - dx/Math.abs(dx) ;
				points[p].velY = unitY/rad*20 - dy/Math.abs(dy) ;
			}
			else{
				points[p].velX = 0;
				points[p].velY = 0;
			}
			points[p].velX += transitionSpeed.x
			points[p].velY += transitionSpeed.y

			points[p].x += points[p].velX * time.sinceLastStep/1000 * points[p].speed*2;
			points[p].y += points[p].velY * time.sinceLastStep/1000 * points[p].speed*2;
			if(points[p].x > canvas.width){points[p].x = points[p].x % canvas.width}
			else if(points[p].x < 0){points[p].x = canvas.width + points[p].x}
			if(points[p].y > canvas.height){points[p].y = points[p].y % canvas.height}
			else if(points[p].y < 0){points[p].y = canvas.height + points[p].y}
			
		}
		
		var deccelerationSpeed = 5;
			
		if(transitionSpeed.x != 0 && transitionSpeed.x > deccelerationSpeed){
			transitionSpeed.x-=deccelerationSpeed;
		}
		else if(transitionSpeed.x != 0 && transitionSpeed.x < -deccelerationSpeed){
			transitionSpeed.x+=deccelerationSpeed;
		}
		else if(transitionSpeed.x != 0){
			transitionSpeed.x = 0;
		}
		if(transitionSpeed.y != 0 && transitionSpeed.y > deccelerationSpeed){
			transitionSpeed.y-=deccelerationSpeed;
		}
		else if(transitionSpeed.y != 0 && transitionSpeed.y < -deccelerationSpeed){
			transitionSpeed.y+=deccelerationSpeed;
		}
		else if(transitionSpeed.y != 0){
			transitionSpeed.y = 0;
		}



		

		time.lastStep = now;


	}


	function renderScene(){
		canvas.context.fillStyle = '#00bbbb'
		canvas.context.fillRect(0,0,canvas.width,canvas.height);
		canvas.context.fillStyle = 'white'
		canvas.context.globalAlpha = 0.8 ;
		for(var p = 0; p<points.length; p++){
			canvas.context.beginPath();
			canvas.context.arc(points[p].x,points[p].y,points[p].radius,0,Math.PI*2,false);
			canvas.context.fill();

		}
		canvas.context.globalAlpha = 1


		
	}



	step();
