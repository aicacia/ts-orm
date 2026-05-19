import type { AdapterStatus, UnsubscribeFn } from "../types.js";

export interface SingletonAdapter<T> {
	subscribe(
		onUpdate: (value: T | undefined) => void,
		onError: (error: Error) => void,
	): UnsubscribeFn;
	set(doc: T): Promise<void>;
	update(changes: Partial<T>): Promise<void>;
	getStatus(): AdapterStatus;
}

export interface SingletonConfig<T> {
	createSource: () => SingletonAdapter<T>;
}

export interface SingletonInterface<T> {
	subscribe(
		onUpdate: (value: T | undefined) => void,
		onError?: (error: Error) => void,
	): UnsubscribeFn;
	set(doc: T): Promise<void>;
	update(changes: Partial<T>): Promise<void>;
	getStatus(): AdapterStatus;
	getSource(): SingletonAdapter<T>;
}

export class Singleton<T> implements SingletonInterface<T> {
	readonly #source: SingletonAdapter<T>;

	constructor({ createSource }: SingletonConfig<T>) {
		this.#source = createSource();
	}

	subscribe(
		onUpdate: (value: T | undefined) => void,
		onError: (error: Error) => void = () => {},
	): UnsubscribeFn {
		return this.#source.subscribe(onUpdate, onError);
	}

	set(doc: T): Promise<void> {
		return this.#source.set(doc);
	}

	update(changes: Partial<T>): Promise<void> {
		return this.#source.update(changes);
	}

	getStatus(): AdapterStatus {
		return this.#source.getStatus();
	}

	getSource(): SingletonAdapter<T> {
		return this.#source;
	}
}

export function createSingleton<T>(
	config: SingletonConfig<T>,
): SingletonInterface<T> {
	return new Singleton(config);
}
