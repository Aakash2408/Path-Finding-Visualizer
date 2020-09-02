import MODAL_TYPES from "./ModalTypes";

const INITIAL_STATE = {
  body: null,
  active: false,
};

const modalReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case MODAL_TYPES.OPEN_MODAL:
      return {
        ...state,
        active: true,
        body: action.payload,
      };

    case MODAL_TYPES.CLOSE_MODAL:
      return {
        ...state,
        active: false,
        body: null,
      };

    default:
      return state;
  }
};

export default modalReducer;
