declare global {
  interface Array<T> {
    uniq(): T[];
  }
}

Array.prototype.uniq = function<T>(): T[] {
  return [...new Set(this)];
}
