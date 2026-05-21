import { fuzzyEquals } from "@aicacia/string-fuzzy_equals";
import { getFieldValue } from "../field.js";
import { compareOrderValues, compareValues, stableSortWithTieBreaker, } from "./sort.js";
export function createComparisonPredicate(filter) {
    const fieldValue = (doc) => getFieldValue(doc, filter.field);
    const expected = filter.value;
    switch (filter.operator) {
        case "equal":
            return (doc) => fieldValue(doc) === expected;
        case "notEqual":
            return (doc) => fieldValue(doc) !== expected;
        case "greaterThan":
            return (doc) => compareValues(fieldValue(doc), expected) > 0;
        case "lessThan":
            return (doc) => compareValues(fieldValue(doc), expected) < 0;
        case "greaterThanOrEqual":
            return (doc) => compareValues(fieldValue(doc), expected) >= 0;
        case "lessThanOrEqual":
            return (doc) => compareValues(fieldValue(doc), expected) <= 0;
        case "in": {
            if (Array.isArray(expected)) {
                const expectedSet = new Set(expected);
                return (doc) => expectedSet.has(fieldValue(doc));
            }
            return (doc) => fieldValue(doc) === expected;
        }
        case "contains":
            return (doc) => {
                const value = fieldValue(doc);
                if (typeof value === "string" && typeof expected === "string") {
                    return value.includes(expected);
                }
                if (Array.isArray(value)) {
                    return value.includes(expected);
                }
                return false;
            };
        case "containsIgnoreCase": {
            if (typeof expected !== "string") {
                return () => false;
            }
            const expectedLower = expected.toLowerCase();
            return (doc) => {
                const value = fieldValue(doc);
                if (typeof value === "string") {
                    return value.toLowerCase().includes(expectedLower);
                }
                if (Array.isArray(value)) {
                    return value.some((item) => typeof item === "string" &&
                        item.toLowerCase().includes(expectedLower));
                }
                return false;
            };
        }
        case "fuzzyContains": {
            if (typeof expected !== "string") {
                return () => false;
            }
            return (doc) => {
                const value = fieldValue(doc);
                if (typeof value === "string") {
                    return fuzzyEquals(expected, value, false);
                }
                if (Array.isArray(value)) {
                    return value.some((item) => typeof item === "string" && fuzzyEquals(expected, item, false));
                }
                return false;
            };
        }
        case "includes":
            return (doc) => {
                const value = fieldValue(doc);
                if (Array.isArray(value)) {
                    return value.includes(expected);
                }
                if (typeof value === "string" && typeof expected === "string") {
                    return value.includes(expected);
                }
                return false;
            };
        default:
            return () => false;
    }
}
export function createLogicalPredicate(filter) {
    const predicates = filter.filters.map(createFilterPredicate);
    if (filter.operator === "and") {
        return (doc) => predicates.every((predicate) => predicate(doc));
    }
    return (doc) => predicates.some((predicate) => predicate(doc));
}
export function createFilterPredicate(filter) {
    switch (filter.type) {
        case "comparison":
            return createComparisonPredicate(filter);
        case "logical":
            return createLogicalPredicate(filter);
        case "reference":
            throw new Error("Reference filters are not supported for d2ts incremental queries");
        default:
            return () => true;
    }
}
export function applyFiltersToDocuments(docs, cte) {
    if (!cte.filters?.length) {
        return docs.slice();
    }
    const filterPredicate = (doc) => cte.filters?.every((filter) => createFilterPredicate(filter)(doc));
    return docs.filter(filterPredicate);
}
export function applySortPaginationToCTE(results, cte) {
    let orderedResults = results;
    const orderBy = cte.orderBy;
    if (orderBy?.length) {
        orderedResults = stableSortWithTieBreaker([...results], (a, b) => compareOrderValues(a, b, orderBy));
    }
    const offset = cte.offset ?? 0;
    const limit = cte.limit ?? orderedResults.length;
    return orderedResults.slice(offset, offset + limit);
}
export function applyCTEToDocuments(docs, cte) {
    return applySortPaginationToCTE(applyFiltersToDocuments(docs, cte), cte);
}
//# sourceMappingURL=CTEEvaluator.js.map