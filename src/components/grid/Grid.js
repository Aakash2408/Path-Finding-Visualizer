import React, { Component } from "react";
import { connect } from "react-redux";
import GridCell from "../grid-cell/GridCell";
import Graph from "../../utils/Graph";
import Queue from "../../utils/Queue";
import Stack from "../../utils/Stack";
import Node from "../../utils/Node";
import PriorityQueue from "../../utils/PriorityQueue";
import {
  markCellVisited,
  markShortestPath,
  findPath,
  createGrid,
  wKeyPress,
  cellClicked,
  dragDrop,
  mouseDown,
  mouseOver,
} from "../../redux/grid/gridActions";
import "./Grid.scss";

class Grid extends Component {
  state = {
    routing: false,
    animationWait: 10,
  };

  componentDidMount() {
    const { buildGrid, wKeyPressed } = this.props;
    buildGrid();

    this.handleKeyPress(wKeyPressed);
  }

  componentDidUpdate() {
    const {
      enableVisualizeButton,
      gridCells,
      playerPos,
      targetPos,
      currentAlg,
      markVisited,
      markSP,
      findPath,
    } = this.props;

    if (!enableVisualizeButton && !this.state.routing) {
      this.setState({ routing: true }, () => {
        switch (currentAlg) {
          case 0:
            this.bfs(
              gridCells,
              playerPos,
              targetPos,
              markVisited,
              markSP,
              findPath
            );
            break;

          case 1:
            this.dfs(
              gridCells,
              playerPos,
              targetPos,
              markVisited,
              markSP,
              findPath
            );
            break;

          case 2:
            this.dijkstra(
              gridCells,
              playerPos,
              targetPos,
              markVisited,
              markSP,
              findPath
            );
            break;

          case 3:
            this.AStar(
              gridCells,
              playerPos,
              targetPos,
              markVisited,
              markSP,
              findPath
            );
            break;

          default:
            break;
        }
      });
    }
  }

  bfs = async (
    gridCells,
    playerPos,
    targetPos,
    markVisited,
    markSP,
    findPath
  ) => {
    let { graph, cellIdPositionMap } = this.initializeGraph(gridCells);
    let playerId = gridCells[playerPos.i][playerPos.j].id;
    let targetId = gridCells[targetPos.i][targetPos.j].id;

    let visited = new Set();
    let queue = new Queue();

    queue.enquque(new Node(playerId));
    visited.add(playerId);

    let targetFound = false;
    let parent = new Map();

    while (!queue.isEmpty()) {
      let node = queue.dequeue();
      let temp = graph.adjList.get(node.id).head;
      while (temp !== null) {
        if (!visited.has(temp.id)) {
          parent.set(temp.id, node.id);

          let { i, j } = cellIdPositionMap.get(temp.id);
          markVisited(i, j);
          await this.wait(this.state.animationWait);

          if (temp.id === targetId) {
            targetFound = true;
            break;
          }

          visited.add(temp.id);
          queue.enquque(temp);
        }
        temp = temp.next;
      }

      if (targetFound) {
        break;
      }
    }

    if (targetFound) {
      this.drawShortestPath(
        parent,
        playerId,
        targetId,
        cellIdPositionMap,
        markSP
      );
    }

    findPath();
    this.setState({ routing: false });
  };

  dfs = async (
    gridCells,
    playerPos,
    targetPos,
    markVisited,
    markSP,
    findPath
  ) => {
    let { graph, cellIdPositionMap } = this.initializeGraph(gridCells);
    let playerId = gridCells[playerPos.i][playerPos.j].id;
    let targetId = gridCells[targetPos.i][targetPos.j].id;

    let visited = new Set();
    let stack = new Stack();

    stack.push(new Node(playerId));
    visited.add(playerId);

    let targetFound = false;
    let parent = new Map();

    while (!stack.isEmpty()) {
      let node = stack.pop();
      let { i, j } = cellIdPositionMap.get(node.id);
      markVisited(i, j);
      await this.wait(this.state.animationWait);

      let temp = graph.adjList.get(node.id).head;
      while (temp !== null) {
        if (!visited.has(temp.id)) {
          parent.set(temp.id, node.id);

          if (temp.id === targetId) {
            targetFound = true;
            break;
          }

          visited.add(temp.id);
          stack.push(temp);
        }
        temp = temp.next;
      }

      if (targetFound) {
        break;
      }
    }

    if (targetFound) {
      this.drawShortestPath(
        parent,
        playerId,
        targetId,
        cellIdPositionMap,
        markSP
      );
    }

    findPath();
    this.setState({ routing: false });
  };

