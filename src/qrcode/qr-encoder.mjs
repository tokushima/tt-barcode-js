/**
 * QR Code encoder. Builds a module matrix from text input.
 */
import * as Q from './qr-data.mjs';
import { rsEncode } from './reed-solomon.mjs';
import { bits, bitsToCodewords, utf8Bytes, intdiv } from '../_util.mjs';

/**
 * @param {string} text
 * @param {number} ecLevel
 * @param {?number} version
 * @returns {boolean[][]} module matrix (true = dark)
 */
export function encode(text, ecLevel = Q.EC_M, version = null){
	const enc = new QREncoderState();
	return enc.build(text, ecLevel, version);
}

class QREncoderState{
	constructor(){
		this.version = 0;
		this.ecLevel = 0;
		this.size = 0;
		this.modules = [];
		this.reserved = [];
	}

	build(text, ecLevel, version){
		this.ecLevel = ecLevel;
		const mode = this.detectMode(text);
		const dataBits = this.encodeData(text, mode);

		this.version = (version === null)
			? this.selectVersion(dataBits, mode, text)
			: version;
		this.size = Q.moduleCount(this.version);

		const bitstream = this.buildBitstream(text, mode, dataBits);
		const codewords = bitsToCodewords(bitstream);
		const finalCodewords = this.addErrorCorrection(codewords);

		this.initMatrix();
		this.placeFinderPatterns();
		this.placeAlignmentPatterns();
		this.placeTimingPatterns();
		this.placeDarkModule();
		this.reserveFormatArea();
		this.reserveVersionArea();
		this.placeData(finalCodewords);

		const bestMask = this.applyBestMask();
		this.placeFormatInfo(bestMask);
		this.placeVersionInfo();

		return this.modules;
	}

	detectMode(text){
		if(/^[0-9]+$/.test(text)) return Q.MODE_NUMERIC;
		if(/^[0-9A-Z $%*+\-.\/:]+$/.test(text)) return Q.MODE_ALPHANUMERIC;
		return Q.MODE_BYTE;
	}

	encodeData(text, mode){
		switch(mode){
			case Q.MODE_NUMERIC: return this.encodeNumeric(text);
			case Q.MODE_ALPHANUMERIC: return this.encodeAlphanumeric(text);
			case Q.MODE_BYTE: return this.encodeByte(text);
			default: return '';
		}
	}

	encodeNumeric(text){
		let out = '';
		for(let i = 0; i < text.length; i += 3){
			const chunk = text.substring(i, i + 3);
			const len = (chunk.length === 3) ? 10 : (chunk.length === 2 ? 7 : 4);
			out += bits(parseInt(chunk, 10), len);
		}
		return out;
	}

	encodeAlphanumeric(text){
		let out = '';
		const chars = Q.ALPHANUMERIC_CHARS;
		for(let i = 0; i < text.length; i += 2){
			const c1 = chars.indexOf(text[i]);
			if(i + 1 < text.length){
				const c2 = chars.indexOf(text[i + 1]);
				out += bits(c1 * 45 + c2, 11);
			}else{
				out += bits(c1, 6);
			}
		}
		return out;
	}

	encodeByte(text){
		let out = '';
		for(const byte of utf8Bytes(text)){
			out += bits(byte, 8);
		}
		return out;
	}

	byteLength(text){
		return utf8Bytes(text).length;
	}

	selectVersion(dataBits, mode, text){
		for(let v = 1; v <= 40; v++){
			const ccBits = Q.charCountBits(mode, v);
			const total = 4 + ccBits + dataBits.length;
			const capacity = Q.capacityBytes(v, this.ecLevel) * 8;
			if(total <= capacity) return v;
		}
		throw new Error('Data too large for QR code');
	}

	buildBitstream(text, mode, dataBits){
		const ccBits = Q.charCountBits(mode, this.version);
		const charCount = (mode === Q.MODE_BYTE) ? this.byteLength(text) : text.length;

		let out = bits(mode, 4);
		out += bits(charCount, ccBits);
		out += dataBits;

		const capacity = Q.capacityBytes(this.version, this.ecLevel) * 8;
		const remaining = capacity - out.length;
		out += '0'.repeat(Math.min(4, remaining));

		if(out.length % 8 !== 0){
			out += '0'.repeat(8 - (out.length % 8));
		}

		const pad = ['11101100', '00010001'];
		let i = 0;
		while(out.length < capacity){
			out += pad[i % 2];
			i++;
		}
		return out.substring(0, capacity);
	}

