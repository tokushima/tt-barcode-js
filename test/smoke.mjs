import { QRCode, MicroQR, DataMatrix, rMQR, NW7, CustomerBarcode } from '../src/index.mjs';
import { strict as assert } from 'node:assert';

let failures = 0;
function test(name, fn){
	try{
		fn();
		console.log(`  ok  ${name}`);
	}catch(err){
		failures++;
		console.error(`  FAIL ${name}\n       ${err.message}`);
	}
}

function isWellFormedSvg(svg){
	assert.ok(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'missing xml prolog');
	assert.match(svg, /<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
	assert.match(svg, /<\/svg>$/);
}

console.log('# QRCode');

test('QRCode.svg produces a non-empty SVG string', () => {
	const svg = QRCode.svg('https://example.com');
	isWellFormedSvg(svg);
});

test('QRCode.create returns 21-module v1 matrix for short numeric', () => {
	const qr = QRCode.create('123', QRCode.EC_L);
	assert.equal(qr.module_count(), 21);
	const m = qr.matrix();
	assert.equal(m.length, 21);
	assert.equal(m[0].length, 21);
	// Top-left finder corner should be dark
	assert.equal(m[0][0], true);
	assert.equal(m[6][6], true);
});

test('QRCode honors EC level differences', () => {
	const a = QRCode.create('https://example.com', QRCode.EC_L).module_count();
	const b = QRCode.create('https://example.com', QRCode.EC_H).module_count();
	assert.ok(b >= a, 'EC_H should need at least as many modules as EC_L');
});

test('QRCode dots + gradient SVG renders', () => {
	const svg = QRCode.create('https://example.com')
		.module_shape('dots')
		.gradient('#FF6B6B', '#4ECDC4')
		.render_svg();
	isWellFormedSvg(svg);
	assert.ok(svg.includes('linearGradient'), 'gradient should produce <linearGradient>');
	assert.ok(svg.includes('<circle '), 'dots mode should use <circle>');
});

test('QRCode finder_shape modern produces rounded rects', () => {
	const svg = QRCode.create('hello')
		.finder_shape('modern')
		.render_svg();
	isWellFormedSvg(svg);
	assert.ok(svg.includes(' rx='), 'modern finders should be rounded rects');
});

test('QRCode UTF-8 byte mode handles Japanese text', () => {
	const svg = QRCode.svg('こんにちは');
	isWellFormedSvg(svg);
});

console.log('# MicroQR');

test('MicroQR.svg produces a valid SVG for numeric input', () => {
	const svg = MicroQR.svg('12345');
	isWellFormedSvg(svg);
});

test('MicroQR M2 alphanumeric encoding', () => {
	const m = MicroQR.create('HELLO', MicroQR.EC_L).matrix();
	assert.equal(m.length, 13);
});

test('MicroQR M4 byte mode', () => {
	const m = MicroQR.create('Hello, World!', MicroQR.EC_L).matrix();
	assert.equal(m.length, 17);
});

console.log('# DataMatrix');

test('DataMatrix.svg produces valid SVG', () => {
	isWellFormedSvg(DataMatrix.svg('Hello'));
});

test('DataMatrix smallest 10x10 symbol for "Hi"', () => {
	const m = DataMatrix.create('Hi').matrix();
	assert.equal(m.length, 10);
	assert.equal(m[0].length, 10);
	// L-pattern: left column all dark, bottom row all dark
	for(let r = 0; r < 10; r++){
		assert.equal(m[r][0], true, `left col row ${r} should be dark`);
	}
	for(let c = 0; c < 10; c++){
		assert.equal(m[9][c], true, `bottom row col ${c} should be dark`);
	}
});

test('DataMatrix rectangle shape', () => {
	const m = DataMatrix.create('Hi').shape('rectangle').matrix();
	assert.notEqual(m.length, m[0].length, 'rectangle should have different rows/cols');
});

test('DataMatrix numeric compression handles 50-digit input', () => {
	const text = '12345678901234567890123456789012345678901234567890';
	const m = DataMatrix.create(text).matrix();
	assert.ok(m.length >= 16, 'should fit a non-trivial symbol');
});

console.log('# rMQR');

test('rMQR.svg produces valid SVG', () => {
	isWellFormedSvg(rMQR.svg('Hello'));
});

test('rMQR R7x43 explicit version', () => {
	const m = rMQR.create('Hi', rMQR.EC_M, 'R7x43').matrix();
	assert.equal(m.length, 7);
	assert.equal(m[0].length, 43);
});

test('rMQR auto selects taller versions for longer input', () => {
	const m = rMQR.create('Hello, World! 1234567890', rMQR.EC_M).matrix();
	assert.ok(m.length >= 7);
	assert.ok(m[0].length >= 43);
});

console.log('# NW7');

test('NW7.svg renders with default A/A start/stop', () => {
	const svg = NW7.svg('12345');
	isWellFormedSvg(svg);
	assert.ok(svg.includes('<text'), 'default show_text should add a text element');
	assert.ok(svg.includes('A12345A'));
});

test('NW7 wide ratio affects total width', () => {
	const a = NW7.create('12345').wide_ratio(2).render_svg();
	const b = NW7.create('12345').wide_ratio(3).render_svg();
	const widthA = parseFloat(a.match(/width="([\d.]+)"/)[1]);
	const widthB = parseFloat(b.match(/width="([\d.]+)"/)[1]);
	assert.ok(widthB > widthA, 'larger ratio should produce wider barcode');
});

test('NW7 invalid character throws', () => {
	assert.throws(() => NW7.svg('12X45'));
});

console.log('# CustomerBarcode');

test('CustomerBarcode renders valid SVG with mm units', () => {
	const bar = CustomerBarcode.create('263-0023', '千葉市稲毛区緑町3丁目30-8 郵便ビル403号');
	const svg = bar.render_svg();
	isWellFormedSvg(svg);
	assert.match(svg, /width="[\d.]+mm"/);
	assert.match(svg, /height="3\.6mm"/);
});

test('CustomerBarcode chardata starts with S and ends with E', () => {
	const bar = CustomerBarcode.create('263-0023', '');
	const cd = bar.getChardata();
	assert.ok(cd.startsWith('S'));
	assert.ok(cd.endsWith('E'));
	assert.equal(cd.length, 23, 'S + 20 + CD + E = 23');
});

test('CustomerBarcode rejects invalid zip', () => {
	assert.throws(() => CustomerBarcode.create('abc', ''));
	assert.throws(() => CustomerBarcode.create('12345', ''));
});

test('CustomerBarcode normalizes kanji-numbered address', () => {
	const r = CustomerBarcode.normalizeAddress('三丁目');
	assert.ok(/3/.test(r), `expected to contain "3" but got "${r}"`);
});

test('CustomerBarcode normalizes full-width input', () => {
	const r = CustomerBarcode.normalizeAddress('３丁目１０');
	assert.match(r, /3/);
	assert.match(r, /10/);
});

console.log(failures === 0 ? `\nAll tests passed.` : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
