// WebGL - 2D Rectangles
// from https://webglfundamentals.org/webgl/webgl-2d-rectangles.html

  "use strict";

var designerMode = false;
var gameId = null;
var socket;
var socketIsOpen = false;
var socket;
var gameStarted = false;
var gl;
var program;
var firstFrame = false;
var lastTime = 0;
var positionAttributeLocation;
var resolutionUniformLocation;
var colorUniformLocation;
var positionBuffer;


var splashElement = {
  slices: 30,
  radius: 50,
  position: {
    x: 200,
    y: 200,
  },
};

var field = {
  border: {
    color: { 
      r: 0, 
      g: 0,  
      b: 0 
    },
    thickness: 10,
  },
  height: 250,
  width: 200,
  position: {
    x: 20,
    y: 10,
  },
};

var puck = {
  position: {
    x: 0,
    y: 0,
  },
  velocity: {
    x: Math.random() * 200,
    y: 50 + (Math.random() * 200),
  },
  config: {
    width: 30,
    height: 30,
    color: {
      r: 0,
      g: 0,
      b: 0,
    },
    initialVelocity: {
      x: 0,
      y: 0,
    },
  }
};

var lowerPaddle = {
  position: {
    x: 0,
    y: 0,
  },
  height: 5,
  width: 120,
  moveSize: 20,
};

var upperPaddle = {
   position: {
    x: 0,
    y: 0,
  },
  height: 5,
  width: 120, 
  moveSize: 20,
};

function getPuckConfig() {
  if (designerMode) {
    return {
      width: parseFloat(document.getElementById("puckWidth").value),
      height: parseFloat(document.getElementById("puckHeight").value),
      color: {
        r: parseFloat(document.getElementById("puckColorR").value),
        g: parseFloat(document.getElementById("puckColorG").value),
        b: parseFloat(document.getElementById("puckColorB").value),
      },
      initialVelocity: {
        x: 0,
        y: 0,
      },
    }; }

  return {
    width: 10,
    height: 10,
    color: {
      r: 0,
      g: 0,
      b: 0,
    },
    initialVelocity: {
      x: 100,
      y: 0,
    },
  };
}

function getFieldConfig() {
  if (designerMode) {
    return {
      border: {
        color: { 
          r: parseFloat(document.getElementById("borderColorR").value), 
          g: parseFloat(document.getElementById("borderColorG").value),  
          b: parseFloat(document.getElementById("borderColorB").value),
      },
      thickness: parseFloat(document.getElementById("borderThickness").value),
      },
      height: parseFloat(document.getElementById("fieldHeight").value),
      width: parseFloat(document.getElementById("fieldWidth").value),
      position: {
        x: parseFloat(document.getElementById("fieldPositionX").value),
        y: parseFloat(document.getElementById("fieldPositionY").value),
      },
    };
  }
  
  return {
    border: {
      color: { 
        r: 0, 
        g: 0,  
        b: 0 
      },
      thickness: 10,
    },
    height: 400,
    width: 300,
    position: {
      x: 50,
      y: 50,
    },
  };
}

function initializePuck() {
  var fieldConfig = getFieldConfig();
  puck.position.x = fieldConfig.position.x + (fieldConfig.width / 2);
  puck.position.y = fieldConfig.position.y + (fieldConfig.height / 2);
}

