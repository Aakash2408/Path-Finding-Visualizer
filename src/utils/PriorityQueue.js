class PriorityQueue {
  constructor() {
    this.arr = [];
    this.indexMap = new Map();
  }

  buildMinHeap() {
    if (!this.isEmpty()) {
      let i = Math.floor(this.arr.length / 2) - 1;
      while (i >= 0) {
        this.minHeapify(i);
        i--;
      }
    }
  }

  minHeapify(i) {
    let left = 2 * i + 1;
    let right = 2 * i + 2;

    if (left < this.arr.length && this.arr[i].weight > this.arr[left].weight) {
      this.swap(i, left);
      this.minHeapify(left);
    }
    if (
      right < this.arr.length &&
      this.arr[i].weight > this.arr[right].weight
    ) {
      this.swap(i, right);
      this.minHeapify(right);
    }
  }

  enqeue(node) {
    try {
      this.arr.push(node);
      this.indexMap.set(node.id, this.arr.length - 1);
      this.buildMinHeap();
    } catch (error) {
      throw new Error(error);
    }
  }

  dequeue() {
    if (!this.isEmpty()) {
      if (this.arr.length === 1) {
        let node = this.arr.pop();
        this.indexMap = new Map();
        return node;
      } else {
        let node = this.arr[0];

        this.arr[0] = this.arr.pop();
        this.indexMap.set(this.arr[0].id, 0);
        this.indexMap.delete(node.id);
        this.minHeapify(0);
        return node;
      }
    } else {
      throw new Error("Priority Queue is empty");
    }
  }

  peek(id) {
    if (this.containsKey(id)) {
      return this.arr[this.indexMap.get(id)];
    } else {
      throw new Error("Queue is empty");
    }
  }

  swap(a, b) {
    let temp = this.arr[a];

    this.arr[a] = this.arr[b];
    this.arr[b] = temp;

    this.indexMap.set(this.arr[a].id, a);
    this.indexMap.set(this.arr[b].id, b);
  }

  decreaseKey(id, val) {
    if (this.containsKey(id)) {
      this.arr[this.indexMap.get(id)].weight = val;
      this.buildMinHeap();
    } else {
      throw new Error(`Node with id(${id}) not found`);
    }
  }

  containsKey(id) {
    return this.indexMap.has(id) && this.indexMap.get(id) < this.arr.length;
  }

  isEmpty() {
    return this.arr.length === 0;
  }
}

export default PriorityQueue;
