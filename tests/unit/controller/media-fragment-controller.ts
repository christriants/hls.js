import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import MediaFragmentController from '../../../src/controller/media-fragment-controller';
import { Events } from '../../../src/events';
import Hls from '../../../src/hls';

chai.use(sinonChai);
const expect = chai.expect;

describe('MediaFragmentController', function () {
  let hls: Hls;
  let controller: MediaFragmentController;

  beforeEach(function () {
    hls = new Hls();
    controller = new MediaFragmentController(hls);
  });

  afterEach(function () {
    controller.destroy();
    hls.destroy();
  });

  describe('parseMediaFragment', function () {
    it('should parse start and end times', function () {
      const triggerSpy = sinon.spy(hls, 'trigger');
      hls.trigger(Events.MANIFEST_LOADING, {
        url: 'http://example.com/playlist.m3u8#t=10,20',
      });
      expect(triggerSpy).to.have.been.calledWith(
        Events.MEDIA_FRAGMENT_PARSED,
        sinon.match({ start: 10, end: 20 }),
      );
    });

    it('should parse start time only', function () {
      const triggerSpy = sinon.spy(hls, 'trigger');
      hls.trigger(Events.MANIFEST_LOADING, {
        url: 'http://example.com/playlist.m3u8#t=10',
      });
      expect(triggerSpy).to.have.been.calledWith(
        Events.MEDIA_FRAGMENT_PARSED,
        sinon.match({ start: 10, end: undefined }),
      );
    });

    it('should parse end time only', function () {
      const triggerSpy = sinon.spy(hls, 'trigger');
      hls.trigger(Events.MANIFEST_LOADING, {
        url: 'http://example.com/playlist.m3u8#t=,20',
      });
      expect(triggerSpy).to.have.been.calledWith(
        Events.MEDIA_FRAGMENT_PARSED,
        sinon.match({ start: undefined, end: 20 }),
      );
    });
  });

  describe('startPosition', function () {
    it('should set config.startPosition from fragment start', function () {
      hls.trigger(Events.MANIFEST_LOADING, {
        url: 'http://example.com/playlist.m3u8#t=10,20',
      });

      expect(hls.config.startPosition).to.equal(10);
    });
  });

  describe('end position handling', function () {
    let hls: Hls;
    let media: HTMLVideoElement;

    beforeEach(function () {
      hls = new Hls();
      media = document.createElement('video');
      hls.trigger(Events.MANIFEST_LOADING, {
        url: 'http://example.com/playlist.m3u8#t=10,20',
      });
      hls.trigger(Events.MEDIA_ATTACHING, { media });
    });

    afterEach(function () {
      hls.destroy();
    });

    it('should pause at end time', function (done) {
      const pauseSpy = sinon.spy(media, 'pause');
      hls.on(Events.MEDIA_FRAGMENT_END, function () {
        expect(pauseSpy).to.have.been.calledOnce;
        done();
      });
      Object.defineProperty(media, 'currentTime', {
        value: 20,
        configurable: true,
      });
      Object.defineProperty(media, 'paused', {
        value: false,
        configurable: true,
      });
      media.dispatchEvent(new Event('timeupdate'));
    });

    it('should only pause once', function () {
      const pauseSpy = sinon.spy(media, 'pause');
      Object.defineProperty(media, 'currentTime', {
        value: 20,
        configurable: true,
      });
      Object.defineProperty(media, 'paused', {
        value: false,
        configurable: true,
      });
      media.dispatchEvent(new Event('timeupdate'));
      media.dispatchEvent(new Event('timeupdate'));
      expect(pauseSpy).to.have.been.calledOnce;
    });
  });
});
