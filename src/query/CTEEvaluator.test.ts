import test from "tape";
import {
	applyCTEToDocuments,
	applySortPaginationToCTE,
	createFilterPredicate,
} from "./CTEEvaluator.js";
import { createCTE, greaterThan } from "./cte.js";

test("CTEEvaluator: applyCTEToDocuments filters, sorts, and paginates", (t) => {
	const docs = [
		{ id: "1", age: 18 },
		{ id: "2", age: 35 },
		{ id: "3", age: 25 },
		{ id: "4", age: 42 },
	];

	const cte = createCTE<(typeof docs)[number]>();
	cte.filters = [greaterThan("age", 20)];
	cte.orderBy = [{ field: "age", direction: "desc" }];
	cte.offset = 1;
	cte.limit = 2;

	const result = applyCTEToDocuments(docs, cte);

	t.deepEqual(result, [
		{ id: "2", age: 35 },
		{ id: "3", age: 25 },
	]);
	t.end();
});

test("CTEEvaluator: applySortPaginationToCTE keeps stable ordering on ties", (t) => {
	const docs = [
		{ id: "1", score: 10 },
		{ id: "2", score: 10 },
		{ id: "3", score: 20 },
	];

	const cte = createCTE<(typeof docs)[number]>();
	cte.orderBy = [{ field: "score", direction: "asc" }];

	const result = applySortPaginationToCTE(docs, cte);

	t.deepEqual(
		result.map((doc) => doc.id),
		["1", "2", "3"],
	);
	t.end();
});

test("CTEEvaluator: createFilterPredicate throws for reference filters", (t) => {
	t.throws(
		() =>
			createFilterPredicate({
				type: "reference",
				operator: "in",
				cteName: "other_cte",
			}),
		/reference filters are not supported/i,
	);
	t.end();
});
