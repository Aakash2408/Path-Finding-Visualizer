class Queue {
  constructor() {
    this.arr = [];
  }

  enquque(node) {
    try {
      this.arr.push(node);
    } catch (error) {
      new Error(error);
    }
  }

  dequeue() {
    return this.arr.shift();
  }

  size() {
    return this.arr.length;
  }

  isEmpty() {
    return this.arr.length === 0;
  }
}

export default Queue;
