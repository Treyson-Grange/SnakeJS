// ------------------------------------------------------------------
//
// Rendering function for a PlayerRemote object.
//
// ------------------------------------------------------------------
MyGame.renderer.PlayerRemote = (function(graphics) {
    'use strict';
    let that = {};
    const SCREEN_WIDTH = 1;
    // ------------------------------------------------------------------
    //
    // Renders a PlayerRemote model.
    //
    // ------------------------------------------------------------------
    that.render = function(model, texture, playerSelfPos) {

        let screenPos = {x: playerSelfPos.x - .5, y: playerSelfPos.y - .5}; //top-left corner of screen

        graphics.saveContext();
    
        // render snake if in render dist
        console.log(model.state.position);
        console.log(screenPos);
        console.log(screenPos.x < model.state.position.x + (model.size.width / 2));
        if (screenPos.x < model.state.position.x + (model.size.width / 2) && model.state.position.x - (model.size.width / 2) < screenPos.x + SCREEN_WIDTH) {
            console.log("x good");
            if (screenPos.y < model.state.position.y + (model.size.height / 2) && model.state.position.y - (model.size.height / 2) < screenPos.y + SCREEN_WIDTH) {
                let position = {
                    x: model.state.position.x - screenPos.x,
                    y: model.state.position.y - screenPos.y,
                }
                console.log(position);
                graphics.rotateCanvas(position, model.state.direction);
                graphics.drawImage(texture, position, model.size); 
            }                        
        }
            
        // we need the last i in this call to increment every time the function is called; that way we render a new frame of the frog each time
        graphics.restoreContext();
    }




    // that.render = function(model, texture, playerSelfPos) {
    //     graphics.saveContext();
    //     let position = {
    //         x: model.state.position.x - playerSelfPos.x,
    //         y: model.state.position.y - playerSelfPos.y
    //     }
    //     graphics.rotateCanvas(position, model.state.direction);
    //     graphics.drawImage(texture, position, model.size);
    //     graphics.restoreContext();
    // };
    // change + 0 = new
    return that;

}(MyGame.graphics));
