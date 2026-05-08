/**
 * Data Matrix ECC 200 encoder. (ISO/IEC 16022)
 */
import * as D from './datamatrix-data.mjs';
import { intdiv } from '../_util.mjs';

const GF_EXP = new Array(512).fill(0);
const GF_LOG = new Array(256).fill(0);
let gfInitialized = false;

function gfInit(){
	if(gfInitialized) return;
	let x = 1;
	for(let i = 0; i < 255; i++){
		GF_EXP[i] = x;
		GF_LOG[x] = i;
		x <<= 1;
		if(x & 0x100){
			x ^= D.GF_POLY;
		}
	}
	for(let i = 255; i < 512; i++){
		GF_EXP[i] = GF_EXP[i - 255];
	}
	gfInitialized = true;
}

function gfMultiply(a, b){
	if(a === 0 || b === 0) return 0;
	return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(count){
	gfInit();
	let poly = [1];
	for(let i = 0; i < count; i++){
		const next = new Array(poly.length + 1).fill(0);
		const factor = GF_EXP[i + 1]; // roots a^1 .. a^count
		for(let j = 0; j < poly.length; j++){
			next[j] ^= poly[j];
			next[j + 1] ^= gfMultiply(poly[j], factor);
		}
		poly = next;
	}
	return poly;
}

function reedSolomonBlock(data, ecCount){
	gfInit();
	const gen = rsGenerator(ecCount);
	const result = [...data, ...new Array(ecCount).fill(0)];
	for(let i = 0; i < data.length; i++){
		const coef = result[i];
		if(coef !== 0){
			for(let j = 0; j < gen.length; j++){
				result[i + j] ^= gfMultiply(gen[j], coef);
			}
		}
	}
	return result.slice(data.length);
}

/**
 * @param {string} text
 * @param {'auto'|'square'|'rectangle'} shape
 * @returns {boolean[][]} Data Matrix matrix (true=dark)
 */
export function encode(text, shape = 'auto'){
	let codewords = encodeAscii(text);
	const symbol = selectSymbol(codewords.length, shape);

	codewords = padCodewords(codewords, symbol[4]);
	const blocks = symbol[6];

	let all;
	if(blocks === 1){
		const ec = reedSolomonBlock(codewords, symbol[5]);
		all = [...codewords, ...ec];
	}else{
		const ecPerBlock = intdiv(symbol[5], blocks);
		const dataBlocks = Array.from({ length: blocks }, () => []);
		for(let i = 0; i < codewords.length; i++){
			dataBlocks[i % blocks].push(codewords[i]);
		}
		const ecBlocks = [];
		for(let b = 0; b < blocks; b++){
			ecBlocks.push(reedSolomonBlock(dataBlocks[b], ecPerBlock));
		}
		const maxData = dataBlocks[0].length;
		all = [];
		for(let i = 0; i < maxData; i++){
			for(let b = 0; b < blocks; b++){
				if(i < dataBlocks[b].length){
					all.push(dataBlocks[b][i]);
				}
			}
		}
		for(let i = 0; i < ecPerBlock; i++){
			for(let b = 0; b < blocks; b++){
				all.push(ecBlocks[b][i]);
			}
		}
	}

	return buildMatrix(all, symbol);
}

function encodeAscii(text){
	const codewords = [];
	const len = text.length;
	let i = 0;
	while(i < len){
		const c = text.charCodeAt(i);

		// Compress consecutive 2-digit numerics into one codeword
		if(c >= 0x30 && c <= 0x39 && i + 1 < len){
			const c2 = text.charCodeAt(i + 1);
			if(c2 >= 0x30 && c2 <= 0x39){
				codewords.push(((c - 0x30) * 10 + (c2 - 0x30)) + 130);
				i += 2;
				continue;
			}
		}

		if(c >= 0 && c <= 127){
			codewords.push(c + 1);
		}else{
			// Extended ASCII (128-255)
			codewords.push(D.UPPER_SHIFT);
			codewords.push((c - 128) + 1);
		}
		i++;
	}
	return codewords;
}

function selectSymbol(dataLen, shape){
	for(const sym of D.SYMBOL_SIZES){
		if(sym[4] < dataLen) continue;
		if(shape === 'square' && sym[0] !== sym[1]) continue;
		if(shape === 'rectangle' && sym[0] === sym[1]) continue;
		return sym;
	}
	throw new Error('Data too large for Data Matrix');
}

function padCodewords(codewords, capacity){
	const out = codewords.slice();
	if(out.length < capacity){
		out.push(D.PAD);
	}
	while(out.length < capacity){
		const r = ((149 * (out.length + 1)) % 253) + 1;
		out.push((D.PAD + r) % 254);
	}
	return out;
}

function buildMatrix(codewords, symbol){
	const [rows, cols, dr, dc] = symbol;

	const mapRows = rows - (dr * 2);
	const mapCols = cols - (dc * 2);

	// Mapping matrix uses -1 for "unset", 0/1 for placed bits.
	const mapping = Array.from({ length: mapRows }, () => new Array(mapCols).fill(-1));
	placeData(mapping, mapRows, mapCols, codewords);

	const matrix = Array.from({ length: rows }, () => new Array(cols).fill(false));
	placeFinderAndClock(matrix, rows, cols, dr, dc);

	const regionH = intdiv(mapRows, dr);
	const regionW = intdiv(mapCols, dc);

	for(let r = 0; r < mapRows; r++){
		for(let c = 0; c < mapCols; c++){
			const ri = intdiv(r, regionH);
			const ci = intdiv(c, regionW);
			const mr = r + (ri * 2) + 1;
			const mc = c + (ci * 2) + 1;
			matrix[mr][mc] = (mapping[r][c] === 1);
		}
	}

	return matrix;
}

function placeFinderAndClock(matrix, rows, cols, dr, dc){
	const mapRows = rows - (dr * 2);
	const mapCols = cols - (dc * 2);
	const rh = intdiv(mapRows, dr);
	const rw = intdiv(mapCols, dc);

	for(let ri = 0; ri < dr; ri++){
		const topRow = ri * (rh + 2);
		const botRow = topRow + rh + 1;
		for(let c = 0; c < cols; c++){
			matrix[topRow][c] = (c % 2 === 0); // clock track
			matrix[botRow][c] = true;          // solid
		}
	}

	for(let ci = 0; ci < dc; ci++){
		const leftCol = ci * (rw + 2);
		const rightCol = leftCol + rw + 1;
		for(let r = 0; r < rows; r++){
			matrix[r][leftCol] = true;            // solid
			matrix[r][rightCol] = (r % 2 !== 0);  // clock track
		}
	}
}

/**
 * ECC 200 standard placement algorithm.
 * `mapping` is the integer-valued mapping matrix (-1 unset, 0/1 placed).
 */
function placeData(mapping, rows, cols, codewords){
	let r = 4;
	let c = 0;
	let idx = 0;
	const total = codewords.length;

	while(r < rows || c < cols){
		if(r === rows && c === 0){
			placeCorner1(mapping, rows, cols, codewords[idx] ?? 0);
			idx++;
		}
		if(r === rows - 2 && c === 0 && cols % 4 !== 0){
			placeCorner2(mapping, rows, cols, codewords[idx] ?? 0);
			idx++;
		}
		if(r === rows - 2 && c === 0 && cols % 8 === 4){
			placeCorner3(mapping, rows, cols, codewords[idx] ?? 0);
			idx++;
		}
		if(r === rows + 4 && c === 2 && cols % 8 === 0){
			placeCorner4(mapping, rows, cols, codewords[idx] ?? 0);
			idx++;
		}

		// Diagonal up
		while(r >= 0 && c < cols){
			if(r < rows && c >= 0 && mapping[r][c] === -1){
				if(idx < total){
					placeUtah(mapping, rows, cols, r, c, codewords[idx]);
					idx++;
				}else{
					placeUtah(mapping, rows, cols, r, c, 0);
				}
			}
			r -= 2;
			c += 2;
		}
		r += 1;
		c += 3;

		// Diagonal down
		while(r < rows && c >= 0){
			if(r >= 0 && c < cols && mapping[r][c] === -1){
				if(idx < total){
					placeUtah(mapping, rows, cols, r, c, codewords[idx]);
					idx++;
				}else{
					placeUtah(mapping, rows, cols, r, c, 0);
				}
			}
			r += 2;
			c -= 2;
		}
		r += 3;
		c += 1;
	}

	for(let rr = 0; rr < rows; rr++){
		for(let cc = 0; cc < cols; cc++){
			if(mapping[rr][cc] === -1) mapping[rr][cc] = 0;
		}
	}

	// Bottom-right corner fixed pattern
	if(mapping[rows - 1][cols - 1] === 0){
		mapping[rows - 1][cols - 1] = 1;
		mapping[rows - 2][cols - 2] = 1;
	}
}

function placeUtah(matrix, rows, cols, r, c, val){
	const positions = [
		[-2, -2], [-2, -1],
		[-1, -2], [-1, -1], [-1, 0],
		[0, -2], [0, -1], [0, 0],
	];
	for(let i = 0; i < 8; i++){
		const bit = (val >> (7 - i)) & 1;
		let pr = r + positions[i][0];
		let pc = c + positions[i][1];
		if(pr < 0){ pr += rows; pc += 4 - ((rows + 4) % 8); }
		if(pc < 0){ pc += cols; pr += 4 - ((cols + 4) % 8); }
		matrix[pr][pc] = bit;
	}
}

function placeCorner1(matrix, rows, cols, val){
	const pos = [
		[rows - 1, 0], [rows - 1, 1], [rows - 1, 2],
		[0, cols - 2], [0, cols - 1],
		[1, cols - 1], [2, cols - 1], [3, cols - 1],
	];
	for(let i = 0; i < 8; i++){
		matrix[pos[i][0]][pos[i][1]] = (val >> (7 - i)) & 1;
	}
}

function placeCorner2(matrix, rows, cols, val){
	const pos = [
		[rows - 3, 0], [rows - 2, 0], [rows - 1, 0],
		[0, cols - 4], [0, cols - 3], [0, cols - 2], [0, cols - 1],
		[1, cols - 1],
	];
	for(let i = 0; i < 8; i++){
		matrix[pos[i][0]][pos[i][1]] = (val >> (7 - i)) & 1;
	}
}

function placeCorner3(matrix, rows, cols, val){
	const pos = [
		[rows - 3, 0], [rows - 2, 0], [rows - 1, 0],
		[0, cols - 2], [0, cols - 1],
		[1, cols - 1], [2, cols - 1], [3, cols - 1],
	];
	for(let i = 0; i < 8; i++){
		matrix[pos[i][0]][pos[i][1]] = (val >> (7 - i)) & 1;
	}
}

function placeCorner4(matrix, rows, cols, val){
	const pos = [
		[rows - 1, 0], [rows - 1, cols - 1],
		[0, cols - 3], [0, cols - 2], [0, cols - 1],
		[1, cols - 3], [1, cols - 2], [1, cols - 1],
	];
	for(let i = 0; i < 8; i++){
		matrix[pos[i][0]][pos[i][1]] = (val >> (7 - i)) & 1;
	}
}
