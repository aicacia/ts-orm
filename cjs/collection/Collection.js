"use strict";
var _Collection_id, _Collection_source, _Collection_getPrimaryKey, _Collection_getKey;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collection = void 0;
exports.defaultGetPrimaryKey = defaultGetPrimaryKey;
exports.defaultGetKey = defaultGetKey;
exports.createCollection = createCollection;
const tslib_1 = require("tslib");
const QueryBuilder_js_1 = require("../query/QueryBuilder.js");
function defaultGetPrimaryKey() {
    return "id";
}
function defaultGetKey(doc) {
    if (typeof doc.id === "string") {
        return doc.id;
    }
    throw new Error("Document is missing a string 'id' field");
}
class Collection {
    constructor({ id, getPrimaryKey = defaultGetPrimaryKey, getKey = defaultGetKey, createSource, }) {
        _Collection_id.set(this, void 0);
        _Collection_source.set(this, void 0);
        _Collection_getPrimaryKey.set(this, void 0);
        _Collection_getKey.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _Collection_id, id, "f");
        tslib_1.__classPrivateFieldSet(this, _Collection_getPrimaryKey, getPrimaryKey, "f");
        tslib_1.__classPrivateFieldSet(this, _Collection_getKey, getKey, "f");
        tslib_1.__classPrivateFieldSet(this, _Collection_source, createSource(this), "f");
    }
    get id() {
        return tslib_1.__classPrivateFieldGet(this, _Collection_id, "f");
    }
    create(doc) {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f").create(doc);
    }
    update(id, changes) {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f").update(id, changes);
    }
    delete(id) {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f").delete(id);
    }
    query() {
        return new QueryBuilder_js_1.QueryBuilder({ name: this.id, adapter: tslib_1.__classPrivateFieldGet(this, _Collection_source, "f") });
    }
    subscribe(query, onUpdate, onError = () => { }) {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f").subscribe(query, onUpdate, onError);
    }
    getStatus() {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f").getStatus();
    }
    getPrimaryKey() {
        return tslib_1.__classPrivateFieldGet(this, _Collection_getPrimaryKey, "f").call(this);
    }
    getKey(doc) {
        return tslib_1.__classPrivateFieldGet(this, _Collection_getKey, "f").call(this, doc);
    }
    getSource() {
        return tslib_1.__classPrivateFieldGet(this, _Collection_source, "f");
    }
}
exports.Collection = Collection;
_Collection_id = new WeakMap(), _Collection_source = new WeakMap(), _Collection_getPrimaryKey = new WeakMap(), _Collection_getKey = new WeakMap();
function createCollection(config) {
    return new Collection(config);
}
//# sourceMappingURL=Collection.js.map