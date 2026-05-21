"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComparisonPredicate = createComparisonPredicate;
exports.createLogicalPredicate = createLogicalPredicate;
exports.createFilterPredicate = createFilterPredicate;
exports.applyFiltersToDocuments = applyFiltersToDocuments;
exports.applySortPaginationToCTE = applySortPaginationToCTE;
exports.applyCTEToDocuments = applyCTEToDocuments;
const string_fuzzy_equals_1 = require("@aicacia/string-fuzzy_equals");
const field_js_1 = require("../field.js");
const sort_js_1 = require("./sort.js");
function createComparisonPredicate(filter) {
    const fieldValue = (doc) => (0, field_js_1.getFieldValue)(doc, filter.field);
    const expected = filter.value;
    switch (filter.operator) {
        case "equal":
            return (doc) => fieldValue(doc) === expected;
        case "notEqual":
            return (doc) => fieldValue(doc) !== expected;
        case "greaterThan":
            return (doc) => (0, sort_js_1.compareValues)(fieldValue(doc), expected) > 0;
        case "lessThan":
            return (doc) => (0, sort_js_1.compareValues)(fieldValue(doc), expected) < 0;
        case "greaterThanOrEqual":
            return (doc) => (0, sort_js_1.compareValues)(fieldValue(doc), expected) >= 0;
        case "lessThanOrEqual":
            return (doc) => (0, sort_js_1.compareValues)(fieldValue(doc), expected) <= 0;
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
                    return (0, string_fuzzy_equals_1.fuzzyEquals)(expected, value, false);
                }
                if (Array.isArray(value)) {
                    return value.some((item) => typeof item === "string" && (0, string_fuzzy_equals_1.fuzzyEquals)(expected, item, false));
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
function createLogicalPredicate(filter) {
    const predicates = filter.filters.map(createFilterPredicate);
    if (filter.operator === "and") {
        return (doc) => predicates.every((predicate) => predicate(doc));
    }
    return (doc) => predicates.some((predicate) => predicate(doc));
}
function createFilterPredicate(filter) {
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
function applyFiltersToDocuments(docs, cte) {
    var _a;
    if (!((_a = cte.filters) === null || _a === void 0 ? void 0 : _a.length)) {
        return docs.slice();
    }
    const filterPredicate = (doc) => { var _a; return (_a = cte.filters) === null || _a === void 0 ? void 0 : _a.every((filter) => createFilterPredicate(filter)(doc)); };
    return docs.filter(filterPredicate);
}
function applySortPaginationToCTE(results, cte) {
    var _a, _b;
    let orderedResults = results;
    const orderBy = cte.orderBy;
    if (orderBy === null || orderBy === void 0 ? void 0 : orderBy.length) {
        orderedResults = (0, sort_js_1.stableSortWithTieBreaker)([...results], (a, b) => (0, sort_js_1.compareOrderValues)(a, b, orderBy));
    }
    const offset = (_a = cte.offset) !== null && _a !== void 0 ? _a : 0;
    const limit = (_b = cte.limit) !== null && _b !== void 0 ? _b : orderedResults.length;
    return orderedResults.slice(offset, offset + limit);
}
function applyCTEToDocuments(docs, cte) {
    return applySortPaginationToCTE(applyFiltersToDocuments(docs, cte), cte);
}
//# sourceMappingURL=CTEEvaluator.js.map