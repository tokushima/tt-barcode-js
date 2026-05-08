/**
 * Japan Post Customer Barcode (郵便カスタマーバーコード).
 *
 *   import { CustomerBarcode } from 'tt-barcode';
 *
 *   const bar = CustomerBarcode.create('263-0023', '千葉市稲毛区緑町3丁目30-8 郵便ビル403号');
 *   const svg = bar.render_svg({ bar_height: 3.6, module_width: 0.6, gap: 0.6 });
 *
 * @see https://www.post.japanpost.jp/zipcode/zipmanual/index.html
 */

const BAR_LONG = 1;      // full height
const BAR_SEMI_UP = 2;   // ascender (top 2/3)
const BAR_SEMI_DOWN = 3; // descender (bottom 2/3)
const BAR_TIMING = 4;    // tracker (middle 1/3)

const CHAR_PATTERNS = {
	'0':[1,4,4], '1':[1,1,4], '2':[1,3,2], '3':[3,1,2], '4':[1,2,3],
	'5':[1,4,1], '6':[3,2,1], '7':[2,1,3], '8':[2,3,1], '9':[4,1,1],
	'!':[3,2,4], '#':[3,4,2], '%':[2,3,4], '@':[4,3,2], '(':[2,4,3],
	')':[4,2,3], '[':[4,4,1], ']':[1,1,1], '-':[4,1,4],
};

const ALPHA_MAP = {
	A:'!0', B:'!1', C:'!2', D:'!3', E:'!4', F:'!5', G:'!6', H:'!7', I:'!8', J:'!9',
	K:'#0', L:'#1', M:'#2', N:'#3', O:'#4', P:'#5', Q:'#6', R:'#7', S:'#8', T:'#9',
	U:'%0', V:'%1', W:'%2', X:'%3', Y:'%4', Z:'%5',
};

const CD_VALUES = {
	'0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9,
	'-':10, '!':11, '#':12, '%':13, '@':14, '(':15, ')':16, '[':17, ']':18,
};

const KANJI_TO_NUM = {
	'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10',
};

