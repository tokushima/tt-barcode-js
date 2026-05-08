/**
 * rMQR (Rectangular Micro QR Code) generator.
 *
 *   import { rMQR } from 'tt-barcode';
 *
 *   const svg = rMQR.svg('Hello');
 *
 *   const customSvg = rMQR.create('Hello', rMQR.EC_M, 'R9x43')
 *     .module_size(15)
 *     .render_svg();
 */
import { encodeFull } from './rmqr/rmqr-encoder.mjs';
import { SVGRenderer } from './rmqr/svg-renderer.mjs';

export class rMQR{
	static EC_M = 0;
	static EC_H = 1;

	constructor(modules){
		this._modules = modules;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_size = 10;
		this._margin = 2;
	}

	static create(text, ecLevel = rMQR.EC_M, version = null){
		return new rMQR(encodeFull(text, ecLevel, version));
	}

	static svg(text, ecLevel = rMQR.EC_M){
		return rMQR.create(text, ecLevel).render_svg();
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }

	size(px){
		const maxDim = Math.max(this._modules.length, this._modules[0].length);
		this._module_size = Math.max(1, Math.floor(px / (maxDim + this._margin * 2)));
		return this;
	}

	render_svg(){
		return new SVGRenderer(this._modules)
			.fg_color(this._fg_color).bg_color(this._bg_color)
			.module_size(this._module_size).margin(this._margin)
			.render();
	}

	matrix(){ return this._modules; }
}
