/**
 * Micro QR Code specification tables (ISO/IEC 18004 Annex).
 * Versions M1-M4, sizes 11x11 to 17x17.
 */

export const EC_DETECT = 0;
export const EC_L = 1;
export const EC_M = 2;
export const EC_Q = 3;

export const MODE_NUMERIC = 0;
export const MODE_ALPHANUMERIC = 1;
export const MODE_BYTE = 2;
export const MODE_KANJI = 3;

export const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function moduleCount(version){
	return version * 2 + 9;
}

export function modeBits(version){
	return version - 1;
}

export const CHAR_COUNT_BITS = {
	1: [3, 0, 0, 0],
	2: [4, 3, 0, 0],
	3: [5, 4, 4, 3],
	4: [6, 5, 5, 4],
};

export const VERSION_TABLE = {
	1: [[5, 2, 3]],                               // EC_DETECT
	2: [[10, 5, 5], [10, 6, 4]],                  // EC_L, EC_M
	3: [[17, 6, 11], [17, 8, 9]],                 // EC_L, EC_M
	4: [[24, 8, 16], [24, 10, 14], [24, 14, 10]], // EC_L, EC_M, EC_Q
};

export const SUPPORTED_MODES = {
	1: { [EC_DETECT]: [MODE_NUMERIC] },
	2: {
		[EC_L]: [MODE_NUMERIC, MODE_ALPHANUMERIC],
		[EC_M]: [MODE_NUMERIC, MODE_ALPHANUMERIC],
	},
	3: {
		[EC_L]: [MODE_NUMERIC, MODE_ALPHANUMERIC, MODE_BYTE, MODE_KANJI],
		[EC_M]: [MODE_NUMERIC, MODE_ALPHANUMERIC, MODE_BYTE, MODE_KANJI],
	},
	4: {
		[EC_L]: [MODE_NUMERIC, MODE_ALPHANUMERIC, MODE_BYTE, MODE_KANJI],
		[EC_M]: [MODE_NUMERIC, MODE_ALPHANUMERIC, MODE_BYTE, MODE_KANJI],
		[EC_Q]: [MODE_NUMERIC, MODE_ALPHANUMERIC, MODE_BYTE, MODE_KANJI],
	},
};

export const CAPACITY = {
	1: { [EC_DETECT]: [5, 0, 0, 0] },
	2: {
		[EC_L]: [10, 6, 0, 0],
		[EC_M]: [8, 5, 0, 0],
	},
	3: {
		[EC_L]: [23, 14, 9, 6],
		[EC_M]: [18, 11, 7, 4],
	},
	4: {
		[EC_L]: [35, 21, 15, 9],
		[EC_M]: [30, 18, 13, 8],
		[EC_Q]: [21, 12, 9, 5],
	},
};

export const SYMBOL_NUMBERS = {
	'1_0': 0, '2_1': 1, '2_2': 2, '3_1': 3,
	'3_2': 4, '4_1': 5, '4_2': 6, '4_3': 7,
};

export const FORMAT_INFO = [
	[0x4445, 0x4172, 0x4E2B, 0x4B1C], // M1-Detect
	[0x55AE, 0x5099, 0x5FC0, 0x5AF7], // M2-L
	[0x6793, 0x62A4, 0x6DFD, 0x68CA], // M2-M
	[0x7678, 0x734F, 0x7C16, 0x7921], // M3-L
	[0x06DE, 0x03E9, 0x0CB0, 0x0987], // M3-M
	[0x1735, 0x1202, 0x1D5B, 0x186C], // M4-L
	[0x2508, 0x203F, 0x2F66, 0x2A51], // M4-M
	[0x34E3, 0x31D4, 0x3E8D, 0x3BBA], // M4-Q
];

export function maskCondition(mask, row, col){
	switch(mask){
		case 0: return (row % 2 === 0);
		case 1: return ((Math.trunc(row / 2) + Math.trunc(col / 3)) % 2 === 0);
		case 2: return ((((row * col) % 2) + ((row * col) % 3)) % 2 === 0);
		case 3: return ((((row + col) % 2) + ((row * col) % 3)) % 2 === 0);
		default: return false;
	}
}
