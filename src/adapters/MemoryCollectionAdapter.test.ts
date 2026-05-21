import test from "tape";
import { createCollection } from "../collection/Collection.js";
import { createCTE, equal } from "../query/cte.js";
import { MemoryCollectionAdapter } from "./MemoryCollectionAdapter.js";

test("MemoryCollectionAdapter: applies CTE per subscriber and updates independently", async (t) => {
	type User = { id: string; role: "user" | "admin" };

	const collection = createCollection<User>({
		id: "users",
		getPrimaryKey: () => "id",
		getKey: (doc) => doc.id,
		createSource: (collection) =>
			new MemoryCollectionAdapter({
				collection,
				initialDocs: [
					{ id: "1", role: "user" },
					{ id: "2", role: "admin" },
				],
			}),
	});

	const adminCte = createCTE<User>();
	adminCte.filters = [equal("role", "admin")];

	const userCte = createCTE<User>();
	userCte.filters = [equal("role", "user")];

	const adminUpdates: Array<Array<User>> = [];
	const userUpdates: Array<Array<User>> = [];

	collection.subscribe(
		adminCte,
		(docs) => adminUpdates.push(docs),
		(error) => t.fail(error.message),
	);
	collection.subscribe(
		userCte,
		(docs) => userUpdates.push(docs),
		(error) => t.fail(error.message),
	);

	t.deepEqual(adminUpdates[0], [{ id: "2", role: "admin" }]);
	t.deepEqual(userUpdates[0], [{ id: "1", role: "user" }]);

	await collection.create({ id: "3", role: "admin" });
	t.deepEqual(adminUpdates[1], [
		{ id: "2", role: "admin" },
		{ id: "3", role: "admin" },
	]);
	t.deepEqual(userUpdates[1], [{ id: "1", role: "user" }]);

	await collection.update("3", { role: "user" });
	t.deepEqual(adminUpdates[2], [{ id: "2", role: "admin" }]);
	t.deepEqual(userUpdates[2], [
		{ id: "1", role: "user" },
		{ id: "3", role: "user" },
	]);

	await collection.delete("2");
	t.deepEqual(adminUpdates[3], []);
	t.deepEqual(userUpdates[3], [
		{ id: "1", role: "user" },
		{ id: "3", role: "user" },
	]);

	t.end();
});

test("MemoryCollectionAdapter: applies orderBy, offset, and limit", (t) => {
	type Score = { id: string; score: number };

	const collection = createCollection<Score>({
		id: "users",
		getPrimaryKey: () => "id",
		getKey: (doc) => doc.id,
		createSource: (collection) =>
			new MemoryCollectionAdapter({
				collection,
				initialDocs: [
					{ id: "a", score: 2 },
					{ id: "b", score: 1 },
					{ id: "c", score: 2 },
					{ id: "d", score: 3 },
				],
			}),
	});

	const cte = createCTE<{ id: string; score: number }>();
	cte.orderBy = [{ field: "score", direction: "asc" }];
	cte.offset = 1;
	cte.limit = 2;

	collection.subscribe(
		cte,
		(docs) => {
			t.deepEqual(
				docs.map((doc) => doc.id),
				["a", "c"],
			);
		},
		(error) => t.fail(error.message),
	);

	t.end();
});
