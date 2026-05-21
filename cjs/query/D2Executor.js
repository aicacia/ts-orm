"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.D2Executor = void 0;
const d2ts_1 = require("@electric-sql/d2ts");
const field_js_1 = require("../field.js");
const CTEEvaluator_js_1 = require("./CTEEvaluator.js");
const cte_js_1 = require("./cte.js");
function createPipeline(root, cte) {
    var _a;
    let stream = root;
    const filters = cte.filters;
    if (filters === null || filters === void 0 ? void 0 : filters.length) {
        const filterPredicate = (doc) => filters.every((filter) => (0, CTEEvaluator_js_1.createFilterPredicate)(filter)(doc));
        stream = stream.pipe((0, d2ts_1.filter)(filterPredicate));
    }
    if ((_a = cte.orderBy) === null || _a === void 0 ? void 0 : _a.length) {
        // Order and pagination are applied after extraction because the current
        // d2ts orderBy operator is not reliable for this query shape.
    }
    return stream;
}
function toMultiSetArray(docs) {
    return docs.map((doc) => [doc, 1]);
}
function flattenDocs(collection) {
    return collection.flatMap(([value, multiplicity]) => Array.from({ length: Math.max(0, multiplicity) }, () => value));
}
function extractDocuments(messages) {
    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index];
        if (message.type === d2ts_1.MessageType.DATA) {
            return flattenDocs(message.data.collection.getInner());
        }
    }
    return [];
}
class D2Executor {
    execute(cte, source = [], joins = []) {
        const graph = new d2ts_1.D2({ initialFrontier: 0 });
        const root = graph.newInput();
        const stream = createPipeline(root, cte);
        graph.finalize();
        const reader = stream.connectReader();
        let version = 0;
        let subscriber = null;
        const joinDefs = joins !== null && joins !== void 0 ? joins : [];
        const rightCache = new Map();
        let rightUnsubs = [];
        const getResults = () => {
            var _a;
            const dataVersion = version++;
            root.sendData(dataVersion, toMultiSetArray(source));
            root.sendFrontier(dataVersion);
            graph.run();
            const messages = reader.drain();
            const leftResults = (0, CTEEvaluator_js_1.applySortPaginationToCTE)(extractDocuments(messages), cte);
            if (!joinDefs.length) {
                return leftResults;
            }
            let joinedResults = leftResults;
            for (const join of joinDefs) {
                const collectionId = join.collection.id;
                const rightDocs = (_a = rightCache.get(collectionId)) !== null && _a !== void 0 ? _a : [];
                joinedResults = joinedResults
                    .map((left) => {
                    const leftKey = (0, field_js_1.getFieldValue)(left, join.leftField);
                    const matches = rightDocs.filter((right) => {
                        var _a;
                        return (0, field_js_1.getFieldValue)(right, ((_a = join.rightField) !== null && _a !== void 0 ? _a : join.leftField)) === leftKey;
                    });
                    if (join.type === "inner" && matches.length === 0) {
                        return null;
                    }
                    return Object.assign(Object.assign({}, left), { [collectionId]: matches });
                })
                    .filter((r) => r !== null);
            }
            return joinedResults;
        };
        const publish = () => {
            if (!subscriber) {
                return;
            }
            try {
                subscriber.onUpdate(getResults());
            }
            catch (error) {
                if (subscriber.onError) {
                    subscriber.onError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        };
        return {
            subscribe(onUpdate, onError) {
                subscriber = { onUpdate, onError };
                rightUnsubs = [];
                for (const join of joinDefs) {
                    const collectionId = join.collection.id;
                    const unsub = join.collection.subscribe((0, cte_js_1.createCTE)(), (docs) => {
                        rightCache.set(collectionId, docs.slice());
                        publish();
                    }, onError);
                    rightUnsubs.push(unsub);
                }
                publish();
                return () => {
                    subscriber = null;
                    for (const u of rightUnsubs)
                        u();
                    rightUnsubs = [];
                };
            },
        };
    }
}
exports.D2Executor = D2Executor;
//# sourceMappingURL=D2Executor.js.map