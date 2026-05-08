/**
 * rMQR encoder. (ISO/IEC 23941)
 */
import * as R from './rmqr-data.mjs';
import { rsEncode } from '../qrcode/reed-solomon.mjs';
import { bits, intdiv, utf8Bytes } from '../_util.mjs';

/**
 * @param {string} text
 * @param {number} ecLevel - 0 = EC_M, 1 = EC_H
 * @param {?string} version - e.g. 'R7x43' or null for auto
 * @returns {number[][]} matrix of 0/1
 */
export function encodeFull(text, ecLevel, version = null){
	const mode = selectMode(text);
	const ver = (version !== null) ? findVersion(version) : selectVersion(text, mode, ecLevel);

	const bitstream = buildBitstream(text, mode, ver, ecLevel);
	const codewords = bitsToCodewords(bitstream, ver, ecLevel);
	const blocks = splitIntoBlocks(codewords, ver, ecLevel);
	const finalCw = interleaveBlocks(blocks);

	const h = ver[2];
	const w = ver[3];

	const matrix = Array.from({ length: h }, () => new Array(w).fill(null));

	placeFinderPattern(matrix, h, w);
	placeFinderSubPattern(matrix, h, w);
	placeCornerFinder(matrix, h, w);
	placeAlignmentPatterns(matrix, h, w);
	placeTimingPatterns(matrix, h, w);
	placeFormatInfo(matrix, ver, ecLevel);
	placeData(matrix, finalCw, ver);

	for(let r = 0; r < h; r++){
		for(let c = 0; c < w; c++){
			if(matrix[r][c] === null) matrix[r][c] = 0;
		}
	}

	return matrix;
}

function selectMode(text){
	if(/^[0-9]+$/.test(text)) return R.MODE_NUMERIC;
	if(/^[0-9A-Z $%*+\-.\/:]+$/.test(text)) return R.MODE_ALNUM;
	return R.MODE_BYTE;
}

function findVersion(name){
	for(const v of R.VERSIONS){
		if(v[0] === name) return v;
	}
	throw new Error('Unknown rMQR version: ' + name);
}

function cciIndex(mode){
	switch(mode){
		case R.MODE_NUMERIC: return 6;
		case R.MODE_ALNUM:   return 7;
		case R.MODE_BYTE:    return 8;
		case R.MODE_KANJI:   return 9;
		default: throw new Error('Unknown rMQR mode: ' + mode);
	}
}

function textByteLen(text, mode){
	return (mode === R.MODE_BYTE) ? utf8Bytes(text).length : text.length;
}

function selectVersion(text, mode, ecLevel){
	for(const v of R.VERSIONS){
		const dataBitsIdx = (ecLevel === 0) ? 10 : 11;
		const capacityBits = v[dataBitsIdx];
		const cciBits = v[cciIndex(mode)];
		const payloadBits = computePayloadBits(text, mode, cciBits);
		if(payloadBits <= capacityBits) return v;
	}
	throw new Error('Data too long for rMQR');
}

function computePayloadBits(text, mode, cciBits){
	const len = textByteLen(text, mode);
	let total = 3 + cciBits;

	switch(mode){
		case R.MODE_NUMERIC: {
			total += intdiv(len, 3) * 10;
			const rem = len % 3;
			if(rem === 2) total += 7;
			else if(rem === 1) total += 4;
			break;
		}
		case R.MODE_ALNUM:
			total += intdiv(len, 2) * 11;
			if(len % 2 === 1) total += 6;
			break;
		case R.MODE_BYTE:
			total += len * 8;
			break;
	}
	return total;
}

function buildBitstream(text, mode, ver, ecLevel){
	const cciBits = ver[cciIndex(mode)];
	const dataBitsIdx = (ecLevel === 0) ? 10 : 11;
	const capacity = ver[dataBitsIdx];

	let out = bits(mode, 3);
	out += bits(textByteLen(text, mode), cciBits);

	switch(mode){
		case R.MODE_NUMERIC: out += encodeNumeric(text); break;
		case R.MODE_ALNUM:   out += encodeAlnum(text); break;
		case R.MODE_BYTE:    out += encodeByte(text); break;
	}

	const remaining = capacity - out.length;
	if(remaining >= 3){
		out += '000';
	}else if(remaining > 0){
		out += '0'.repeat(remaining);
	}
	return out;
}

