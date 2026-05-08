/**
 * Data Matrix (ECC 200) generator.
 *
 *   import { DataMatrix } from 'tt-barcode';
 *
 *   const svg = DataMatrix.svg('Hello');
 *
 *   const customSvg = DataMatrix.create('Hello')
 *     .shape('rectangle')
 *     .fg_color('#003366')
 *     .module_size(10)
 *     .render_svg();
 */
import { encode as dmEncode } from './datamatrix/datamatrix-encoder.mjs';
import { SVGRenderer } from './datamatrix/svg-renderer.mjs';

export class DataMatrix{
	constructor(text){
		this._text = text;
		this._shape = 'auto';
		this._modules = null;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_size = 10;
		this._margin = 2;
	}

	static create(text){ return new DataMatrix(text); }
	static svg(text){ return DataMatrix.create(text).render_svg(); }

	shape(shape){
		this._shape = shape;
		this._modules = null;
		return this;
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }

	size(px){
		const m = this._matrix();
		const maxDim = Math.max(m.length, m[0].length);
		this._module_size = Math.max(1, Math.floor(px / (maxDim + this._margin * 2)));
		return this;
	}

	render_svg(){
		return new SVGRenderer(this._matrix())
			.fg_color(this._fg_color).bg_color(this._bg_color)
			.module_size(this._module_size).margin(this._margin)
			.render();
	}

	matrix(){ return this._matrix(); }

	_matrix(){
		if(this._modules === null){
			this._modules = dmEncode(this._text, this._shape);
		}
		return this._modules;
	}
}
