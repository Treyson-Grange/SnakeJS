// ------------------------------------------------------------------
//
// Nodejs module that provides the server-side game model.
//
// ------------------------------------------------------------------
"use strict";

let present = require("present");
let random = require("./random");
let Player = require("./player");
let Food = require("./food");

const WORLD_SIZE = 4; // Both x and y
const WALL_SIZE = { length: 0.5, width: 0.1 };

const UPDATE_RATE_MS = 50;
let quit = false;
let activeClients = {};
let inputQueue = [];

let playerNames = {};

let foodCount = 100;

let foodSOA = Food.create(foodCount);
for (let i = 0; i < foodCount; i++) {
  let X = random.nextDouble() * WORLD_SIZE; // 4 becauase the map size is 4
  if (X < 0.2) {
    X += 0.2;
  } else if (X > 3.8) {
    X -= 0.2;
  }
  foodSOA.positionsX[i] = X;
}

for (let i = 0; i < foodCount; i++) {
  let Y = random.nextDouble() * WORLD_SIZE;
  if (Y < 0.2) {
    Y += 0.2;
  } else if (Y > 3.8) {
    Y -= 0.2;
  }
  foodSOA.positionsY[i] = Y;
}

let bigFood = new Array(foodCount).fill(false);

// fill sprite sheet indices with random indices; so basically pick random sprite sheet to generate :)
for (let i = 0; i < foodSOA.spriteSheetIndices.length; i++) {
  foodSOA.spriteSheetIndices[i] = random.nextRange(0, 5); // amount of sprites is hardcoded
}

// function disablePlayer(player) {

// }

function turnBodyIntoFood(player, client, clientId) {
  for (let i = player.segments.length - 1; i >= 0; i--) {
    let newFoodLocation = player.segments[i].position;
    foodSOA.bigFood.push(true); // tell the foodSOA that the following food is a big food
    foodSOA.positionsX.push(newFoodLocation.x);
    foodSOA.positionsY.push(newFoodLocation.y);
    foodSOA.spriteSheetIndices.push(random.nextRange(0, 5)); // amount of sprites is hardcoded
    foodSOA.reportUpdates.push(true);
    client.socket.emit("remove-segment", i); // tell the client to remove that segment

    // Notify other clients that the player's body is gone
    for (let otherId in activeClients) {
      if (otherId !== clientId) {
        activeClients[otherId].socket.emit("remove-full-body-other", clientId);
      }
    }
  }
  player.segments = []; //player still dies when it hits a head lol
}

//------------------------------------------------------------------
//
// Utility function to perform a hit test between player and food.  The
// objects must have a position: { x: , y: } property and radius property.
//
//------------------------------------------------------------------
function playerFoodCollided(player, food) {
  if (player.isActive) {
    let distance = Math.sqrt(
      Math.pow(player.position.x - food.position.x, 2) +
      Math.pow(player.position.y - food.position.y, 2)
    );
    let radii = player.radius + food.radius;

    return distance <= radii;
  } else {
    return false;
  }
}

//------------------------------------------------------------------
//
// Utility function to perform a hit test between player and wall.  The
// objects must have a position: { x: , y: } property
//
//------------------------------------------------------------------
function playerWallCollided(playerPos, player) {
  if (player.isActive) {
    let hitWall = false;

    let halfWallWidth = WALL_SIZE.width / 2;

    if (
      playerPos.x < 0 + halfWallWidth ||
      playerPos.x > WORLD_SIZE - halfWallWidth
    ) {
      hitWall = true;
    } else if (
      playerPos.y < 0 + halfWallWidth ||
      playerPos.y > WORLD_SIZE - halfWallWidth
    ) {
      hitWall = true;
    }

    return hitWall;
  } else {
    return false;
  }
}

//------------------------------------------------------------------
//
// Utility function to perform a hit test between one player's head and another player.  The
// objects must have a position: { x: , y: } property and radius property.
//
//------------------------------------------------------------------
function playerPlayerCollided(player1, player2) {
  if (player1.isActive && player2.isActive) {
    let distance = Math.sqrt(
      Math.pow(player1.position.x - player2.position.x, 2) +
      Math.pow(player1.position.y - player2.position.y, 2)
    );
    let radii = player1.radius + player2.radius;
    if (distance <= radii) {
      return true;
    } else {
      if (player2.segments !== undefined) {
        for (let i = 0; i < player2.segments.length; i++) {
          let distance = Math.sqrt(
            Math.pow(player1.position.x - player2.segments[i].position.x, 2) +
            Math.pow(player1.position.y - player2.segments[i].position.y, 2)
          );
          let radii = player1.radius + player2.radius;
          if (distance <= radii) {
            return true;
          }
        }
      } else {

      }
      return false;
    }
  }
}

