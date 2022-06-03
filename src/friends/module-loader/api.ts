/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import type ModuleLoader from 'friends/module-loader/class';

import { cache } from 'friends/module-loader/const';
import { resolveModule } from 'friends/module-loader/helpers';

import type { Module } from 'friends/module-loader/interface';

export * from 'friends/module-loader/interface';

/**
 * Adds the specified modules to a load bucket by the specified name.
 * Notice, adding modules don’t force them to load. To load the created bucket, use the `loadBucket` method.
 * The function returns the number of added modules in the bucket.
 *
 * @param bucketName
 * @param modules
 */
export function addModulesToBucket(this: ModuleLoader, bucketName: string, ...modules: Module[]): number {
	let
		bucket = this.loadBuckets.get(bucketName);

	if (bucket == null) {
		bucket = new Set();
		this.loadBuckets.set(bucketName, bucket);
	}

	for (let i = 0; i < modules.length; i++) {
		const
			module = modules[i];

		if (module.id != null) {
			if (!cache.has(module.id)) {
				cache.set(module.id, module);
			}
		}

		bucket.add(module);
	}

	return bucket.size;
}

/**
 * Loads the specified modules.
 * If some modules are already loaded, they won’t be loaded twice.
 * If all specified modules are already loaded, the function returns a simple value, but not a promise.
 * The resulting value is designed to use with [[AsyncRender]].
 *
 * @param modules
 */
export function load(this: ModuleLoader, ...modules: Module[]): CanPromise<IterableIterator<Module[]>> {
	const
		tasks: Array<Promise<unknown>> = [];

	for (let i = 0; i < modules.length; i++) {
		const
			module = modules[i],
			resolvedModule = resolveModule.call(this, module);

		if (Object.isPromise(resolvedModule)) {
			tasks.push(resolvedModule);
		}
	}

	const
		i = [modules].values();

	if (tasks.length === 0) {
		return i;
	}

	return this.async.promise(Promise.all(tasks)).then(() => i);
}

/**
 * Loads a bucket of modules by the specified name.
 * If some modules are already loaded, they won’t be loaded twice.
 * If all specified modules are already loaded, the function returns a simple value, but not a promise.
 * The resulting value is designed to use with [[AsyncRender]].
 *
 * @param bucketName
 */
export function loadBucket(this: ModuleLoader, bucketName: string): CanPromise<IterableIterator<Module[]>> {
	const bucket = this.loadBuckets.get(bucketName) ?? new Set();
	return load.call(this, ...bucket);
}
