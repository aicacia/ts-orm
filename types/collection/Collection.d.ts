import type { CTE } from "../query/cte.js";
import type { QueryBuilderInterface } from "../query/QueryBuilder.js";
import type { AdapterStatus, UnsubscribeFn } from "../types.js";
export interface CollectionAdapter<T> {
    subscribe(query: CTE<T>, onUpdate: (docs: T[]) => void, onError: (error: Error) => void): UnsubscribeFn;
    create(doc: T): Promise<void>;
    update(id: string, changes: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    getStatus(): AdapterStatus;
}
export interface CollectionAdapterOptions<T> {
    collection: CollectionInterface<T>;
}
export interface CollectionConfig<T> {
    id: string;
    getPrimaryKey?: () => string;
    getKey?: (doc: T) => string;
    createSource: (collection: CollectionInterface<T>) => CollectionAdapter<T>;
}
export declare function defaultGetPrimaryKey(): string;
export declare function defaultGetKey(doc: Record<string, unknown>): string;
export interface CollectionInterface<T> {
    readonly id: string;
    create(doc: T): Promise<void>;
    update(id: string, changes: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    query(): QueryBuilderInterface<T>;
    subscribe(query: CTE<T>, onUpdate: (docs: T[]) => void, onError?: (error: Error) => void): UnsubscribeFn;
    getStatus(): AdapterStatus;
    getPrimaryKey(): string;
    getKey(doc: T): string;
    getSource(): CollectionAdapter<T>;
}
export declare class Collection<T> implements CollectionInterface<T> {
    #private;
    constructor({ id, getPrimaryKey, getKey, createSource, }: CollectionConfig<T>);
    get id(): string;
    create(doc: T): Promise<void>;
    update(id: string, changes: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    query(): QueryBuilderInterface<T>;
    subscribe(query: CTE<T>, onUpdate: (docs: T[]) => void, onError?: (error: Error) => void): UnsubscribeFn;
    getStatus(): AdapterStatus;
    getPrimaryKey(): string;
    getKey(doc: T): string;
    getSource(): CollectionAdapter<T>;
}
export declare function createCollection<T>(config: CollectionConfig<T>): CollectionInterface<T>;
//# sourceMappingURL=Collection.d.ts.map