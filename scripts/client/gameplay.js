//------------------------------------------------------------------
//
// This function provides the "game" code.
//
//------------------------------------------------------------------
MyGame.screens["game-play"] = (function (
  game,
  components,
  renderer,
  graphics,
  input
) {
  "use strict";

  console.log(components.PlayerRemote());
  console.log(components.Player());

  let lastTimeStamp = performance.now(),
    cancelNextRequest = true,
    myKeyboard = input.Keyboard(),
    playerSelf = {
      model: components.Player(),
      texture: MyGame.assets["player-self"],
    },
    playerOthers = {},
    messageHistory = MyGame.utilities.Queue(),
    messageId = 1,
    socket = io();

  //------------------------------------------------------------------
  //
  // Handler for when the server ack's the socket connection.  We receive
  // the state of the newly connected player model.
  //
  //------------------------------------------------------------------
  socket.on("connect-ack", function (data) {
    playerSelf.model.position.x = data.position.x;
    playerSelf.model.position.y = data.position.y;

    playerSelf.model.size.x = data.size.x;
    playerSelf.model.size.y = data.size.y;

    playerSelf.model.direction = data.direction;
    playerSelf.model.speed = data.speed;
    playerSelf.model.rotateRate = data.rotateRate;
  });

  //------------------------------------------------------------------
  //
  // Handler for when a new player connects to the game.  We receive
  // the state of the newly connected player model.
  //
  //------------------------------------------------------------------
  socket.on("connect-other", function (data) {
    let model = components.PlayerRemote();
    console.log("MODEL IS: ", model);
    console.log("COMPONENTS.PLAYERREMOTE() IS: ", components.PlayerRemote());
    model.state.position.x = data.position.x;
    model.state.position.y = data.position.y;
    model.state.direction = data.direction;

    model.goal.position.x = data.position.x;
    model.goal.position.y = data.position.y;
    model.goal.direction = data.direction;
    model.goal.updateWindow = 0;

    model.size.x = data.size.x;
    model.size.y = data.size.y;

    playerOthers[data.clientId] = {
      model: model,
      texture: MyGame.assets["player-other"],
    };
  });

  //------------------------------------------------------------------
  //
  // Handler for when another player disconnects from the game.
  //
  //------------------------------------------------------------------
  socket.on("disconnect-other", function (data) {
    delete playerOthers[data.clientId];
  });

  //------------------------------------------------------------------
  //
  // Handler for receiving state updates about the self player.
  //
  //------------------------------------------------------------------
  socket.on("update-self", function (data) {
    playerSelf.model.position.x = data.position.x;
    playerSelf.model.position.y = data.position.y;
    playerSelf.model.direction = data.direction;

    //
    // Remove messages from the queue up through the last one identified
    // by the server as having been processed.
    let done = false;
    while (!done && !messageHistory.empty) {
      if (messageHistory.front.id === data.lastMessageId) {
        done = true;
      }
      //console.log('dumping: ', messageHistory.front.id);
      messageHistory.dequeue();
    }

    //
    // Update the client simulation since this last server update, by
    // replaying the remaining inputs.
    let memory = MyGame.utilities.Queue();
    while (!messageHistory.empty) {
      let message = messageHistory.dequeue();
      switch (message.type) {
        case "move":
          playerSelf.model.move(message.elapsedTime);
          break;
        case "up":
          playerSelf.model.goUp(message.elapsedTime);
          break;
        case "right":
          playerSelf.model.goRight(message.elapsedTime);
          break;
        case "left":
          playerSelf.model.goLeft(message.elapsedTime);
          break;
        case "down":
          playerSelf.model.goDown(message.elapsedTime);
          break;
      }
      memory.enqueue(message);
    }
    messageHistory = memory;
  });

  //------------------------------------------------------------------
  //
  // Handler for receiving state updates about other players.
  //
  //------------------------------------------------------------------
  socket.on("update-other", function (data) {
    if (playerOthers.hasOwnProperty(data.clientId)) {
      let model = playerOthers[data.clientId].model;
      model.goal.updateWindow = data.updateWindow;

      model.goal.position.x = data.position.x;
      model.goal.position.y = data.position.y;
      model.goal.direction = data.direction;
    }
  });

  //------------------------------------------------------------------
  //
  // Process the registered input handlers here.
  //
  //------------------------------------------------------------------
  function processInput(elapsedTime) {
    myKeyboard.update(elapsedTime);
  }

  //------------------------------------------------------------------
  //
  // Update the game simulation
  //
  //------------------------------------------------------------------
  function update(elapsedTime) {
    let message = {
      //makes it automatically move
      id: messageId++,
      elapsedTime: elapsedTime,
      type: "move",
    };
    socket.emit("input", message);
    messageHistory.enqueue(message);
    playerSelf.model.move(elapsedTime);
    playerSelf.model.update(elapsedTime);
    for (let id in playerOthers) {
      playerOthers[id].model.update(elapsedTime);
    }
  }

  //------------------------------------------------------------------
  //
  // Render the current state of the game simulation
  //
  //------------------------------------------------------------------
  function render() {
    graphics.clear();
    renderer.Background.render(playerSelf.model.position, {height: .75, width: .75}, MyGame.assets["tile"]);
    // console.log("playerSelf.model, playerSelf.texture: ", playerSelf.model, playerSelf.texture);
    renderer.Player.render(playerSelf.model, playerSelf.texture);
    for (let id in playerOthers) {
      let otherPlayer = playerOthers[id];
      renderer.PlayerRemote.render(otherPlayer.model, MyGame.assets["player-other"], playerSelf.model.position); // player.texture is 'undefined' here :( should prolly fix that!
    }
  }

  //------------------------------------------------------------------
  //
  // Client-side game loop
  //
  //------------------------------------------------------------------
  function gameLoop(time) {
    let elapsedTime = time - lastTimeStamp;
    lastTimeStamp = time;

    processInput(elapsedTime);
    update(elapsedTime);
    render();

    if (!cancelNextRequest) {
      requestAnimationFrame(gameLoop);
    }
  }

  function updatePlayers() {
    playerSelf.texture = MyGame.assets["player-self"];
  }

  //------------------------------------------------------------------
  //
  // Public function used to get the game initialized and then up
  // and running.
  //
  //------------------------------------------------------------------
  function initialize() {
    console.log("game initializing...");

    //
    // Create the keyboard input handler and register the keyboard commands
    myKeyboard.registerHandler(
      (elapsedTime) => {
        let message = {
          id: messageId++,
          elapsedTime: elapsedTime,
          type: "test",
        };
        socket.emit("input", message);
        messageHistory.enqueue(message);
        playerSelf.model.rotateRight(elapsedTime);
      },
      "t",
      true
    );
    myKeyboard.registerHandler(
      (elapsedTime) => {
        let message = {
          id: messageId++,
          elapsedTime: elapsedTime,
          type: "up",
        };
        socket.emit("input", message);
        messageHistory.enqueue(message);
        playerSelf.model.goUp(elapsedTime);
      },
      "w",
      true
    );
    myKeyboard.registerHandler(
      (elapsedTime) => {
        let message = {
          id: messageId++,
          elapsedTime: elapsedTime,
          type: "right",
        };
        socket.emit("input", message);
        messageHistory.enqueue(message);
        playerSelf.model.goRight(elapsedTime);
      },
      "d",
      true
    );

    myKeyboard.registerHandler(
      (elapsedTime) => {
        let message = {
          id: messageId++,
          elapsedTime: elapsedTime,
          type: "left",
        };
        socket.emit("input", message);
        messageHistory.enqueue(message);
        playerSelf.model.goLeft(elapsedTime);
      },
      "a",
      true
    );
    myKeyboard.registerHandler(
      (elapsedTime) => {
        let message = {
          id: messageId++,
          elapsedTime: elapsedTime,
          type: "down",
        };
        socket.emit("input", message);
        messageHistory.enqueue(message);
        playerSelf.model.goDown(elapsedTime);
      },
      "s",
      true
    );

    //
    // Stop the game loop by canceling the request for the next animation frame
    cancelNextRequest = true;
    //
    // Then, return to the main menu
    game.showScreen("main-menu");
  }

  function run() {
    lastTimeStamp = performance.now();
    cancelNextRequest = false;
    requestAnimationFrame(gameLoop);
  }

  return {
    initialize: initialize,
    run: run,
    updatePlayers: updatePlayers,
  };
})(
  MyGame.game,
  MyGame.components,
  MyGame.renderer,
  MyGame.graphics,
  MyGame.input
);
