/**
 * NW-7 (Codabar) barcode generator.
 *
 *   import { NW7 } from 'tt-barcode';
 *
 *   const svg = NW7.svg('12345');
 *
 *   const customSvg = NW7.create('12345', 'A', 'B')
 *     .fg_color('#003366')
 *     .height(100)
 *     .show_text(false)
 *     .render_svg();
 *
 *   Valid characters: 0-9, -, $, :, /, ., +
 *   Start/Stop: A, B, C, D
 */
import { encode as nw7Encode } from './nw7/nw7-encoder.mjs';
import { SVGRenderer } from './nw7/svg-renderer.mjs';

export class NW7{
	constructor(bars, text){
		this._bars = bars;
		this._text = text;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_width = 2;
		this._height = 80;
		this._margin = 10;
		this._wide_ratio = 2.5;
		this._show_text = true;
		this._font_size = 14;
	}

	static create(data, start = 'A', stop = 'A'){
		const r = nw7Encode(data, start, stop);
		return new NW7(r.bars, r.text);
	}

	static svg(data, start = 'A', stop = 'A'){
		return NW7.create(data, start, stop).render_svg();
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_width(px){ this._module_width = px; return this; }
	height(px){ this._height = px; return this; }
	margin(px){ this._margin = px; return this; }
	wide_ratio(ratio){ this._wide_ratio = ratio; return this; }
	show_text(show){ this._show_text = show; return this; }
	font_size(size){ this._font_size = size; return this; }

	render_svg(){
		return new SVGRenderer(this._bars, this._text)
			.fg_color(this._fg_color).bg_color(this._bg_color)
			.module_width(this._module_width).height(this._height)
			.margin(this._margin).wide_ratio(this._wide_ratio)
			.show_text(this._show_text).font_size(this._font_size)
			.render();
	}

	bars(){ return this._bars; }
	text(){ return this._text; }
}
