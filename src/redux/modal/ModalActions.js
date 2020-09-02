import MODAL_TYPES from "./ModalTypes";

export const openModal = (body) => ({
  type: MODAL_TYPES.OPEN_MODAL,
  payload: body,
});

export const closeModal = () => ({
  type: MODAL_TYPES.CLOSE_MODAL,
});
