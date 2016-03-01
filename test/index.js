import ImdRipple from '../src';

import assert from 'power-assert';
import simulant from 'simulant';

const createButton = (textContent) => {
  const element = document.createElement('button');
  element.textContent = textContent;

  return element;
};
const simulateLeftClick = (element) => {
  const { width, height, top, left } = element.getBoundingClientRect();
  simulant.fire(element, simulant('mousedown', {
    which: 1,
    clientX: width / 2 + left,
    clientY: height / 2 + top,
  }));

  setTimeout(() => {
    simulant.fire(element, simulant('mouseup'));
  }, 1000);
};
const simulateTouch = (element) => {
  const { width, height, top, left } = element.getBoundingClientRect();
  simulant.fire(element, simulant('touchstart', {
    changedTouches: [
      {
        clientX: width / 2 + left,
        clientY: height / 2 + top,
      },
    ],
  }));

  setTimeout(() => {
    simulant.fire(element, simulant('touchend'));
  }, 1000);
};

describe('ImdRipple', () => {
  it('クリック時にbegin,canvas破棄時にendイベントを発行する', (done) => {
    const element = document.body.appendChild(createButton('THIS IS BUTTON'));
    const ripple = new ImdRipple(element);

    window.setTimeout(() => {
      simulateLeftClick(element);
    });
    ripple.once('begin', () => {
      ripple.once('end', () => {
        ripple.element.parentNode.removeChild(ripple.element);
        done();
      });
    });
  });

  xit('(simulant issue)タッチ時にbegin,canvas破棄時にendイベントを発行する', (done) => {
    const element = document.body.appendChild(createButton('THIS IS BUTTON'));
    const ripple = new ImdRipple(element);

    window.setTimeout(() => {
      simulateTouch(element);
    });
    ripple.once('begin', () => {
      ripple.once('end', () => {
        ripple.element.parentNode.removeChild(ripple.element);
        done();
      });
    });
  });

  describe('::play', () => {
    it('ripple.playからアニメーションを直接再生できる', () => {
      const element = document.body.appendChild(createButton('THIS IS BUTTON'));
      const ripple = new ImdRipple(element);

      return ripple.play()
      .then(() => {
        ripple.element.parentNode.removeChild(ripple.element);
      });
    });
  });

  describe('.play', () => {
    it('インスタンスを生成しなくても波形アニメーションは再生できる', () => {
      const promise = ImdRipple.play(25, 25, 50, 50);
      const canvas = promise.context.canvas;

      document.body.appendChild(canvas);

      return promise
      .then(() => ImdRipple.util.transparentize(canvas));
    });

    it('波形の粒の大きさの変更', () => {
      const options = { pixelSize: 3 };
      const promise = ImdRipple.play(25, 25, 50, 50, options);
      const canvas = promise.context.canvas;

      document.body.appendChild(canvas);

      return promise
      .then(() => ImdRipple.util.transparentize(canvas));
    });

    it('波形をなめらかにする', () => {
      const options = { pixelSize: 1, bitCrash: 1 };
      const promise = ImdRipple.play(25, 25, 50, 50, options);
      const canvas = promise.context.canvas;

      document.body.appendChild(canvas);

      return promise
      .then(() => ImdRipple.util.transparentize(canvas));
    });

    it('波形の色を変更する', () => {
      const options = { pixelSize: 1, bitCrash: 1, color: 'aliceblue' };
      const promise = ImdRipple.play(25, 25, 50, 50, options);
      const canvas = promise.context.canvas;

      document.body.appendChild(canvas);

      return promise
      .then(() => ImdRipple.util.transparentize(canvas));
    });
  });

  describe('util', () => {
    describe('.requestAnimationFrame', () => {
      it('利用可能な非同期関数でcallbackを実行する', (done) => {
        ImdRipple.util.requestAnimationFrame(() => done());
      });
    });

    describe('.createContext2d', () => {
      it('指定した大きさのCanvasRenderingContext2Dを返す', () => {
        const width = 100;
        const height = 100;
        const { canvas } = ImdRipple.util.createContext2d(width, height);

        assert(canvas.width === width);
        assert(canvas.height === height);
      });
    });

    describe('.promiseEvent', () => {
      it('指定したイベントをpromiseで取得する', () => {
        const element = createButton('THIS IS BUTTON');
        const eventMock = { which: 1 };

        setTimeout(() => {
          simulant.fire(element, simulant('click', eventMock));
        });

        return ImdRipple.util.promiseEvent(element, 'click')
        .then((event) => {
          assert(event.which === eventMock.which);
        });
      });
    });

    describe('.getImageData', () => {
      it('contextと同じ大きさの空のimageDataを返す', () => {
        const canvas = document.createElement('canvas');
        const imageData = ImdRipple.util.getImageData(canvas);

        // imageData.data.slice はIE11以下で使用できない
        const firstPixel = [].slice.call(imageData.data, 0, 4);
        assert.deepEqual(firstPixel, [0, 0, 0, 0]);

        const lastPixel = [].slice.call(imageData.data, -4);
        assert.deepEqual(lastPixel, [0, 0, 0, 0]);
      });
    });

    describe('.transparentize', () => {
      it('canvasを透明化、opacity:0でcanvasを破棄', () => {
        const canvas = document.createElement('canvas');
        canvas.getContext('2d').fillRect(0, 0, 100, 100);
        document.body.appendChild(canvas);

        assert(canvas.parentNode.toString() === '[object HTMLBodyElement]');
        return ImdRipple.util.transparentize(canvas).then(() => {
          assert(canvas.parentNode === null);
        });
      });
    });

    describe('.getTimingFunction', () => {
      it('関数かnullを返す', () => {
        assert(typeof ImdRipple.util.getTimingFunction('easeInOutExpo') === 'function');
        assert(typeof ImdRipple.util.getTimingFunction(() => null) === 'function');
        assert(ImdRipple.util.getTimingFunction('nothing') === null);
      });
    });

    describe('.createRenderSchedule', () => {
      const createRenderSchedule = ImdRipple.util.createRenderSchedule;

      it('5x5 / 5 pixel = 1x1 data', () => {
        const schedule = createRenderSchedule(0, 0, 5, 5, { pixelSize: 5 });

        const data = JSON.stringify(schedule.data);
        assert(data === '[[0]]');

        assert(schedule.width === 1);
        assert(schedule.height === 1);
        assert(schedule.pixelSize === 5);
        assert(schedule.easedBy === ImdRipple.util.getTimingFunction());
      });

      it('2x2 / 1 pixel = 2x2 data', () => {
        const schedule = createRenderSchedule(0, 0, 2, 2, { timingFunction: 'easeInOutExpo' });

        const data = JSON.stringify(schedule.data);
        assert(data === '[[0,1],[1,1]]');

        assert(schedule.width === 2);
        assert(schedule.height === 2);
        assert(schedule.pixelSize === 1);
        assert(schedule.easedBy === ImdRipple.util.getTimingFunction('easeInOutExpo'));
      });
    });

    describe('.getPixelColor', () => {
      it('指定したcolorNameのrgbaを返す', () => {
        const [r, g, b, a] = ImdRipple.util.getPixelColor('red');

        assert(r === 255);
        assert(g === 0);
        assert(b === 0);
        assert(a === 255);
      });
    });
  });
});
