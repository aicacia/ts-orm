import test from "tape";
import { MemoryCollectionAdapter } from "../adapters/MemoryCollectionAdapter.js";
import { createCTE } from "../query/cte.js";
import { createCollection } from "./Collection.js";

test("Collection: delegates create/update/delete/subscribe/getStatus/getSource/getKey/getPrimaryKey through MemoryCollectionAdapter", async (t) => {
	const collection = createCollection<{ id: string; name: string }>({
		id: "test",
		createSource: (collection) =>
			new MemoryCollectionAdapter({
				collection,
				initialDocs: [{ id: "1", name: "first" }],
			}),
		getPrimaryKey: () => "id",
		getKey: (doc) => doc.id,
	});

	const updates: Array<Array<{ id: string; name: string }>> = [];

	collection.subscribe(
		createCTE(),
		(docs) => updates.push(docs),
		(error) => t.fail(error.message),
	);

	t.deepEqual(updates, [[{ id: "1", name: "first" }]]);

	await collection.create({ id: "2", name: "second" });
	t.deepEqual(updates, [
		[{ id: "1", name: "first" }],
		[
			{ id: "1", name: "first" },
			{ id: "2", name: "second" },
		],
	]);

	await collection.update("1", { name: "first-updated" });
	t.deepEqual(updates[2], [
		{ id: "1", name: "first-updated" },
		{ id: "2", name: "second" },
	]);

	await collection.delete("2");
	t.deepEqual(updates[3], [{ id: "1", name: "first-updated" }]);

	t.equal(collection.getSource(), collection.getSource());
	t.equal(collection.getStatus().state, "idle");
	t.equal(collection.getPrimaryKey(), "id");
	t.equal(collection.getKey({ id: "x", name: "x" }), "x");
	t.end();
});

test("Collection.query: builds a QueryBuilder from adapter docs", (t) => {
	type User = { id: string; name: string };

	const collection = createCollection<User>({
		id: "test-query",
		createSource: (collection) =>
			new MemoryCollectionAdapter({
				collection,
				initialDocs: [{ id: "1", name: "first" }],
			}),
		getPrimaryKey: () => "id",
		getKey: (doc) => doc.id,
	});

	const updates: Array<Array<User>> = [];

	collection.query().subscribe(
		(docs) => updates.push(docs),
		(error) => t.fail(error.message),
	);

	t.deepEqual(updates, [[{ id: "1", name: "first" }]]);
	t.end();
});
