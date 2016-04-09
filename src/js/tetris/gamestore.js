define(
    ['redux', 'ramda', './actions', './tetris', '../constants'],
    function(redux, R, actions, tetris, constants){
        'use strict';

        const INITIAL_STATE = {
            score: 0,
            startTime: 0,
            time: 0,
            page: constants.PAGE_INTRO,
            queue: tetris.makePiece(),
            piece: tetris.makePiece(),
            gamefield: tetris.EMPTY_FIELD,
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
            case actions.RESTART:
                nState = R.merge(state, {gamefield: INITIAL_STATE.gamefield});
                break;
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
            if(state.page === constants.PAGE_GAME){
                let res = tetris.shiftField(nState.gamefield);
                nState = R.merge(nState, {
                    gamefield: res[0],
                    score: state.score + res[1],
                });
                nState.time = new Date().getTime() - nState.startTime;
                if(tetris.checkBlock(nState.piece, nState.gamefield)){
                    nState = R.merge(nState, {
                        page: constants.PAGE_FINAL
                    });
                }
            }
            return nState;
        }

        return redux.createStore(gameReducer);
});
