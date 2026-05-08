export type MicroQRECLevel = 0 | 1 | 2 | 3;

export class MicroQR {
	static readonly EC_DETECT: 0;
	static readonly EC_L: 1;
	static readonly EC_M: 2;
	static readonly EC_Q: 3;

	constructor(modules: number[][]);

	static create(text: string, ecLevel?: MicroQRECLevel, version?: number | null): MicroQR;
	static svg(text: string, ecLevel?: MicroQRECLevel): string;

	fg_color(color: string): this;
	bg_color(color: string): this;
	module_size(px: number): this;
	margin(modules: number): this;
	size(px: number): this;

	render_svg(): string;
	matrix(): number[][];
	module_count(): number;
}
