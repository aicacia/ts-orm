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
	keyOf: (doc: T) => string;
}

export interface CollectionConfig<T> {
	id: string;
	createSource: (keyOf: (doc: T) => string) => CollectionAdapter<T>;
	keyOf: (doc: T) => string;
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
	getKeyOf(): (doc: T) => string;
	getSource(): CollectionAdapter<T>;
}

export class Collection<T> implements CollectionInterface<T> {
	readonly #id: string;
	readonly #source: CollectionAdapter<T>;
	readonly #keyOf: (doc: T) => string;

	constructor({ id, createSource, keyOf }: CollectionConfig<T>) {
		this.#id = id;
		this.#keyOf = keyOf;
		this.#source = createSource(keyOf);
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
		return new QueryBuilder({ adapter: this.#source });
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

	getKeyOf(): (doc: T) => string {
		return this.#keyOf;
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