function encodeNumeric(text){
	let out = '';
	for(let i = 0; i < text.length; i += 3){
		const group = text.substring(i, i + 3);
		const val = parseInt(group, 10);
		const len = group.length === 3 ? 10 : (group.length === 2 ? 7 : 4);
		out += bits(val, len);
	}
	return out;
}

function encodeAlnum(text){
	let out = '';
	for(let i = 0; i < text.length; i += 2){
		if(i + 1 < text.length){
			const v = R.ALNUM_TABLE.indexOf(text[i]) * 45 + R.ALNUM_TABLE.indexOf(text[i + 1]);
			out += bits(v, 11);
		}else{
			out += bits(R.ALNUM_TABLE.indexOf(text[i]), 6);
		}
	}
	return out;
}

function encodeByte(text){
	let out = '';
	for(const b of utf8Bytes(text)){
		out += bits(b, 8);
	}
	return out;
}

function bitsToCodewords(bitstream, ver, ecLevel){
	let bs = bitstream;
	if(bs.length % 8 !== 0){
		bs += '0'.repeat(8 - (bs.length % 8));
	}
	const cw = [];
	for(let i = 0; i < bs.length; i += 8){
		cw.push(parseInt(bs.substring(i, i + 8), 2));
	}

	const blocksDef = (ecLevel === 0) ? ver[12] : ver[13];
	let dataCount = 0;
	for(const bd of blocksDef){
		dataCount += bd[0] * bd[2];
	}

	const pad = [0xEC, 0x11];
	let i = 0;
	while(cw.length < dataCount){
		cw.push(pad[i % 2]);
		i++;
	}
	return cw;
}

function splitIntoBlocks(codewords, ver, ecLevel){
	const blocksDef = (ecLevel === 0) ? ver[12] : ver[13];
	const blocks = [];
	let idx = 0;

	for(const bd of blocksDef){
		for(let b = 0; b < bd[0]; b++){
			const k = bd[2];
			const ecCount = bd[1] - k;
			const data = codewords.slice(idx, idx + k);
			blocks.push({ data, ec: rsEncode(data, ecCount) });
			idx += k;
		}
	}
	return blocks;
}

function interleaveBlocks(blocks){
	const out = [];

	const maxData = Math.max(...blocks.map(b => b.data.length));
	for(let i = 0; i < maxData; i++){
		for(const b of blocks){
			if(i < b.data.length) out.push(b.data[i]);
		}
	}

	const maxEc = Math.max(...blocks.map(b => b.ec.length));
	for(let i = 0; i < maxEc; i++){
		for(const b of blocks){
			if(i < b.ec.length) out.push(b.ec[i]);
		}
	}
	return out;
}

function placeFinderPattern(matrix, h, w){
	for(let r = 0; r < 7; r++){
		for(let c = 0; c < 7; c++){
			if(r === 0 || r === 6 || c === 0 || c === 6){
				matrix[r][c] = 1;
			}else{
				matrix[r][c] = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ? 1 : 0;
			}
		}
	}

	for(let r = 0; r < Math.min(8, h); r++){
		matrix[r][7] = 0;
	}
	if(h >= 9){
		for(let c = 0; c < 8; c++){
			matrix[7][c] = 0;
		}
	}
}

function placeFinderSubPattern(matrix, h, w){
	for(let r = 0; r < 5; r++){
		for(let c = 0; c < 5; c++){
			const isBorder = (r === 0 || r === 4 || c === 0 || c === 4);
			const isCenter = (r === 2 && c === 2);
			matrix[h - 5 + r][w - 5 + c] = (isBorder || isCenter) ? 1 : 0;
		}
	}
}

function placeCornerFinder(matrix, h, w){
	matrix[h - 1][0] = 1;
	matrix[h - 1][1] = 1;
	matrix[h - 1][2] = 1;
	if(h >= 11){
		matrix[h - 2][0] = 1;
		matrix[h - 2][1] = 0;
	}

	matrix[0][w - 1] = 1;
	matrix[0][w - 2] = 1;
	matrix[1][w - 1] = 1;
	matrix[1][w - 2] = 0;
}

