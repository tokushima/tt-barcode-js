import { svgEscape } from '../_util.mjs';

export class SVGRenderer{
	constructor(modules){
		this.modules = modules;
		this.size = modules.length;
		this._fg_color = '#000000';
		this._bg_color = '#FFFFFF';
		this._module_size = 10;
		this._margin = 2;
	}

	fg_color(color){ this._fg_color = color; return this; }
	bg_color(color){ this._bg_color = color; return this; }
	module_size(px){ this._module_size = px; return this; }
	margin(modules){ this._margin = modules; return this; }

	render(){
		const ms = this._module_size;
		const total = (this.size + this._margin * 2) * ms;

		let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
		out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">\n`;
		out += `<rect width="${total}" height="${total}" fill="${svgEscape(this._bg_color)}"/>\n`;

		const fill = `fill="${svgEscape(this._fg_color)}"`;
		for(let r = 0; r < this.size; r++){
			for(let c = 0; c < this.size; c++){
				if(!this.modules[r][c]) continue;
				const x = (c + this._margin) * ms;
				const y = (r + this._margin) * ms;
				out += `<rect x="${x}" y="${y}" width="${ms}" height="${ms}" ${fill}/>\n`;
			}
		}

		out += '</svg>';
		return out;
	}
}