// return a new puck whose position and velocity have been
// calculated based on the current state and timeDelta
function movePuck(puck, fieldConfig, timeDelta) {

  var next = {
    x: puck.position.x + (puck.velocity.x * timeDelta),
    y: puck.position.y + (puck.velocity.y * timeDelta)
  };
  if (puck.position.x == next.x &&
      puck.position.y == next.y) {
    // no movement detected
    return puck;
  }

  var currentPuckLeft = puck.position.x - (puck.config.width / 2);
  var currentPuckRight = puck.position.x + (puck.config.width / 2);
  var currentPuckTop = puck.position.y - (puck.config.height / 2);
  var currentPuckBottom = puck.position.y + (puck.config.height / 2);
  var nextPuckLeft = next.x - (puck.config.width / 2);
  var nextPuckRight = next.x + (puck.config.width / 2);
  var nextPuckTop = next.y - (puck.config.height / 2);
  var nextPuckBottom = next.y + (puck.config.height / 2);

  // check for intersection with left border
  var collideLeftBorder = (puck.velocity.x < 0)
  && (doLineSegmentsIntersect(
    {x:currentPuckLeft,y:currentPuckTop},
    {x:nextPuckLeft,y:nextPuckTop},
    {x:fieldConfig.position.x,y:fieldConfig.position.y},
    {x:fieldConfig.position.x,y:fieldConfig.position.y + fieldConfig.height}
  ) || doLineSegmentsIntersect(
    {x:currentPuckLeft,y:currentPuckBottom},
    {x:nextPuckLeft,y:nextPuckBottom},
    {x:fieldConfig.position.x,y:fieldConfig.position.y},
    {x:fieldConfig.position.x,y:fieldConfig.position.y + fieldConfig.height}   
  ));
  if (collideLeftBorder) {
    var overlap = fieldConfig.position.x - nextPuckLeft;
    next.x += overlap;
    puck.velocity.x *= -1;
  }
  
  // check for intersection with right border
  var collideRightBorder = (puck.velocity.x > 0)
  && (doLineSegmentsIntersect(
    {x:currentPuckRight,y:currentPuckTop},
    {x:nextPuckRight,y:nextPuckTop},
    {x:fieldConfig.position.x + fieldConfig.width,y:fieldConfig.position.y},
    {x:fieldConfig.position.x + fieldConfig.width,y:fieldConfig.position.y + fieldConfig.height}
  ) || doLineSegmentsIntersect(
    {x:currentPuckRight,y:currentPuckBottom},
    {x:nextPuckRight,y:nextPuckBottom},
    {x:fieldConfig.position.x + fieldConfig.width,y:fieldConfig.position.y},
    {x:fieldConfig.position.x + fieldConfig.width,y:fieldConfig.position.y + fieldConfig.height}   
  ));
  if (collideRightBorder) {
    var overlap = nextPuckRight - fieldConfig.position.x - fieldConfig.width;
    next.x -= overlap;
    puck.velocity.x *= -1;
  }

  // check for intersection with upper paddle
  var collideUpperPaddle = (puck.velocity.y < 0)
  && (doLineSegmentsIntersect(
    {x:currentPuckLeft,y:currentPuckTop},
    {x:nextPuckLeft,y:nextPuckTop},
    {x:upperPaddle.position.x - (upperPaddle.width / 2),y:upperPaddle.position.y + (upperPaddle.height / 2)},
    {x:upperPaddle.position.x + (upperPaddle.width / 2),y:upperPaddle.position.y + (upperPaddle.height / 2)}
  ) || doLineSegmentsIntersect(
    {x:currentPuckRight,y:currentPuckTop},
    {x:nextPuckRight,y:nextPuckTop},
    {x:upperPaddle.position.x - (upperPaddle.width / 2),y:upperPaddle.position.y + (upperPaddle.height / 2)},
    {x:upperPaddle.position.x + (upperPaddle.width / 2),y:upperPaddle.position.y + (upperPaddle.height / 2)}
  ));
  if (collideUpperPaddle) {
    var overlap = upperPaddle.position.y + (upperPaddle.height / 2) - nextPuckTop;
    next.y -= overlap;
    puck.velocity.y *= -1;
  }

  // check for intersection with lower paddle
  var collideLowerPaddle = (puck.velocity.y > 0)
  && (doLineSegmentsIntersect(
    {x:currentPuckLeft,y:currentPuckBottom},
    {x:nextPuckLeft,y:nextPuckBottom},
    {x:lowerPaddle.position.x - (lowerPaddle.width / 2),y:lowerPaddle.position.y - (lowerPaddle.height / 2)},
    {x:lowerPaddle.position.x + (lowerPaddle.width / 2),y:lowerPaddle.position.y - (lowerPaddle.height / 2)}
  ) || doLineSegmentsIntersect(
    {x:currentPuckRight,y:currentPuckBottom},
    {x:nextPuckRight,y:nextPuckBottom},
    {x:lowerPaddle.position.x - (lowerPaddle.width / 2),y:lowerPaddle.position.y - (lowerPaddle.height / 2)},
    {x:lowerPaddle.position.x + (lowerPaddle.width / 2),y:lowerPaddle.position.y - (lowerPaddle.height / 2)}
  ));
  if (collideLowerPaddle) {
    var overlap = lowerPaddle.position.y - (lowerPaddle.height / 2) - nextPuckBottom;
    next.y -= overlap;
    puck.velocity.y *= -1;
  }

  // move puck
  puck.position.y = next.y;
  puck.position.x = next.x;

  return puck;
}

