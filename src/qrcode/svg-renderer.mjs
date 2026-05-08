/**
 * Render a QR code matrix as an SVG string.
 *
 * module_shape: 'square' (default), 'dots'
 * finder_shape: 'square' (default), 'modern'
 */
import { svgEscape, fixed } from '../_util.mjs';

export class SVGRenderer{
	constructor(modules){
		this.modules = modules;
		this.size = modules.length;

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

		this._icon_svg = null;
		this._icon_data_url = null;
		this._icon_scale = 0.2;
	}

	module_shape(shape){ this._module_shape = shape; return this; }
	finder_shape(shape){ this._finder_shape = shape; return this; }
	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	finder_color(color){ this._finder_color = color; return this; }

	gradient(startColor, endColor){
		this._gradient_start = startColor;
		this._gradient_end = endColor;
		return this;
	}

	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }
	dot_scale(scale){ this._dot_scale = Math.max(0.1, Math.min(1.0, scale)); return this; }
	alpha(percent){ this._alpha = Math.max(0, Math.min(100, percent)); return this; }

	icon_svg(svg, scale = 0.2){
		this._icon_svg = svg;
		this._icon_scale = scale;
		return this;
	}

	icon_data_url(url, scale = 0.2){
		this._icon_data_url = url;
		this._icon_scale = scale;
		return this;
	}

	render(){
		const ms = this._module_size;
		const total = (this.size + this._margin * 2) * ms;

		let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
		out += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">\n`;
		out += `<rect width="${total}" height="${total}" fill="${svgEscape(this._bg_color)}"/>\n`;

		let fillAttr = `fill="${svgEscape(this._fg_color)}"`;
		if(this._gradient_start !== null && this._gradient_end !== null){
			out += '<defs>\n';
			out += `<linearGradient id="qr-grad" x1="0%" y1="0%" x2="100%" y2="100%">`;
			out += `<stop offset="0%" stop-color="${svgEscape(this._gradient_start)}"/>`;
			out += `<stop offset="100%" stop-color="${svgEscape(this._gradient_end)}"/>`;
			out += '</linearGradient>\n';
			out += '</defs>\n';
			fillAttr = 'fill="url(#qr-grad)"';
		}

		const finderFill = this._finder_color
			? `fill="${svgEscape(this._finder_color)}"`
			: fillAttr;
		const customFinder = (this._finder_shape !== 'square');

		out += (this._alpha < 100)
			? `<g opacity="${fixed(this._alpha / 100, 2)}">\n`
			: '<g>\n';

		if(customFinder){
			out += this.renderModernFinders(finderFill, ms);
		}

		for(let r = 0; r < this.size; r++){
			for(let c = 0; c < this.size; c++){
				if(!this.modules[r][c]) continue;
				const isFinder = this.isFinderModule(r, c);
				if(isFinder && customFinder) continue;

				const f = isFinder ? finderFill : fillAttr;
				out += (this._module_shape === 'dots')
					? this.renderDot(r, c, ms, f)
					: this.renderSquare(r, c, ms, f);
			}
		}

		out += '</g>\n';
		out += this.renderIcon(total, ms);
		out += '</svg>';
		return out;
	}

	renderSquare(r, c, ms, fill){
		const x = (c + this._margin) * ms;
		const y = (r + this._margin) * ms;
		return `<rect x="${x}" y="${y}" width="${ms}" height="${ms}" ${fill}/>\n`;
	}

	renderDot(r, c, ms, fill){
		const cx = (c + this._margin) * ms + ms / 2;
		const cy = (r + this._margin) * ms + ms / 2;
		const radius = (ms / 2) * this._dot_scale;
		return `<circle cx="${fixed(cx, 1)}" cy="${fixed(cy, 1)}" r="${fixed(radius, 1)}" ${fill}/>\n`;
	}

	renderModernFinders(fill, ms){
		let out = '';
		const positions = [[0, 0], [0, this.size - 7], [this.size - 7, 0]];
		for(const [pr, pc] of positions){
			const ox = (pc + this._margin) * ms;
			const oy = (pr + this._margin) * ms;
			const outer = 7 * ms;

			out += `<rect x="${ox}" y="${oy}" width="${outer}" height="${outer}" rx="${fixed(ms * 2.0, 1)}" ry="${fixed(ms * 2.0, 1)}" ${fill}/>\n`;
			out += `<rect x="${fixed(ox + ms, 1)}" y="${fixed(oy + ms, 1)}" width="${5 * ms}" height="${5 * ms}" rx="${fixed(ms * 1.4, 1)}" ry="${fixed(ms * 1.4, 1)}" fill="${svgEscape(this._bg_color)}"/>\n`;
			out += `<rect x="${ox + 2 * ms}" y="${oy + 2 * ms}" width="${3 * ms}" height="${3 * ms}" rx="${fixed(ms * 1.0, 1)}" ry="${fixed(ms * 1.0, 1)}" ${fill}/>\n`;
		}
		return out;
	}

	renderIcon(totalSize, ms){
		if(this._icon_svg === null && this._icon_data_url === null) return '';

		const iconSize = this.size * ms * this._icon_scale;
		const iconX = (totalSize - iconSize) / 2;
		const iconY = (totalSize - iconSize) / 2;

		if(this._icon_svg !== null){
			let viewBox = '0 0 100 100';
			let inner = this._icon_svg;
			const wrapMatch = inner.match(/<svg[^>]*viewBox="([^"]*)"[^>]*>([\s\S]*)<\/svg>/);
			if(wrapMatch){
				viewBox = wrapMatch[1];
				inner = wrapMatch[2];
			}else{
				const noVbMatch = inner.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
				if(noVbMatch) inner = noVbMatch[1];
			}
			return `<g transform="translate(${fixed(iconX, 1)}, ${fixed(iconY, 1)})"><svg viewBox="${viewBox}" width="${fixed(iconSize, 1)}" height="${fixed(iconSize, 1)}">${inner}</svg></g>\n`;
		}

		return `<image x="${fixed(iconX, 1)}" y="${fixed(iconY, 1)}" width="${fixed(iconSize, 1)}" height="${fixed(iconSize, 1)}" href="${svgEscape(this._icon_data_url)}"/>\n`;
	}

	isFinderModule(r, c){
		const s = this.size;
		return (r <= 7 && c <= 7) || (r <= 7 && c >= s - 8) || (r >= s - 8 && c <= 7);
	}
}
