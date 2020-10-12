import React, { Component } from "react";
import Home from "./pages/Home";
import Modal from "./components/Modal/Modal";
import Tutorial from "./components/tutorial/Tutorial";
import { connect } from "react-redux";
import { openModal } from "./redux/modal/ModalActions";
import "./App.css";

class App extends Component {
  componentDidMount() {
    const { modalOpen } = this.props;
    modalOpen(
      <div
        style={{
          backgroundColor: "#2f2f2f",
          border: "5px solid white",
          borderRadius: "40px",
        }}
      >
        <Tutorial></Tutorial>
      </div>
    );
  }

  render() {
    return (
      <div className="App">
        <Home></Home>
        <Modal></Modal>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  modalOpen: (body) => dispatch(openModal(body)),
});

export default connect(null, mapDispatchToProps)(App);
