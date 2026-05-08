import { svgEscape, fixed } from '../_util.mjs';

export class SVGRenderer{
	constructor(bars, text){
		this.bars = bars;
		this.text = text;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_width = 2;
		this._height = 80;
		this._margin = 10;
		this._wide_ratio = 2.5;
		this._show_text = true;
		this._font_size = 14;
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_width(px){ this._module_width = px; return this; }
	height(px){ this._height = px; return this; }
	margin(px){ this._margin = px; return this; }
	wide_ratio(ratio){ this._wide_ratio = ratio; return this; }
	show_text(show){ this._show_text = show; return this; }
	font_size(size){ this._font_size = size; return this; }

	render(){
		const mw = this._module_width;
		const wr = this._wide_ratio;

		let barcodeWidth = 0;
		for(const [, width] of this.bars){
			barcodeWidth += (width === 1) ? mw : mw * wr;
		}

		const textHeight = this._show_text ? (this._font_size + 8) : 0;
		const totalW = barcodeWidth + this._margin * 2;
		const totalH = this._height + this._margin * 2 + textHeight;

		let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
		out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fixed(totalW, 1)} ${fixed(totalH, 1)}" width="${fixed(totalW, 1)}" height="${fixed(totalH, 1)}">\n`;
		out += `<rect width="${fixed(totalW, 1)}" height="${fixed(totalH, 1)}" fill="${svgEscape(this._bg_color)}"/>\n`;

		let x = this._margin;
		for(const [isBar, width] of this.bars){
			const w = (width === 1) ? mw : mw * wr;
			if(isBar){
				out += `<rect x="${fixed(x, 1)}" y="${this._margin}" width="${fixed(w, 1)}" height="${this._height}" fill="${svgEscape(this._fg_color)}"/>\n`;
			}
			x += w;
		}

		if(this._show_text){
			const textY = this._margin + this._height + this._font_size + 4;
			const textX = this._margin + barcodeWidth / 2;
			out += `<text x="${fixed(textX, 1)}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="${this._font_size}" fill="${svgEscape(this._fg_color)}">${svgEscape(this.text)}</text>\n`;
		}

		out += '</svg>';
		return out;
	}
}
