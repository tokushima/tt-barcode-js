# tt-barcode (JS)

## インストール

```bash
npm install github:tokushima/tt-barcode-js
# 特定タグ/コミットを固定する場合
npm install github:tokushima/tt-barcode-js#v1.0.0
```

## QRコード

```js
import { QRCode } from '@tokushima/tt-barcode';

// SVG文字列を取得
const svg = QRCode.svg('https://example.com');

// ビルダーパターンでカスタマイズ
const customSvg = QRCode.create('https://example.com')
  .module_shape('dots')        // 'square' (デフォルト), 'dots'
  .finder_shape('modern')      // 'square' (デフォルト), 'modern'
  .fg_color('#FF0000')
  .bg_color('#FFFFFF')
  .finder_color('#CC0000')
  .module_size(10)
  .margin(4)
  .render_svg();

// グラデーション
const gradSvg = QRCode.create('https://example.com')
  .module_shape('dots')
  .gradient('#FF6B6B', '#4ECDC4')
  .render_svg();

// アイコン埋め込み (SVG文字列 / data URL)
const iconSvg = QRCode.create('https://example.com')
  .icon_svg('<circle cx="50" cy="50" r="40" fill="red"/>', 0.25)
  .render_svg();
```

### 誤り訂正レベル

| 定数 | 復元率 |
|------|--------|
| `QRCode.EC_L` | 7% |
| `QRCode.EC_M` | 15% (デフォルト) |
| `QRCode.EC_Q` | 25% |
| `QRCode.EC_H` | 30% |

## マイクロQRコード

```js
import { MicroQR } from '@tokushima/tt-barcode';

const svg = MicroQR.svg('12345');

const customSvg = MicroQR.create('HELLO')
  .fg_color('#003366')
  .module_size(15)
  .margin(3)
  .render_svg();
```

バージョン M1 (11x11) - M4 (17x17)。誤り訂正: `EC_DETECT` (M1), `EC_L`, `EC_M`, `EC_Q` (M4)。

## Data Matrix

```js
import { DataMatrix } from '@tokushima/tt-barcode';

const svg = DataMatrix.svg('Hello');

const customSvg = DataMatrix.create('Hello')
  .shape('rectangle')          // 'auto' (デフォルト), 'square', 'rectangle'
  .fg_color('#003366')
  .module_size(10)
  .margin(2)
  .render_svg();
```

ECC 200 準拠。正方形 (10x10 - 144x144) および長方形 (8x18 - 16x48) シンボルに対応。

## rMQR

```js
import { rMQR } from '@tokushima/tt-barcode';

const svg = rMQR.svg('Hello');

const customSvg = rMQR.create('Hello', rMQR.EC_M, 'R9x43')
  .module_size(15)
  .margin(3)
  .render_svg();
```

ISO/IEC 23941 準拠。32 バージョン (R7x43 - R17x139)。誤り訂正: `EC_M` (デフォルト), `EC_H`。

## NW-7 (Codabar)

```js
import { NW7 } from '@tokushima/tt-barcode';

const svg = NW7.svg('12345');

const customSvg = NW7.create('12345', 'A', 'B')
  .fg_color('#003366')
  .height(100)
  .module_width(2)
  .margin(20)
  .wide_ratio(2.5)
  .show_text(false)
  .render_svg();
```

使用可能文字: `0-9`, `-`, `$`, `:`, `/`, `.`, `+`
スタート/ストップ: `A`, `B`, `C`, `D`

## 郵便カスタマーバーコード

```js
import { CustomerBarcode } from '@tokushima/tt-barcode';

const bar = CustomerBarcode.create('263-0023', '千葉市稲毛区緑町3丁目30-8 郵便ビル403号');

const svg = bar.render_svg({
  bar_height: 3.6,    // バーの高さ(mm)
  module_width: 0.6,  // モジュール幅(mm)
  gap: 0.6,           // ギャップ幅(mm)
  color: '#000000',   // バーの色
  bgcolor: '#FFFFFF', // 背景色
});
```
