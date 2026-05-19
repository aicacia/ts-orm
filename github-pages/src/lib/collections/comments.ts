import { createCollection, MemoryCollectionAdapter } from "@aicacia/orm";
import * as v from "valibot";

export const commentSchema = v.object({
	id: v.string(),
	recipeId: v.string(),
	author: v.string(),
	text: v.string(),
	createdAt: v.date(),
	updatedAt: v.date(),
});

export type Comment = v.InferOutput<typeof commentSchema>;

export const commentsCollection = createCollection({
	id: "comments",
	createSource: (keyOf) =>
		new MemoryCollectionAdapter<Comment>({
			keyOf,
			initialDocs: [],
		}),
	keyOf: (doc: Comment) => doc.id,
});
