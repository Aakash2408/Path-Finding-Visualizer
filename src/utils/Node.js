class Node {
  constructor(id, weight = 0, i, j) {
    this.id = id;
    this.next = null;
    this.weight = weight;
    this.i = i;
    this.j = j;
  }

  setWeight(w) {
    this.weight = w;
  }
}

export default Node;
