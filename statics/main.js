const nonMobileWidthMin = 1000;
const phonePercentageScaling = Math.max(window.innerWidth, window.innerHeight) < nonMobileWidthMin ? Math.max(window.innerWidth, window.innerHeight) / nonMobileWidthMin : 1.0;
const linesCloseness = 200;


const commonSettings = {
	numPoints: Math.round(150 * phonePercentageScaling),//window.innerwidth < 500 ? 70 : 150,
	rad: 2 * Math.PI,
	fade: 1.0,
	springForce: 10,
	springLength: 100,
	cursorMass: 350000,
	pointMass: 10,
	wallBounces: false,
	distanceScalingFactor: 1.0 * 5,//1.0 * 5 / phonePercentageScaling,
	velMax: 20 ,
	groundFriction: 0.99,
	offscreenBufferSize: linesCloseness / 4,



}

const gameSettings = [
	
	{
		name: "Springs and Point Gravity",
		quantumGravityDistance: 10,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 50,
		cursorMass: 3000,
		springForce: 15,
		springLength: 10,
		wallFriction: 0.6,
		startVelocity: 0,
		wallStoppingVel: 1,
		useSpringForces: true,
		useInterpointGravity: true,
		fade: 0.2
		
	},
	{
		name: "Springs",
		quantumGravityDistance: 10,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 30,
		wallFriction: 0.2,
		startVelocity: 0,
		wallStoppingVel: 1,
		useSpringForces: true,
		useInterpointGravity: false,
		fade: 0.4,
		springForce: 22,
		springLength: 80,
		velMax: 10,
		groundFriction: 0.97,
		
	},
	{
		name: "Point Gravity",
		quantumGravityDistance: 10,
		timeScaleFactor: 1/10 * 1.0,
		gravityForce: 50,
		wallFriction: 0.6,
		startVelocity: 0,
		wallStoppingVel: 1,
		useSpringForces: false,
		useInterpointGravity: true,
		fade:0.15,
		
	},

]


let gameIndex = Math.round(Math.random() * 1000) % (gameSettings.length); 
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

let debugDrawPoint = undefined;