function placeAlignmentPatterns(matrix, h, w){
	const coords = R.ALIGNMENT_COORDS[w] ?? [];
	for(const cx of coords){
		for(let r = 0; r < 3; r++){
			for(let c = 0; c < 3; c++){
				const isBorder = (r === 0 || r === 2 || c === 0 || c === 2);
				matrix[r][cx - 1 + c] = isBorder ? 1 : 0;
				matrix[h - 3 + r][cx - 1 + c] = isBorder ? 1 : 0;
			}
		}
	}
}

function placeTimingPatterns(matrix, h, w){
	const coords = R.ALIGNMENT_COORDS[w] ?? [];

	for(let c = 0; c < w; c++){
		const color = (((c + 1) % 2) === 1) ? 1 : 0;
		if(matrix[0][c] === null) matrix[0][c] = color;
		if(matrix[h - 1][c] === null) matrix[h - 1][c] = color;
	}

	const vCols = [0, w - 1, ...coords];
	for(const c of vCols){
		for(let r = 0; r < h; r++){
			const color = (((r + 1) % 2) === 1) ? 1 : 0;
			if(matrix[r][c] === null) matrix[r][c] = color;
		}
	}
}

function computeFormatInfo(ver, ecLevel){
	let data = ver[1];
	if(ecLevel === 1){
		data |= (1 << 5);
	}

	const shifted = data << 12;
	let tmp = shifted;
	while(true){
		const msb = msbPosition(tmp);
		if(msb < 13) break;
		tmp ^= (R.FORMAT_BCH_POLY << (msb - 13));
	}
	return shifted | tmp;
}

function msbPosition(val){
	let pos = 0;
	let v = val;
	while(v > 0){
		pos++;
		v >>>= 1;
	}
	return pos;
}

function placeFormatInfo(matrix, ver, ecLevel){
	const format = computeFormatInfo(ver, ecLevel);
	const h = ver[2];
	const w = ver[3];

	let masked = format ^ R.FORMAT_MASK_FINDER;
	for(let n = 0; n < 18; n++){
		matrix[1 + (n % 5)][8 + intdiv(n, 5)] = (masked >> n) & 1;
	}

	masked = format ^ R.FORMAT_MASK_SUB;
	for(let n = 0; n < 15; n++){
		matrix[h - 6 + (n % 5)][w - 8 + intdiv(n, 5)] = (masked >> n) & 1;
	}
	matrix[h - 6][w - 5] = (masked >> 15) & 1;
	matrix[h - 6][w - 4] = (masked >> 16) & 1;
	matrix[h - 6][w - 3] = (masked >> 17) & 1;
}

function placeData(matrix, finalCw, ver){
	const h = ver[2];
	const w = ver[3];
	const remainder = ver[5];

	let bitstr = '';
	for(const cw of finalCw){
		bitstr += bits(cw, 8);
	}
	bitstr += '0'.repeat(remainder);

	let bitIdx = 0;
	let dy = -1;
	let cx = w - 2;
	let cy = h - 6;

	const maskArea = Array.from({ length: h }, () => new Array(w).fill(false));

	while(bitIdx < bitstr.length){
		for(let xOffset = 0; xOffset <= 1; xOffset++){
			const x = cx - xOffset;
			if(x < 0 || x >= w || cy < 0 || cy >= h) continue;
			if(matrix[cy][x] !== null) continue;

			if(bitIdx < bitstr.length){
				matrix[cy][x] = parseInt(bitstr[bitIdx], 10);
				maskArea[cy][x] = true;
				bitIdx++;
			}
		}

		if(dy < 0 && cy <= 1){
			cx -= 2;
			dy = 1;
		}else if(dy > 0 && cy >= h - 2){
			cx -= 2;
			dy = -1;
		}else{
			cy += dy;
		}
	}

	applyMask(matrix, maskArea, h, w);
}

function applyMask(matrix, maskArea, h, w){
	for(let r = 0; r < h; r++){
		for(let c = 0; c < w; c++){
			if(!maskArea[r][c]) continue;
			if((intdiv(r, 2) + intdiv(c, 3)) % 2 === 0){
				matrix[r][c] ^= 1;
			}
		}
	}
}
