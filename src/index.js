import EventEmitter from 'events';
import Promise from 'bluebird';
import * as util from './utility';

import JSON5 from 'json5';
import objectAssign from 'object-assign';

export default class ImdRipple extends EventEmitter {
  /**
  * アニメーションで使用するユーティリティ関数群の参照
  *
  * @property ImdRipple.util
  * @static
  * @public
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
  * 指定の要素のクリック時にアニメーションするイベントを追加
  *
  * @class ImdRipple
  * @constructor
  * @param {element} element - クリックイベントを監視する要素。アニメ時子要素としてCanvasを追加する
  * @param {object} [options] - this.playの引数
  */
  constructor(element, options = {}) {
    super();

    /**
    * @property {HTMLElement} element
    * @public
    */
    this.element = element;

    // 親要素と全く同じ大きさのcanvas要素であることを期待する
    // そのため、position:staticプロパティを使用しない
    const position = window.getComputedStyle(element).getPropertyValue('position');
    if (position === 'static') {
      this.element.style.position = 'relative';
    }

    // TODO: タッチデバイス
    element.addEventListener('mousedown', (event) => {
      if (event.which !== 1) {// only left click
        return;
      }

      const { left, top } = element.getBoundingClientRect();
      const x = Math.floor(event.clientX - left);
      const y = Math.floor(event.clientY - top);

      const opts = objectAssign({
        autoDestroy: false,
      }, options);
      const animation = this.play(x, y, opts);

      this.emit('begin', animation.context);

      // マウスキー押上でキャンバスの透明化を開始する
      const destroy = () => {
        element.removeEventListener('mouseup', destroy);

        util.transparentize(animation.context.canvas, opts)
        .then(() => animation.stop())
        .then(() => {
          this.emit('end', animation.context);
        });
      };
      element.addEventListener('mouseup', destroy);
    });
  }

  /**
  * コンストラクタの要素内で波形アニメーションを再生する
  *
  * @method ImdRipple#play
  * @public
  * @param {number} [x=auto] 波形アニメーションの始点x
  * @param {number} [y=auto] 波形アニメーションの始点y
  * @param {object} [options] ImdRipple.rippleの引数
  * @return {Promise} ImdRipple.play参照
  */
  play(x, y, options = {}) {
    const opts = objectAssign({
      autoDestroy: true,
    }, JSON5.parse(this.element.getAttribute('imd-options') || '{}'), options);

    // FIXME: 端数が入るとアニメーションがおかしくなる
    const { width, height } = this.element.getBoundingClientRect();
    const playX = x || width / 2;
    const playY = y || height / 2;

    const promise = ImdRipple.play(playX, playY, width, height, opts);
    const canvas = promise.context.canvas;

    promise
    .then(() => {
      this.emit('rendered');

      if (opts.autoDestroy) {
        return util.transparentize(promise.context.canvas, opts)
        .then(() => promise.stop())
        .then(() => {
          this.emit('end');
        });
      }
      return promise.context;
    });

    this.element.appendChild(canvas);

    return promise;
  }

  /**
  * CanvasRenderingContext2Dを作成して波形アニメーションを再生する
  *
  * @method ImdRipple.play
  * @static
  * @param {number} x 波形アニメーションの始点x
  * @param {number} y 波形アニメーションの始点y
  * @param {number} width 波形アニメーションの幅
  * @param {number} height 波形アニメーションの高さ
  * @param {object} [options]
  * @param {number} [options.pixelSize=height/15] ピクセル１粒の大きさ
  * @return {Promise<CanvasRenderingContext2D>} animation このpromiseは独自の２プロパティを持つ
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
      // 全てのピクセルの描写を終えるまでcanvasを更新し続ける
      // キャンバスが大きいほど負荷が高いので、更新の必要がなければ停止する
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
