
const commonSettings = {
	numPoints: window.innerwidth < 500 ? 70 : 150,
	rad: 2 * Math.PI,
	fade: 1.0,
	springForce: 10,
	springLength: 100,
	cursorMass: 350000,
	wallBounces: false

}

const gameSettings = [
	
	{
		name: "Springs and Point Gravity",
		quantumGravityDistance: 10,
		distanceScalingFactor: 1.0 * 5,
		offscreenBufferSize: 20,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 50,
		cursorMass: 3000,
		springForce: 15,
		springLength: 200,
		wallFriction: 0.6,
		groundFriction: 0.99,
		startVelocity: 0,
		wallStoppingVel: 1,
		velMax: 50,
		useSpringForces: true,
		useInterpointGravity: true,
		fade: 0.2
		
	},
	{
		name: "Springs",
		quantumGravityDistance: 10,
		distanceScalingFactor: 1.0 * 5,
		offscreenBufferSize: 20,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 30,
		wallFriction: 0.6,
		groundFriction: 0.99,
		startVelocity: 0,
		wallStoppingVel: 1,
		velMax: 30,
		useSpringForces: true,
		useInterpointGravity: false,
		fade: 0.4
		
	},
	{
		name: "Point Gravity",
		quantumGravityDistance: 10,
		distanceScalingFactor: 1.0 * 5,
		offscreenBufferSize: 20,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 50,
		wallFriction: 0.6,
		groundFriction: 0.99,
		startVelocity: 0,
		wallStoppingVel: 1,
		velMax: 50,
		useSpringForces: false,
		useInterpointGravity: true,
		fade:0.15,
		
	},
	{
		name: "Fast!",
		quantumGravityDistance: 10,
		distanceScalingFactor: 1.0 * 5,
		offscreenBufferSize: 20,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 50,
		wallFriction: 0.6,
		groundFriction: 1.0,
		startVelocity: 5,
		wallStoppingVel: 1,
		velMax: 50,
		useSpringForces: false,
		useInterpointGravity: true,
		fade:0.2
		
	}

]

let gameIndex = Math.round(Math.random() * 1000) % gameSettings.length;
console.log(gameIndex)
let settings = {...commonSettings, ...gameSettings[gameIndex]};
console.log("Mode", settings.name);


function clamp(val, start, end) {
	if(val < start){
		return start;
	}
	else if(val > end){
		return end;
	}
	return isNaN(val) ? (end - start) / 2 + start : val;
}

function pointDist(point1, point2) {
	let xd = point1.x - point2.x;
	let yd = point1.y - point2.y;
	return Math.sqrt(xd * xd + yd * yd);
}

function render(dt) {

	
	canvas.ctx.fillStyle = `rgba(255,255,255,${settings.fade})`;
	canvas.ctx.fillRect(0,0,canvas.width, canvas.height);
	
	


	canvas.ctx.fillStyle = "rgba(0,0,0,0.5)"
	
	const drawLines = true;
	const linesCloseness = 200;

	canvas.ctx.strokeStyle = "rgba(0,0,0,0.8)";
	if(drawLines) {
		for(let p = 0; p < state.points.length; p++) {
			const point1 = state.points[p];


			for(let j = p+1; j < state.points.length; j++) {
				if(p == j) {
					continue;
				}

				const point2 = state.points[j];

				const dist = pointDist(point1, point2);

				if(dist < linesCloseness) {


					const percentageThick = 1.0 - (dist / linesCloseness);

					canvas.ctx.strokeStyle = `rgba(0,0,0,${percentageThick})`;

					canvas.ctx.beginPath();
					canvas.ctx.moveTo(point1.x, point1.y);
					canvas.ctx.lineTo(point2.x, point2.y);
					canvas.ctx.stroke();
				}




			}
			
		}
	}

	canvas.ctx.fillStyle = "rgba(0,0,0,0.8)"

	for(let p = 0; p < state.points.length; p++) {
		const point = state.points[p];
		// canvas.ctx.beginPath();

		// canvas.ctx.arc(point.x, point.y, 10, 0, settings.rad);
		// canvas.ctx.fill();
	}

}



