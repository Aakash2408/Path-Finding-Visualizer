import FILTER_TYPES from './filterTypes';

const INITIAL_STATE = {
  algorithms: [
    {
      id: 0,
      type: 'unweighted',
      name: 'Breadth First Search',
      abbreviation: 'BFS',
      description: 'BFS is unweighted & gives shortest path',
      complexity: 'O(V+E)',
    },
    {
      id: 1,
      type: 'unweighted',
      name: 'Depth First Search',
      abbreviation: 'DFS',
      description: "DFS is unweighted & doesn't guarantee shortest path",
      complexity: ' O(V+E)',
    },
    {
      id: 2,
      type: 'weighted',
      name: "Dijkstra's Algorithm",
      description: 'Dijkstra algorithm is weighted & guarantees shortest path',
      complexity: 'O(E + VlogV)',
    },
    {
      id: 3,
      type: 'weighted',
      name: 'A* Algorithm',
      description: 'A* (pronounced "A-star") is a graph traversal and path search algorithm, which is often used in computer science due to its completeness, optimality, and optimal efficiency. One major practical drawback is its O(b^d) space complexity, as it stores all generated nodes in memory. Thus, in practical travel-routing systems, it is generally outperformed by algorithms which can pre-process the graph to attain better performance, as well as memory-bounded approaches; however, A* is still the best solution in many cases.',
    },
    {
      id: 4,
      type: 'weighted',
      name: 'Bidirectional Dijkstra',
      description:
        'Bidirectional Dijkstra is weighted & guarantees shortest path',
      complexity: 'O(E + VlogV)',
    },
    {
      id: 5,
      type: 'weighted',
      name: 'Bidirectional A*',
      description: 'Bidirectional A* uses heuristics to find the shortest path',
    },
  ],
  currentAlg: 0,
};

const filterReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case FILTER_TYPES.CHOOSE_ALGO:
      return {
        ...state,
        currentAlg: action.payload,
      };

    default:
      return state;
  }
};

export default filterReducer;
