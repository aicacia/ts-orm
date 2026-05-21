import type { CTE, CTEComparisonFilter, CTEFilter, CTELogicalFilter } from "./cte.js";
export declare function createComparisonPredicate<T>(filter: CTEComparisonFilter<T>): (doc: T) => boolean;
export declare function createLogicalPredicate<T>(filter: CTELogicalFilter<T>): (doc: T) => boolean;
export declare function createFilterPredicate<T>(filter: CTEFilter<T>): (doc: T) => boolean;
export declare function applyFiltersToDocuments<T>(docs: T[], cte: CTE<T>): T[];
export declare function applySortPaginationToCTE<T>(results: T[], cte: CTE<T>): T[];
export declare function applyCTEToDocuments<T>(docs: T[], cte: CTE<T>): T[];
//# sourceMappingURL=CTEEvaluator.d.ts.map