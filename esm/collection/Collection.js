var _Collection_id, _Collection_source, _Collection_getPrimaryKey, _Collection_getKey;
import { __classPrivateFieldGet, __classPrivateFieldSet } from "tslib";
import { QueryBuilder } from "../query/QueryBuilder.js";
export function defaultGetPrimaryKey() {
    return "id";
}
export function defaultGetKey(doc) {
    if (typeof doc.id === "string") {
        return doc.id;
    }
    throw new Error("Document is missing a string 'id' field");
}
export class Collection {
    constructor({ id, getPrimaryKey = defaultGetPrimaryKey, getKey = defaultGetKey, createSource, }) {
        _Collection_id.set(this, void 0);
        _Collection_source.set(this, void 0);
        _Collection_getPrimaryKey.set(this, void 0);
        _Collection_getKey.set(this, void 0);
        __classPrivateFieldSet(this, _Collection_id, id, "f");
        __classPrivateFieldSet(this, _Collection_getPrimaryKey, getPrimaryKey, "f");
        __classPrivateFieldSet(this, _Collection_getKey, getKey, "f");
        __classPrivateFieldSet(this, _Collection_source, createSource(this), "f");
    }
    get id() {
        return __classPrivateFieldGet(this, _Collection_id, "f");
    }
    create(doc) {
        return __classPrivateFieldGet(this, _Collection_source, "f").create(doc);
    }
    update(id, changes) {
        return __classPrivateFieldGet(this, _Collection_source, "f").update(id, changes);
    }
    delete(id) {
        return __classPrivateFieldGet(this, _Collection_source, "f").delete(id);
    }
    query() {
        return new QueryBuilder({ name: this.id, adapter: __classPrivateFieldGet(this, _Collection_source, "f") });
    }
    subscribe(query, onUpdate, onError = () => { }) {
        return __classPrivateFieldGet(this, _Collection_source, "f").subscribe(query, onUpdate, onError);
    }
    getStatus() {
        return __classPrivateFieldGet(this, _Collection_source, "f").getStatus();
    }
    getPrimaryKey() {
        return __classPrivateFieldGet(this, _Collection_getPrimaryKey, "f").call(this);
    }
    getKey(doc) {
        return __classPrivateFieldGet(this, _Collection_getKey, "f").call(this, doc);
    }
    getSource() {
        return __classPrivateFieldGet(this, _Collection_source, "f");
    }
}
_Collection_id = new WeakMap(), _Collection_source = new WeakMap(), _Collection_getPrimaryKey = new WeakMap(), _Collection_getKey = new WeakMap();
export function createCollection(config) {
    return new Collection(config);
}
//# sourceMappingURL=Collection.js.map