  dijkstra = async (
    gridCells,
    playerPos,
    targetPos,
    markVisited,
    markSP,
    findPath
  ) => {
    let { graph, cellIdPositionMap } = this.initializeGraph(gridCells);
    let playerId = gridCells[playerPos.i][playerPos.j].id;
    let targetId = gridCells[targetPos.i][targetPos.j].id;

    let parent = new Map();
    let shortestDistance = new Map();

    let pq = new PriorityQueue();

    for (let i = 0; i < gridCells.length; i++) {
      for (let j = 0; j < gridCells[i].length; j++) {
        if (!gridCells[i][j].isWall) {
          pq.enqeue(new Node(gridCells[i][j].id, Infinity, i, j));
        }
      }
    }

    let targetFound = false;
    pq.decreaseKey(playerId, 0);

    while (!pq.isEmpty()) {
      let current = pq.dequeue();

      if (current.id === playerId) {
        shortestDistance.set(playerId, 0);
      } else if (current.id === targetId && current.weight !== Infinity) {
        //infinity to make sure the node has atleast been touched
        targetFound = true;
        break;
      } else {
        shortestDistance.set(current.id, current.weight);
      }

      let head = graph.adjList.get(current.id).head; //neighbours

      while (head !== null) {
        let totalWeight = shortestDistance.get(current.id) + head.weight;

        if (pq.containsKey(head.id) && pq.peek(head.id).weight > totalWeight) {
          pq.decreaseKey(head.id, totalWeight);
          parent.set(head.id, current.id);

          let { i, j } = cellIdPositionMap.get(head.id);
          markVisited(i, j);
          await this.wait(this.state.animationWait);
        }

        head = head.next;
      }
    }

    if (targetFound) {
      this.drawShortestPath(
        parent,
        playerId,
        targetId,
        cellIdPositionMap,
        markSP
      );
    }

    findPath();
    this.setState({ routing: false });
  };

  AStar = async (
    gridCells,
    playerPos,
    targetPos,
    markVisited,
    markSP,
    findPath
  ) => {
    let { graph, cellIdPositionMap } = this.initializeGraph(gridCells);
    let playerId = gridCells[playerPos.i][playerPos.j].id;
    let targetId = gridCells[targetPos.i][targetPos.j].id;

    let parent = new Map();
    let shortestDistance = new Map();

    let pq = new PriorityQueue();

    for (let i = 0; i < gridCells.length; i++) {
      for (let j = 0; j < gridCells[i].length; j++) {
        if (!gridCells[i][j].isWall) {
          pq.enqeue(new Node(gridCells[i][j].id, Infinity));
          shortestDistance.set(gridCells[i][j].id, Infinity);
        }
      }
    }

    let targetFound = false;
    pq.decreaseKey(playerId, 0);

    while (!pq.isEmpty()) {
      let current = pq.dequeue();

      if (current.id === playerId) {
        shortestDistance.set(current.id, 0);
      } else if (current.id === targetId && current.weight !== Infinity) {
        //infinity to make sure the node has atleast been touched
        targetFound = true;
        break;
      }

      let head = graph.adjList.get(current.id).head; //neighbours

      while (head !== null) {
        // f(n) = g(n) + h(n)
        let g = shortestDistance.get(current.id) + head.weight;

        let { i, j } = cellIdPositionMap.get(head.id);
        let h = Math.abs(targetPos.i - i) + Math.abs(targetPos.j - j);

        let f = g + h * 1.001; // h * 1.001 for tie-breaking if same f values exists in pq

        if (pq.containsKey(head.id) && pq.peek(head.id).weight > f) {
          pq.decreaseKey(head.id, f);
          parent.set(head.id, current.id);

          shortestDistance.set(head.id, g);

          markVisited(i, j);
          await this.wait(this.state.animationWait);
        }

        head = head.next;
      }
    }

    if (targetFound) {
      this.drawShortestPath(
        parent,
        playerId,
        targetId,
        cellIdPositionMap,
        markSP
      );
    }

    findPath();
    this.setState({ routing: false });
  };