function getGravForces(point1, point2, massProduct, quantumDist=10000, disableQuantumGrav=true, isAntiGrav, distanceScalingFactor) {

	let cursorDistX = (point1.x - point2.x) * distanceScalingFactor;
	let cursorDistY = (point1.y - point2.y) * distanceScalingFactor;


	if(!isAntiGrav && (cursorDistX * cursorDistX + cursorDistY * cursorDistY < quantumDist * quantumDist) && disableQuantumGrav) {
		return {
			x: 0,
			y: 0
		}
	}

	let signX = Math.sign(cursorDistX);
	let signY = Math.sign(cursorDistY);

	// Cant get closer than a certain distance otherwise gravity forces get enormous.
	if(Math.abs(cursorDistX) < quantumDist){
		cursorDistX = quantumDist * signX;
	}
	if(Math.abs(cursorDistX) < quantumDist){
		cursorDistY = quantumDist * signY;
	}

	var unitX = cursorDistY
	var unitY = -cursorDistX;
	var cursorDistSquared = cursorDistX*cursorDistX+cursorDistY*cursorDistY;
	let cursorDist = Math.sqrt(cursorDistSquared);

	

	let gravForce = settings.gravityForce / cursorDistSquared;

	let theta = Math.atan(Math.abs(cursorDistY / cursorDistX));

	let gravX = Math.abs(Math.cos(theta) * gravForce) * -signX;
	let gravY = Math.abs(Math.sin(theta) * gravForce) * -signY;


	return {
		x: gravX,
		y: gravY,
		dist: cursorDist
	}	

}


function getSpringForces(point1, point2, springLength, springFactor, distanceScalingFactor) {




	let cursorDistX = (point1.x - point2.x) * distanceScalingFactor;
	let cursorDistY = (point1.y - point2.y) * distanceScalingFactor;


	

	let signX = Math.sign(cursorDistX);
	let signY = Math.sign(cursorDistY);

	
	var unitX = cursorDistY
	var unitY = -cursorDistX;
	var cursorDistSquared = cursorDistX*cursorDistX+cursorDistY*cursorDistY;
	let cursorDist = Math.sqrt(cursorDistSquared);

	let springCompression = cursorDist > springLength ? 0 : springLength - cursorDist;

	let gravForce = springFactor * (springCompression / springLength);

	let angle = cursorDistX == 0 ? Math.PI/2: Math.abs(cursorDistY / cursorDistX)


	let theta = Math.atan(angle);

	let springX = Math.abs(Math.cos(theta) * gravForce) * signX;
	let springY = Math.abs(Math.sin(theta) * gravForce) * signY;


	return {
		x: springX,
		y: springY,
		dist: cursorDist
	}	

}

