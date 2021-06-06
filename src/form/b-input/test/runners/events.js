/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

// @ts-check

/**
 * @typedef {import('playwright').Page} Page
 */

const
	{initInput} = include('src/form/b-input/test/helpers');

/** @param {Page} page */
module.exports = (page) => {
	beforeEach(async () => {
		await page.evaluate(() => {
			globalThis.removeCreatedComponents();
		});
	});

	describe('b-input component events', () => {
		it('listening `change` and `actionChange` events', async () => {
			const
				target = await initInput(page);

			const scan = await target.evaluate(async (ctx) => {
				const
					{input} = ctx.$refs;

				const
					res = [],
					values = ['1', '2'];

				input.focus();

				ctx.on('onChange', (val) => {
					res.push(['change', val]);
				});

				ctx.on('onActionChange', (val) => {
					res.push(['actionChange', val]);
				});

				for (const val of values) {
					input.value = val;
					input.dispatchEvent(new InputEvent('input', {data: val}));
				}

				ctx.value = '3';
				await ctx.nextTick();

				return res;
			});

			expect(scan).toEqual([
				['actionChange', '1'],
				['actionChange', '2'],
				['change', '3']
			]);
		});

		it('listening `change` and `actionChange` events with the provided `mask`', async () => {
			const
				target = await initInput(page, {mask: '%d-%d-%d'});

			const scan = await target.evaluate(async (ctx) => {
				const
					{input} = ctx.$refs;

				const
					res = [],
					keys = ['1', '2'];

				input.focus();

				ctx.on('onChange', (val) => {
					res.push(['change', val]);
				});

				ctx.on('onActionChange', (val) => {
					res.push(['actionChange', val]);
				});

				for (const key of keys) {
					input.dispatchEvent(new KeyboardEvent('keydown', {
						key,
						code: `Digit${key.toUpperCase()}`
					}));
				}

				ctx.value = '3';
				await ctx.nextTick();

				return res;
			});

			expect(scan).toEqual([
				['actionChange', '1-_-_'],
				['actionChange', '1-2-_'],
				['change', '3-_-_']
			]);
		});

		it('listening `selectText`', async () => {
			const target = await initInput(page, {
				text: 'foo'
			});

			expect(
				await target.evaluate((ctx) => {
					const
						res = [];

					ctx.on('selectText', () => res.push(true));
					ctx.selectText();
					ctx.selectText();

					return res;
				})
			).toEqual([true]);
		});

		it('listening `clearText`', async () => {
			const target = await initInput(page, {
				text: 'foo'
			});

			expect(
				await target.evaluate((ctx) => {
					const
						res = [];

					ctx.on('clearText', () => res.push(true));
					ctx.clearText();
					ctx.clearText();

					return res;
				})
			).toEqual([true]);
		});
	});
};
