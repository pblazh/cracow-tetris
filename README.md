# Krakow Tetris game

That is my version of the Tetris game as a solution of a test task below.
As a my own prerequisites I've decided to make a game a resembling the original old days Tetris.
To add a little fun I'm planning to make in in functional style to have an easy possibility to add a "rollback" function.

Since there was mentioned that the game should work at least on the latest browsers, I used heavily ES6 arrow functions as it leads to much cleaner code. If the broader is desired it can be easily accomplished by using Babel or any other transpiller.

To run the project:
- install npm
- say install npm dependencies by "npm install"
- install grunt by "npm install -g grunt-cli"
- install bower dependences by "bower install"

- to run a dev server say "grunt server"
- to built say "grunt"

The compiled version can be found here:
https://pblazh.github.io/cracow-tetris/


# The task
> Dear candidate,
> 
> We would like to ask you to create simple Tetris game. 
> 
> ##Tetris rules:
> 
> 1. You have 7 different shapes of blocks.
> 2. Blocks fall down to the bottom of the board.
> 3. You can move blocks horizontally by pressing **left** and **right** keys.
> 4. You can accelerate falling down by pressing **down** key.
> 5. You can rotate shapes by 90 degrees by pressing **up** key.
> 6. If you fill the whole line, the line should disappear and blocks from above should fall down.
> 
> ##Technology:
> 
> The test should be accomplished using HTML5 and JavaScript and should work at least on the latest desktop version of Chrome and Firefox. You can use any library/framework you want (we recommend PIXI.js or Easel.js).
> 
> You can add more features (like preview of next block, score, particle effects, sounds etc.), but it’s not necessary. We would like you to spend not more then 15 hours on this.
> 
> Your test will be judged based on:
> 
> 75% - code (clean code, design patterns, proper separation of concerns).
> 25% - game (no bugs, gameplay, look & feel).
> 
> Good luck, have fun and remember: good code wins arguments!
