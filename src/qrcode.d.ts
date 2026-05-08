export type QRECLevel = 0 | 1 | 2 | 3;
export type QRModuleShape = 'square' | 'dots';
export type QRFinderShape = 'square' | 'modern';

export class QRCode {
	static readonly EC_L: 0;
	static readonly EC_M: 1;
	static readonly EC_Q: 2;
	static readonly EC_H: 3;

	constructor(text: string, ecLevel: QRECLevel, version: number | null);

	static create(text: string, ecLevel?: QRECLevel, version?: number | null): QRCode;
	static svg(text: string, ecLevel?: QRECLevel): string;

	module_shape(shape: QRModuleShape): this;
	finder_shape(shape: QRFinderShape): this;
	fg_color(color: string): this;
	bg_color(color: string): this;
	finder_color(color: string): this;
	module_size(px: number): this;
	margin(modules: number): this;
	dot_scale(scale: number): this;
	alpha(percent: number): this;
	size(px: number): this;
	gradient(start: string, end: string): this;
	icon_svg(svgString: string, scale?: number): this;
	icon_data_url(url: string, scale?: number): this;

	render_svg(): string;
	matrix(): number[][];
	module_count(): number;
}