//------------------------------------------------------------------
//
// Utility function to perform a test for all collisions.
//
//------------------------------------------------------------------
function checkAllCollisions() {
  // for every player
  for (let clientId in activeClients) {
    let client = activeClients[clientId];
    let player = client.player;

    if (player.isActive) {
      // if the player is "alive" for this round
      let playerSpec = {
        radius: player.size.width / 2,
        position: player.position,
        isActive: client.isAlive,
        segments: player.segments,
      };

      // check for player v food collisions
      for (let i = 0; i < foodSOA.positionsX.length; i++) {
        let foodSize = foodSOA.size;

        // update the size to be bigger if it's a piece of big food
        if (foodSOA.bigFood[i]) {
          foodSize = foodSOA.size;
        }

        // create food obj for collision detection
        let foodPiece = {
          radius: foodSize.width / 2,
          position: { x: foodSOA.positionsX[i], y: foodSOA.positionsY[i] },
        };

        // check for collision
        if (playerFoodCollided(playerSpec, foodPiece)) {
          client.socket.emit("hit-food", {
            x: foodSOA.positionsX[i],
            y: foodSOA.positionsY[i],
          });
          player.addBodyPart();

          player.points += 1;
          // "eat" food by relocating it somewhere else in the map
          let newPosX = random.nextDouble() * 4;
          let newPosY = random.nextDouble() * 4;

          // if it's big food, just remove it from all the lists
          if (foodSOA.bigFood[i]) {
            foodSOA.bigFood.splice(i, 1);
            foodSOA.positionsX.splice(i, 1);
            foodSOA.positionsY.splice(i, 1);
            foodSOA.spriteSheetIndices.splice(i, 1);
            foodSOA.reportUpdates.splice(i, 1);
          } else {
            // tell the food to re-locate if it's small
            foodSOA.relocateFood(i, newPosX, newPosY);
            foodSOA.reportUpdates[i] = true;
          }

          client.socket.emit("update-points", player.points);

          client.socket.emit("add-body-part", "");

          // Notify other clients that a part should be added
          for (let otherId in activeClients) {
            if (otherId !== clientId) {
              let data = {
                clientId: clientId,
                numParts: player.segments.length,
              };
              activeClients[otherId].socket.emit("add-body-other", data);
            }
          }
        }
      }

      if (client.elapsedTime > 5000) {
        // player is invincible for the first 5 seconds

        // check for player v wall collisions
        if (
          playerWallCollided(
            { x: player.position.x, y: player.position.y },
            playerSpec
          )
        ) {
          client.socket.emit("hit-head", {
            x: player.position.x,
            y: player.position.y,
          });
          client.socket.emit("game-over");
          client.isAlive = false;
          turnBodyIntoFood(player, client, clientId);
        }

        // check for player v player collisions
        for (let otherId in activeClients) {
          if (otherId !== clientId) {
            let otherClient = activeClients[otherId];
            let otherPlayer = otherClient.player;

            let otherPlayerSpec = {
              radius: otherPlayer.size.width / 2,
              position: otherPlayer.position,
              isActive: otherPlayer.isActive,
              segments: otherPlayer.segments,
            };

            if (playerPlayerCollided(playerSpec, otherPlayerSpec)) {
              if (otherClient.isAlive) {
                client.socket.emit("hit-head", {
                  x: player.position.x,
                  y: player.position.y,
                });
                client.socket.emit("game-over");
                client.isAlive = false;
                turnBodyIntoFood(player, client, clientId);
              }

              otherPlayer.kills = otherPlayer.kills + 1;
              otherClient.socket.emit("add-kill", 1);
            }
          }
        }
      }
    }
  }
}
//------------------------------------------------------------------
//
//    Update the scoreboard for all connected clients
//
//------------------------------------------------------------------
function updateScoreBoard() {
  let scores = [];
  for (let clientId in activeClients) {
    scores.push({
      clientId: clientId,
      points: activeClients[clientId].player.points,
    });
  }
  scores.sort((a, b) => b.points - a.points);
  for (let clientId in activeClients) {
    activeClients[clientId].socket.emit("update-scores", scores);
  }
}

