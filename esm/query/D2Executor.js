import { D2, filter, MessageType } from "@electric-sql/d2ts";
import { getFieldValue } from "../field.js";
import { applySortPaginationToCTE, createFilterPredicate, } from "./CTEEvaluator.js";
import { createCTE } from "./cte.js";
function createPipeline(root, cte) {
    let stream = root;
    const filters = cte.filters;
    if (filters?.length) {
        const filterPredicate = (doc) => filters.every((filter) => createFilterPredicate(filter)(doc));
        stream = stream.pipe(filter(filterPredicate));
    }
    if (cte.orderBy?.length) {
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
        if (message.type === MessageType.DATA) {
            return flattenDocs(message.data.collection.getInner());
        }
    }
    return [];
}
export class D2Executor {
    execute(cte, source = [], joins = []) {
        const graph = new D2({ initialFrontier: 0 });
        const root = graph.newInput();
        const stream = createPipeline(root, cte);
        graph.finalize();
        const reader = stream.connectReader();
        let version = 0;
        let subscriber = null;
        const joinDefs = joins ?? [];
        const rightCache = new Map();
        let rightUnsubs = [];
        const getResults = () => {
            const dataVersion = version++;
            root.sendData(dataVersion, toMultiSetArray(source));
            root.sendFrontier(dataVersion);
            graph.run();
            const messages = reader.drain();
            const leftResults = applySortPaginationToCTE(extractDocuments(messages), cte);
            if (!joinDefs.length) {
                return leftResults;
            }
            let joinedResults = leftResults;
            for (const join of joinDefs) {
                const collectionId = join.collection.id;
                const rightDocs = rightCache.get(collectionId) ?? [];
                joinedResults = joinedResults
                    .map((left) => {
                    const leftKey = getFieldValue(left, join.leftField);
                    const matches = rightDocs.filter((right) => getFieldValue(right, (join.rightField ?? join.leftField)) === leftKey);
                    if (join.type === "inner" && matches.length === 0) {
                        return null;
                    }
                    return {
                        ...left,
                        [collectionId]: matches,
                    };
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
                    const unsub = join.collection.subscribe(createCTE(), (docs) => {
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
//# sourceMappingURL=D2Executor.js.map