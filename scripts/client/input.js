// ------------------------------------------------------------------
//
// Keyboard input handling support
//
// ------------------------------------------------------------------
MyGame.input.Keyboard = function () {
  "use strict";
  let keys = {},
    keyRepeat = {},
    handlers = {},
    nextHandlerId = 0,
    that = {};

  // ------------------------------------------------------------------
  //
  // Allows the client code to register a keyboard handler.
  //
  // ------------------------------------------------------------------
  that.registerHandler = function (handler, key, repeat, rate) {
    //
    // If no repeat rate was passed in, use a value of 0 so that no delay between
    // repeated keydown events occurs.
    if (rate === undefined) {
      rate = 0;
    }

    //
    // Each entry is an array of handlers to allow multiple handlers per keyboard input
    if (!handlers.hasOwnProperty(key)) {
      handlers[key] = [];
    }
    handlers[key].push({
      id: nextHandlerId,
      key: key,
      repeat: repeat,
      rate: rate,
      elapsedTime: rate, // Initialize an initial elapsed time so the very first keypress will be valid
      handler: handler,
    });

    nextHandlerId += 1;

    //
    // We return an handler id that client code must track if it is desired
    // to unregister the handler in the future.
    return handlers[key][handlers[key].length - 1].id;
  };

  // ------------------------------------------------------------------
  //
  // Allows the client code to unregister a keyboard handler.
  //
  // ------------------------------------------------------------------
  that.unregisterHandler = function (key, id) {
    if (handlers.hasOwnProperty(key)) {
      for (let entry = 0; entry < handlers[key].length; entry += 1) {
        if (handlers[key][entry].id === id) {
          handlers[key].splice(entry, 1);
          break;
        }
      }
    }
  };

  // ------------------------------------------------------------------
  //
  // Called when the 'keydown' event is fired from the browser.  During
  // this handler we record which key caused the event.
  //
  // ------------------------------------------------------------------
  function keyDown(event) {
    keys[event.key] = event.timeStamp;
    //
    // Because we can continuously receive the keyDown event, check to
    // see if we already have this property.  If we do, we don't want to
    // overwrite the value that already exists.
    if (keyRepeat.hasOwnProperty(event.key) === false) {
      keyRepeat[event.key] = false;
    }
  }

  // ------------------------------------------------------------------
  //
  // Called when the 'keyrelease' event is fired from the browser.  When
  // a key is released, we want to remove it from the set of keys currently
  // indicated as down.
  //
  // ------------------------------------------------------------------
  function keyRelease(event) {
    delete keys[event.key];
    delete keyRepeat[event.key];
  }

  // ------------------------------------------------------------------
  //
  // Allows the client to invoke all the handlers for the registered key/handlers.
  //
  // ------------------------------------------------------------------
  that.update = function (elapsedTime) {
    for (let key in keys) {
      if (handlers.hasOwnProperty(key)) {
        for (let entry = 0; entry < handlers[key].length; entry += 1) {
          let event = handlers[key][entry];
          event.elapsedTime += elapsedTime;
          if (event.repeat === true) {
            //
            // Check the rate vs elapsed time for this key before invoking the handler
            if (event.elapsedTime >= event.rate) {
              event.handler(elapsedTime);
              keyRepeat[key] = true;
              //
              // Reset the elapsed time, adding in any extra time beyond the repeat
              // rate that may have accumulated.
              event.elapsedTime = event.elapsedTime - event.rate;
            }
          } else if (event.repeat === false && keyRepeat[key] === false) {
            event.handler(elapsedTime);
            keyRepeat[key] = true;
          }
        }
      }
    }
  };

  //
  // This is how we receive notification of keyboard events.
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyRelease);

  return that;
};
