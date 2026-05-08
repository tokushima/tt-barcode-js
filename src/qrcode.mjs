/**
 * QR Code generator (builder pattern).
 *
 *   import { QRCode } from 'tt-barcode';
 *
 *   const svg = QRCode.svg('https://example.com');
 *
 *   const customSvg = QRCode.create('https://example.com')
 *     .module_shape('dots')
 *     .finder_shape('modern')
 *     .fg_color('#FF0000')
 *     .render_svg();
 *
 *   // Gradient
 *   QRCode.create('https://example.com')
 *     .module_shape('dots')
 *     .gradient('#FF6B6B', '#4ECDC4')
 *     .render_svg();
 *
 *   module_shape: 'square' (default), 'dots'
 *   finder_shape: 'square' (default), 'modern'
 *
 *   Error correction levels:
 *     QRCode.EC_L (7%), QRCode.EC_M (15%), QRCode.EC_Q (25%), QRCode.EC_H (30%)
 *     EC_H is forced when an icon is set.
 */
import * as Q from './qrcode/qr-data.mjs';
import { encode as qrEncode } from './qrcode/qr-encoder.mjs';
import { SVGRenderer } from './qrcode/svg-renderer.mjs';

export class QRCode{
	static EC_L = Q.EC_L;
	static EC_M = Q.EC_M;
	static EC_Q = Q.EC_Q;
	static EC_H = Q.EC_H;

	constructor(text, ecLevel, version){
		this._text = text;
		this._ec_level = ecLevel;
		this._version = version;
		this._modules = null;
		this._module_shape = 'square';
		this._finder_shape = 'square';
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._finder_color = null;
		this._gradient_start = null;
		this._gradient_end = null;
		this._module_size = 10;
		this._margin = 4;
		this._dot_scale = 0.85;
		this._alpha = 100;
		this._icon_svg_str = null;
		this._icon_data_url = null;
		this._icon_scale = 0.2;
	}

	static create(text, ecLevel = Q.EC_M, version = null){
		return new QRCode(text, ecLevel, version);
	}

	static svg(text, ecLevel = Q.EC_M){
		return QRCode.create(text, ecLevel).render_svg();
	}

	module_shape(shape){ this._module_shape = shape; return this; }
	finder_shape(shape){ this._finder_shape = shape; return this; }
	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	finder_color(color){ this._finder_color = color; return this; }
	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }
	dot_scale(scale){ this._dot_scale = scale; return this; }
	alpha(percent){ this._alpha = Math.max(0, Math.min(100, percent)); return this; }

	size(px){
		const m = this._matrix();
		this._module_size = Math.max(1, Math.floor(px / (m.length + this._margin * 2)));
		return this;
	}

	gradient(start, end){
		this._gradient_start = start;
		this._gradient_end = end;
		return this;
	}

	icon_svg(svgString, scale = 0.2){
		this._icon_svg_str = svgString;
		this._icon_scale = scale;
		this._modules = null;
		return this;
	}

	icon_data_url(url, scale = 0.2){
		this._icon_data_url = url;
		this._icon_scale = scale;
		this._modules = null;
		return this;
	}

	render_svg(){
		return this._buildSvg().render();
	}

	matrix(){ return this._matrix(); }
	module_count(){ return this._matrix().length; }

	_matrix(){
		if(this._modules === null){
			const ec = (this._icon_svg_str !== null || this._icon_data_url !== null)
				? Q.EC_H
				: this._ec_level;
			this._modules = qrEncode(this._text, ec, this._version);
		}
		return this._modules;
	}

	_buildSvg(){
		const r = new SVGRenderer(this._matrix());
		r.module_shape(this._module_shape).finder_shape(this._finder_shape)
			.fg_color(this._fg_color).bg_color(this._bg_color)
			.module_size(this._module_size).margin(this._margin)
			.dot_scale(this._dot_scale).alpha(this._alpha);

		if(this._finder_color !== null) r.finder_color(this._finder_color);
		if(this._gradient_start !== null && this._gradient_end !== null){
			r.gradient(this._gradient_start, this._gradient_end);
		}
		if(this._icon_svg_str !== null) r.icon_svg(this._icon_svg_str, this._icon_scale);
		if(this._icon_data_url !== null) r.icon_data_url(this._icon_data_url, this._icon_scale);
		return r;
	}
}
