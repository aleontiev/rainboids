// Object pooling system for efficient memory management
export class PoolManager {
    constructor(ObjectClass, initialSize) {
        this.ObjectClass = ObjectClass;
        this.pool = [];
        this.activeObjects = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new ObjectClass());
        }
    }
    
    get(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = new this.ObjectClass();
        }
        obj.reset(...args);
        this.activeObjects.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.activeObjects.indexOf(obj);
        if (index > -1) {
            this.activeObjects.splice(index, 1);
            obj.active = false;
            this.pool.push(obj);
        }
    }
    
    updateActive(...args) {
        for (let i = this.activeObjects.length - 1; i >= 0; i--) {
            this.activeObjects[i].update(...args);
        }
    }
    
    drawActive() {
        this.activeObjects.forEach(obj => obj.draw());
    }
} 