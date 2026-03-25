/**
 * pose-tracker.js v2.0
 * Ядро: детекция позы + лица, рендер, интеграция всех модулей
 */

const PoseTracker = (() => {

  let detector  = null;
  let rafId     = null;
  let isRunning = false;
  let videoEl   = null;
  let canvasEl  = null;
  let ctx       = null;

  const options = {
    showSkeleton:  true,
    showKeypoints: true,
    showLabels:    false,
    showZones:     true,
    showFaceBox:   true,
    showTrails:    false,
    showScore:     true,
  };

  // FPS
  const fps = { frames:0, lastTime: performance.now(), value:0,
    tick() {
      this.frames++;
      const now = performance.now();
      if (now - this.lastTime >= 500) {
        this.value = Math.round(this.frames / (now - this.lastTime) * 1000);
        this.frames = 0;
        this.lastTime = now;
        UI.setFPS(this.value);
      }
    }
  };

  let faceDetectCooldown = 0;
  let lastFaceResult = null;

  function init(videoElement, canvasElement) {
    videoEl  = videoElement;
    canvasEl = canvasElement;
    ctx      = canvasEl.getContext('2d');
  }

  async function loadModel(modelType = 'Lightning') {
    UI.setModelStatus('loading');
    UI.setLoadingText('Загрузка TensorFlow.js…');

    try {
      await tf.setBackend('webgl');
      await tf.ready();

      UI.setLoadingText(`Загрузка MoveNet ${modelType}…`);

      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet, {
          modelType: modelType === 'Thunder'
            ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
            : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.2,
        }
      );

      UI.setLoadingText('Загрузка детектора лица…');

      // Загружаем детектор лица
      await FaceTracker.load();

      console.log('[PoseTracker] Все модели загружены');
      UI.setModelStatus('ok');

    } catch (err) {
      console.error('[PoseTracker] Ошибка:', err);
      UI.setModelStatus('error');
      throw err;
    }
  }

  function startLoop() {
    if (isRunning || !detector) return;
    isRunning = true;
    _loop();
  }

  function stopLoop() {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    UI.setPersonStatus('off');
    UI.setFaceStatus('off');
    UI.setFPS('--');
    _clearCanvas();
    Skeleton.clearTrails();
  }

  function setOptions(newOptions) {
    Object.assign(options, newOptions);
  }

  async function _loop() {
    if (!isRunning) return;
    if (videoEl.readyState < 2) {
      rafId = requestAnimationFrame(_loop);
      return;
    }

    _syncCanvasSize();

    try {
      // Детекция позы
      const poses = await detector.estimatePoses(videoEl, {
        flipHorizontal: false,
        maxPoses: 1,
      });

      const hasPose = poses.length > 0 && poses[0].score > 0.2;
      UI.setPersonStatus(hasPose ? 'ok' : 'warn');

      // Детекция лица (каждые N кадров)
      faceDetectCooldown++;
      if (faceDetectCooldown % 2 === 0 && FaceTracker.isReady()) {
        lastFaceResult = await FaceTracker.detect(videoEl);
        if (lastFaceResult) {
          UI.setFaceStatus('ok');
          UI.updateFacePosition(lastFaceResult);
        } else {
          UI.setFaceStatus('warn');
        }
      }

      // Рендер
      const zoneResult = _render(poses, lastFaceResult);

      // Подсчёт очков
      if (hasPose) {
        Scoring.update(poses[0], zoneResult);
      }

      // Запись
      if (Recorder.isRecording) {
        Recorder.recordFrame(
          hasPose ? poses[0] : null,
          lastFaceResult,
          Scoring.getState().total,
          zoneResult
        );
        UI.updateRecStats(Recorder.getStats());
      }

    } catch (err) {
      console.warn('[PoseTracker] Кадр:', err.message);
    }

    fps.tick();
    rafId = requestAnimationFrame(_loop);
  }

  function _render(poses, faceResult) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Зеркальное видео
    ctx.save();
    ctx.translate(canvasEl.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    ctx.restore();

    let zoneResult = null;

    if (poses.length > 0) {
      const kps = _mirrorKP(poses[0].keypoints);

      // Зоны
      if (options.showZones) {
        zoneResult = Zones.draw(ctx, kps);
      }

      // Скелет
      Skeleton.draw(ctx, kps, {
        showSkeleton:  options.showSkeleton,
        showKeypoints: options.showKeypoints,
        showLabels:    options.showLabels,
        showTrails:    options.showTrails,
      });
    }

    // Лицо
    if (options.showFaceBox && faceResult) {
      FaceTracker.drawBox(ctx, faceResult, canvasEl.width, canvasEl.height);
    }

    // Счёт на канвасе
    if (options.showScore) {
      _drawScoreHUD();
    }

    return zoneResult;
  }

  function _drawScoreHUD() {
    const score = Scoring.getState();
    ctx.save();
    ctx.font = 'bold 20px "Orbitron", monospace';
    ctx.fillStyle = 'rgba(255,107,53,0.9)';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 15;
    ctx.fillText('⚡ ' + score.total, 14, 36);
    ctx.restore();
  }

  function _mirrorKP(keypoints) {
    return keypoints.map(kp => ({ ...kp, x: canvasEl.width - kp.x }));
  }

  function _syncCanvasSize() {
    if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
      canvasEl.width  = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
    }
  }

  function _clearCanvas() {
    if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  return {
    init, loadModel, startLoop, stopLoop, setOptions,
    get isRunning() { return isRunning; },
  };

})();
