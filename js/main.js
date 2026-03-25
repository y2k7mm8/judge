/**
 * main.js v2.0
 * Точка входа — инициализация всех модулей и обработчики событий
 */

(async () => {

  UI.init();
  UI.showLoading('Инициализация…');
  UI.addEvent('AI Judge v2.0 запущен', 'system');

  const videoEl  = document.getElementById('webcam');
  const canvasEl = document.getElementById('output-canvas');

  PoseTracker.init(videoEl, canvasEl);

  let cameraStream = null;

  // ── СТАРТ ──────────────────────────────────────────────────────
  document.getElementById('btn-start').addEventListener('click', async () => {
    UI.setStartEnabled(false);
    UI.showLoading('Подключение камеры…');
    UI.setCameraStatus('loading');

    try {
      cameraStream = await _startCamera(videoEl);
      UI.setCameraStatus('ok');
      UI.addEvent('Камера подключена', 'system');

      UI.setLoadingText('Загрузка AI-моделей…');
      await PoseTracker.loadModel('Lightning');
      UI.addEvent('Модели загружены', 'system');

      PoseTracker.startLoop();
      UI.hideLoading();
      UI.setStopEnabled(true);
      UI.setRecordEnabled(true);
      UI.setExportEnabled(true);

    } catch (err) {
      console.error('[main]', err);
      const msg = {
        NotAllowedError: '❌ Доступ к камере запрещён',
        NotFoundError:   '❌ Камера не найдена',
      }[err.name] || '❌ Ошибка: ' + err.message;
      UI.setLoadingText(msg);
      UI.setCameraStatus('error');
      UI.setStartEnabled(true);
    }
  });

  // ── СТОП ───────────────────────────────────────────────────────
  document.getElementById('btn-stop').addEventListener('click', () => {
    // Если запись идёт — остановить
    if (Recorder.isRecording) _stopRecording();

    PoseTracker.stopLoop();

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }

    videoEl.srcObject = null;
    UI.setCameraStatus('off');
    UI.setFaceStatus('off');
    UI.setPersonStatus('off');
    UI.setStopEnabled(false);
    UI.setStartEnabled(true);
    UI.setRecordEnabled(false);
    document.getElementById('live-badge')?.classList.remove('active');
    UI.showLoading('Нажмите «СТАРТ»');
    UI.addEvent('Трекинг остановлен', 'system');
  });

  // ── ЗАПИСЬ ─────────────────────────────────────────────────────
  document.getElementById('btn-record').addEventListener('click', () => {
    if (!Recorder.isRecording) {
      Recorder.start();
      UI.setRecordActive(true);
      UI.addEvent('Запись начата', 'system');
    } else {
      _stopRecording();
    }
  });

  function _stopRecording() {
    Recorder.stop();
    UI.setRecordActive(false);
    UI.addEvent('Запись остановлена', 'system');
  }

  // ── ЭКСПОРТ ────────────────────────────────────────────────────
  document.getElementById('btn-export').addEventListener('click', () => {
    Recorder.exportJSON();
    UI.addEvent('JSON экспортирован', 'system');
  });

  // ── СБРОС ОЧКОВ ────────────────────────────────────────────────
  document.getElementById('btn-reset-score').addEventListener('click', () => {
    Scoring.reset();
    UI.addEvent('Очки сброшены', 'system');
  });

  // ── TOGGLES ────────────────────────────────────────────────────
  UI.onToggleChange((toggles) => {
    PoseTracker.setOptions(toggles);
  });

  // ── ИНИЦИАЛИЗАЦИЯ ──────────────────────────────────────────────
  UI.setLoadingText('Нажмите «СТАРТ»');
  UI.setStartEnabled(true);
  UI.setStopEnabled(false);
  UI.setRecordEnabled(false);
  UI.setExportEnabled(false);

  // ── КАМЕРА ─────────────────────────────────────────────────────
  async function _startCamera(video) {
    const constraints = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
      { video: { facingMode: 'user' } },
      { video: true },
    ];

    let stream = null, lastErr = null;
    for (const c of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; }
      catch (e) { lastErr = e; }
    }
    if (!stream) throw lastErr;

    video.srcObject = stream;
    await new Promise((res, rej) => {
      video.onloadedmetadata = () => video.play().then(res).catch(rej);
      video.onerror = rej;
      setTimeout(() => rej(new Error('Таймаут камеры')), 10000);
    });

    console.log(`[main] Камера: ${video.videoWidth}×${video.videoHeight}`);
    return stream;
  }

})();
