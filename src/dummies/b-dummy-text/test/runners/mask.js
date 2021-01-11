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
	h = include('tests/helpers');

/**
 * @param {Page} page
 */
module.exports = (page) => {
	beforeEach(async () => {
		await page.evaluate(() => {
			globalThis.removeCreatedComponents();
		});
	});

	describe('b-dummy-text masked input', () => {
		const
			q = '[data-id="target"]';

		const init = async (attrs = {}) => {
			await page.evaluate((attrs) => {
				const scheme = [
					{
						attrs: {
							'data-id': 'target',
							mask: '+%d (%d%d%d) %d%d%d-%d%d-%d%d',
							...attrs
						}
					}
				];

				globalThis.renderComponents('b-dummy-text', scheme);
			}, attrs);

			await h.bom.waitForIdleCallback(page);
			return h.component.waitForComponent(page, q);
		};

		it('applying a mask without providing of a text value', async () => {
			const target = await init();
			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('');
		});

		it('applying a mask to the static content', async () => {
			const target = await init({text: '79858608729'});
			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('+7 (985) 860-87-29');
		});

		it('applying a mask to the partial static content', async () => {
			const target = await init({text: '798586'});
			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('+7 (985) 86_-__-__');
		});

		it('applying a mask to the non-normalized static content', async () => {
			const target = await init({text: '798_586xsd35473178x'});
			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('+7 (985) 863-54-73');
		});

		it('applying a mask with `maskPlaceholder`', async () => {
			const target = await init({text: '798586', maskPlaceholder: '*'});
			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('+7 (985) 86*-**-**');
		});

		it('applying a mask with finite repetitions', async () => {
			const target = await init({
				text: '12357984',
				mask: '%d-%d',
				maskRepeat: 2
			});

			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('1-2 3-5');
		});

		it('applying a mask with partial finite repetitions', async () => {
			const target = await init({
				text: '1',
				mask: '%d-%d',
				maskRepeat: 2
			});

			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('1-_ _-_');
		});

		it('applying a mask with infinite repetitions', async () => {
			const target = await init({
				text: '12357984',
				mask: '%d-%d',
				maskRepeat: true
			});

			expect(await target.evaluate((ctx) => ctx.$refs.input.value)).toBe('1-2 3-5');
		});
	});
};