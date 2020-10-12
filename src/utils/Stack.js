class Stack {
  constructor() {
    this.arr = [];
  }

  push(data) {
    try {
      this.arr.push(data);
    } catch (error) {
      throw new Error(error);
    }
  }

  pop() {
    if (this.arr.length > 0) {
      let data = this.arr.pop();
      return data;
    } else {
      throw new Error("Stack is empty");
    }
  }

  isEmpty() {
    return this.arr.length === 0;
  }

  size() {
    return this.arr.length;
  }
}

export default Stack;
