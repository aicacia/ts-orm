import type { AdapterStatus, UnsubscribeFn } from "../types.js";
export interface SingletonAdapter<T> {
    subscribe(onUpdate: (value: T | undefined) => void, onError: (error: Error) => void): UnsubscribeFn;
    set(doc: T): Promise<void>;
    update(changes: Partial<T>): Promise<void>;
    getStatus(): AdapterStatus;
}
export interface SingletonConfig<T> {
    createSource: () => SingletonAdapter<T>;
}
export interface SingletonInterface<T> {
    subscribe(onUpdate: (value: T | undefined) => void, onError?: (error: Error) => void): UnsubscribeFn;
    set(doc: T): Promise<void>;
    update(changes: Partial<T>): Promise<void>;
    getStatus(): AdapterStatus;
    getSource(): SingletonAdapter<T>;
}
export declare class Singleton<T> implements SingletonInterface<T> {
    #private;
    constructor({ createSource }: SingletonConfig<T>);
    subscribe(onUpdate: (value: T | undefined) => void, onError?: (error: Error) => void): UnsubscribeFn;
    set(doc: T): Promise<void>;
    update(changes: Partial<T>): Promise<void>;
    getStatus(): AdapterStatus;
    getSource(): SingletonAdapter<T>;
}
export declare function createSingleton<T>(config: SingletonConfig<T>): SingletonInterface<T>;
//# sourceMappingURL=Singleton.d.ts.map