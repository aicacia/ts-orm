export interface AdapterStatus {
	state: "idle" | "syncing" | "offline" | "error";
	lastSyncAt?: number;
	error?: Error;
}

export type UnsubscribeFn = () => void;
