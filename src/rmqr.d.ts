export type RMQRECLevel = 0 | 1;
export type RMQRVersion =
	| 'R7x43' | 'R7x59' | 'R7x77' | 'R7x99' | 'R7x139'
	| 'R9x43' | 'R9x59' | 'R9x77' | 'R9x99' | 'R9x139'
	| 'R11x27' | 'R11x43' | 'R11x59' | 'R11x77' | 'R11x99' | 'R11x139'
	| 'R13x27' | 'R13x43' | 'R13x59' | 'R13x77' | 'R13x99' | 'R13x139'
	| 'R15x43' | 'R15x59' | 'R15x77' | 'R15x99' | 'R15x139'
	| 'R17x43' | 'R17x59' | 'R17x77' | 'R17x99' | 'R17x139';

export class rMQR {
	static readonly EC_M: 0;
	static readonly EC_H: 1;

	constructor(modules: number[][]);

	static create(text: string, ecLevel?: RMQRECLevel, version?: RMQRVersion | null): rMQR;
	static svg(text: string, ecLevel?: RMQRECLevel): string;

	fg_color(color: string): this;
	bg_color(color: string): this;
	module_size(px: number): this;
	margin(modules: number): this;
	size(px: number): this;

	render_svg(): string;
	matrix(): number[][];
}