//------------------------------------------------------------------
//
// Process the network inputs we have received since the last time
// the game loop was processed.
//
//------------------------------------------------------------------
function processInput() {
  //
  // Double buffering on the queue so we don't asynchronously receive inputs
  // while processing.
  let processMe = inputQueue;
  inputQueue = [];

  for (let inputIndex in processMe) {
    let input = processMe[inputIndex];
    let client = activeClients[input.clientId];
    if (client === undefined) {
      //Since it is possible that there is still input in the queue for a client that has disconnected we need to check heres
      continue;
    }
    client.lastMessageId = input.message.id;
    switch (input.message.type) {
      case "move":
        client.player.move(input.message.elapsedTime);
        break;
      case "up":
        client.player.goUp(input.message.elapsedTime);
        break;
      case "down":
        client.player.goDown(input.message.elapsedTime);
        break;
      case "right":
        client.player.goRight(input.message.elapsedTime);
        break;
      case "left":
        client.player.goLeft(input.message.elapsedTime);
        break;
      case "test":
        client.player.goRight(input.message.elapsedTime);
        break;
      // case "addBodyPart":         //  This is commented out because the player should not be allowed to tell the server to add parts.
      //   client.player.addBodyPart(input.message.elapsedTime);
      //   break;
    }
  }
}

//------------------------------------------------------------------
//
// Update the simulation of the game.
//
//------------------------------------------------------------------
function update(elapsedTime, currentTime) {
  for (let clientId in activeClients) {
    activeClients[clientId].player.update(elapsedTime); // this does nothing rn
  }
  for (let clientId in activeClients) {
    activeClients[clientId].elapsedTime += elapsedTime;
  }
  checkAllCollisions();
  updateScoreBoard();
}

//------------------------------------------------------------------
//
// Send state of the game to any connected clients.
//
//------------------------------------------------------------------
function updateClients(elapsedTime) {
  for (let clientId in activeClients) {
    let client = activeClients[clientId];
    let update = {
      clientId: clientId,
      lastMessageId: client.lastMessageId,
      direction: client.player.direction,
      position: client.player.position,
      updateWindow: elapsedTime,
    };
    if (client.player.reportUpdate) {
      client.socket.emit("update-self", update);

      //
      // Notify all other connected clients about every
      // other connected client status...but only if they are updated.
      for (let otherId in activeClients) {
        if (otherId !== clientId) {
          activeClients[otherId].socket.emit("update-other", update);
        }
      }
    }

    //
    // Notify all clients about every food that's been updated
    let foodUpdate = {
      reportUpdates: foodSOA.reportUpdates,
      positionsX: foodSOA.positionsX,
      positionsY: foodSOA.positionsY,
      count: foodSOA.count,
      spriteSheetIndices: foodSOA.spriteSheetIndices,
      bigFood: foodSOA.bigFood,
    };
    client.socket.emit("food-update", foodUpdate);
  }

  for (let clientId in activeClients) {
    activeClients[clientId].player.reportUpdate = false;
  }
}

//------------------------------------------------------------------
//
// Server side game loop
//
//------------------------------------------------------------------
function gameLoop(currentTime, elapsedTime) {
  processInput();
  update(elapsedTime, currentTime);
  updateClients(elapsedTime);

  if (!quit) {
    setTimeout(() => {
      let now = present();
      gameLoop(now, now - currentTime);
    }, UPDATE_RATE_MS);
  }
}

