function quoteIdentifier(identifier, dialect) {
    if (dialect === "mysql") {
        return `\`${identifier.replace(/`/g, "``")}\``;
    }
    return `"${identifier.replace(/"/g, '""')}"`;
}
function quotePath(path, dialect) {
    return path
        .split(".")
        .filter((part) => part.length > 0)
        .map((part) => quoteIdentifier(part, dialect))
        .join(".");
}
function toFieldExpression(alias, field, dialect) {
    if (field.includes(".")) {
        return quotePath(field, dialect);
    }
    return `${quoteIdentifier(alias, dialect)}.${quoteIdentifier(field, dialect)}`;
}
function castText(expression, dialect) {
    return dialect === "mysql"
        ? `CAST(${expression} AS CHAR)`
        : `CAST(${expression} AS TEXT)`;
}
function pushParam(state, value) {
    state.params.push(value);
    state.paramIndex += 1;
    if (state.dialect === "postgresql") {
        return `$${state.paramIndex}`;
    }
    return "?";
}
function compileComparisonFilter(filter, alias, state) {
    const field = toFieldExpression(alias, String(filter.field), state.dialect);
    switch (filter.operator) {
        case "equal":
            return `${field} = ${pushParam(state, filter.value)}`;
        case "notEqual":
            return `${field} != ${pushParam(state, filter.value)}`;
        case "greaterThan":
            return `${field} > ${pushParam(state, filter.value)}`;
        case "lessThan":
            return `${field} < ${pushParam(state, filter.value)}`;
        case "greaterThanOrEqual":
            return `${field} >= ${pushParam(state, filter.value)}`;
        case "lessThanOrEqual":
            return `${field} <= ${pushParam(state, filter.value)}`;
        case "in": {
            if (!Array.isArray(filter.value)) {
                return `${field} = ${pushParam(state, filter.value)}`;
            }
            if (filter.value.length === 0) {
                return "1 = 0";
            }
            const placeholders = filter.value.map((value) => pushParam(state, value));
            return `${field} IN (${placeholders.join(", ")})`;
        }
        case "contains":
        case "includes": {
            const pattern = `%${String(filter.value)}%`;
            return `${castText(field, state.dialect)} LIKE ${pushParam(state, pattern)}`;
        }
        case "containsIgnoreCase": {
            const pattern = `%${String(filter.value)}%`;
            return `LOWER(${castText(field, state.dialect)}) LIKE LOWER(${pushParam(state, pattern)})`;
        }
        case "fuzzyContains":
            throw new Error("fuzzyContains is not supported in SQL output; use a database-specific similarity function");
        default:
            return "1 = 1";
    }
}
function compileLogicalFilter(filter, alias, state) {
    if (filter.filters.length === 0) {
        return filter.operator === "and" ? "1 = 1" : "1 = 0";
    }
    const joiner = filter.operator === "and" ? " AND " : " OR ";
    return `(${filter.filters
        .map((nestedFilter) => compileFilter(nestedFilter, alias, state))
        .join(joiner)})`;
}
function compileReferenceFilter(filter, alias, state) {
    const fieldName = String(filter.field ?? state.primaryKey);
    const leftExpression = toFieldExpression(alias, fieldName, state.dialect);
    const rightExpression = quotePath(fieldName, state.dialect);
    const operator = filter.operator === "in" ? "IN" : "NOT IN";
    return `${leftExpression} ${operator} (SELECT ${rightExpression} FROM ${quoteIdentifier(filter.cteName, state.dialect)})`;
}
function compileFilter(filter, alias, state) {
    switch (filter.type) {
        case "comparison":
            return compileComparisonFilter(filter, alias, state);
        case "logical":
            return compileLogicalFilter(filter, alias, state);
        case "reference":
            return compileReferenceFilter(filter, alias, state);
        default:
            return "1 = 1";
    }
}
function compileCTEBody(cte, tableName, state) {
    const alias = "t0";
    let sql = `SELECT ${quoteIdentifier(alias, state.dialect)}.* FROM ${quotePath(tableName, state.dialect)} AS ${quoteIdentifier(alias, state.dialect)}`;
    if (cte.joins?.length) {
        const joins = cte.joins.map((join, index) => {
            const joinAlias = `j${index + 1}`;
            const leftField = toFieldExpression(alias, join.leftField, state.dialect);
            const rightField = toFieldExpression(joinAlias, join.rightField ?? join.leftField, state.dialect);
            const joinType = join.type === "inner" ? "INNER JOIN" : "LEFT JOIN";
            return `${joinType} ${quotePath(join.collectionId, state.dialect)} AS ${quoteIdentifier(joinAlias, state.dialect)} ON ${leftField} = ${rightField}`;
        });
        sql = `${sql} ${joins.join(" ")}`;
    }
    if (cte.filters?.length) {
        const filters = cte.filters.map((filter) => compileFilter(filter, alias, state));
        sql = `${sql} WHERE ${filters.join(" AND ")}`;
    }
    if (cte.orderBy?.length) {
        const orderByParts = cte.orderBy.map(({ field, direction }) => {
            const normalizedDirection = direction === "desc" ? "DESC" : "ASC";
            return `${toFieldExpression(alias, String(field), state.dialect)} ${normalizedDirection}`;
        });
        sql = `${sql} ORDER BY ${orderByParts.join(", ")}`;
    }
    if (cte.limit !== undefined) {
        sql = `${sql} LIMIT ${pushParam(state, cte.limit)}`;
    }
    if (cte.offset !== undefined) {
        sql = `${sql} OFFSET ${pushParam(state, cte.offset)}`;
    }
    return sql;
}
function compileNamedCTEs(cte, state, seen) {
    if (!cte.ctes) {
        return [];
    }
    const sqlParts = [];
    for (const [cteName, nested] of Object.entries(cte.ctes)) {
        if (seen.has(cteName)) {
            throw new Error(`Circular CTE reference detected for '${cteName}'`);
        }
        seen.add(cteName);
        sqlParts.push(...compileNamedCTEs(nested, state, seen));
        const nestedTableName = nested.name ?? cteName;
        const nestedBody = compileCTEBody(nested, nestedTableName, state);
        sqlParts.push(`${quoteIdentifier(cteName, state.dialect)} AS (${nestedBody})`);
        seen.delete(cteName);
    }
    return sqlParts;
}
export function cteToSQL(cte, options) {
    const tableName = options.tableName ?? cte.name;
    if (!tableName) {
        throw new Error("Missing table name. Provide options.tableName or set cte.name before converting to SQL");
    }
    const state = {
        paramIndex: 0,
        params: [],
        dialect: options.dialect,
        primaryKey: options.primaryKey ?? "id",
    };
    const namedCTEs = compileNamedCTEs(cte, state, new Set());
    const mainBody = compileCTEBody(cte, tableName, state);
    const sql = namedCTEs.length
        ? `WITH ${namedCTEs.join(", ")} ${mainBody}`
        : mainBody;
    return {
        sql,
        params: state.params,
    };
}
//# sourceMappingURL=sql.js.map