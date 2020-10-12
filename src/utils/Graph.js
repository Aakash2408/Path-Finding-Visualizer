import LinkedList from "./LinkedList";

class Graph {
  constructor() {
    this.adjList = new Map();
  }

  createGraphVertex(id) {
    if (!this.adjList.has(id)) {
      this.adjList.set(id, new LinkedList());
    } else {
      throw new Error("Graph vertex already exists");
    }
  }

  addPathBetweenVertices(id1, id2, weight = 0) {
    if (this.adjList.has(id1)) {
      this.adjList.get(id1).addNodeToList(id2, weight);
    } else {
      throw new Error("Vertices were not found");
    }
  }
}

export default Graph;
