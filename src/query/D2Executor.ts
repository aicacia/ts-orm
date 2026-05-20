import type {
	IStreamBuilder,
	Message,
	MultiSetArray,
	RootStreamBuilder,
} from "@electric-sql/d2ts";
import { D2, filter, MessageType } from "@electric-sql/d2ts";
import type { FieldPath } from "../field.js";
import { getFieldValue } from "../field.js";
import {
	applySortPaginationToCTE,
	createFilterPredicate,
} from "./CTEEvaluator.js";
import type { CTE } from "./cte.js";
import { createCTE } from "./cte.js";
import type {
	QueryExecutor,
	QueryJoinDescriptor,
	QuerySubscription,
} from "./executor.js";

function createPipeline<T>(
	root: RootStreamBuilder<T>,
	cte: CTE<T>,
): IStreamBuilder<T> {
	let stream: IStreamBuilder<T> = root;

	const filters = cte.filters;
	if (filters?.length) {
		const filterPredicate = (doc: T) =>
			filters.every((filter) => createFilterPredicate(filter)(doc));
		stream = stream.pipe(filter(filterPredicate));
	}

	if (cte.orderBy?.length) {
		// Order and pagination are applied after extraction because the current
		// d2ts orderBy operator is not reliable for this query shape.
	}

	return stream;
}

function toMultiSetArray<T>(docs: T[]): MultiSetArray<T> {
	return docs.map((doc) => [doc, 1]);
}

function flattenDocs<T>(collection: MultiSetArray<T>): T[] {
	return collection.flatMap(([value, multiplicity]) =>
		Array.from({ length: Math.max(0, multiplicity) }, () => value),
	);
}

function extractDocuments<T>(messages: Message<T>[]): T[] {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.type === MessageType.DATA) {
			return flattenDocs(message.data.collection.getInner());
		}
	}

	return [];
}

export class D2Executor<T> implements QueryExecutor<T> {
	execute(
		cte: CTE<T>,
		source: T[] = [],
		joins: QueryJoinDescriptor[] = [],
	): QuerySubscription<T> {
		const graph = new D2({ initialFrontier: 0 });
		const root = graph.newInput<T>();
		const stream = createPipeline(root, cte);
		graph.finalize();

		const reader = stream.connectReader();
		let version = 0;
		let subscriber: {
			onUpdate: (values: T[]) => void;
			onError?: (error: Error) => void;
		} | null = null;

		const joinDefs = joins ?? [];
		const rightCache = new Map<string, unknown[]>();
		let rightUnsubs: Array<() => void> = [];

		const getResults = () => {
			const dataVersion = version++;
			root.sendData(dataVersion, toMultiSetArray(source));
			root.sendFrontier(dataVersion);
			graph.run();

			const messages = reader.drain();
			const leftResults = applySortPaginationToCTE(
				extractDocuments(messages),
				cte,
			);

			if (!joinDefs.length) {
				return leftResults;
			}

			let joinedResults: unknown[] = leftResults as unknown[];
			for (const join of joinDefs) {
				const collectionId = join.collection.id;
				const rightDocs = rightCache.get(collectionId) ?? [];
				joinedResults = joinedResults
					.map((left) => {
						const leftKey = getFieldValue(
							left as T,
							join.leftField as unknown as FieldPath<T>,
						);
						const matches = (rightDocs as unknown[]).filter(
							(right) =>
								getFieldValue(
									right as Record<string, unknown>,
									(join.rightField ?? join.leftField) as unknown as FieldPath<
										Record<string, unknown>
									>,
								) === leftKey,
						);

						if (join.type === "inner" && matches.length === 0) {
							return null;
						}

						return {
							...(left as object),
							[collectionId]: matches,
						};
					})
					.filter((r) => r !== null);
			}

			return joinedResults as T[];
		};

		const publish = () => {
			if (!subscriber) {
				return;
			}

			try {
				subscriber.onUpdate(getResults());
			} catch (error) {
				if (subscriber.onError) {
					subscriber.onError(
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			}
		};

		return {
			subscribe(onUpdate, onError) {
				subscriber = { onUpdate, onError };

				rightUnsubs = [];
				for (const join of joinDefs) {
					const collectionId = join.collection.id;
					const unsub = join.collection.subscribe(
						createCTE(),
						(docs: unknown[]) => {
							rightCache.set(collectionId, docs.slice());
							publish();
						},
						onError,
					);
					rightUnsubs.push(unsub);
				}

				publish();
				return () => {
					subscriber = null;
					for (const u of rightUnsubs) u();
					rightUnsubs = [];
				};
			},
		};
	}
}
