import React, { Component } from 'react';
import { connect } from 'react-redux';
import { chooseAlg } from '../../redux/filter/filterActions';
import { findPath, resetVisitedAndSP } from '../../redux/grid/gridActions';
import './Filter.scss';

export class Filter extends Component {
  render() {
    const {
      algorithms,
      chooseAlg,
      enableVisualizeButton,
      findPath,
      resetVisitedAndSPCells,
      currentAlg,
    } = this.props;

    return (
      <div className="filter">
        <h3 className="title">Select Algorithm:</h3>
        <select
          name="algorithm"
          className="form-control"
          onChange={(e) => chooseAlg(e.target.value)}
          disabled={!enableVisualizeButton}
        >
          {algorithms.map((alg) => (
            <option value={alg.id} key={alg.id}>
              {alg.name}
            </option>
          ))}
        </select>
        <p className="alg-info">
          {algorithms[currentAlg].complexity ? (
            <React.Fragment>
              Complexity:
              <span className="complexity">
                {algorithms[currentAlg].complexity}
              </span>{' '}
              <br />
            </React.Fragment>
          ) : null}
          {algorithms[currentAlg].description}
        </p>
        <button
          className="visualize-btn"
          disabled={!enableVisualizeButton}
          onClick={() => {
            resetVisitedAndSPCells();
            findPath();
          }}
        >
          <span className="squirk">Visualize</span>
        </button>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  algorithms: state.filter.algorithms,
  currentAlg: state.filter.currentAlg,
  enableVisualizeButton: state.grid.enableVisualizeButton,
});

const mapDispatchToProps = (dispatch) => ({
  chooseAlg: (id) => dispatch(chooseAlg(parseInt(id))),
  findPath: () => dispatch(findPath(false)),
  resetVisitedAndSPCells: () => dispatch(resetVisitedAndSP()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Filter);
