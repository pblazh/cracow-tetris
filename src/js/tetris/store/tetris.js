define(['ramda'], function(R){
    'use strict';

    const WIDTH = 6;
    const HEIGHT = 12;
    const EMPTY_FIELD = R.repeat(R.repeat(0, WIDTH), HEIGHT);

    function Block(data, x, y){
        this.x = x || 0;
        this.y = y || 0;
        this.data = data;
    }


    const INITIAL_STATE = {
        score: 0,
        time: 0,
        queue: [],
        piece: [],
        gamefield: EMPTY_FIELD,
    };


    // shift game field down eliminating filled rows
    let shiftField = R.compose(
        R.take(HEIGHT),
        R.flip(R.concat)(EMPTY_FIELD),
        R.dropWhile(R.all(R.identity))
    );

    // check if a block could be placed in the field
    let checkBlock = function(block, field){
        for(let y = 0, l = block.data.length; y < l; ++y){
            for(let x = 0, m = block.data[0].length; x < m; ++x){
                if(field[y + block.y][x + block.x] && block.data[y][x]){
                    return true;
                }
            }
        }
        return false;
    };

    // move block
    let moveDown = function(block, field){
        if(block.y > 0){
            let nblock = new Block(block.data, block.x, block.y - 1);
            return checkBlock(nblock, field) ? block : nblock;
        }
        return block;
    };

    let moveLeft = function(block, field){
        if(block.x > 0){
            let nblock = new Block(block.data, block.x - 1, block.y);
            return checkBlock(nblock, field) ? block : nblock;
        }
        return block;
    };

    let moveRight = function(block, field){
        if((block.x + block.data[0].length) < field[0].length){
            let nblock = new Block(block.data, block.x + 1, block.y);
            return checkBlock(nblock, field) ? block : nblock;
        }
        return block;
    };

    let rotate = function(block, field){
        let d = block.data;
        let out = R.map(() => [], R.range(0, d[0].length));
        for(let y = 0, l = d.length; y < l; ++y){
            for(let x = 0, m = d[0].length; x < m; ++x){
                out[out.length - 1 - x].push(d[y][x]);
            }
        }
        let nb = new Block(out, block.x, block.y);
        return checkBlock(nb, field) ? block : nb;
    };

    let dropDown = function(block, field){
        let nblock;
        do{
            nblock = block;
            block = moveDown(block, field);
        }while(nblock.y !== block.y);
        return block;
    };

    let placeBlock = function(block, field){
        field = R.map(R.map(R.identity), field);
        for(let y = 0, l = block.data.length; y < l; ++y){
            for(let x = 0, m = block.data[0].length; x < m; ++x){
                field[y + block.y][x + block.x] = block.data[y][x];
            }
        }
        return field;
    };


    //function gameReducer(state, action){
    //    if(!state){
    //        return INITIAL_STATE;
    //    }
    //}

    //var gameStore = redux.createStore(gameReducer);

    function print(a){
        console.log( R.join('\n', R.map(R.join(','), a)) );
    }

    let n = R.update(0, R.repeat(1, WIDTH), EMPTY_FIELD);
    n = R.update(1, R.repeat(1, WIDTH), n);
    n = R.update(2, [1,0,1,0,1,0], n);
    //print(n);

    console.log('shift field ------------');
    n = shiftField(n);
    print(n);

    console.log('block ------------');
    let b = new Block([
        [2,3,4],
        [0,0,5],
        [0,0,6],
    ], 1, 4);
    // console.log(b);
    // print(b.data);
    //
    print(placeBlock(b, n));

    //console.log('shift block ------------');
    b = moveDown(b, n);
    print(placeBlock(b, n));
    b = moveDown(b, n);
    print(placeBlock(b, n));

    console.log('right block ------------');
    b = moveRight(b, n);
    print(placeBlock(b, n));

    console.log('left block ------------');
    b = moveLeft(b, n);
    print(placeBlock(b, n));

    console.log('rotate block ------------');
    b = rotate(b, n);
    // print(placeBlock(b, n));

    console.log('drop block ------------');
    b = dropDown(b, n);
    print(placeBlock(b, n));

    // console.log('place block ------------');
    // n = placeBlock(b, n);
    // print(n);
    // dropDown(n, s);

    // console.log('apply block ------------');
    // n = applyShape(n, s);
    // print(n);

    console.log('------------');
});
