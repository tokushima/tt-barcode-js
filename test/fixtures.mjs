/**
 * SVG fixture comparison tests.
 *
 * Fixtures in test/fixtures/ are golden SVGs produced by the PHP reference
 * implementation (tt-barcode). Each test asserts that the JS encoder
 * produces a byte-identical SVG for the same input parameters, so changes
 * in encoding/rendering get caught as regressions and cross-impl drift.
 */
import { QRCode, MicroQR, DataMatrix, rMQR, NW7, CustomerBarcode } from '../src/index.mjs';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, 'fixtures');

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

function load(rel){ return readFileSync(join(FIXTURE_DIR, rel), 'utf8'); }

function eqSvg(actual, fixturePath){
	const expected = load(fixturePath);
	if(actual !== expected){
		const min = Math.min(actual.length, expected.length);
		let firstDiff = min;
		for(let i = 0; i < min; i++){
			if(actual[i] !== expected[i]){ firstDiff = i; break; }
		}
		const start = Math.max(0, firstDiff - 20);
		const ctx = 60;
		const a = JSON.stringify(actual.slice(start, firstDiff + ctx));
		const e = JSON.stringify(expected.slice(start, firstDiff + ctx));
		throw new Error(
			`SVG mismatch for ${fixturePath} ` +
			`(lenA=${actual.length} lenE=${expected.length}, @${firstDiff})\n` +
			`         A: ${a}\n         E: ${e}`,
		);
	}
}

const QR_TEXT = 'https://example.com/test?id=12345';

console.log('# QRCode fixtures');
test('QRCode standard', () => {
	eqSvg(QRCode.create(QR_TEXT).render_svg(), 'QRCode/standard.svg');
});
test('QRCode dots (custom colors)', () => {
	eqSvg(
		QRCode.create(QR_TEXT).module_shape('dots').fg_color('#e94560').bg_color('#0f3460').render_svg(),
		'QRCode/dots.svg',
	);
});
test('QRCode dots + modern finder', () => {
	eqSvg(
		QRCode.create(QR_TEXT).module_shape('dots').finder_shape('modern')
			.fg_color('#FF0000').finder_color('#CC0000').margin(2).render_svg(),
		'QRCode/dots_modern.svg',
	);
});
test('QRCode gradient', () => {
	eqSvg(
		QRCode.create(QR_TEXT).module_shape('dots').gradient('#FF6B6B', '#4ECDC4').render_svg(),
		'QRCode/gradient.svg',
	);
});
test('QRCode Japanese (UTF-8 byte mode)', () => {
	eqSvg(QRCode.create('こんにちは世界').render_svg(), 'QRCode/japanese.svg');
});

console.log('# MicroQR fixtures');
test('MicroQR M1 numeric', () => {
	eqSvg(MicroQR.svg('01234'), 'MicroQR/m1_numeric.svg');
});
test('MicroQR M2 numeric', () => {
	eqSvg(MicroQR.create('1234567890').render_svg(), 'MicroQR/m2_numeric.svg');
});
test('MicroQR M2 alphanumeric', () => {
	eqSvg(MicroQR.create('HELLO').render_svg(), 'MicroQR/m2_alnum.svg');
});
test('MicroQR M3 byte', () => {
	eqSvg(
		MicroQR.create('Hello').fg_color('#003366').module_size(15).render_svg(),
		'MicroQR/m3_byte.svg',
	);
});
test('MicroQR M4 byte (margin=3)', () => {
	eqSvg(
		MicroQR.create('Hello, World!!', MicroQR.EC_L).margin(3).render_svg(),
		'MicroQR/m4_byte.svg',
	);
});
test('MicroQR M4-Q numeric', () => {
	eqSvg(MicroQR.create('12345', MicroQR.EC_Q).render_svg(), 'MicroQR/m4q_numeric.svg');
});
test('MicroQR M4 alphanumeric', () => {
	eqSvg(
		MicroQR.create('HTTP://EXAMPLE.COM', MicroQR.EC_L).render_svg(),
		'MicroQR/m4_alnum.svg',
	);
});

console.log('# DataMatrix fixtures');
test('DataMatrix simple', () => {
	eqSvg(DataMatrix.create('Hello').render_svg(), 'DataMatrix/simple.svg');
});
test('DataMatrix custom', () => {
	eqSvg(
		DataMatrix.create('Hello').fg_color('#003366').module_size(15).margin(3).render_svg(),
		'DataMatrix/custom.svg',
	);
});
test('DataMatrix numeric', () => {
	eqSvg(DataMatrix.create('1234567890').render_svg(), 'DataMatrix/numeric.svg');
});
test('DataMatrix large (multi-region)', () => {
	eqSvg(
		DataMatrix.create('Hello, World! This is a Data Matrix test.').render_svg(),
		'DataMatrix/large.svg',
	);
});
test('DataMatrix multiblock (52x52)', () => {
	eqSvg(DataMatrix.create('A'.repeat(180)).render_svg(), 'DataMatrix/multiblock.svg');
	assert.equal(DataMatrix.create('A'.repeat(180)).matrix().length, 52);
});
test('DataMatrix rectangle', () => {
	eqSvg(DataMatrix.create('Hello').shape('rectangle').render_svg(), 'DataMatrix/rectangle.svg');
	const m = DataMatrix.create('Hello').shape('rectangle').matrix();
	assert.equal(m.length, 8);
	assert.equal(m[0].length, 18);
});

