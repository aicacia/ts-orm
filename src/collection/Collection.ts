import type { CTE } from "../query/cte.js";
import type { QueryBuilderInterface } from "../query/QueryBuilder.js";
import { QueryBuilder } from "../query/QueryBuilder.js";
import type { AdapterStatus, UnsubscribeFn } from "../types.js";

export interface CollectionAdapter<T> {
	subscribe(
		query: CTE<T>,
		onUpdate: (docs: T[]) => void,
		onError: (error: Error) => void,
	): UnsubscribeFn;
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

export function defaultGetPrimaryKey(): string {
	return "id";
}

export function defaultGetKey(doc: Record<string, unknown>): string {
	if (typeof doc.id === "string") {
		return doc.id;
	}
	throw new Error("Document is missing a string 'id' field");
}

export interface CollectionInterface<T> {
	readonly id: string;

	create(doc: T): Promise<void>;
	update(id: string, changes: Partial<T>): Promise<void>;
	delete(id: string): Promise<void>;
	query(): QueryBuilderInterface<T>;
	subscribe(
		query: CTE<T>,
		onUpdate: (docs: T[]) => void,
		onError?: (error: Error) => void,
	): UnsubscribeFn;
	getStatus(): AdapterStatus;
	getPrimaryKey(): string;
	getKey(doc: T): string;
	getSource(): CollectionAdapter<T>;
}

export class Collection<T> implements CollectionInterface<T> {
	readonly #id: string;
	readonly #source: CollectionAdapter<T>;
	readonly #getPrimaryKey: () => string;
	readonly #getKey: (doc: T) => string;

	constructor({
		id,
		getPrimaryKey = defaultGetPrimaryKey,
		getKey = defaultGetKey as (doc: T) => string,
		createSource,
	}: CollectionConfig<T>) {
		this.#id = id;
		this.#getPrimaryKey = getPrimaryKey;
		this.#getKey = getKey;
		this.#source = createSource(this);
	}

	get id() {
		return this.#id;
	}

	create(doc: T): Promise<void> {
		return this.#source.create(doc);
	}

	update(id: string, changes: Partial<T>): Promise<void> {
		return this.#source.update(id, changes);
	}

	delete(id: string): Promise<void> {
		return this.#source.delete(id);
	}

	query(): QueryBuilderInterface<T> {
		return new QueryBuilder({ name: this.id, adapter: this.#source });
	}

	subscribe(
		query: CTE<T>,
		onUpdate: (docs: T[]) => void,
		onError: (error: Error) => void = () => {},
	): UnsubscribeFn {
		return this.#source.subscribe(query, onUpdate, onError);
	}

	getStatus(): AdapterStatus {
		return this.#source.getStatus();
	}

	getPrimaryKey(): string {
		return this.#getPrimaryKey();
	}

	getKey(doc: T): string {
		return this.#getKey(doc);
	}

	getSource(): CollectionAdapter<T> {
		return this.#source;
	}
}

export function createCollection<T>(
	config: CollectionConfig<T>,
): CollectionInterface<T> {
	return new Collection(config);
}