  initializeGraph(gridCells) {
    let graph = new Graph();
    let cellIdPositionMap = new Map();

    for (let i = 0; i < gridCells.length; i++) {
      for (let j = 0; j < gridCells[i].length; j++) {
        if (!gridCells[i][j].isWall) {
          graph.createGraphVertex(gridCells[i][j].id);
          cellIdPositionMap.set(gridCells[i][j].id, { i, j });

          //get neighbours
          //up
          if (i - 1 >= 0 && !gridCells[i - 1][j].isWall) {
            graph.addPathBetweenVertices(
              gridCells[i][j].id,
              gridCells[i - 1][j].id,
              gridCells[i - 1][j].weight,
              i - 1,
              j
            );
          }
          //right
          if (j + 1 <= gridCells[i].length - 1 && !gridCells[i][j + 1].isWall) {
            graph.addPathBetweenVertices(
              gridCells[i][j].id,
              gridCells[i][j + 1].id,
              gridCells[i][j + 1].weight,
              i,
              j + 1
            );
          }
          //bottom
          if (i + 1 <= gridCells.length - 1 && !gridCells[i + 1][j].isWall) {
            graph.addPathBetweenVertices(
              gridCells[i][j].id,
              gridCells[i + 1][j].id,
              gridCells[i + 1][j].weight,
              i + 1,
              j
            );
          }
          //left
          if (j - 1 >= 0 && !gridCells[i][j - 1].isWall) {
            graph.addPathBetweenVertices(
              gridCells[i][j].id,
              gridCells[i][j - 1].id,
              gridCells[i][j - 1].weight,
              i,
              j - 1
            );
          }
        }
      }
    }
    return { graph, cellIdPositionMap };
  }

  drawShortestPath = async (
    parent,
    playerId,
    targetId,
    cellIdPositionMap,
    markSP
  ) => {
    let temp = targetId;
    while (temp !== playerId) {
      let parentId = parent.get(temp);

      let { i, j } = cellIdPositionMap.get(parentId);
      markSP(i, j);
      await this.wait(this.state.animationWait);
      temp = parentId;
    }
  };

  wait = (microsecs) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), microsecs);
    });
  };

  handleKeyPress = (wKeyPressed) => {
    document.onkeydown = (e) => {
      if (e.key === "w" || e.key === "W") {
        wKeyPressed(true);
      }
    };

    document.onkeyup = (e) => {
      wKeyPressed(false);
    };
  };

  render() {
    const {
      gridCells,
      wKeyPressed,
      cellClick,
      dragNDrop,
      algorithms,
      currentAlg,
      onMouseDown,
      onMouseOver,
    } = this.props;

    return (
      <table className="table">
        <tbody>
          {gridCells.map((row, i) => (
            <tr key={i}>
              {row.map((col, j) => (
                <GridCell
                  key={j}
                  {...col}
                  wKeyPressed={wKeyPressed}
                  onCellClicked={(i, j) =>
                    cellClick(i, j, algorithms[currentAlg].type)
                  }
                  onDragDrop={dragNDrop}
                  mouseDown={onMouseDown}
                  mouseOver={(i, j) =>
                    onMouseOver(i, j, algorithms[currentAlg].type)
                  }
                ></GridCell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

const mapStateToProps = (state) => ({
  gridCells: state.grid.gridCells,
  rows: state.grid.rows,
  columns: state.grid.columns,
  playerPos: state.grid.playerPos,
  targetPos: state.grid.targetPos,
  enableVisualizeButton: state.grid.enableVisualizeButton,
  currentAlg: state.filter.currentAlg,
  algorithms: state.filter.algorithms,
});

const mapDispatchToProps = (dispatch) => ({
  buildGrid: () => dispatch(createGrid()),
  markVisited: (i, j) => dispatch(markCellVisited(i, j)),
  markSP: (i, j) => dispatch(markShortestPath(i, j)),
  findPath: () => dispatch(findPath(true)),
  wKeyPressed: (pressed) => dispatch(wKeyPress(pressed)),
  cellClick: (i, j, algType) => dispatch(cellClicked(i, j, algType)),
  dragNDrop: (i, j, type) => dispatch(dragDrop(i, j, type)),
  onMouseDown: (down) => dispatch(mouseDown(down)),
  onMouseOver: (i, j, algType) => dispatch(mouseOver(i, j, algType)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Grid);