//------------------------------------------------------------------
//
// Get the socket.io server up and running so it can begin
// collecting inputs from the connected clients.
//
//------------------------------------------------------------------
function initializeSocketIO(httpServer) {
  let io = require("socket.io")(httpServer);

  //------------------------------------------------------------------
  //
  // Notifies the already connected clients about the arrival of this
  // new client.  Plus, tell the newly connected client about the
  // other players already connected. Plus, tell the newly connected client about the food.
  //
  //------------------------------------------------------------------
  function notifyConnect(socket, newPlayer) {
    for (let clientId in activeClients) {
      let client = activeClients[clientId];
      if (newPlayer.clientId !== clientId) {
        //
        // Tell existing about the newly connected player
        client.socket.emit("connect-other", {
          clientId: newPlayer.clientId,
          direction: newPlayer.direction,
          position: newPlayer.position,
          rotateRate: newPlayer.rotateRate,
          speed: newPlayer.speed,
          size: newPlayer.size,
          name: newPlayer.name,
        });

        //
        // Tell the new player about the already connected player
        socket.emit("connect-other", {
          clientId: client.player.clientId,
          direction: client.player.direction,
          position: client.player.position,
          rotateRate: client.player.rotateRate,
          speed: client.player.speed,
          size: client.player.size,
        });
      }
    }
  }

  //
  // Tell the new player about the food
  function notifyNewPlayerFood(newPlayer) {
    let client = activeClients[newPlayer.clientId];
    let foodSpriteUpdate = {
      spriteSheetIndices: foodSOA.spriteSheetIndices,
      bigFood: bigFood,
    };
    client.socket.emit("food-initial", foodSpriteUpdate);
  }

  //------------------------------------------------------------------
  //
  // Notifies the already connected clients about the disconnect of
  // another client.
  //
  //------------------------------------------------------------------
  function notifyDisconnect(playerId) {
    for (let clientId in activeClients) {
      let client = activeClients[clientId];
      if (playerId !== clientId) {
        client.socket.emit("disconnect-other", {
          clientId: playerId,
        });
      }
    }
  }

  io.on("connection", function (socket) {
    console.log("Connection established: ", socket.id);
    //
    // Create an entry in our list of connected clients
    let newPlayer = Player.create();

    newPlayer.clientId = socket.id;
    playerNames[socket.id] = { name: "Player", clientId: socket.id };
    socket.emit("updatePlayerNames", playerNames);

    activeClients[socket.id] = {
      socket: socket,
      player: newPlayer,
      elapsedTime: 0, // keep track of how long the player has been in the game
      isAlive: true,
    };
    socket.emit("connect-ack", {
      direction: newPlayer.direction,
      position: newPlayer.position,
      size: newPlayer.size,
      rotateRate: newPlayer.rotateRate,
      speed: newPlayer.speed,
    });

    socket.on("input", (data) => {
      inputQueue.push({
        clientId: socket.id,
        message: data,
      });
    });

    socket.on("add-start-parts", (data) => {
      let client = activeClients[socket.id];
      let player = client.player;
      for (let i = 0; i < 3; i++) {
        player.addBodyPart();
        client.socket.emit("add-body-part", "");
        for (let otherId in activeClients) {
          if (otherId !== socket.id) {
            activeClients[otherId].socket.emit("add-body-other", {
              clientId: socket.id,
            });
          }
        }
      }
    });

    socket.on("playerName", (data) => {
      playerNames[socket.id] = { name: data.name, clientId: socket.id };
      socket.emit("updatePlayerNames", playerNames);
      for (let clientId in activeClients) {
        if (clientId !== socket.id) {
          activeClients[clientId].socket.emit("updatePlayerNames", playerNames);
        }
      }
      // update player's elapsedTime to be 0, so that they are invincible for the first few seconds
      //   activeClients[socket.id].socket.emit("updatePlayerElapsedTime", 0);
      activeClients[socket.id].elapsedTime = 0;

      // Notify other clients that a part should be added
      for (let otherId in activeClients) {
        if (otherId !== socket.id) {
          let data = {
            clientId: otherId,
            numParts: activeClients[otherId].player.segments.length,
          };
          socket.emit("add-body-other", data);
        }
      }
    });

    // socket.on("player-dead", function () {
    //     // tell the server here somehow that the player is dead?
    // });

    socket.on("disconnect", function () {
      turnBodyIntoFood(
        activeClients[socket.id].player,
        activeClients[socket.id],
        socket.id
      );
      delete activeClients[socket.id];
      delete playerNames[socket.id];
      notifyDisconnect(socket.id);
    });

    // handler for when player loses, exits game and returns to main menu
    // "refreshes" the player so they respawn in the next game alive, in some new place
    socket.on("reset-player", function () {
      activeClients[socket.id].player.refresh();
      activeClients[socket.id].isAlive = true;

      // notify other clients that that player's body is gone
      for (let otherId in activeClients) {
        if (otherId !== socket.id) {
          activeClients[otherId].socket.emit(
            "remove-full-body-other",
            socket.id
          );
          activeClients[otherId].socket.emit("player-visible", socket.id);
        }
      }
    });

    notifyConnect(socket, newPlayer);
    notifyNewPlayerFood(newPlayer);
  });
}

//------------------------------------------------------------------
//
// Entry point to get the game started.
//
//------------------------------------------------------------------
function initialize(httpServer) {
  initializeSocketIO(httpServer);
  gameLoop(present(), 0);
}

//------------------------------------------------------------------
//
// Public function that allows the game simulation and processing to
// be terminated.
//
//------------------------------------------------------------------
function terminate() {
  this.quit = true;
}

module.exports.initialize = initialize;
