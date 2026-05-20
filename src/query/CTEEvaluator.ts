import { fuzzyEquals } from "@aicacia/string-fuzzy_equals";
import { getFieldValue } from "../field.js";
import type {
	CTE,
	CTEComparisonFilter,
	CTEFilter,
	CTELogicalFilter,
} from "./cte.js";
import {
	compareOrderValues,
	compareValues,
	stableSortWithTieBreaker,
} from "./sort.js";

export function createComparisonPredicate<T>(
	filter: CTEComparisonFilter<T>,
): (doc: T) => boolean {
	const fieldValue = (doc: T) => getFieldValue(doc, filter.field);
	const expected = filter.value;

	switch (filter.operator) {
		case "equal":
			return (doc: T) => fieldValue(doc) === expected;
		case "notEqual":
			return (doc: T) => fieldValue(doc) !== expected;
		case "greaterThan":
			return (doc: T) => compareValues(fieldValue(doc), expected) > 0;
		case "lessThan":
			return (doc: T) => compareValues(fieldValue(doc), expected) < 0;
		case "greaterThanOrEqual":
			return (doc: T) => compareValues(fieldValue(doc), expected) >= 0;
		case "lessThanOrEqual":
			return (doc: T) => compareValues(fieldValue(doc), expected) <= 0;
		case "in": {
			if (Array.isArray(expected)) {
				const expectedSet = new Set(expected);
				return (doc: T) => expectedSet.has(fieldValue(doc));
			}

			return (doc: T) => fieldValue(doc) === expected;
		}
		case "contains":
			return (doc: T) => {
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
			return (doc: T) => {
				const value = fieldValue(doc);
				if (typeof value === "string") {
					return value.toLowerCase().includes(expectedLower);
				}
				if (Array.isArray(value)) {
					return value.some(
						(item) =>
							typeof item === "string" &&
							item.toLowerCase().includes(expectedLower),
					);
				}
				return false;
			};
		}
		case "fuzzyContains": {
			if (typeof expected !== "string") {
				return () => false;
			}

			return (doc: T) => {
				const value = fieldValue(doc);
				if (typeof value === "string") {
					return fuzzyEquals(expected, value, false);
				}
				if (Array.isArray(value)) {
					return value.some(
						(item) =>
							typeof item === "string" && fuzzyEquals(expected, item, false),
					);
				}
				return false;
			};
		}
		case "includes":
			return (doc: T) => {
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

export function createLogicalPredicate<T>(
	filter: CTELogicalFilter<T>,
): (doc: T) => boolean {
	const predicates = filter.filters.map(createFilterPredicate);

	if (filter.operator === "and") {
		return (doc: T) => predicates.every((predicate) => predicate(doc));
	}

	return (doc: T) => predicates.some((predicate) => predicate(doc));
}

export function createFilterPredicate<T>(
	filter: CTEFilter<T>,
): (doc: T) => boolean {
	switch (filter.type) {
		case "comparison":
			return createComparisonPredicate(filter as CTEComparisonFilter<T>);
		case "logical":
			return createLogicalPredicate(filter as CTELogicalFilter<T>);
		case "reference":
			throw new Error(
				"Reference filters are not supported for d2ts incremental queries",
			);
		default:
			return () => true;
	}
}

export function applyFiltersToDocuments<T>(docs: T[], cte: CTE<T>): T[] {
	if (!cte.filters?.length) {
		return docs.slice();
	}

	const filterPredicate = (doc: T) =>
		cte.filters?.every((filter) => createFilterPredicate(filter)(doc));

	return docs.filter(filterPredicate);
}

export function applySortPaginationToCTE<T>(results: T[], cte: CTE<T>): T[] {
	let orderedResults = results;

	const orderBy = cte.orderBy;
	if (orderBy?.length) {
		orderedResults = stableSortWithTieBreaker([...results], (a, b) =>
			compareOrderValues(a, b, orderBy),
		);
	}

	const offset = cte.offset ?? 0;
	const limit = cte.limit ?? orderedResults.length;
	return orderedResults.slice(offset, offset + limit);
}

export function applyCTEToDocuments<T>(docs: T[], cte: CTE<T>): T[] {
	return applySortPaginationToCTE(applyFiltersToDocuments(docs, cte), cte);
}
