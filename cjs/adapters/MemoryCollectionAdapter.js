"use strict";
var _MemoryCollectionAdapter_instances, _MemoryCollectionAdapter_docs, _MemoryCollectionAdapter_status, _MemoryCollectionAdapter_subscribers, _MemoryCollectionAdapter_collection, _MemoryCollectionAdapter_notifySubscribers, _MemoryCollectionAdapter_setDocs;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCollectionAdapter = void 0;
const tslib_1 = require("tslib");
const CTEEvaluator_js_1 = require("../query/CTEEvaluator.js");
class MemoryCollectionAdapter {
    constructor({ collection, initialDocs }) {
        _MemoryCollectionAdapter_instances.add(this);
        _MemoryCollectionAdapter_docs.set(this, void 0);
        _MemoryCollectionAdapter_status.set(this, { state: "idle" });
        _MemoryCollectionAdapter_subscribers.set(this, new Set());
        _MemoryCollectionAdapter_collection.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _MemoryCollectionAdapter_collection, collection, "f");
        tslib_1.__classPrivateFieldSet(this, _MemoryCollectionAdapter_docs, initialDocs !== null && initialDocs !== void 0 ? initialDocs : [], "f");
    }
    subscribe(query, onUpdate, onError) {
        const subscriber = { query, onUpdate, onError };
        tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f").add(subscriber);
        try {
            onUpdate((0, CTEEvaluator_js_1.applyCTEToDocuments)(tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f"), query));
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
        return () => {
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f").delete(subscriber);
        };
    }
    create(doc) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").push(doc);
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
        });
    }
    update(id, changes) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const index = tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").findIndex((doc) => tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_collection, "f").getKey(doc) === id);
            if (index === -1) {
                throw new Error("Unable to update document without a current value");
            }
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f")[index] = Object.assign(Object.assign({}, tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f")[index]), changes);
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
        });
    }
    delete(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const index = tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").findIndex((doc) => tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_collection, "f").getKey(doc) === id);
            if (index === -1) {
                throw new Error("Unable to delete document without a current value");
            }
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").splice(index, 1);
            tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
        });
    }
    getStatus() {
        return Object.assign({}, tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_status, "f"));
    }
}
exports.MemoryCollectionAdapter = MemoryCollectionAdapter;
_MemoryCollectionAdapter_docs = new WeakMap(), _MemoryCollectionAdapter_status = new WeakMap(), _MemoryCollectionAdapter_subscribers = new WeakMap(), _MemoryCollectionAdapter_collection = new WeakMap(), _MemoryCollectionAdapter_instances = new WeakSet(), _MemoryCollectionAdapter_notifySubscribers = function _MemoryCollectionAdapter_notifySubscribers() {
    for (const { query, onUpdate, onError } of tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f")) {
        try {
            onUpdate((0, CTEEvaluator_js_1.applyCTEToDocuments)(tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f"), query));
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
}, _MemoryCollectionAdapter_setDocs = function _MemoryCollectionAdapter_setDocs() {
    tslib_1.__classPrivateFieldSet(this, _MemoryCollectionAdapter_status, { state: "syncing" }, "f");
    tslib_1.__classPrivateFieldSet(this, _MemoryCollectionAdapter_status, { state: "idle", lastSyncAt: Date.now() }, "f");
    tslib_1.__classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_notifySubscribers).call(this);
};
//# sourceMappingURL=MemoryCollectionAdapter.js.map