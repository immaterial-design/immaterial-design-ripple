import Promise from 'bluebird';
import easingJs from 'easing-js';

/**
* 利用可能な非同期関数でcallbackを実行する
*
* @params {function} [callback]
* @return undefined
*/
export function requestAnimationFrame(callback) {
  return window.requestAnimationFrame(callback);
}

/**
* 指定した大きさのcontext2dを返す
*
* @function createContext2d
* @param {number} width contextの幅
* @param {number} height contextの高さ
* @param {object} [options]
* @param {object} [options.pixelated=true] imageSmoothingEnabledをfalseに設定する
* @return {CanvasRenderingContext2D}
*/
export function createContext2d(width, height, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.right = 0;
  canvas.style.bottom = 0;
  canvas.style.left = 0;

  const context = canvas.getContext('2d');
  if (options.pixelated) {
    context.mozImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
  }

  return context;
}

/**
* contextと同じ大きさの空のimageDataを返す
*
* @function getImageData
* @param {HTMLCanvasElement} canvas 大きさの基準となるcanvas
* @return {ImageData}
*/
export function getImageData(canvas) {
  const { width, height } = canvas;

  const newContext = document.createElement('canvas').getContext('2d');
  newContext.canvas.width = width;
  newContext.canvas.height = height;
  return newContext.getImageData(0, 0, width, height);
}


/**
* canvasを透明化、opacity:0でcanvasを破棄
*
* TODO: optionsで透明化の秒数が指定できるように
*
* @function transparentize
* @param {element} element 透明化させ、破棄する要素
* @param {object} [options]
* @param {number} [options.opacityStep=0.02] 1フレームの透明化進行度
* @return {Promise<null>} animation 要素破棄時にfullfill
*/
export function transparentize(element, options = {}) {
  const elementStyle = element.style;
  const opts = Object.create(options);
  if (opts.opacityStep === undefined) {
    opts.opacityStep = 0.02;
  }

  return new Promise((resolve) => {
    let opacity = 1;
    const render = () => {
      opacity -= opts.opacityStep;
      if (opacity <= 0) {
        elementStyle.opacity = 0;
        return resolve();
      }

      elementStyle.opacity = opacity;

      return requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }).then(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

/**
* easingJsで定義された関数名であれば、その関数を返し
* 引数が関数であれば、そのまま返す
* それ以外はnull
*
* @function getTimingFunction
* @param {string|function} name EasingJsの関数名か、独自で関数を定義
* @return {function|null} timingFunction (t,b,c,d)を受け取るイージング関数。未定義の関数名ならnull
*/
export function getTimingFunction(name = 'easeInBack') {
  if (typeof name === 'function') {
    return name;
  }
  if (easingJs[name]) {
    return easingJs[name];
  }

  return null;
}

/**
* 指定した大きさのimageDataを作成し
* 波形アニメーションとして表示するフレーム番号を計算する
* x,yを始点とする
*
* 返される配列の値は大きさからpixelSizeを割ったもの。
*
* @function createRenderSchedule
* @param {number} x 波形アニメーションの始点x
* @param {number} y 波形アニメーションの始点y
* @param {number} width 波形アニメーションの幅
* @param {number} height 波形アニメーションの高さ
* @param {object} [options]
* @param {number} [options.pixelSize] ピクセル１粒の大きさ
* @param {number} [options.bitCrash=null] 境界にノイズを入れる、値はノイズの強さ
* @param {string|function} [options.timingFunction='easeInQuint'] フレーム番号のイージング関数名
* @return {object} RenderSchedule
* @return {array} RenderSchedule.data yとxからなる二次元配列。表示するフレーム番号を値に持つ
* @return {number} RenderSchedule.width ピクセルの横の個数
* @return {number} RenderSchedule.height ピクセルの縦の個数
* @return {number} RenderSchedule.pixelSize ピクセル１粒の大きさ
* @return {function|null} RenderSchedule.easedBy フレーム番号の調整に使用した関数
*/
export function createRenderSchedule(x, y, width, height, options = {}) {
  const opts = Object.create(options);
  if (opts.pixelSize === undefined) {
    opts.pixelSize = 1;
  }

  const dataWidth = Math.ceil(width / opts.pixelSize);
  const dataHeight = Math.ceil(height / opts.pixelSize);
  const data = [];

  // ピクセルごとの表示を開始するフレーム番号を定義する
  let c = 0;// maxFrame
  for (let i = 0; i < dataHeight; i++) {
    if (data[i] === undefined) {
      data[i] = [];
    }
    for (let j = 0; j < dataWidth; j++) {
      const originalX = opts.pixelSize * j;
      const originalY = opts.pixelSize * i;

      // x, yからの距離をピクセル基準で求める
      const distanceX = Math.abs(originalX - x);
      const distanceY = Math.abs(originalY - y);
      const distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));
      const showFrame = Math.floor(distance / opts.pixelSize);
      if (c < showFrame) {
        c = showFrame;
      }

      data[i].push(showFrame);
    }
  }

  // アニメーションの緩急を変更する
  // http://d.hatena.ne.jp/nakamura001/20111117/1321539246
  const timingFunction = getTimingFunction(opts.timingFunction);
  if (timingFunction) {
    const d = 1;
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        const b = data[i][j];// showFrame
        const t = c > 0 ? (b / c) : 0;// distanceRate
        data[i][j] = Math.floor(timingFunction(t, b, c, d));

        // ５フレーム以降は境界部分のジャギーを目立たせる（ささくれさせる）
        if (opts.bitCrash > 1 && b > 5) {
          data[i][j] += Math.floor(opts.bitCrash * Math.random());
        }
      }
    }
  }

  return {
    data,
    width: dataWidth,
    height: dataHeight,
    pixelSize: opts.pixelSize,
    easedBy: timingFunction,
  };
}

/**
* 指定したcolorNameのrgbaを返す（CanvasRenderingContext2D経由）
*
* @function getPixelColor
* @param {String} colorName CanvasRenderingContext2D.fillStyleの値
* @return {Array} color [r,g,b,a]
*/
export function getPixelColor(colorName = 'rgba(0,0,0,.3)') {
  const context = document.createElement('canvas').getContext('2d');
  context.canvas.width = 1;
  context.canvas.width = 1;
  context.fillStyle = colorName;
  context.fillRect(0, 0, 1, 1);

  // splat構文を使用するとエラーになるので、配列に変換する
  // const [r,g,b,a] = document.createElement('canvas').getContext('2d').getImagedata(...).data
  //   => TypeError: Invalid attempt to destructure non-iterable instance
  return [].slice.call(context.getImageData(0, 0, 1, 1).data);
}
