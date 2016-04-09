define(['ramda', '../constants'],
    function(R, constants){
        'use strict';

        const EMPTY_FIELD = R.repeat(R.repeat(0, constants.FIELD_WIDTH), constants.FIELD_HEIGHT);

        let makePiece = (data, x, y) => ({
            x: x || 0,
            y: y || constants.FIELD_HEIGHT - 3,
            data: data || [[2, 3, 4],[0, 0, 5],[0, 0, 6]],
        });

        // shift game field down eliminating filled rows
        let shiftField = R.compose(
            R.take(constants.FIELD_HEIGHT),
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

        // merge block data into a gamefield
        let mergeBlock = function(block, field){
            field = R.map(R.map(R.identity), field);
            for(let y = 0, l = block.data.length; y < l; ++y){
                for(let x = 0, m = block.data[0].length; x < m; ++x){
                    field[y + block.y][x + block.x] = block.data[y][x];
                }
            }
            return field;
        };

        // move block
        let moveDown = function(block, field){
            if(block.y > 0){
                let nBlock = R.merge(block, {y: block.y - 1});
                return checkBlock(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let moveLeft = function(block, field){
            if(block.x > 0){
                let nBlock = R.merge(block, {x: block.x - 1});
                return checkBlock(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let moveRight = function(block, field){
            if((block.x + block.data[0].length) < field[0].length){
                let nBlock = R.merge(block, {x: block.x + 1});
                return checkBlock(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let rotateLeft = function(block, field){
            let d = block.data;
            let out = R.map(() => [], R.range(0, d[0].length));
            for(let y = 0, l = d.length; y < l; ++y){
                for(let x = 0, m = d[0].length; x < m; ++x){
                    out[out.length - 1 - x].push(d[y][x]);
                }
            }
            let nBlock = R.merge(block, {data: out});
            return checkBlock(nBlock, field) ? block : nBlock;
        };

        // move block down unitl hits the obstakle
        let dropDown = function(block, field){
            let nBlock;
            do{
                nBlock = block;
                block = moveDown(block, field);
            }while(nBlock.y !== block.y);
            return block;
        };

        return {
            makePiece: makePiece,
            mergeBlock: mergeBlock,
            checkBlock: checkBlock,
            rotateLeft: rotateLeft,
            moveRight: moveRight,
            moveLeft: moveLeft,
            moveDown: moveDown,
            dropDown: dropDown,
            shiftField: shiftField,
            EMPTY_FIELD: EMPTY_FIELD,
        };
});
