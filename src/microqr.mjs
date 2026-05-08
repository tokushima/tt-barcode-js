/**
 * Micro QR Code generator (M1-M4).
 *
 *   import { MicroQR } from 'tt-barcode';
 *
 *   const svg = MicroQR.svg('12345');
 *
 *   const customSvg = MicroQR.create('HELLO')
 *     .fg_color('#003366')
 *     .module_size(15)
 *     .render_svg();
 *
 *   Versions: M1 (11x11) - M4 (17x17)
 *   EC levels: EC_DETECT (M1 only), EC_L, EC_M, EC_Q (M4 only)
 */
import * as M from './microqr/microqr-data.mjs';
import { encode as mqrEncode } from './microqr/microqr-encoder.mjs';
import { SVGRenderer } from './microqr/svg-renderer.mjs';

export class MicroQR{
	static EC_DETECT = M.EC_DETECT;
	static EC_L = M.EC_L;
	static EC_M = M.EC_M;
	static EC_Q = M.EC_Q;

	constructor(modules){
		this._modules = modules;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_size = 10;
		this._margin = 2;
	}

	static create(text, ecLevel = M.EC_L, version = null){
		return new MicroQR(mqrEncode(text, ecLevel, version));
	}

	static svg(text, ecLevel = M.EC_L){
		return MicroQR.create(text, ecLevel).render_svg();
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }

	size(px){
		this._module_size = Math.max(1, Math.floor(px / (this._modules.length + this._margin * 2)));
		return this;
	}

	render_svg(){
		return new SVGRenderer(this._modules)
			.fg_color(this._fg_color).bg_color(this._bg_color)
			.module_size(this._module_size).margin(this._margin)
			.render();
	}

	matrix(){ return this._modules; }
	module_count(){ return this._modules.length; }
}
