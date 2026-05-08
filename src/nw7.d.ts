export type NW7StartStop = 'A' | 'B' | 'C' | 'D';

export class NW7 {
	constructor(bars: number[], text: string);

	static create(data: string, start?: NW7StartStop, stop?: NW7StartStop): NW7;
	static svg(data: string, start?: NW7StartStop, stop?: NW7StartStop): string;

	fg_color(color: string): this;
	bg_color(color: string): this;
	module_width(px: number): this;
	height(px: number): this;
	margin(px: number): this;
	wide_ratio(ratio: number): this;
	show_text(show: boolean): this;
	font_size(size: number): this;

	render_svg(): string;
	bars(): number[];
	text(): string;
}
