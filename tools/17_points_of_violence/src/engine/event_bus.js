export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(item => item !== callback));
  }

  emit(type, payload = {}) {
    for (const callback of this.listeners.get(type) || []) {
      callback(payload);
    }
  }
}
