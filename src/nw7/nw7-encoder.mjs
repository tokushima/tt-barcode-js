/**
 * NW-7 (Codabar) encoder.
 * Each character has 7 elements (4 bars + 3 spaces).
 * Width values: 1 = narrow, 2 = wide.
 */

const PATTERNS = {
	'0': [1,1,1,1,1,2,2],
	'1': [1,1,1,1,2,2,1],
	'2': [1,1,1,2,1,1,2],
	'3': [2,2,1,1,1,1,1],
	'4': [1,1,2,1,1,2,1],
	'5': [2,1,1,1,1,2,1],
	'6': [1,2,1,1,1,1,2],
	'7': [1,2,1,1,2,1,1],
	'8': [1,2,2,1,1,1,1],
	'9': [2,1,1,2,1,1,1],
	'-': [1,1,1,2,2,1,1],
	'$': [1,1,2,2,1,1,1],
	':': [2,1,1,1,2,1,2],
	'/': [2,1,2,1,1,1,2],
	'.': [2,1,2,1,2,1,1],
	'+': [1,1,2,1,2,1,2],
	'A': [1,1,2,2,1,2,1],
	'B': [1,2,1,2,1,1,2],
	'C': [1,1,1,2,1,2,2],
	'D': [1,1,1,2,2,2,1],
};

const VALID_START_STOP = ['A', 'B', 'C', 'D'];

/**
 * @param {string} data
 * @param {string} start - one of 'A', 'B', 'C', 'D'
 * @param {string} stop  - one of 'A', 'B', 'C', 'D'
 * @returns {{bars: Array<[boolean, number]>, text: string}}
 */
export function encode(data, start = 'A', stop = 'A'){
	data = data.trim().toUpperCase();
	start = start.toUpperCase();
	stop = stop.toUpperCase();

	if(!PATTERNS[start] || !VALID_START_STOP.includes(start)){
		throw new Error('Invalid start character: ' + start);
	}
	if(!PATTERNS[stop] || !VALID_START_STOP.includes(stop)){
		throw new Error('Invalid stop character: ' + stop);
	}

	const chars = start + data + stop;
	for(let i = 0; i < chars.length; i++){
		if(!PATTERNS[chars[i]]){
			throw new Error('Invalid NW-7 character: ' + chars[i]);
		}
	}

	const bars = [];
	for(let i = 0; i < chars.length; i++){
		if(i > 0){
			bars.push([false, 1]); // inter-character gap (narrow space)
		}
		const pattern = PATTERNS[chars[i]];
		for(let j = 0; j < 7; j++){
			const isBar = (j % 2 === 0);
			bars.push([isBar, pattern[j]]);
		}
	}

	return { bars, text: chars };
}

export function validChars(){
	return '0123456789-$:/.+';
}
