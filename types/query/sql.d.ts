import type { CTE } from "./cte.js";
export type SQLDialect = "postgresql" | "sqlite" | "mysql";
export interface CTESQLBuildOptions {
    dialect: SQLDialect;
    tableName?: string;
    primaryKey?: string;
}
export interface CTESQLResult {
    sql: string;
    params: unknown[];
}
export declare function cteToSQL<T>(cte: CTE<T>, options: CTESQLBuildOptions): CTESQLResult;
//# sourceMappingURL=sql.d.ts.map