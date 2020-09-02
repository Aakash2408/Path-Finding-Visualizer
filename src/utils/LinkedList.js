import Node from "./Node";

class LinkedList {
  constructor() {
    this.head = null;
  }

  addNodeToList(id, weight = 0) {
    if (!this.checkIfNodeAlreadyExists(this.head, id)) {
      let newNode = new Node(id, weight);
      newNode.next = this.head;
      this.head = newNode;
    } else {
      //console.log("Node already exists in the neighbour list");
    }
  }

  checkIfNodeAlreadyExists(head, id) {
    let temp = head;
    while (temp !== null) {
      if (temp.id === id) {
        return true;
      }
      temp = temp.next;
    }
    return false;
  }
}

export default LinkedList;