function initializeLowerPaddle() {
  var fieldConfig = getFieldConfig();
  lowerPaddle.position.x = fieldConfig.position.x + (fieldConfig.width / 2);
  lowerPaddle.position.y = fieldConfig.position.y + fieldConfig.height - (lowerPaddle.height / 2);
}

function initializeUpperPaddle() {
  var fieldConfig = getFieldConfig();
  upperPaddle.position.x = fieldConfig.position.x + (fieldConfig.width / 2);
  upperPaddle.position.y = fieldConfig.position.y + (upperPaddle.height / 2); 
}

function handleKeyPress(e) {
  if (e.type == 'keydown') {
    if (e.key == 'ArrowLeft') {
      e.preventDefault();
      lowerPaddle.position.x -= lowerPaddle.moveSize;
      socket.send(JSON.stringify({
        clientName: document.getElementById("userName").value,
        direction: "Left",
        distance: lowerPaddle.moveSize
      }));
    } else if (e.key == 'ArrowRight') {
      e.preventDefault();
      lowerPaddle.position.x += lowerPaddle.moveSize;
      socket.send(JSON.stringify({
        clientName: document.getElementById("userName").value,
        direction: "Right",
        distance: lowerPaddle.moveSize
      }));
   } else if (e.key == 'a') {
      upperPaddle.position.x -= upperPaddle.moveSize;
    } else if (e.key == 'd') {
      upperPaddle.position.x += upperPaddle.moveSize;
    }
  }
}

function handleMoveMsg(move) {
  if (move.clientName != document.getElementById("userName").value){
    if (move.direction == 'Left') {
      upperPaddle.Position += move.distance;
    }
    console.log("handling move message!");
  }
}

/**
 * @author Peter Kelley
 * @author pgkelley4@gmail.com
 */

/**
 * See if two line segments intersect. This uses the 
 * vector cross product approach described below:
 * http://stackoverflow.com/a/565282/786339
 * 
 * @param {Object} p point object with x and y coordinates
 *  representing the start of the 1st line.
 * @param {Object} p2 point object with x and y coordinates
 *  representing the end of the 1st line.
 * @param {Object} q point object with x and y coordinates
 *  representing the start of the 2nd line.
 * @param {Object} q2 point object with x and y coordinates
 *  representing the end of the 2nd line.
 */
function doLineSegmentsIntersect(p, p2, q, q2) {
	var r = subtractPoints(p2, p);
	var s = subtractPoints(q2, q);

	var uNumerator = crossProduct(subtractPoints(q, p), r);
	var denominator = crossProduct(r, s);

	if (uNumerator == 0 && denominator == 0) {
		// They are coLlinear
		
		// Do they touch? (Are any of the points equal?)
		if (equalPoints(p, q) || equalPoints(p, q2) || equalPoints(p2, q) || equalPoints(p2, q2)) {
			return true
		}
		// Do they overlap? (Are all the point differences in either direction the same sign)
		return !allEqual(
				(q.x - p.x < 0),
				(q.x - p2.x < 0),
				(q2.x - p.x < 0),
				(q2.x - p2.x < 0)) ||
			!allEqual(
				(q.y - p.y < 0),
				(q.y - p2.y < 0),
				(q2.y - p.y < 0),
				(q2.y - p2.y < 0));
	}

	if (denominator == 0) {
		// lines are paralell
		return false;
	}

	var u = uNumerator / denominator;
	var t = crossProduct(subtractPoints(q, p), s) / denominator;

	return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
}