function render(dt) {

	if(state.debugDelayFrameMillis > 0) {
		canvas.ctx.fillStyle = `rgba(255,255,255,1.0)`;
	}
	else {
		canvas.ctx.fillStyle = `rgba(255,255,255,${fps120HzCapable ? settings.fade : (settings.fade + 1.0) / 2})`;
	} 
	
	canvas.ctx.fillRect(0,0,canvas.width, canvas.height);
	
	


	canvas.ctx.fillStyle = "rgba(0,0,0,0.5)"
	
	const drawLines = true;



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

					if(state.useForceAmplituteColor && forceAmplitudeMax !== undefined && forceAmplitudeMax !== 0) {
						canvas.ctx.strokeStyle = `rgba(${ (Math.abs(point2.accelX) + Math.abs(point2.accelY) )/forceAmplitudeMax * 255},0,0,${percentageThick})`;

					}
					else{
						canvas.ctx.strokeStyle = `rgba(0,0,0,${percentageThick})`;

					}

					canvas.ctx.beginPath();
					canvas.ctx.moveTo(point1.x, point1.y);
					canvas.ctx.lineTo(point2.x, point2.y);
					canvas.ctx.stroke();
				}




			}
			
		}
	}

	canvas.ctx.fillStyle = "rgba(0,0,0,0.8)";
	if(state.usePoints) {
		for(let p = 0; p < state.points.length; p++) {
        		const point = state.points[p];
               		canvas.ctx.beginPath();
                	canvas.ctx.arc(point.x, point.y, 10, 0, settings.rad);
                	canvas.ctx.fill();
	        }

	}

	if(state.showDebugCursor) {
		canvas.ctx.fillStyle = "rgba(255,0,0,0.8)";
		canvas.ctx.beginPath();
		canvas.ctx.arc(mousePos.x, mousePos.y, 10, 0, settings.rad);
		canvas.ctx.fill();

	}
	if(debugDrawPoint !== undefined) {
		canvas.ctx.fillStyle = "rgba(0,0,255,0.8)";
		canvas.ctx.beginPath();
		canvas.ctx.arc(debugDrawPoint.x, debugDrawPoint.y, 10, 0, settings.rad);
		canvas.ctx.fill();
		debugDrawPoint = undefined;
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

function maybeRecomputeWrappedPointPositions(constantPoint, variablePoint, isAntiGrav=false) {
	let deltaX = Math.abs(constantPoint.x - variablePoint.x);
	let deltaY = Math.abs(constantPoint.y - variablePoint.y);
	let recomputedPoint = false;
	let flipX = false;
	let flipY = false;
	let newPoint = undefined;
	if(!state.useWrappedPhysics) {
		return {
			flipModifierX: 1,
			flipModifierY: 1,
			recomputedPoint
		};
	}
	const halfWidth = canvas.width / 2 + settings.offscreenBufferSize;
	const halfHeight = canvas.height / 2 + settings.offscreenBufferSize; 

	if(state.useWrappedPhysics && deltaX > halfWidth) {
		deltaX = halfWidth * 2 - deltaX;
		recomputedPoint = true;
		flipX = true;
	}
	if(state.useWrappedPhysics && deltaY > halfHeight) {
		deltaY = halfHeight * 2 - deltaY;
		recomputedPoint = true;
		flipY = true;
	}
	if(recomputedPoint) {
		const newX = flipX ? constantPoint.x + deltaX : variablePoint.x;
		const newY = flipY ? constantPoint.y + deltaY : variablePoint.y;

		// Need to do this all in one step in case an adjustment on one axis messes up the other.
		newPoint = {
			...variablePoint,
			x: newX,
			y: newY
		}

	}

	/*
		isAntiGrav | flipForce | Result
				0  |         0  |  1
				0  |		 1  | -1
				1  |         0  | -1
				1  |		 1  |  1

				This is an xor ( ^ ) output is 1 | 0
				1 * -2 + 1 = -2 + 1 = -1
				0 * -2 + 1 = 0 + 1 = 1



	*/


	const flipModifierX = flipX && variablePoint.x > constantPoint.x ? -1 : 1;// 1//-2 * (isAntiGrav ^ flipForceX) + 1;
	const flipModifierY = flipY && variablePoint.y > constantPoint.y ? -1 : 1;//-2 * (isAntiGrav ^ flipForceY) + 1;


	return {
			newPoint,
			flipModifierX,
			flipModifierY,
			recomputedPoint
		};

}

function update(dtMillis, isAntiGrav) {
	const scaledMillis = dtMillis * settings.timeScaleFactor;
	const mouseOOB = mousePos.x === undefined || mousePos.y === undefined;
	const clampedMousePos = {
		x: mouseOOB ? undefined : clamp(mousePos.x, 0, canvas.width),
		y: mouseOOB ? undefined : clamp(mousePos.y, 0, canvas.height)
	}



	const swarming = debug ? 5 : state.noise.getVal(state.lastMillis) + 40;///*Math.random() * 100 +*/ 75;
	
	if(state.useForceAmplituteColor) {
		state.forceAmplitudeMax = 0;
	}
	let pointRecomputedStatus;
	for(var p = 0; p < state.points.length; p++){
		let point = state.points[p];
		point.accelX = 0;
		point.accelY = 0;

		if(!mouseOOB && !(state.paused && state.pauseBehavior.removeCursorPhysics)) {
			pointRecomputedStatus = maybeRecomputeWrappedPointPositions(clampedMousePos, point, isAntiGrav)
			let gravPoint = pointRecomputedStatus.recomputedPoint ? pointRecomputedStatus.newPoint : point;
			// debugDrawPoint = pointRecomputedStatus.recomputedPoint ? pointRecomputedStatus.newPoint : undefined;

			
			const grav = getGravForces(gravPoint, clampedMousePos, settings.cursorMass, isAntiGrav ? 0 : settings.quantumGravityDistance, false, isAntiGrav, settings.distanceScalingFactor / 15);


			if(isAntiGrav) {
				point.accelX -= grav.x * pointRecomputedStatus.flipModifierX;
				point.accelY -= grav.y * pointRecomputedStatus.flipModifierY;
			}
			else {
				point.accelX += grav.x * pointRecomputedStatus.flipModifierX;
				point.accelY += grav.y * pointRecomputedStatus.flipModifierY;
			}
			// forceAmplitudeMax = Math.max(Math.abs(point.accelX) + Math.abs(point.accelY))

		}

		

		
		for(let j = 0; j < state.points.length; j++) {
			if(j === p ) {
				continue;
			}
			let otherPoint = state.points[j];
			pointRecomputedStatus = maybeRecomputeWrappedPointPositions(point, otherPoint, isAntiGrav);
			// otherPoint = pointRecomputedStatus.recomputedPoint ? pointRecomputedStatus.newPoint : otherPoint;

			let pointUsedForForces = pointRecomputedStatus.recomputedPoint ? pointRecomputedStatus.newPoint : otherPoint;
			
			


			if(settings.useInterpointGravity) {
				const pointGrav = getGravForces(point, pointUsedForForces, settings.pointMass, isAntiGrav ? 0 : swarming, !isAntiGrav, isAntiGrav, settings.distanceScalingFactor);


				if(isAntiGrav) {
					point.accelX -= pointGrav.x * pointRecomputedStatus.flipModifierX;
					point.accelY -= pointGrav.y * pointRecomputedStatus.flipModifierY;
				}
				else {
					point.accelX += pointGrav.x * pointRecomputedStatus.flipModifierX;
					point.accelY += pointGrav.y * pointRecomputedStatus.flipModifierY;
				}
			}

			if(settings.useSpringForces) {
				const springForces = getSpringForces(point, pointUsedForForces, settings.springLength, settings.springForce, settings.distanceScalingFactor);

				point.accelX += springForces.x * pointRecomputedStatus.flipModifierX;
				point.accelY += springForces.y * pointRecomputedStatus.flipModifierY;
			}

			// state.points[j] = otherPoint; // sync back lol

			
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
		
		forceAmplitudeMax = Math.max(Math.abs(point.accelX) + Math.abs(point.accelY))

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
				point.x = canvas.width + settings.offscreenBufferSize;
			}
			point.velX *= settings.wallFriction;

		}
		if(point.y < -settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velY) < settings.wallStoppingVel) {
				point.y = -settings.offscreenBufferSize + 1;
				point.velY *= -1;
			}
			else {
				point.y = canvas.height + settings.offscreenBufferSize ;
			}

			point.velY *= settings.wallFriction;

		}
		if(point.x > canvas.width + settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velX) < settings.wallStoppingVel) {
				point.x = canvas.width + settings.offscreenBufferSize - 1;
				point.velX *= -1;
			}
			else {
				point.x = -settings.offscreenBufferSize;
			}
			point.velX *= settings.wallFriction;

			
		}
		if(point.y > canvas.height + settings.offscreenBufferSize) {

			if(settings.wallBounces && Math.abs(point.velX) < settings.wallStoppingVel) {
				point.y = canvas.height + settings.offscreenBufferSize - 1;
				point.velY *= -1;
			}
			else {
				point.y = - settings.offscreenBufferSize;
			}
			point.velY *= settings.wallFriction;

		}

	}

}

