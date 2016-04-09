define(['redux', 'ramda', './actions', './tetris'], function(redux, R, actions, tetris){
    'use strict';

    const INITIAL_STATE = {
        score: 0,
        time: 0,
        queue: [],
        piece: [],
        gamefield: tetris.EMPTY_FIELD,
    };
    function gameReducer(state, action){
        if(!state){
            return INITIAL_STATE;
        }
        let nState;
        switch(action.type){
        case actions.ADD_SHAPE:
            nState = R.merge(state, {piece: tetris.makeBlock()});
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
            nState = R.merge(nState, {
                gamefield: tetris.mergeBlock(nPiece, nState.gamefield),
                piece: tetris.makeBlock(),
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
                    piece: tetris.makeBlock(),
                });
            }
            break;
        default:
            nState = state;
        }
        return nState;
    }

    return redux.createStore(gameReducer);
});