/**
 * Calculate the cross product of the two points.
 * 
 * @param {Object} point1 point object with x and y coordinates
 * @param {Object} point2 point object with x and y coordinates
 * 
 * @return the cross product result as a float
 */
function crossProduct(point1, point2) {
	return point1.x * point2.y - point1.y * point2.x;
}

/**
 * Subtract the second point from the first.
 * 
 * @param {Object} point1 point object with x and y coordinates
 * @param {Object} point2 point object with x and y coordinates
 * 
 * @return the subtraction result as a point object
 */ 
function subtractPoints(point1, point2) {
	var result = {};
	result.x = point1.x - point2.x;
	result.y = point1.y - point2.y;

	return result;
}

/**
 * See if the points are equal.
 *
 * @param {Object} point1 point object with x and y coordinates
 * @param {Object} point2 point object with x and y coordinates
 *
 * @return if the points are equal
 */
function equalPoints(point1, point2) {
	return (point1.x == point2.x) && (point1.y == point2.y)
}

/**
 * See if all arguments are equal.
 *
 * @param {...} args arguments that will be compared by '=='.
 *
 * @return if all arguments are equal
 */
function allEqual(args) {
	var firstValue = arguments[0],
		i;
	for (i = 1; i < arguments.length; i += 1) {
		if (arguments[i] != firstValue) {
			return false;
		}
	}
	return true;
}

function enterGame() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  window.addEventListener("keydown", handleKeyPress);
  var canvas = document.getElementById("canvas");
  canvas.focus();
  gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  program = webglUtils.createProgramFromScripts(gl, ["2d-vertex-shader", "2d-fragment-shader"]);

  // look up where the vertex data needs to go.
  positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  colorUniformLocation = gl.getUniformLocation(program, "u_color");

  // Create a buffer to put three 2d clip space points in
  positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  initializePuck();
  initializeLowerPaddle();
  initializeUpperPaddle();
  //drawSplash();
  getDrawScene(false)();



  function drawSplash() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    
    //// draw field ////
  
    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
  
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
  
    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset)
  
    // set the resolution
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
  
    //// splash element ////
    setCircle(
        gl, 
        splashElement.position.x,
        splashElement.position.y,
        splashElement.radius,
        splashElement.slices
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      0,
      0,
      0,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLE_FAN;
    var offset = 0;
    var count = splashElement.slices;
    gl.drawArrays(primitiveType, offset, count);
  }
}

