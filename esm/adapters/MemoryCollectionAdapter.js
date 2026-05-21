var _MemoryCollectionAdapter_instances, _MemoryCollectionAdapter_docs, _MemoryCollectionAdapter_status, _MemoryCollectionAdapter_subscribers, _MemoryCollectionAdapter_collection, _MemoryCollectionAdapter_notifySubscribers, _MemoryCollectionAdapter_setDocs;
import { __classPrivateFieldGet, __classPrivateFieldSet } from "tslib";
import { applyCTEToDocuments } from "../query/CTEEvaluator.js";
export class MemoryCollectionAdapter {
    constructor({ collection, initialDocs }) {
        _MemoryCollectionAdapter_instances.add(this);
        _MemoryCollectionAdapter_docs.set(this, void 0);
        _MemoryCollectionAdapter_status.set(this, { state: "idle" });
        _MemoryCollectionAdapter_subscribers.set(this, new Set());
        _MemoryCollectionAdapter_collection.set(this, void 0);
        __classPrivateFieldSet(this, _MemoryCollectionAdapter_collection, collection, "f");
        __classPrivateFieldSet(this, _MemoryCollectionAdapter_docs, initialDocs ?? [], "f");
    }
    subscribe(query, onUpdate, onError) {
        const subscriber = { query, onUpdate, onError };
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f").add(subscriber);
        try {
            onUpdate(applyCTEToDocuments(__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f"), query));
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
        return () => {
            __classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f").delete(subscriber);
        };
    }
    async create(doc) {
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").push(doc);
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
    }
    async update(id, changes) {
        const index = __classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").findIndex((doc) => __classPrivateFieldGet(this, _MemoryCollectionAdapter_collection, "f").getKey(doc) === id);
        if (index === -1) {
            throw new Error("Unable to update document without a current value");
        }
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f")[index] = { ...__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f")[index], ...changes };
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
    }
    async delete(id) {
        const index = __classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").findIndex((doc) => __classPrivateFieldGet(this, _MemoryCollectionAdapter_collection, "f").getKey(doc) === id);
        if (index === -1) {
            throw new Error("Unable to delete document without a current value");
        }
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f").splice(index, 1);
        __classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_setDocs).call(this);
    }
    getStatus() {
        return { ...__classPrivateFieldGet(this, _MemoryCollectionAdapter_status, "f") };
    }
}
_MemoryCollectionAdapter_docs = new WeakMap(), _MemoryCollectionAdapter_status = new WeakMap(), _MemoryCollectionAdapter_subscribers = new WeakMap(), _MemoryCollectionAdapter_collection = new WeakMap(), _MemoryCollectionAdapter_instances = new WeakSet(), _MemoryCollectionAdapter_notifySubscribers = function _MemoryCollectionAdapter_notifySubscribers() {
    for (const { query, onUpdate, onError } of __classPrivateFieldGet(this, _MemoryCollectionAdapter_subscribers, "f")) {
        try {
            onUpdate(applyCTEToDocuments(__classPrivateFieldGet(this, _MemoryCollectionAdapter_docs, "f"), query));
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
}, _MemoryCollectionAdapter_setDocs = function _MemoryCollectionAdapter_setDocs() {
    __classPrivateFieldSet(this, _MemoryCollectionAdapter_status, { state: "syncing" }, "f");
    __classPrivateFieldSet(this, _MemoryCollectionAdapter_status, { state: "idle", lastSyncAt: Date.now() }, "f");
    __classPrivateFieldGet(this, _MemoryCollectionAdapter_instances, "m", _MemoryCollectionAdapter_notifySubscribers).call(this);
};
//# sourceMappingURL=MemoryCollectionAdapter.js.map