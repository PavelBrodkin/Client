/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

/**
 * [[include:super/i-block/modules/state/README.md]]
 * @packageDocumentation
 */

import symbolGenerator from 'core/symbol';

import iBlock from 'super/i-block/i-block';
import Friend from 'super/i-block/modules/friend';

export * from 'super/i-block/modules/state/interface';

export const
	$$ = symbolGenerator();

let
	baseSyncRouterState,
	baseConvertStateToRouterReset;

/**
 * Class provides some helper methods to initialize a component state
 */
export default class State extends Friend {
	/**
	 * True if needed synchronization with a router
	 */
	get needRouterSync(): boolean {
		const {instance: i} = this;
		return baseSyncRouterState !== i.syncRouterState || baseConvertStateToRouterReset !== i.convertStateToRouterReset;
	}

	/** @see [[iBlock.instance]] */
	protected get instance(): this['CTX']['instance'] {
		// @ts-ignore (access)
		// eslint-disable-next-line @typescript-eslint/unbound-method
		baseSyncRouterState = baseSyncRouterState ?? iBlock.prototype.syncRouterState;

		// @ts-ignore (access)
		// eslint-disable-next-line @typescript-eslint/unbound-method
		baseConvertStateToRouterReset = baseConvertStateToRouterReset ?? iBlock.prototype.convertStateToRouterReset;
		return this.ctx.instance;
	}

	/**
	 * Retrieves object values and saves it to a state of the current component
	 * @param data
	 */
	set(data: Nullable<Dictionary>): boolean {
		if (!data) {
			return true;
		}

		for (let keys = Object.keys(data), i = 0; i < keys.length; i++) {
			const
				key = keys[i],
				el = data[key],
				p = key.split('.');

			if (p[0] === 'mods') {
				void this.ctx.setMod(p[1], el);

			} else if (!Object.fastCompare(el, this.field.get(key))) {
				this.field.set(key, el);
			}
		}

		return false;
	}

	/**
	 * Saves a state of the current component to a local storage
	 * @param [data] - additional data to save
	 */
	async saveToStorage(data?: Dictionary): Promise<boolean> {
		//#if runtime has core/kv-storage

		if (this.globalName == null) {
			return false;
		}

		const
			{ctx} = this;

		data = ctx.syncStorageState(data, 'remote');
		this.set(ctx.syncStorageState(data));

		await this.storage.set(data, '[[STORE]]');
		ctx.log('state:save:storage', this, data);

		return true;

		//#endif
	}

	/**
	 * Initializes a state of the current component from a local storage
	 */
	async initFromStorage(): Promise<boolean> {
		//#if runtime has core/kv-storage

		if (this.globalName == null) {
			return false;
		}

		const
			key = $$.pendingLocalStore;

		if (this[key] != null) {
			return this[key];
		}

		const
			{ctx} = this;

		const
			storeWatchers = {group: 'storeWatchers'},
			$a = this.async.clearAll(storeWatchers);

		return this[key] = $a.promise(async () => {
			const
				data = await this.storage.get('[[STORE]]');

			await this.lfc.execCbAtTheRightTime(() => {
				const
					stateFields = ctx.syncStorageState(data);

				this.set(
					stateFields
				);

				const sync = $a.debounce(this.saveToStorage.bind(this), 0, {
					label: $$.syncLocalStorage
				});

				if (Object.isDictionary(stateFields)) {
					for (let keys = Object.keys(stateFields), i = 0; i < keys.length; i++) {
						const
							key = keys[i],
							p = key.split('.');

						if (p[0] === 'mods') {
							$a.on(this.localEmitter, `block.mod.*.${p[1]}.*`, sync, storeWatchers);

						} else {
							ctx.watch(key, (val, ...args) => {
								if (!Object.fastCompare(val, args[0])) {
									sync();
								}
							}, {
								...storeWatchers,
								deep: true
							});
						}
					}
				}

				ctx.log('state:init:storage', this, stateFields);
			});

			return true;

		}, {
			group: 'loadStore',
			join: true
		});

		//#endif
	}

