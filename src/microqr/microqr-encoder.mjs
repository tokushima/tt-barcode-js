/**
 * Micro QR Code encoder. (ISO/IEC 18004, Micro QR M1-M4)
 */
import * as M from './microqr-data.mjs';
import { rsEncode } from '../qrcode/reed-solomon.mjs';
import { bits, bitsToCodewords, utf8Bytes } from '../_util.mjs';

export function encode(text, ecLevel = M.EC_L, version = null){
	const enc = new MicroQREncoderState();
	return enc.build(text, ecLevel, version);
}

class MicroQREncoderState{
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

		if(version === null){
			this.version = this.selectVersion(text, mode);
		}else{
			this.version = version;
			this.validateVersionMode(mode);
		}

		this.size = M.moduleCount(this.version);

		const bitstream = this.buildBitstream(text, mode);
		const codewords = bitsToCodewords(bitstream);
		const finalCodewords = this.addErrorCorrection(codewords);

		this.initMatrix();
		this.placeFinderPattern();
		this.placeTimingPatterns();
		this.reserveFormatArea();
		this.placeData(finalCodewords);

		const bestMask = this.applyBestMask();
		this.placeFormatInfo(bestMask);

		return this.modules;
	}

	detectMode(text){
		if(/^[0-9]+$/.test(text)) return M.MODE_NUMERIC;
		if(/^[0-9A-Z $%*+\-.\/:]+$/.test(text)) return M.MODE_ALPHANUMERIC;
		return M.MODE_BYTE;
	}

	textLength(text, mode){
		return (mode === M.MODE_BYTE) ? utf8Bytes(text).length : [...text].length;
	}

	selectVersion(text, mode){
		const len = this.textLength(text, mode);

		for(let v = 1; v <= 4; v++){
			let ec = this.ecLevel;
			if(v === 1){
				if(ec !== M.EC_L && ec !== M.EC_DETECT) continue;
				ec = M.EC_DETECT;
			}

			if(!M.CAPACITY[v] || !M.CAPACITY[v][ec]) continue;
			const cap = M.CAPACITY[v][ec][mode] ?? 0;
			if(cap >= len){
				if(v === 1) this.ecLevel = M.EC_DETECT;
				return v;
			}
		}
		throw new Error('Data too large for Micro QR code');
	}

	validateVersionMode(mode){
		let ec = this.ecLevel;
		if(this.version === 1) ec = M.EC_DETECT;

		if(!M.SUPPORTED_MODES[this.version] || !M.SUPPORTED_MODES[this.version][ec]){
			throw new Error(`EC level not supported for version M${this.version}`);
		}
		if(!M.SUPPORTED_MODES[this.version][ec].includes(mode)){
			throw new Error(`Mode not supported for version M${this.version}`);
		}
	}

	encodeData(text, mode){
		switch(mode){
			case M.MODE_NUMERIC: return this.encodeNumeric(text);
			case M.MODE_ALPHANUMERIC: return this.encodeAlphanumeric(text);
			case M.MODE_BYTE: return this.encodeByte(text);
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
		const chars = M.ALPHANUMERIC_CHARS;
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

	buildBitstream(text, mode){
		const dataBits = this.encodeData(text, mode);
		const charCount = this.textLength(text, mode);

		const modeBitsLen = M.modeBits(this.version);
		const ccBits = M.CHAR_COUNT_BITS[this.version][mode];

		let out = '';
		if(modeBitsLen > 0){
			out += bits(mode, modeBitsLen);
		}
		out += bits(charCount, ccBits);
		out += dataBits;

		const ec = (this.version === 1) ? M.EC_DETECT : this.ecLevel;
		const ecIdx = (this.version === 1) ? 0 : this.ecLevel - 1;
		const dataCodewords = M.VERSION_TABLE[this.version][ecIdx][2];
		const capacity = dataCodewords * 8;

		const terminatorLen = this.terminatorBits();
		const remaining = capacity - out.length;
		out += '0'.repeat(Math.min(terminatorLen, remaining));

		if(this.version === 1 || this.version === 3){
			out += '0'.repeat(capacity - out.length);
		}else{
			if(out.length % 8 !== 0){
				out += '0'.repeat(8 - (out.length % 8));
			}
			const pad = ['11101100', '00010001'];
			let i = 0;
			while(out.length < capacity){
				out += pad[i % 2];
				i++;
			}
		}
		return out.substring(0, capacity);
	}

	terminatorBits(){
		switch(this.version){
			case 1: return 3;
			case 2: return 5;
			case 3: return 7;
			case 4: return 9;
			default: return 3;
		}
	}

	addErrorCorrection(dataCodewords){
		const ec = (this.version === 1) ? M.EC_DETECT : this.ecLevel;
		const ecIdx = (this.version === 1) ? 0 : this.ecLevel - 1;
		const vt = M.VERSION_TABLE[this.version][ecIdx];
		const ecCount = vt[1];

		const ecCodewords = rsEncode(dataCodewords, ecCount);
		return [...dataCodewords, ...ecCodewords];
	}

	initMatrix(){
		this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
		this.reserved = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
	}

	placeFinderPattern(){
		for(let r = -1; r <= 7; r++){
			for(let c = -1; c <= 7; c++){
				if(r < 0 || r >= this.size || c < 0 || c >= this.size) continue;
				this.modules[r][c] = (
					(r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
					(c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				);
				this.reserved[r][c] = true;
			}
		}
		for(let i = 0; i <= 7; i++){
			if(i < this.size){
				this.modules[i][7] = false;
				this.reserved[i][7] = true;
			}
			if(i < this.size){
				this.modules[7][i] = false;
				this.reserved[7][i] = true;
			}
		}
	}

	placeTimingPatterns(){
		for(let i = 8; i < this.size; i++){
			if(!this.reserved[0][i]){
				this.modules[0][i] = (i % 2 === 0);
				this.reserved[0][i] = true;
			}
			if(!this.reserved[i][0]){
				this.modules[i][0] = (i % 2 === 0);
				this.reserved[i][0] = true;
			}
		}
	}

	reserveFormatArea(){
		for(let c = 1; c <= 8; c++) this.reserved[8][c] = true;
		for(let r = 1; r <= 8; r++) this.reserved[r][8] = true;
	}

	placeData(codewords){
		const ec = (this.version === 1) ? M.EC_DETECT : this.ecLevel;
		const ecIdx = (this.version === 1) ? 0 : this.ecLevel - 1;
		const vt = M.VERSION_TABLE[this.version][ecIdx];
		const dataCount = vt[2];

		let bitstr = '';
		for(let i = 0; i < codewords.length; i++){
			const cw = codewords[i];
			if((this.version === 1 || this.version === 3) && i === dataCount - 1){
				bitstr += bits(cw >> 4, 4);
			}else{
				bitstr += bits(cw, 8);
			}
		}

		let bitIndex = 0;
		let col = this.size - 1;
		let upward = true;

		while(col > 0){
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
		let bestScore = -1;
		const unmasked = this.modules.map(row => row.slice());

		for(let mask = 0; mask < 4; mask++){
			this.modules = unmasked.map(row => row.slice());
			const trial = this.applyMask(mask);
			const score = this.evaluateMask(trial);
			if(score > bestScore){
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
				if(!this.reserved[r][c] && M.maskCondition(mask, r, c)){
					v = !v;
				}
				result[r][c] = v;
			}
		}
		return result;
	}

	evaluateMask(modules){
		const n = this.size;
		let sum1 = 0;
		for(let r = 1; r < n; r++){
			if(modules[r][n - 1]) sum1++;
		}
		let sum2 = 0;
		for(let c = 1; c < n; c++){
			if(modules[n - 1][c]) sum2++;
		}
		return (sum1 <= sum2) ? (sum1 * 16 + sum2) : (sum2 * 16 + sum1);
	}

	placeFormatInfo(mask){
		const ec = (this.version === 1) ? M.EC_DETECT : this.ecLevel;
		const key = `${this.version}_${ec}`;
		const symbolNumber = M.SYMBOL_NUMBERS[key];
		const formatBits = M.FORMAT_INFO[symbolNumber][mask];

		for(let i = 0; i < 7; i++){
			this.modules[i + 1][8] = (((formatBits >> i) & 1) === 1);
		}
		this.modules[8][8] = (((formatBits >> 7) & 1) === 1);

		for(let i = 0; i < 7; i++){
			this.modules[8][7 - i] = (((formatBits >> (8 + i)) & 1) === 1);
		}
	}
}