	addErrorCorrection(dataCodewords){
		const info = Q.VERSION_TABLE[this.version][this.ecLevel];
		const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = info;

		const dataBlocks = [];
		const ecBlocks = [];
		let offset = 0;

		for(let i = 0; i < g1Blocks; i++){
			const block = dataCodewords.slice(offset, offset + g1Data);
			dataBlocks.push(block);
			ecBlocks.push(rsEncode(block, ecPerBlock));
			offset += g1Data;
		}
		for(let i = 0; i < g2Blocks; i++){
			const block = dataCodewords.slice(offset, offset + g2Data);
			dataBlocks.push(block);
			ecBlocks.push(rsEncode(block, ecPerBlock));
			offset += g2Data;
		}

		const result = [];
		const maxData = Math.max(g1Data, g2Data);
		for(let i = 0; i < maxData; i++){
			for(const block of dataBlocks){
				if(i < block.length) result.push(block[i]);
			}
		}
		for(let i = 0; i < ecPerBlock; i++){
			for(const block of ecBlocks){
				if(i < block.length) result.push(block[i]);
			}
		}
		return result;
	}

	initMatrix(){
		this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
		this.reserved = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
	}

	placeFinderPatterns(){
		const positions = [[0, 0], [0, this.size - 7], [this.size - 7, 0]];
		for(const [row, col] of positions){
			for(let r = -1; r <= 7; r++){
				for(let c = -1; c <= 7; c++){
					const rr = row + r;
					const cc = col + c;
					if(rr < 0 || rr >= this.size || cc < 0 || cc >= this.size) continue;
					this.modules[rr][cc] = (
						(r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
						(c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
						(r >= 2 && r <= 4 && c >= 2 && c <= 4)
					);
					this.reserved[rr][cc] = true;
				}
			}
		}
	}

	placeAlignmentPatterns(){
		const positions = Q.ALIGNMENT_POSITIONS[this.version];
		if(!positions || positions.length === 0) return;
		const count = positions.length;
		for(let i = 0; i < count; i++){
			for(let j = 0; j < count; j++){
				if((i === 0 && j === 0) || (i === 0 && j === count - 1) || (i === count - 1 && j === 0)){
					continue;
				}
				for(let r = -2; r <= 2; r++){
					for(let c = -2; c <= 2; c++){
						const rr = positions[i] + r;
						const cc = positions[j] + c;
						this.modules[rr][cc] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
						this.reserved[rr][cc] = true;
					}
				}
			}
		}
	}

	placeTimingPatterns(){
		for(let i = 8; i < this.size - 8; i++){
			if(!this.reserved[6][i]){
				this.modules[6][i] = (i % 2 === 0);
				this.reserved[6][i] = true;
			}
			if(!this.reserved[i][6]){
				this.modules[i][6] = (i % 2 === 0);
				this.reserved[i][6] = true;
			}
		}
	}

	placeDarkModule(){
		const row = 4 * this.version + 9;
		this.modules[row][8] = true;
		this.reserved[row][8] = true;
	}

	reserveFormatArea(){
		for(let i = 0; i <= 8; i++){
			if(i < this.size) this.reserved[i][8] = true;
			if(i < this.size) this.reserved[8][i] = true;
		}
		for(let i = this.size - 8; i < this.size; i++){
			this.reserved[8][i] = true;
		}
		for(let i = this.size - 7; i < this.size; i++){
			this.reserved[i][8] = true;
		}
	}

	reserveVersionArea(){
		if(this.version < 7) return;
		for(let i = 0; i < 6; i++){
			for(let j = this.size - 11; j < this.size - 8; j++){
				this.reserved[i][j] = true;
				this.reserved[j][i] = true;
			}
		}
	}

	placeData(codewords){
		let bitstr = '';
		for(const cw of codewords){
			bitstr += bits(cw, 8);
		}

		let bitIndex = 0;
		let col = this.size - 1;
		let upward = true;

		while(col >= 0){
			if(col === 6) col--;

			const rowOrder = [];
			if(upward){
				for(let r = this.size - 1; r >= 0; r--) rowOrder.push(r);
			}else{
				for(let r = 0; r < this.size; r++) rowOrder.push(r);
			}
			for(const row of rowOrder){
				for(let c = 0; c < 2; c++){
					const cc = col - c;
					if(cc < 0 || this.reserved[row][cc]) continue;
					if(bitIndex < bitstr.length){
						this.modules[row][cc] = (bitstr[bitIndex] === '1');
						bitIndex++;
					}
				}
			}
			col -= 2;
			upward = !upward;
		}
	}

	applyBestMask(){
		let bestMask = 0;
		let bestScore = Number.MAX_SAFE_INTEGER;
		const unmasked = this.modules.map(row => row.slice());

		for(let mask = 0; mask < 8; mask++){
			this.modules = unmasked.map(row => row.slice());
			const trial = this.applyMask(mask);
			const score = this.evaluatePenalty(trial);
			if(score < bestScore){
				bestScore = score;
				bestMask = mask;
			}
		}
		this.modules = unmasked.map(row => row.slice());
		this.modules = this.applyMask(bestMask);
		return bestMask;
	}

	applyMask(mask){
		const result = [];
		for(let r = 0; r < this.size; r++){
			result[r] = [];
			for(let c = 0; c < this.size; c++){
				let v = this.modules[r][c];
				if(!this.reserved[r][c] && this.maskCondition(mask, r, c)){
					v = !v;
				}
				result[r][c] = v;
			}
		}
		return result;
	}

	maskCondition(mask, row, col){
		switch(mask){
			case 0: return ((row + col) % 2 === 0);
			case 1: return (row % 2 === 0);
			case 2: return (col % 3 === 0);
			case 3: return ((row + col) % 3 === 0);
			case 4: return ((intdiv(row, 2) + intdiv(col, 3)) % 2 === 0);
			case 5: return (((row * col) % 2 + (row * col) % 3) === 0);
			case 6: return ((((row * col) % 2) + ((row * col) % 3)) % 2 === 0);
			case 7: return ((((row + col) % 2) + ((row * col) % 3)) % 2 === 0);
			default: return false;
		}
	}

	evaluatePenalty(modules){
		let score = 0;
		const n = this.size;

		// Rule 1: 5+ same color in a row/column
		for(let r = 0; r < n; r++){
			let count = 1;
			for(let c = 1; c < n; c++){
				if(modules[r][c] === modules[r][c - 1]){
					count++;
				}else{
					if(count >= 5) score += count - 2;
					count = 1;
				}
			}
			if(count >= 5) score += count - 2;
		}
		for(let c = 0; c < n; c++){
			let count = 1;
			for(let r = 1; r < n; r++){
				if(modules[r][c] === modules[r - 1][c]){
					count++;
				}else{
					if(count >= 5) score += count - 2;
					count = 1;
				}
			}
			if(count >= 5) score += count - 2;
		}

		// Rule 2: 2x2 same-color block
		for(let r = 0; r < n - 1; r++){
			for(let c = 0; c < n - 1; c++){
				const v = modules[r][c];
				if(v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]){
					score += 3;
				}
			}
		}

		// Rule 3: finder-like pattern
		const p1 = [true,false,true,true,true,false,true,false,false,false,false];
		const p2 = [false,false,false,false,true,false,true,true,true,false,true];
		for(let r = 0; r < n; r++){
			for(let c = 0; c <= n - 11; c++){
				let m1 = true, m2 = true;
				for(let k = 0; k < 11; k++){
					if(modules[r][c + k] !== p1[k]) m1 = false;
					if(modules[r][c + k] !== p2[k]) m2 = false;
				}
				if(m1 || m2) score += 40;
			}
		}
		for(let c = 0; c < n; c++){
			for(let r = 0; r <= n - 11; r++){
				let m1 = true, m2 = true;
				for(let k = 0; k < 11; k++){
					if(modules[r + k][c] !== p1[k]) m1 = false;
					if(modules[r + k][c] !== p2[k]) m2 = false;
				}
				if(m1 || m2) score += 40;
			}
		}

		// Rule 4: dark percentage
		let dark = 0;
		for(let r = 0; r < n; r++){
			for(let c = 0; c < n; c++){
				if(modules[r][c]) dark++;
			}
		}
		const percent = (dark * 100) / (n * n);
		score += intdiv(Math.abs(Math.trunc(percent - 50)), 5) * 10;

		return score;
	}

	placeFormatInfo(mask){
		const formatBits = Q.FORMAT_INFO[this.ecLevel * 8 + mask];
		const n = this.size;

		for(let i = 0; i < 6; i++){
			this.modules[i][8] = (((formatBits >> i) & 1) === 1);
		}
		this.modules[7][8] = (((formatBits >> 6) & 1) === 1);
		this.modules[8][8] = (((formatBits >> 7) & 1) === 1);

		for(let i = 0; i < 7; i++){
			this.modules[n - 7 + i][8] = (((formatBits >> (8 + i)) & 1) === 1);
		}

		for(let i = 0; i < 8; i++){
			this.modules[8][n - 1 - i] = (((formatBits >> i) & 1) === 1);
		}
		this.modules[8][7] = (((formatBits >> 8) & 1) === 1);
		for(let i = 0; i < 6; i++){
			this.modules[8][5 - i] = (((formatBits >> (9 + i)) & 1) === 1);
		}
	}

	placeVersionInfo(){
		if(this.version < 7) return;
		const versionBits = Q.VERSION_INFO[this.version];
		for(let i = 0; i < 18; i++){
			const bit = (((versionBits >> i) & 1) === 1);
			const row = intdiv(i, 3);
			const col = this.size - 11 + (i % 3);
			this.modules[row][col] = bit;
			this.modules[col][row] = bit;
		}
	}
}
