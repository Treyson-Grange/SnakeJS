// --------------------------------------------------------------
//
// Creates a Button object, with functions for managing state.
//
// spec = {
//    texture: ,
//    size: { width: , height: },
//    center: { x: , y: },
//    canvas: ,
// }
//
// --------------------------------------------------------------
MyGame.objects.Button = function (spec) {
    'use strict';

    let active = false;
    let clicked = false;

    let imageReady = false;
    let image = new Image();

    image.onload = function () {
        imageReady = true;
    };
    image.src = spec.imageSrc;

    //------------------------------------------------------------------
    //
    // Handler for when user clicks on end screen "back" button
    //
    //------------------------------------------------------------------
    let localSize = {
        width: spec.size.width * spec.canvas.width,
        height: spec.size.height * spec.canvas.height,
    };

    let localCenter = {
        x: spec.center.x * spec.canvas.width,
        y: spec.center.y * spec.canvas.width,
    };

    // // Check if click is inside the rectangle
    function isInsideRectangle(mouseX, mouseY, rectX, rectY, rectWidth, rectHeight) {
        let rectLeftSide = rectX - (rectWidth / 2);
        let rectRightSide = rectX + (rectWidth / 2);
        let rectBottomSide = rectY - (rectHeight / 2);
        let rectTopSide = rectY + (rectHeight / 2);

        return mouseX >= rectLeftSide && mouseX <= rectRightSide && mouseY >= rectBottomSide && mouseY <= rectTopSide;
    }

    // Handle click event
    spec.canvas.addEventListener("click", function (event) {
        var mouseX = event.clientX - spec.canvas.getBoundingClientRect().left;
        var mouseY = event.clientY - spec.canvas.getBoundingClientRect().top;

        // Check if the click is inside the rectangle
        if (isInsideRectangle(mouseX, mouseY, localCenter.x, localCenter.y, localSize.width, localSize.height) && active) {
            clicked = true;
        }
    });

    function makeActive() {
        active = true;
    }

    function refresh() {
        active = false;
        clicked = false;
    }

    let api = {
        makeActive: makeActive,
        refresh: refresh,
        get size() { return spec.size; },
        get center() { return spec.center; },
        get imageReady() { return imageReady; },
        get image() { return image; },
        get clicked() { return clicked; },
        get active() { return active; },
    };

    return api;
}