	/**
	 * Resets a storage state of the current component
	 */
	async resetStorage(): Promise<boolean> {
		//#if runtime has core/kv-storage

		if (this.globalName == null) {
			return false;
		}

		const
			{ctx} = this;

		const
			stateFields = ctx.convertStateToStorageReset();

		this.set(
			stateFields
		);

		await this.saveToStorage();
		ctx.log('state:reset:storage', this, stateFields);
		return true;

		//#endif
	}

	/**
	 * Saves a state of the current component to a router
	 * @param [data] - additional data to save
	 */
	async saveToRouter(data?: Dictionary): Promise<boolean> {
		//#if runtime has bRouter

		if (!this.needRouterSync) {
			return false;
		}

		const
			{ctx} = this,
			{router} = ctx.r;

		data = ctx.syncRouterState(data, 'remote');
		this.set(ctx.syncRouterState(data));

		if (!ctx.isActivated || !router) {
			return false;
		}

		await router.push(null, {
			query: data
		});

		ctx.log('state:save:router', this, data);
		return true;

		//#endif
	}

	/**
	 * Initializes a state of the current component from a router
	 */
	async initFromRouter(): Promise<boolean> {
		//#if runtime has bRouter

		if (!this.needRouterSync) {
			return false;
		}

		const
			{ctx} = this;

		const
			routerWatchers = {group: 'routerWatchers'},
			$a = this.async.clearAll(routerWatchers);

		await this.lfc.execCbAtTheRightTime(async () => {
			const
				{r} = ctx;

			let
				{router} = r;

			if (!router) {
				await ($a.promisifyOnce(r, 'initRouter', {
					label: $$.initFromRouter
				}));

				({router} = r);
			}

			if (!router) {
				return;
			}

			const
				route = Object.mixin({deep: true, withProto: true}, {}, r.route),
				stateFields = ctx.syncRouterState(Object.assign(Object.create(route), route.params, route.query));

			this.set(
				stateFields
			);

			if (ctx.syncRouterStoreOnInit) {
				const
					stateForRouter = ctx.syncRouterState(stateFields, 'remote'),
					stateKeys = Object.keys(stateForRouter);

				if (stateKeys.length > 0) {
					let
						query;

					for (let i = 0; i < stateKeys.length; i++) {
						const
							key = stateKeys[i];

						const
							currentParams = route.params,
							currentQuery = route.query;

						const
							val = stateForRouter[key],
							currentVal = Object.get(currentParams, key) ?? Object.get(currentQuery, key);

						if (currentVal === undefined && val !== undefined) {
							query = query ?? {};
							query[key] = val;
						}
					}

					if (query != null) {
						await router.replace(null, {query});
					}
				}
			}

			const sync = $a.debounce(this.saveToRouter.bind(this), 0, {
				label: $$.syncRouter
			});

			if (Object.isDictionary(stateFields)) {
				for (let keys = Object.keys(stateFields), i = 0; i < keys.length; i++) {
					const
						key = keys[i],
						p = key.split('.');

					if (p[0] === 'mods') {
						$a.on(this.localEmitter, `block.mod.*.${p[1]}.*`, sync, routerWatchers);

					} else {
						ctx.watch(key, (val, ...args) => {
							if (!Object.fastCompare(val, args[0])) {
								sync();
							}
						}, {
							...routerWatchers,
							deep: true
						});
					}
				}
			}

			ctx.log('state:init:router', this, stateFields);

		}, {
			label: $$.initFromRouter
		});

		return true;

		//#endif
	}

	/**
	 * Resets a router state of the current component
	 */
	async resetRouter(): Promise<boolean> {
		//#if runtime has bRouter

		if (!this.needRouterSync) {
			return false;
		}

		const
			{ctx} = this,
			{router} = ctx.r;

		const
			stateFields = ctx.convertStateToRouterReset();

		this.set(
			stateFields
		);

		if (!ctx.isActivated || !router) {
			return false;
		}

		await router.push(null);
		ctx.log('state:reset:router', this, stateFields);
		return true;

		//#endif
	}
}
