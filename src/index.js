import EventEmitter from 'events';
import Promise from 'bluebird';
import * as util from './utility';

import JSON5 from 'json5';
import objectAssign from 'object-assign';

export default class ImdRipple extends EventEmitter {
  /**
  * アニメーションで使用するユーティリティ関数群の参照
  *
  * @static
  * @public
  * @property ImdRipple.util
  */
  static get util() {
    return util;
  }

  /**
  * ページの読み込み時にインスタンスを自動で生成する
  *
  * @static
  * @public
  * @method ImdRipple.bindOnLoad
  */
  static bindOnLoad(selector, options = {}) {
    return new Promise((resolve) => {
      window.addEventListener('load', () => {
        const elements = [].slice.call(document.querySelectorAll(selector));

        resolve(elements.map((element) => new ImdRipple(element, options)));
      });
    });
  }

  /**
  * 指定の要素のクリック時にアニメーションするイベントを追加する
  *
  * @class ImdRipple
  * @constructor
  * @param {Element} element - クリックイベントを監視する要素。アニメ時子要素としてCanvasを追加する
  * @param {Object} [options] - this.playの引数
  */
  constructor(element, options = {}) {
    super();

    /**
    * @public
    * @property {HTMLElement} element
    */
    this.element = element;

    // 親要素と全く同じ大きさのcanvas要素であることを期待する
    // そのため、position:staticプロパティを使用しない
    const position = window.getComputedStyle(element).getPropertyValue('position');
    if (position === 'static') {
      this.element.style.position = 'relative';
    }

    // mouseup／touchendでキャンバスの透明化を開始する
    this.element.addEventListener('mousedown', (event) => {
      if (event.which !== 1) {// only left click
        return;
      }

      const { left, top } = this.element.getBoundingClientRect();
      const x = Math.floor(event.clientX - left);
      const y = Math.floor(event.clientY - top);

      this.emit('begin');
      this.play(x, y, objectAssign({ exitBefore: 'mouseup' }, options))
      .then(() => {
        this.emit('end');
      });
    });

    this.element.addEventListener('touchstart', (event) => {
      const { left, top } = this.element.getBoundingClientRect();
      const x = Math.floor(event.changedTouches[0].clientX - left);
      const y = Math.floor(event.changedTouches[0].clientY - top);

      this.emit('begin');
      this.play(x, y, objectAssign({ exitBefore: 'touchend' }, options))
      .then(() => {
        this.emit('end');
      });
    });
  }

  /**
  * this.elementに直接定義したオプションを返す
  *
  * @public
  * @method getOptions
  * @param {String} attrName 取得し、json5としてパースする属性名
  * @return {Object} options オプション
  */
  getOptions(attrName = 'imd-options') {
    return JSON5.parse(this.element.getAttribute(attrName) || '{}');
  }

  /**
  * コンストラクタの要素内で波形アニメーションを再生する
  *
  * @public
  * @method ImdRipple#play
  * @param {Number} [x=auto] 波形アニメーションの始点x
  * @param {Number} [y=auto] 波形アニメーションの始点y
  * @param {Object} [options] ImdRipple.rippleで使用する引数
  * @param {String|Bool} [options.exitBefore] canvasを破棄するタイミングの指定
  * @return {Promise} ImdRipple.play参照
  */
  play(x, y, options = {}) {
    const opts = objectAssign({
      exitBefore: true, // auto
    }, this.getOptions(), options);

    const { width, height } = this.element.getBoundingClientRect();
    const playX = x === undefined ? Math.floor(width / 2) : x;
    const playY = y === undefined ? Math.floor(height / 2) : y;

    const animation = ImdRipple.play(playX, playY, width, height, opts);

    this.element.appendChild(animation.context.canvas);

    let exit;
    if (typeof opts.exitBefore === 'string') {
      exit = util.promiseEvent(window, opts.exitBefore);
    } else if (opts.exitBefore === true) {
      exit = animation;// アニメーション終了時に事後処理
    }

    return exit
    .then(() => util.transparentize(animation.context.canvas, opts))
    .then(() => animation.stop());
  }

  /**
  * CanvasRenderingContext2Dを作成して波形アニメーションを再生する
  * 全てのピクセルの描写を終えるまでcanvasを更新し続ける
  * キャンバスが大きいほど負荷が高いので、更新の必要がなければ停止する
  * 全てのピクセルが描写した時か、promise.stopを実行した時に、fulfillする
  *
  * @static
  * @public
  * @method ImdRipple.play
  * @param {Number} x 波形アニメーションの始点x
  * @param {Number} y 波形アニメーションの始点y
  * @param {Number} width 波形アニメーションの幅
  * @param {Number} height 波形アニメーションの高さ
  * @param {Object} [options]
  * @param {Number} [options.pixelSize=height/15] ピクセル１粒の大きさ
  * @return {Promise<CanvasRenderingContext2D>} animation 独自の２プロパティを持つ
  */
  static play(x, y, width, height, options = {}) {
    const opts = objectAssign({
      pixelSize: Math.floor(height / 10),
      bitCrash: 7,
      pixelated: true,
    }, options);

    const context = util.createContext2d(width, height, opts);
    const schedule = util.createRenderSchedule(x, y, width, height, opts);
    const imageData = util.getImageData(context.canvas);
    const [r, g, b, a] = util.getPixelColor(opts.color);

    const promise = new Promise((resolve) => {
      let frame = 0;
      const render = () => {
        if (promise.disabled) {
          return resolve(context);
        }

        let rendered = true;
        let index = 0;
        for (let i = 0; i < context.canvas.height; i++) {
          for (let j = 0; j < context.canvas.width; j++) {
            const pixelX = Math.floor(j / schedule.pixelSize);
            const pixelY = Math.floor(i / schedule.pixelSize);
            const show = schedule.data[pixelY][pixelX] <= frame;
            if (show === false) {
              rendered = false;
            }

            imageData.data[index + 0] = r;
            imageData.data[index + 1] = g;
            imageData.data[index + 2] = b;
            imageData.data[index + 3] = show ? a : 0;
            index += 4;
          }
        }
        context.putImageData(imageData, 0, 0);
        if (rendered) {
          return resolve(context);
        }

        frame += 1;
        return util.requestAnimationFrame(render);
      };

      util.requestAnimationFrame(render);
    });

    // FIXME:
    //   Promiseとcontextを同時返したい。
    //   （mouseupイベントで透明化を始めたいので）
    promise.context = context;
    promise.stop = function stopAnimation() {
      promise.disabled = true;
      return this;
    };

    return promise;
  }
}
