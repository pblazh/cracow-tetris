define(['redux', 'ramda', './actions', './tetris', '../constants'],
    function(redux, R, actions, tetris, constants){
        'use strict';

        // main reducer handle all state changes
        const INITIAL_STATE = {
            score: 0,
            startTime: 0,
            time: 0,
            speed: 2,
            page: constants.PAGE_INTRO,
            queue: tetris.makePiece(),
            piece: tetris.makePiece(),
            gamefield: tetris.EMPTY_FIELD,
            game: null,
        };
        function gameReducer(state, action){
            if(!state){
                return INITIAL_STATE;
            }
            let nState;
            switch(action.type){
            case actions.SWITCH_PAGE:
                nState = R.merge(state, {page: action.value});
                if(action.value === constants.PAGE_GAME){
                    nState.startTime = new Date().getTime();
                }
                break;
            case actions.GAME_RESTART:
                nState = R.merge(state, {
                    gamefield: INITIAL_STATE.gamefield,
                    speed: INITIAL_STATE.speed,
                    lives: INITIAL_STATE.lives,
                    score: INITIAL_STATE.score,
                });
                break;
            case actions.PUSH_BACK: //restore the state from the history
                return action.value;
            case actions.MOVE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.moveLeft(state.piece, state.gamefield),
                });
                break;
            case actions.MOVE_RIGHT:
                nState = R.merge(state, {
                    piece: tetris.moveRight(state.piece, state.gamefield),
                });
                break;
            case actions.ROTATE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.rotateLeft(state.piece, state.gamefield),
                });
                break;
            case actions.DROP_DOWN:
                let nPiece = tetris.dropDown(state.piece, state.gamefield);
                nState = R.merge(state, {
                    gamefield: tetris.mergeBlock(nPiece, state.gamefield),
                    queue: tetris.makePiece(),
                    piece: state.queue,
                });
                break;
            case actions.MAGIC:
                let nBlock = tetris.makePiece(state.piece.x, state.piece.y);
                if(!tetris.isHitWalls(nBlock, state.gamefield)){
                    nState = R.merge(state, {
                        piece: nBlock,
                    });
                }else{
                    nState = state;
                }
                break;
            case actions.MOVE_DOWN:
                nState = R.merge(state, {
                    piece: tetris.moveDown(state.piece, state.gamefield),
                });
                // if block has not moved...
                if(R.equals(nState.piece, state.piece)){
                    nState = R.merge(nState, {
                        gamefield: tetris.mergeBlock(nState.piece, nState.gamefield),
                        queue: tetris.makePiece(),
                        piece: state.queue,
                    });
                }
                break;
            default:
                nState = state;
            }

            // we are playing game try to move the gamefield down,
            // collect the scores, update time, speed etc
            if(state.page === constants.PAGE_GAME){
                let res = tetris.shiftField(nState.gamefield);
                let nScore = state.score + res[1];
                nState = R.merge(nState, {
                    gamefield: res[0],
                    score: nScore,
                    speed: nScore
                        ? INITIAL_STATE.speed / nScore
                        : INITIAL_STATE.speed,
                });

                nState.time = new Date().getTime() - nState.startTime;
                if(tetris.isHitWalls(nState.piece, nState.gamefield)){
                    nState = R.merge(nState, {
                        page: constants.PAGE_FINAL,
                    });
                }
            }
            nState = R.merge(nState, {
                game: tetris.mergeBlock(nState.piece, nState.gamefield),
            });
            return nState;
        }

        return redux.createStore(gameReducer);
});
