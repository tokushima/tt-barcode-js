/**
 * Common utilities for SVG rendering and bit manipulation.
 */

export function svgEscape(value){
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function bits(value, length){
	return value.toString(2).padStart(length, '0');
}

export function bitsToCodewords(bitString){
	const cws = [];
	for(let i = 0; i < bitString.length; i += 8){
		cws.push(parseInt(bitString.substring(i, i + 8), 2));
	}
	return cws;
}

export function utf8Bytes(text){
	return Array.from(new TextEncoder().encode(text));
}

export function intdiv(a, b){
	return Math.trunc(a / b);
}

export function fixed(n, digits = 1){
	if(!Number.isFinite(n)) return String(n);
	const factor = Math.pow(10, digits);
	const scaled = n * factor;
	const floor = Math.floor(scaled);
	const frac = scaled - floor;
	let rounded;
	const eps = 1e-9;
	if(Math.abs(frac - 0.5) < eps){
		rounded = (floor % 2 === 0) ? floor : floor + 1;
	}else{
		rounded = Math.round(scaled);
	}
	if(digits === 0) return String(rounded);
	const sign = rounded < 0 ? '-' : '';
	const abs = Math.abs(rounded).toString().padStart(digits + 1, '0');
	return `${sign}${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
}
