import type {
	CollectionAdapter,
	CollectionAdapterOptions,
	CollectionInterface,
} from "../collection/Collection.js";
import { applyCTEToDocuments } from "../query/CTEEvaluator.js";
import type { CTE } from "../query/cte.js";
import type { AdapterStatus, UnsubscribeFn } from "../types.js";

export interface MemoryCollectionAdapterOptions<T>
	extends CollectionAdapterOptions<T> {
	initialDocs?: T[];
}

export class MemoryCollectionAdapter<T> implements CollectionAdapter<T> {
	#docs: T[];
	#status: AdapterStatus = { state: "idle" };
	#subscribers = new Set<{
		query: CTE<T>;
		onUpdate: (docs: T[]) => void;
		onError: (error: Error) => void;
	}>();
	#collection: CollectionInterface<T>;

	constructor({ collection, initialDocs }: MemoryCollectionAdapterOptions<T>) {
		this.#collection = collection;
		this.#docs = initialDocs ?? [];
	}

	subscribe(
		query: CTE<T>,
		onUpdate: (docs: T[]) => void,
		onError: (error: Error) => void,
	): UnsubscribeFn {
		const subscriber = { query, onUpdate, onError };
		this.#subscribers.add(subscriber);

		try {
			onUpdate(applyCTEToDocuments(this.#docs, query));
		} catch (error) {
			onError(error instanceof Error ? error : new Error(String(error)));
		}

		return () => {
			this.#subscribers.delete(subscriber);
		};
	}

	async create(doc: T): Promise<void> {
		this.#docs.push(doc);
		this.#setDocs();
	}

	async update(id: string, changes: Partial<T>): Promise<void> {
		const index = this.#docs.findIndex(
			(doc) => this.#collection.getKey(doc) === id,
		);

		if (index === -1) {
			throw new Error("Unable to update document without a current value");
		}

		this.#docs[index] = { ...this.#docs[index], ...changes } as T;
		this.#setDocs();
	}

	async delete(id: string): Promise<void> {
		const index = this.#docs.findIndex(
			(doc) => this.#collection.getKey(doc) === id,
		);

		if (index === -1) {
			throw new Error("Unable to delete document without a current value");
		}

		this.#docs.splice(index, 1);
		this.#setDocs();
	}

	getStatus(): AdapterStatus {
		return { ...this.#status };
	}

	#notifySubscribers(): void {
		for (const { query, onUpdate, onError } of this.#subscribers) {
			try {
				onUpdate(applyCTEToDocuments(this.#docs, query));
			} catch (error) {
				onError(error instanceof Error ? error : new Error(String(error)));
			}
		}
	}

	#setDocs(): void {
		this.#status = { state: "syncing" };
		this.#status = { state: "idle", lastSyncAt: Date.now() };
		this.#notifySubscribers();
	}
}
