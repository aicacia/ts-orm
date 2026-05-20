import test from "tape";
import { createCTE, equal } from "../query/cte.js";
import { MemoryCollectionAdapter } from "./MemoryCollectionAdapter.js";

test("MemoryCollectionAdapter: applies CTE per subscriber and updates independently", async (t) => {
	const adapter = new MemoryCollectionAdapter<{
		id: string;
		role: "admin" | "user";
	}>({
		keyOf: (doc) => doc.id,
		initialDocs: [
			{ id: "1", role: "user" },
			{ id: "2", role: "admin" },
		],
	});

	const adminCte = createCTE<{ id: string; role: "admin" | "user" }>();
	adminCte.filters = [equal("role", "admin")];

	const userCte = createCTE<{ id: string; role: "admin" | "user" }>();
	userCte.filters = [equal("role", "user")];

	const adminUpdates: Array<Array<{ id: string; role: "admin" | "user" }>> = [];
	const userUpdates: Array<Array<{ id: string; role: "admin" | "user" }>> = [];

	adapter.subscribe(
		adminCte,
		(docs) => adminUpdates.push(docs),
		(error) => t.fail(error.message),
	);
	adapter.subscribe(
		userCte,
		(docs) => userUpdates.push(docs),
		(error) => t.fail(error.message),
	);

	t.deepEqual(adminUpdates[0], [{ id: "2", role: "admin" }]);
	t.deepEqual(userUpdates[0], [{ id: "1", role: "user" }]);

	await adapter.create({ id: "3", role: "admin" });
	t.deepEqual(adminUpdates[1], [
		{ id: "2", role: "admin" },
		{ id: "3", role: "admin" },
	]);
	t.deepEqual(userUpdates[1], [{ id: "1", role: "user" }]);

	await adapter.update("3", { role: "user" });
	t.deepEqual(adminUpdates[2], [{ id: "2", role: "admin" }]);
	t.deepEqual(userUpdates[2], [
		{ id: "1", role: "user" },
		{ id: "3", role: "user" },
	]);

	await adapter.delete("2");
	t.deepEqual(adminUpdates[3], []);
	t.deepEqual(userUpdates[3], [
		{ id: "1", role: "user" },
		{ id: "3", role: "user" },
	]);

	t.end();
});

test("MemoryCollectionAdapter: applies orderBy, offset, and limit", (t) => {
	const adapter = new MemoryCollectionAdapter<{ id: string; score: number }>({
		keyOf: (doc) => doc.id,
		initialDocs: [
			{ id: "a", score: 2 },
			{ id: "b", score: 1 },
			{ id: "c", score: 2 },
			{ id: "d", score: 3 },
		],
	});

	const cte = createCTE<{ id: string; score: number }>();
	cte.orderBy = [{ field: "score", direction: "asc" }];
	cte.offset = 1;
	cte.limit = 2;

	adapter.subscribe(
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
