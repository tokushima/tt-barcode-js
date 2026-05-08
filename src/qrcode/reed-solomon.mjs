/**
 * GF(256) Reed-Solomon error correction.
 * Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
 */

const EXP = new Array(512).fill(0);
const LOG = new Array(256).fill(0);
let initialized = false;

function init(){
	if(initialized) return;
	let x = 1;
	for(let i = 0; i < 255; i++){
		EXP[i] = x;
		LOG[x] = i;
		x <<= 1;
		if(x & 0x100){
			x ^= 0x11d;
		}
	}
	for(let i = 255; i < 512; i++){
		EXP[i] = EXP[i - 255];
	}
	initialized = true;
}

function multiply(a, b){
	if(a === 0 || b === 0) return 0;
	return EXP[LOG[a] + LOG[b]];
}

function generatorPolynomial(degree){
	init();
	let poly = [1];
	for(let i = 0; i < degree; i++){
		const next = new Array(poly.length + 1).fill(0);
		const factor = EXP[i];
		for(let j = 0; j < poly.length; j++){
			next[j] ^= poly[j];
			next[j + 1] ^= multiply(poly[j], factor);
		}
		poly = next;
	}
	return poly;
}

/**
 * @param {number[]} data Data codewords
 * @param {number} ecCount Number of error correction codewords
 * @returns {number[]} Error correction codewords
 */
export function rsEncode(data, ecCount){
	init();
	const generator = generatorPolynomial(ecCount);
	const result = [...data, ...new Array(ecCount).fill(0)];

	for(let i = 0; i < data.length; i++){
		const coef = result[i];
		if(coef !== 0){
			for(let j = 0; j < generator.length; j++){
				result[i + j] ^= multiply(generator[j], coef);
			}
		}
	}
	return result.slice(data.length);
}