function update(dtMillis, isAntiGrav) {
	const scaledMillis = dtMillis * settings.timeScaleFactor;
	const clampedMousePos = {
		x: clamp(mousePos.x, 0, canvas.width),
		y: clamp(mousePos.y, 0, canvas.height)
	}

	const swarming = state.noise.getVal(state.lastMillis) + 40;///*Math.random() * 100 +*/ 75;
	
	for(var p = 0; p < state.points.length; p++){
		const point = state.points[p];
		point.accelX = 0;
		point.accelY = 0;

		
		const grav = getGravForces(point, clampedMousePos, settings.cursorMass, isAntiGrav ? 0 : settings.quantumGravityDistance, false, isAntiGrav, settings.distanceScalingFactor / 15);


		if(isAntiGrav) {
			point.accelX -= grav.x;
			point.accelY -= grav.y;
		}
		else {
			point.accelX += grav.x;
			point.accelY += grav.y;
		}
		




		for(let j = 0; j < state.points.length; j++) {
			if(j === p) {
				continue;
			}
			const pointGrav = getGravForces(point, state.points[j], 8.0, isAntiGrav ? 0 : swarming, !isAntiGrav, isAntiGrav, settings.distanceScalingFactor);

			const springForces = getSpringForces(point, state.points[j], settings.springLength, settings.springForce, settings.distanceScalingFactor);

			
			if(settings.useInterpointGravity) {
				if(isAntiGrav) {
					point.accelX -= pointGrav.x;
					point.accelY -= pointGrav.y;
				}
				else {
					point.accelX += pointGrav.x;
					point.accelY += pointGrav.y;
				}
			}

			if(settings.useSpringForces) {
				point.accelX += springForces.x;
				point.accelY += springForces.y;
			}

			
		}

		if(state.forcesEnabled) {
			point.velX += point.accelX * scaledMillis * (isAntiGrav ? 0.4 : 1);
			point.velY += point.accelY * scaledMillis * (isAntiGrav ? 0.4 : 1);
		}
		

		if(isAntiGrav) {
			point.velX = clamp(point.velX, -settings.velMax/4, settings.velMax/4);
			point.velY = clamp(point.velY, -settings.velMax/4, settings.velMax/4);
		}
		else {
			point.velX = clamp(point.velX, -settings.velMax, settings.velMax);
			point.velY = clamp(point.velY, -settings.velMax, settings.velMax);
		}
		


		point.x += point.velX * scaledMillis;
		point.y += point.velY * scaledMillis;


		// Background sliding
		point.x += state.velX * scaledMillis;
		point.y += state.velY * scaledMillis;


		point.velX *= state.forcesEnabled ? settings.groundFriction : 0.9;
		point.velY *= state.forcesEnabled ? settings.groundFriction : 0.9;

		if(point.x < -settings.offscreenBufferSize) {
			

			if(settings.wallBounces && Math.abs(point.velX) < settings.wallStoppingVel) {
				point.x = -settings.offscreenBufferSize + 1;
				point.velX *= -1;
			}
			else {
				point.x = canvas.width + point.x + settings.offscreenBufferSize * 2;
			}
			point.velX *= settings.wallFriction;

		}
		if(point.y < -settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velY) < settings.wallStoppingVel) {
				point.y = -settings.offscreenBufferSize + 1;
				point.velY *= -1;
			}
			else {
				point.y = canvas.height + point.y + settings.offscreenBufferSize * 2;
			}

			point.velY *= settings.wallFriction;

		}
		if(point.x > canvas.width + settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velX) < settings.wallStoppingVel) {
				point.x = canvas.width + settings.offscreenBufferSize - 1;
				point.velX *= -1;
			}
			else {
				point.x = canvas.width + point.x + settings.offscreenBufferSize * 2;
			}
			point.velX *= settings.wallFriction;

			
		}
		if(point.y > canvas.height + settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velX) < settings.wallStoppingVel) {
				point.y = canvas.height + settings.offscreenBufferSize - 1;
				point.velY *= -1;
			}
			else {
				point.y = point.y - canvas.height - settings.offscreenBufferSize * 2;
			}
			point.velY *= settings.wallFriction;

		}

	}

}

let tickNum = 0;
function tick(timeMillis) {
	
	state.timeMillis = timeMillis;
	if(state.lastMillis === undefined) {
		state.lastMillis = timeMillis;
	}
	const dtMillis = state.timeMillis - state.lastMillis;

	isAntiGrav = state.antiGravMillis > 0;
	state.antiGravMillis -= dtMillis;

	state.velX *= state.velFriction;
	state.velY *= state.velFriction;

	update(dtMillis, isAntiGrav);
	render();


	const debugFrameTime = false;
	if(debugFrameTime && tickNum % 60 === 0) {
		console.log(Math.round(dtMillis*100)/100)
	}


	state.lastMillis = state.timeMillis;

	tickNum++;

	if(!state.paused){
		window.requestAnimationFrame(tick);
	}
	

}

