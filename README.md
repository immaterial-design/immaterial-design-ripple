Immaterial Design Ripple (beta)
---

<p align="right">
  <a href="https://npmjs.org/package/immaterial-design-ripple">
    <img src="https://img.shields.io/npm/v/immaterial-design-ripple.svg?style=flat-square">
  </a>
  <a href="https://travis-ci.org/immaterial-design/immaterial-design-ripple">
    <img src="http://img.shields.io/travis/immaterial-design/immaterial-design-ripple.svg?style=flat-square">
  </a>
  <a href="https://codeclimate.com/github/immaterial-design/immaterial-design-ripple/coverage">
    <img src="https://img.shields.io/codeclimate/github/immaterial-design/immaterial-design-ripple.svg?style=flat-square">
  </a>
  <a href="https://codeclimate.com/github/immaterial-design/immaterial-design-ripple">
    <img src="https://img.shields.io/codeclimate/coverage/github/immaterial-design/immaterial-design-ripple.svg?style=flat-square">
  </a>
  <a href="https://unpkg.com/immaterial-design-ripple/esdoc/index.html">
    <img src="https://unpkg.com/immaterial-design-ripple/esdoc/badge.svg">
  </a>
</p>

<p align="center">
  <a href="https://saucelabs.com/u/59798">
    <img src="http://soysauce.berabou.me/u/59798/immaterial-design-ripple.svg">
  </a>
</p>

> HTML5 Canvas based pixelated ripple effect.

[See Example](https://unpkg.com/immaterial-design-ripple/release/index.html)

Installation
---

## At NodeJS

```bash
$ npm install immaterial-design-ripple --save
```
```js
import ImdRipple from 'immaterial-design-ripple';

ImdRipple.bindOnLoad('.imd-ripple');
```

## At CDN

```html
<script src="https://unpkg.com/immaterial-design-ripple/release/immaterial-design-ripple.min.js"></script>

<button class="imd-ripple">Default effect</button>
<script>ImdRipple.bindOnLoad('.imd-ripple')</script>
```

Usage
---

## `ImdRipple.bindOnLoad(selector, options = {})`

Bind a left-click event automatically to the elements of the `selector` After window onload.

If specify the `options` then set default of the ripple effect.

```html
<script>
ImdRipple.bindOnLoad('body', {
  pixelSize: 1,
  bitCrash: 10,
  color: 'black',
  timingFunction: 'easeInCirc',
})
</script>
```

Becomes :+1:

![result](https://cloud.githubusercontent.com/assets/1548478/13376399/8a6f610e-ddfe-11e5-9f39-364c869ed841.gif)

Document
---
[API Reference(日本語)](https://unpkg.com/immaterial-design-ripple/esdoc/index.html)

Test
---
```bash
git clone https://github.com/59naga/immaterial-design-ripple.git
cd immaterial-design-ripple

npm install
npm test
```

License
---
[MIT](http://59naga.mit-license.org/)