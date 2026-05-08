export type DataMatrixShape = 'auto' | 'square' | 'rectangle';

export class DataMatrix {
	constructor(text: string);

	static create(text: string): DataMatrix;
	static svg(text: string): string;

	shape(shape: DataMatrixShape): this;
	fg_color(color: string): this;
	bg_color(color: string): this;
	module_size(px: number): this;
	margin(modules: number): this;
	size(px: number): this;

	render_svg(): string;
	matrix(): number[][];
}