const targetFpsRange = [60, 120] // within this range dont touch the amount of points on the screen.
let fps120HzCapable = false;
let diffPointsForFps = [];
const fpsPointStep = 5;
let goodFPSStreak = 0;
const goodFPSStreakAmount = 100;
function maybeImproveFPS(fpsAvg) {
	

	if(fpsAvg < targetFpsRange[fps120HzCapable ? 1 : 0]) {
		// remove points if fps is struggling.
		console.log("FPS: Need to remove some points");
		if(state.points.length >= fpsPointStep) {
			diffPointsForFps = [...diffPointsForFps, ...state.points.splice(0,fpsPointStep)];
		}
		else {
			state.points.splice(0,1);
		}
		goodFPSStreak = 0;

	}
	else if(fpsAvg >= targetFpsRange[fps120HzCapable ? 1 : 0] && diffPointsForFps.length > 0) {
		// Add points back in if fps allows
		goodFPSStreak++;
		if(goodFPSStreak > goodFPSStreakAmount) {
			console.log("FPS: Able to add points back in.");
			state.points = [...state.points, ...diffPointsForFps.splice(0, 1)]
			goodFPSStreak = 0;
		}
		
	}

}

let fpsWindowSize = 10;
let fpsSum = 0;
let fpsWindow = [];
let tickNum = 0;
let shownFps = undefined;
const maxMillisPerTick = 100;
function tick(timeMillis) {
	
	state.timeMillis = timeMillis;
	if(state.lastMillis === undefined) {
		state.lastMillis = timeMillis;
	}
	if(state.debugDelayFrameMillis > 0){
		state.lastMillis = timeMillis -10;
	}
	const dtMillis = clamp(state.timeMillis - state.lastMillis, 0, maxMillisPerTick);

	isAntiGrav = state.antiGravMillis > 0;
	state.antiGravMillis -= dtMillis;

	state.velX *= state.velFriction;
	state.velY *= state.velFriction;

	update(dtMillis, isAntiGrav);
	render();

	let fpsAvg = undefined;
	if(dtMillis > 0) {
		const fps = 1000.0 / dtMillis;
		fpsWindow.push(fps);
		fpsSum += fps;
		if(fpsWindow.length > fpsWindowSize) {
			const bootedFpsNum = fpsWindow.splice(0,1)[0];
			fpsSum -= bootedFpsNum;
		}

		fpsAvg = Math.round(fpsSum / fpsWindow.length * 100) / 100;
		if(fpsAvg >= targetFpsRange[1]) {
			fps120HzCapable = true;


		}
		if(tickNum % 100 === 0) {
			shownFps = fpsAvg;
		}

		if(state.showFpsCounter && shownFps !== undefined) {
			canvas.ctx.fillStyle = "teal";
			canvas.ctx.fontStyle = "bold 48px serif";
			canvas.ctx.fillText(fpsAvg, 10, 10);
		}
	}
	
	if(state.performFPSAdjustments && fpsAvg !== undefined && tickNum % 10 === 0) {
		// Here we can add / remove points from the simulation accoring to device performance.
		maybeImproveFPS(fpsAvg)
	}


	state.lastMillis = state.timeMillis;

	tickNum++;

	if(!(state.paused && state.pauseBehavior.cancelAnimation)){
		if(state.debugDelayFrameMillis > 0) {
			window.setTimeout(()=>{
				window.requestAnimationFrame(tick);
			}, state.debugDelayFrameMillis);
		}
		else{
			window.requestAnimationFrame(tick);

		}
	}
	

}