const state = {
	lastMillis: undefined,
	points: [],
	antiGravMillis: 0,
	noise: window.Simple1DNoise(100, 0.002),
	paused:true,
	cursorPos: undefined,
	loopId: undefined,
	velX: (Math.random() - 0.5) * 5,
	velY: -10,
	velFriction: 0.99,
	forcesEnabled: true
}

function startAnim() {

	for(let i = 0; i < settings.numPoints; i++){
		const point = {};
		point.x = Math.random() * canvas.width;
		point.y = Math.random() * canvas.height;
		point.velX = 2 * (Math.random() - 0.5) * settings.startVelocity;
		point.velY = 2 * (Math.random() - 0.5) * settings.startVelocity;

		point.radius = 5;
		point.speed = 1;
		state.points.push(point);
	}

	const click = ()=>{
		
		state.antiGravMillis = 450;

	}
	const debounce = (func, wait, immediate) => {
	    var timeout;
	    return () => {
	        const context = this, args = arguments;
	        const later = function() {
	            timeout = null;
	            if (!immediate) func.apply(context, args);
	        };
	        const callNow = immediate && !timeout;
	        clearTimeout(timeout);
	        timeout = setTimeout(later, wait);
	        if (callNow) func.apply(context, args);
	    };
	};
	window.addEventListener('click', debounce(click, 40, false), false);


	state.paused = false;
	state.loopId = window.requestAnimationFrame(tick);
}

function pause() {
	state.paused = true;
	if(state.loopId !== undefined) {
		window.cancelAnimationFrame(state.loopId);
		state.loopId = undefined;
		state.lastMillis = undefined;
	}

}
function resume() {
	state.paused = false;
	state.loopId = window.requestAnimationFrame(tick);
}


window.onload = function(){
	const canvas = {};
	window.canvas = canvas;

	canvas.el = document.getElementById('canvas');
	if(!canvas.el){
		console.log(canvas.el, ':(')
		return;
	}
	canvas.ctx = canvas.el.getContext('2d');
	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		canvas.el.width = canvas.width;
		canvas.el.height = canvas.height;

	}
	resize();

	
	const debounce = (func, wait, immediate) => {
	    var timeout;
	    return () => {
	        const context = this, args = arguments;
	        const later = function() {
	            timeout = null;
	            if (!immediate) func.apply(context, args);
	        };
	        const callNow = immediate && !timeout;
	        clearTimeout(timeout);
	        timeout = setTimeout(later, wait);
	        if (callNow) func.apply(context, args);
	    };
	};
	window.addEventListener('resize', debounce(resize, 40, false), false);

	

	window.mousePos = {
		x: canvas.width / 2,
		y: canvas.height / 2
	};


	document.body.addEventListener("mousemove", (event) => {
		mousePos.x = event.clientX;
		mousePos.y = event.clientY;


		if(event.clientX < 0  || event.clientX > canvas.width || event.clientY < 0 || event.clientY > canvas.height) {
			mousePos.x = canvas.width / 2;
			mousePos.y = canvas.height / 2;

		}
	});


	let leaveTimer = undefined;

	document.addEventListener("mouseleave", function(event){
		// mousePos.x = canvas.width / 2;
		// mousePos.y = canvas.height / 2;
		state.forcesEnabled = false;
		leaveTimer = window.setTimeout(()=>{pause()}, 2000);
		console.log("paused");

	});

	document.addEventListener("mouseenter", function(event){
		if(leaveTimer !== undefined) {
			window.clearTimeout(leaveTimer);
			leaveTimer = undefined;
		}
		state.forcesEnabled = true;
		resume();
		console.log("resumed")
	});

	const touchState = {
		inTouch: false,
	}



	document.getElementById('changeMode').addEventListener('click', () => {

		gameIndex = (gameIndex + 1) % gameSettings.length;
		settings = {...commonSettings, ...gameSettings[gameIndex]};

		console.log("changeMode", settings.name);
		createMessage(`Mode: <b>${settings.name}</b>`);
	})




	startAnim();

}
