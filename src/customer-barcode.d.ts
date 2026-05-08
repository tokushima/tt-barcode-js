export interface CustomerBarcodeRenderOptions {
	bar_height?: number;
	module_width?: number;
	gap?: number;
	color?: string;
	bgcolor?: string | null;
}

export class CustomerBarcode {
	static readonly BAR_LONG: 1;
	static readonly BAR_SEMI_UP: 2;
	static readonly BAR_SEMI_DOWN: 3;
	static readonly BAR_TIMING: 4;

	constructor();

	static create(zip: string, address?: string): CustomerBarcode;
	static normalizeAddress(address: string): string;

	getBars(): number[];
	getChardata(): string;
	render_svg(opt?: CustomerBarcodeRenderOptions): string;
}
