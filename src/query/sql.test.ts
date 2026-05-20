import test from "tape";
import {
	and,
	containsIgnoreCase,
	createCTE,
	equal,
	greaterThan,
	inCTE,
} from "./cte.js";
import { cteToSQL } from "./sql.js";

test("cteToSQL: compiles PostgreSQL query with nested CTE and positional params", (t) => {
	const cte = createCTE<{
		id: string;
		age: number;
		name: string;
		status: string;
	}>();
	cte.name = "users";
	cte.ctes = {
		active_users: {
			version: "1.0",
			name: "users",
			filters: [equal("status", "active")],
		},
	};
	cte.filters = [
		and(greaterThan("age", 21), containsIgnoreCase("name", "al")),
		inCTE("active_users", "id"),
	];
	cte.orderBy = [{ field: "age", direction: "desc" }];
	cte.limit = 10;
	cte.offset = 5;

	const result = cteToSQL(cte, { dialect: "postgresql" });

	t.equal(
		result.sql,
		'WITH "active_users" AS (SELECT "t0".* FROM "users" AS "t0" WHERE "t0"."status" = $1) SELECT "t0".* FROM "users" AS "t0" WHERE ("t0"."age" > $2 AND LOWER(CAST("t0"."name" AS TEXT)) LIKE LOWER($3)) AND "t0"."id" IN (SELECT "id" FROM "active_users") ORDER BY "t0"."age" DESC LIMIT $4 OFFSET $5',
	);
	t.deepEqual(result.params, ["active", 21, "%al%", 10, 5]);
	t.end();
});

test("cteToSQL: compiles SQLite query with '?' placeholders", (t) => {
	const cte = createCTE<{ id: number; title: string }>();
	cte.filters = [containsIgnoreCase("title", "fox")];
	cte.limit = 25;

	const result = cteToSQL(cte, {
		dialect: "sqlite",
		tableName: "posts",
	});

	t.equal(
		result.sql,
		'SELECT "t0".* FROM "posts" AS "t0" WHERE LOWER(CAST("t0"."title" AS TEXT)) LIKE LOWER(?) LIMIT ?',
	);
	t.deepEqual(result.params, ["%fox%", 25]);
	t.end();
});

test("cteToSQL: compiles MySQL query with backtick identifiers", (t) => {
	const cte = createCTE<{ id: number; age: number; user_id: number }>();
	cte.name = "users";
	cte.joins = [
		{
			collectionId: "profiles",
			leftField: "id",
			rightField: "user_id",
			type: "left",
		},
	];
	cte.filters = [greaterThan("age", 18)];

	const result = cteToSQL(cte, { dialect: "mysql" });

	t.equal(
		result.sql,
		"SELECT `t0`.* FROM `users` AS `t0` LEFT JOIN `profiles` AS `j1` ON `t0`.`id` = `j1`.`user_id` WHERE `t0`.`age` > ?",
	);
	t.deepEqual(result.params, [18]);
	t.end();
});

test("cteToSQL: throws when table name is missing", (t) => {
	const cte = createCTE<{ id: string }>();

	t.throws(
		() => cteToSQL(cte, { dialect: "postgresql" }),
		/missing table name/i,
	);
	t.end();
});

test("cteToSQL: throws for fuzzyContains", (t) => {
	const cte = createCTE<{ name: string }>();
	cte.name = "users";
	cte.filters = [
		{
			type: "comparison",
			operator: "fuzzyContains",
			field: "name",
			value: "Alice",
		},
	];

	t.throws(
		() => cteToSQL(cte, { dialect: "postgresql" }),
		/fuzzycontains is not supported/i,
	);
	t.end();
});