const debug = false;
const state = {
	lastMillis: undefined,
	points: [],
	antiGravMillis: 0,
	noise: window.Simple1DNoise(100, 0.002),
	cursorPos: undefined,
	loopId: undefined,
	velX: debug ? 0 : (Math.random() - 0.5) * 5,
	velY: debug ? 0 : -10,
	velFriction: 0.99,
	forcesEnabled: true,
	showFpsCounter: true,
	showDebugCursor: debug,
	useWrappedPhysics: true,
	usePoints: debug ? true : Math.random() > 0.7, // more likely than not to not get points
	useForceAmplituteColor: false,
	forceAmplitudeMax: undefined,
	paused:true,
	pauseBehavior: {
		cancelAnimation: false,
		removeCursorPhysics: true
	},
	debugDelayFrameMillis: 0,
	performFPSAdjustments: !debug

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
	window.addEventListener('click', debounce(click, 30, false), false);


	state.paused = false;
	state.loopId = window.requestAnimationFrame(tick);
}

function pause() {
	state.paused = true;
	if(state.loopId !== undefined && state.pauseBehavior.cancelAnimation) {
		// window.cancelAnimationFrame(state.loopId);
		// state.loopId = undefined;
		// state.lastMillis = undefined;
	}

}
function resume() {
	state.paused = false;
	if(state.pauseBehavior.cancelAnimation) {
		state.loopId = window.requestAnimationFrame(tick);

	}
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
		// state.forcesEnabled = false;
		leaveTimer = window.setTimeout(()=>{pause()}, 250);

	});

	document.addEventListener("mouseenter", function(event){
		if(leaveTimer !== undefined) {
			window.clearTimeout(leaveTimer);
			leaveTimer = undefined;
		}
		state.forcesEnabled = true;
		resume();
	});

	const touchState = {
		inTouch: false,
	}

	const onTouch = (touchEvent) => {
		if(touchEvent.touches.length == 0) {
			console.log("no touch")
			mousePos.x = undefined;
			mousePos.y = undefined;
			return;
		}
		var touch = touchEvent.touches[0];// || touchEvent.changedTouches[0];
		mousePos.x = touch.clientX;
		mousePos.y = touch.clientY;
		console.log("touch")

	}

	document.addEventListener("touchmove", onTouch);
	document.addEventListener("touchstart", onTouch);
	document.addEventListener("touchend", onTouch);

	document.getElementById('changeMode').addEventListener('click', () => {

		gameIndex = (gameIndex + 1) % gameSettings.length;
		settings = {...commonSettings, ...gameSettings[gameIndex]};

		console.log("changeMode", settings.name);
		createMessage(`Mode: <b>${settings.name}</b>`);
	})

	document.getElementById('closeButton').addEventListener('click', () => {
		document.getElementById('mainPage').style.display = 'none';
	})




	startAnim();

}
