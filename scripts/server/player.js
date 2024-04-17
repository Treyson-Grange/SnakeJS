// ------------------------------------------------------------------
//
// Nodejs module that represents the model for a player.
//
// ------------------------------------------------------------------
"use strict";

let random = require("./random");
let Body = require("./body");
//------------------------------------------------------------------
//
// Public function used to initially create a newly connected player
// at some random location.
//
//------------------------------------------------------------------
function createPlayer() {
  let that = {};

  let position = {
    x: random.nextDouble(),
    y: random.nextDouble(),
  };

  let size = {
    width: 0.05,
    height: 0.05,
  };
  let direction = random.nextDouble() * 2 * Math.PI; // Angle in radians
  let rotateRate = Math.PI / 1000; // radians per millisecond
  let speed = 0.0002; // unit distance per millisecond
  let reportUpdate = false; // Indicates if this model was updated during the last update
  let segments = [];

  Object.defineProperty(that, "direction", {
    get: () => direction,
  });

  Object.defineProperty(that, "position", {
    get: () => position,
  });

  Object.defineProperty(that, "size", {
    get: () => size,
  });

  Object.defineProperty(that, "speed", {
    get: () => speed,
  });

  Object.defineProperty(that, "rotateRate", {
    get: () => rotateRate,
  });

  Object.defineProperty(that, "reportUpdate", {
    get: () => reportUpdate,
    set: (value) => (reportUpdate = value),
  });
  Object.defineProperty(that, "segments", {
    get: () => segments,
  });

  that.addBodyPart = function (elapsedTime) {
    reportUpdate = true;
    let newSnakePart = Body.createBody();
    segments.push(newSnakePart);
  };

  //------------------------------------------------------------------
  //
  // Moves the player forward based on how long it has been since the
  // last move took place.
  //
  //------------------------------------------------------------------
  that.move = function (elapsedTime) {
    reportUpdate = true;
    let vectorX = Math.cos(direction);
    let vectorY = Math.sin(direction);

    position.x += vectorX * elapsedTime * speed;
    position.y += vectorY * elapsedTime * speed;
    for (let i = 1; i < segments.length; i++) {
      segments[i].follow(
        elapsedTime,
        segments[i - 1].position,
        segments[i - 1].direction
      );
    }
  };

  //------------------------------------------------------------------
  //
  // Rotates the player right based on how long it has been since the
  // last rotate took place.
  //
  //------------------------------------------------------------------
  that.rotateRight = function (elapsedTime) {
    reportUpdate = true;
    direction += rotateRate * elapsedTime;
  };
  function rotateRight(elapsedTime) {
    reportUpdate = true;
    direction += rotateRate * elapsedTime;
  }

  //------------------------------------------------------------------
  //
  // Rotates the player left based on how long it has been since the
  // last rotate took place.
  //
  //------------------------------------------------------------------
  that.rotateLeft = function (elapsedTime) {
    reportUpdate = true;
    direction -= rotateRate * elapsedTime;
  };

  //------------------------------------------------------------------
  //
  // Functions that given input, change the prefered direction
  // of the player
  //
  //------------------------------------------------------------------
  that.goUp = function (elapsedTime) {
    if (direction == Math.PI / 2) {
      return;
    }
    reportUpdate = true;
    direction = -Math.PI / 2;
  };
  that.goDown = function (elapsedTime) {
    if (direction == -Math.PI / 2) {
      return;
    }
    reportUpdate = true;
    direction = Math.PI / 2;
  };
  that.goRight = function (elapsedTime) {
    if (direction == Math.PI) {
      return;
    }
    reportUpdate = true;
    direction = 0;
  };
  that.goLeft = function (elapsedTime) {
    if (direction == 0) {
      return;
    }
    reportUpdate = true;
    direction = Math.PI;
  };

  //------------------------------------------------------------------
  //
  // Function used to update the player during the game loop.
  //
  //------------------------------------------------------------------
  let updateRotateRate = 5000000;
  that.update = function (when) {};

  return that;
}

module.exports.create = () => createPlayer();
