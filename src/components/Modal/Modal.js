import React, { Component } from "react";
import { connect } from "react-redux";
import { closeModal } from "../../redux/modal/ModalActions";
import "./Modal.scss";

class Modal extends Component {
  render() {
    const { body, active, modalClose } = this.props;

    if (active === true) {
      return (
        <div className="modal-custom" onClick={modalClose}>
          <div className="outer-container">
            <div className="close-btn">
              <button onClick={modalClose}></button>
            </div>
            {body}
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

const mapStateToProps = (state) => ({
  body: state.modal.body,
  active: state.modal.active,
});

const mapDispatchToProps = (dispatch) => ({
  modalClose: () => dispatch(closeModal()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Modal);