function getDrawScene(animate) {
  function drawScene(time) {
    if (animate && firstFrame) {
      lastTime = time;
      firstFrame = false;
    }
    var timeDelta = 0;
    if (typeof time != 'undefined' && gameStarted) {
      var seconds = time / 1000; 
      timeDelta = seconds - lastTime;
      lastTime = seconds;
    }
  
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    
    //// draw field ////
  
    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
  
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
  
    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset)
  
    // set the resolution
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    
    var fieldConfig = getFieldConfig();
    //// left border ////
    setRectangle(
        gl,  
        fieldConfig.position.x - fieldConfig.border.thickness, 
        fieldConfig.position.y, 
        fieldConfig.border.thickness, 
        fieldConfig.height,
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      fieldConfig.border.color.r,
      fieldConfig.border.color.g,
      fieldConfig.border.color.b,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  
    //// right border ////
    setRectangle(
        gl, 
        fieldConfig.position.x + fieldConfig.width,
        fieldConfig.position.y,
        fieldConfig.border.thickness,
        fieldConfig.height,
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      fieldConfig.border.color.r,
      fieldConfig.border.color.g,
      fieldConfig.border.color.b,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  
    //// puck ////
    puck.config = getPuckConfig();
    puck = movePuck(puck, fieldConfig, timeDelta);
    setRectangle(
        gl, 
        puck.position.x - (puck.config.width / 2),
        puck.position.y - (puck.config.height / 2),
        puck.config.width,
        puck.config.height,
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      puck.config.color.r,
      puck.config.color.g,
      puck.config.color.b,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  
    //// lower paddle ////
    setRectangle(
        gl, 
        lowerPaddle.position.x - (lowerPaddle.width / 2),
        lowerPaddle.position.y - (lowerPaddle.height / 2),
        lowerPaddle.width,
        lowerPaddle.height,
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      0,
      0,
      0,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  
    //// upper paddle ////
    setRectangle(
        gl, 
        upperPaddle.position.x - (upperPaddle.width / 2),
        upperPaddle.position.y - (upperPaddle.height / 2),
        upperPaddle.width,
        upperPaddle.height,
    );
  
    // set color
    gl.uniform4f(
      colorUniformLocation, 
      0,
      0,
      0,
      1);
  
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  
    // Call drawScene again next frame
    if (gameStarted) {
      requestAnimationFrame(drawScene);
    }
  }
  return drawScene;
}

// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}

// Fill the buffer with the values that define a rectangle.
function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

function setCircle(gl, x, y, r, slices) {
  var coords = new Float32Array(slices);

  coords[0] = x;
  coords[1] = y;
  for (var i = 2; i < slices; ++i) {
    var theta = (2 * Math.PI) / slices;
    coords[i] = x + (r * Math.cos(theta * i));
    coords[i+1] = y + (r * Math.cos(theta * i));
  }
  console.log(coords.toString());

  gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
}

function establishSocketConnection() {
  socket = new WebSocket("ws://localhost:9160");
  socket.onmessage = handleMessage;
  console.log("Requested socket connection.");
  socket.onopen = function (event) {
    console.log("Connection established.");
  };
  socket.onerror = function (event) {
    console.log(event.data);
  };
  socket.onclose = function (event) {
    console.log(event.data);
  };
}

function startGame() {
  gameStarted = true;
  getDrawScene(gameStarted)();
}

function requestNewGame() {
  if (socket.readyState != 1) {
    alert("Connection to server lost.");
    return;
  }
  socket.send(JSON.stringify({
    messageType: "NewGameReqMsg",
    userName: document.getElementById("userName").value,
    gameName: document.getElementById("gameName").value
  }));
}

function requestJoinGame() {
  if (socket.readyState != 1) {
    alert("Connection to server lost.");
    return;
  }
  socket.send(JSON.stringify({
    messageType: "JoinGameReqMsg",
    userName: document.getElementById("userName").value,
    gameName: document.getElementById("gameName").value
  })); 
}

function requestStartGame() {
  if (socket.readyState != 1) {
    alert("Connection to server lost.");
    return;
  }
  socket.send(JSON.stringify({
    messageType: "StartGameReqMsg",
    gameName: document.getElementById("gameName").value
  }));
}

function handleMessage(event) {
  var msg = JSON.parse(event.data);
  switch (msg.messageType) {
    case "NewGameResMsg":
      console.log("NewGameResMsg received: " + msg.result);
      if (msg.result == "GameCreated") {
        enterGame();
      } else {
        alert("Failed to create game with exception: " + msg.result);
      }
      break;
    case "JoinGameResMsg":
      console.log("JoinGameResMsg received: " + msg.result);
      if (msg.result == "JoinedGame") {
        enterGame();
      } else {
        alert("Failed to join game with exception: " + msg.result);
      }
    case "StartGameMsg":
      console.log("StartGame message received");
      startGame();
      break;
    case "MoveMsg":
      console.log("Move message received");
      handleMoveMsg(msg)
      break;
    default:
      console.log("Message received: " + event.data);
  }
}

window.onload = establishSocketConnection;
