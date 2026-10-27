import { sanitizeSvgAvatar } from '@/lib/helpers/sanitize-html';

describe('sanitizeSvgAvatar', () => {
	it('keeps decorative shapes and presentation attributes intact', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).toContain('<circle');
		expect(result).toContain('cx="50"');
		expect(result).toContain('fill="red"');
	});

	it('strips a <script> tag', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
		expect(sanitizeSvgAvatar(svg)).not.toContain('script');
	});

	it('strips SMIL animation elements that manipulate attributes without a <script> tag', () => {
		const svg =
			'<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40">' +
			'<animate attributeName="fill" from="red" to="blue" begin="click" />' +
			'<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" />' +
			'<set attributeName="opacity" to="0" begin="mouseover" />' +
			'</circle></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).not.toContain('animate');
		expect(result).not.toContain('<set');
		expect(result).toContain('<circle');
	});

	it('strips <style> blocks, including CSS @import', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://evil.example/steal.css");</style><rect width="10" height="10" /></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).not.toContain('style');
		expect(result).not.toContain('@import');
		expect(result).toContain('<rect');
	});

	it('strips <foreignObject> content', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body onload="alert(1)"></body></foreignObject></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).not.toContain('foreignObject');
		expect(result).not.toContain('onload');
	});

	it('strips <use> elements referencing external content', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#y" /></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).not.toContain('use');
		expect(result).not.toContain('evil.example');
	});

	it('strips javascript: and event-handler attributes', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onclick="javascript:alert(1)" /></svg>';
		const result = sanitizeSvgAvatar(svg);
		expect(result).not.toContain('onclick');
		expect(result).not.toContain('javascript:');
	});
});