console.log('# rMQR fixtures');
test('rMQR simple (R7x43)', () => {
	eqSvg(rMQR.create('Hello').render_svg(), 'rMQR/simple.svg');
	const m = rMQR.create('Hello').matrix();
	assert.equal(m.length, 7);
	assert.equal(m[0].length, 43);
});
test('rMQR custom', () => {
	eqSvg(
		rMQR.create('Hello').fg_color('#003366').module_size(15).margin(3).render_svg(),
		'rMQR/custom.svg',
	);
});
test('rMQR numeric', () => {
	eqSvg(rMQR.create('1234567890').render_svg(), 'rMQR/numeric.svg');
});
test('rMQR alphanumeric', () => {
	eqSvg(rMQR.create('HELLO WORLD').render_svg(), 'rMQR/alnum.svg');
});
test('rMQR EC_H', () => {
	eqSvg(rMQR.create('Hello', rMQR.EC_H).render_svg(), 'rMQR/ec_h.svg');
});
test('rMQR explicit version (R9x43)', () => {
	eqSvg(rMQR.create('Hello', rMQR.EC_M, 'R9x43').render_svg(), 'rMQR/version.svg');
});

console.log('# NW7 fixtures');
test('NW7 simple', () => {
	eqSvg(NW7.svg('12345'), 'NW7/simple.svg');
});
test('NW7 custom (height/margin/wide_ratio/start-stop)', () => {
	eqSvg(
		NW7.create('9876543210', 'A', 'B').fg_color('#003366').height(100).margin(20).wide_ratio(3.0).render_svg(),
		'NW7/custom.svg',
	);
});
test('NW7 no text', () => {
	eqSvg(NW7.create('12345').show_text(false).render_svg(), 'NW7/no_text.svg');
});
test('NW7 start/stop C/D', () => {
	eqSvg(NW7.create('9999', 'C', 'D').render_svg(), 'NW7/start_stop.svg');
});

console.log('# CustomerBarcode fixtures');
test('CustomerBarcode basic', () => {
	const bar = CustomerBarcode.create('263-0023', '千葉市稲毛区緑町3丁目30－8 郵便ビル403号');
	assert.equal(bar.getChardata(), 'S26300233-30-8-403@@@5E');
	eqSvg(bar.render_svg(), 'CustomerBarcode/basic.svg');
});
test('CustomerBarcode custom colors', () => {
	const bar = CustomerBarcode.create('0640804', '札幌市中央区南四条西29丁目1524－23 第2郵便ハウス501');
	eqSvg(
		bar.render_svg({ color: '#003366', bgcolor: '#FFFFFF' }),
		'CustomerBarcode/custom.svg',
	);
});

// chardata test vectors from JapanPost-published examples
// (from PHP reference test/CustomerBarcode/customer_barcode.php)
const CHARDATA_VECTORS = [
	['014-0113', '秋田県仙北郡仙北町堀見内 南田茂木 添60－1', 'S014011360-1@@@@@@@@@]E'],
	['1100016',  '東京都台東区台東5－6－3 ABCビル10F', 'S11000165-6-3-10@@@@@9E'],
	['0600906',  '北海道札幌市東区北六条東4丁目 郵便センター6号館', 'S06009064-6@@@@@@@@@@9E'],
	['0650006',  '北海道札幌市東区北六条東8丁目 郵便センター10号館', 'S06500068-10@@@@@@@@@9E'],
	['4070033',  '山梨県韮崎市龍岡町下條南割 韮崎400', 'S4070033400@@@@@@@@@@-E'],
	['2730102',  '千葉県鎌ケ谷市右京塚 東3丁目20－5 郵便・A&bコーポB604号', 'S27301023-20-5!1604@@0E'],
	['1980036',  '東京都青梅市河辺町十一丁目六番地一号 郵便タワー601', 'S198003611-6-1-601@@@]E'],
	['0270203',  '岩手県宮古市大字津軽石第二十一地割大淵川480', 'S027020321-480@@@@@@@(E'],
	['5900016',  '大阪府堺市中田出井町四丁目六番十九号', 'S59000164-6-19@@@@@@@#E'],
	['0800831',  '北海道帯広市稲田町南七線 西28', 'S08008317-28@@@@@@@@@[E'],
	['3170055',  '茨城県日立市宮田町6丁目7－14 ABCビル2F', 'S31700556-7-14-2@@@@@!E'],
	['6500046',  '神戸市中央区港島中町9丁目7－6 郵便シティA棟1F1号', 'S65000469-7-6!01-1@@@5E'],
	['6230011',  '京都府綾部市青野町綾部6－7 LプラザB106', 'S62300116-7#1!1106@@@4E'],
	['2280024',  '神奈川県座間市入谷6丁目3454－5 郵便ハイツ6－1108', 'S22800246-3454-5-6-112E'],
	['9100067',  '福井県福井市新田塚3丁目80－25 J1ビル2－B', 'S91000673-80-25!91-2!9E'],
	['0640804',  '札幌市中央区南四条西29丁目1524－23 第2郵便ハウス501', 'S064080429-1524-23-2-3E'],
];
for(const [zip, addr, expected] of CHARDATA_VECTORS){
	test(`CustomerBarcode chardata: ${zip}`, () => {
		const bar = CustomerBarcode.create(zip, addr);
		assert.equal(bar.getChardata(), expected);
	});
}

test('CustomerBarcode bar count is 65', () => {
	const bar = CustomerBarcode.create('0640804', '札幌市中央区南四条西29丁目1524－23 第2郵便ハウス501');
	assert.equal(bar.getBars().length, 65);
});

console.log(failures === 0 ? `\nAll fixture tests passed.` : `\n${failures} fixture failure(s).`);
process.exit(failures === 0 ? 0 : 1);