function svgEscape(value){
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Convert full-width characters to half-width.
 * Equivalent to PHP `mb_convert_kana($s, $flags)` for the 'a' (alphanumerics)
 * and 's' (space) flags.
 */
function toHalfwidth(s, { ascii = true, space = true } = {}){
	let out = '';
	for(const ch of s){
		const code = ch.codePointAt(0);
		if(ascii && code >= 0xFF01 && code <= 0xFF5E){
			out += String.fromCodePoint(code - 0xFEE0);
		}else if(space && code === 0x3000){
			out += ' ';
		}else{
			out += ch;
		}
	}
	return out;
}

function isAlpha(ch){ return /^[A-Za-z]$/.test(ch); }

export class CustomerBarcode{
	constructor(){
		this._bars = [];
		this._chardata = '';
	}

	/**
	 * @param {string} zip - 7-digit postal code (with or without hyphen)
	 * @param {string} address - address text after the locality
	 */
	static create(zip, address = ''){
		const obj = new CustomerBarcode();
		obj._encode(zip, address);
		return obj;
	}

	getBars(){ return this._bars; }
	getChardata(){ return this._chardata; }

	_encode(zip, address){
		zip = toHalfwidth(zip, { ascii: true, space: false });
		zip = zip.replace(/-/g, '');

		if(!/^[0-9]{7}$/.test(zip)){
			throw new Error('郵便番号は7桁の数字で指定してください');
		}

		const normalized = CustomerBarcode.normalizeAddress(address);

		let chardata = '';
		const str = zip + normalized;
		for(let i = 0; i < str.length; i++){
			const c = str[i];
			chardata += isAlpha(c) ? ALPHA_MAP[c.toUpperCase()] : c;
		}
		// pad/truncate to 20 characters with CC4 (@)
		chardata = chardata.substring(0, 20).padEnd(20, '@');

		// check digit (mod 19)
		let cdsum = 0;
		for(let i = 0; i < chardata.length; i++){
			cdsum += CD_VALUES[chardata[i]];
		}
		const cdVal = (cdsum % 19 === 0) ? 0 : 19 - (cdsum % 19);
		const cdChar = Object.keys(CD_VALUES).find(k => CD_VALUES[k] === cdVal);

		this._chardata = 'S' + chardata + cdChar + 'E';

		// Start
		this._bars.push(BAR_LONG);
		// Data
		for(let i = 0; i < chardata.length; i++){
			for(const t of CHAR_PATTERNS[chardata[i]]){
				this._bars.push(t);
			}
		}
		// Check digit
		for(const t of CHAR_PATTERNS[cdChar]){
			this._bars.push(t);
		}
		// Stop
		this._bars.push(BAR_LONG);
	}

	static normalizeAddress(address){
		if(!address) return '';
		address = toHalfwidth(address, { ascii: true, space: true });
		address = address.toUpperCase();
		address = address.replace(/[&\/・.]/gu, '');
		address = address.replace(/[A-Z]{2,}/gu, '-');

		// Kanji numerals -> Arabic numerals (within recognized address suffix patterns)
		const re = /([一二三四五六七八九十]+)(丁目|丁|番地|番|号|地割|線|の|ノ)/gu;
		const matches = [...address.matchAll(re)];
		for(const m of matches){
			let v = m[0];
			v = v.replace(/([一二三四五六七八九]+)十([一二三四五六七八九])/gu, '$1$2');
			v = v.replace(/([一二三四五六七八九]+)十/gu, '$10');
			v = v.replace(/十([一二三四五六七八九]+)/gu, '1$1');

			let translated = v;
			for(const [k, n] of Object.entries(KANJI_TO_NUM)){
				translated = translated.split(k).join(n);
			}

			address = address.split(m[0]).join(translated);
		}

		address = address.replace(/[^\w-]/g, '-');
		address = address.replace(/(\d)F$/, '$1');
		address = address.replace(/(\d)F/g, '$1-');
		address = address.replace(/-+/g, '-');
		address = address.replace(/-([A-Z]+)/g, '$1');
		address = address.replace(/([A-Z]+)-/g, '$1');

		address = address.replace(/^-+|-+$/g, '');
		return address;
	}

	/**
	 * @param {object} [opt]
	 * @param {number} [opt.bar_height]   Bar height in mm (default 3.6)
	 * @param {number} [opt.module_width] Module width in mm (default 0.6)
	 * @param {number} [opt.gap]          Gap width in mm (default 0.6)
	 * @param {string} [opt.color]        Bar color (default #000000)
	 * @param {?string} [opt.bgcolor]     Background color (default null = transparent)
	 */
	render_svg(opt = {}){
		const barHeight = opt.bar_height ?? 3.6;
		const moduleWidth = opt.module_width ?? 0.6;
		const gap = opt.gap ?? 0.6;
		const color = opt.color ?? '#000000';
		const bgcolor = opt.bgcolor ?? null;

		const barCount = this._bars.length;
		const totalWidth = barCount * moduleWidth + (barCount - 1) * gap;

		const round4 = n => Number(n.toFixed(4)).toString();

		let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
		out += `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}mm" height="${barHeight}mm" viewBox="0 0 ${totalWidth} ${barHeight}">\n`;

		if(bgcolor !== null){
			out += `<rect width="${totalWidth}" height="${barHeight}" fill="${svgEscape(bgcolor)}"/>\n`;
		}

		let x = 0;
		const div = barHeight / 3;
		for(const barType of this._bars){
			const [y, h] = this._barDimensions(barType, barHeight, div);
			out += `<rect x="${round4(x)}" y="${round4(y)}" width="${moduleWidth}" height="${round4(h)}" fill="${svgEscape(color)}"/>\n`;
			x += moduleWidth + gap;
		}

		out += '</svg>';
		return out;
	}

	_barDimensions(barType, barHeight, div){
		switch(barType){
			case BAR_LONG:      return [0, barHeight];
			case BAR_SEMI_UP:   return [0, div * 2];
			case BAR_SEMI_DOWN: return [div, div * 2];
			case BAR_TIMING:    return [div, div];
			default:            return [0, barHeight];
		}
	}
}

CustomerBarcode.BAR_LONG = BAR_LONG;
CustomerBarcode.BAR_SEMI_UP = BAR_SEMI_UP;
CustomerBarcode.BAR_SEMI_DOWN = BAR_SEMI_DOWN;
CustomerBarcode.BAR_TIMING = BAR_TIMING;
