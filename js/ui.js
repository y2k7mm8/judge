/**
 * ui.js v2.0
 * Управление интерфейсом: статусы, панели, события, анимации
 */

const UI = (() => {

  const els = {};
  let clockInterval = null;
  let eventCount = 0;
  const MAX_EVENTS = 20;

  function init() {
    // Кнопки
    els.btnStart      = document.getElementById('btn-start');
    els.btnStop       = document.getElementById('btn-stop');
    els.btnRecord     = document.getElementById('btn-record');
    els.btnExport     = document.getElementById('btn-export');
    els.btnResetScore = document.getElementById('btn-reset-score');

    // Статусы
    els.statusCamera = document.getElementById('status-camera');
    els.statusModel  = document.getElementById('status-model');
    els.statusPerson = document.getElementById('status-person');
    els.statusFace   = document.getElementById('status-face');
    els.recIndicator = document.getElementById('rec-indicator');

    // Значения
    els.fpsValue       = document.getElementById('fps-value');
    els.playerPosition = document.getElementById('player-position');
    els.scoreValue     = document.getElementById('score-value');
    els.scoreBig       = document.getElementById('score-big');
    els.scoreCombo     = document.getElementById('score-combo');
    els.scHits         = document.getElementById('sc-hits');
    els.scZones        = document.getElementById('sc-zones');
    els.scActivity     = document.getElementById('sc-activity');

    // Загрузка
    els.loadingOverlay = document.getElementById('loading-overlay');
    els.loadingText    = document.getElementById('loading-text');
    els.liveBadge      = document.getElementById('live-badge');

    // Панели
    els.eventLog     = document.getElementById('event-log');
    els.positionText = document.getElementById('position-text');
    els.radarDot     = document.getElementById('radar-dot');
    els.faceInfo     = document.getElementById('face-info');
    els.faceHistory  = document.getElementById('face-history');
    els.faceIcon     = document.querySelector('.face-icon');

    // Toggles
    els.toggleSkeleton  = document.getElementById('toggle-skeleton');
    els.toggleKeypoints = document.getElementById('toggle-keypoints');
    els.toggleLabels    = document.getElementById('toggle-labels');
    els.toggleZones     = document.getElementById('toggle-zones');
    els.toggleFaceBox   = document.getElementById('toggle-face-box');
    els.toggleTrails    = document.getElementById('toggle-trails');
    els.toggleScore     = document.getElementById('toggle-score');

    // Запись
    els.recFrames   = document.getElementById('rec-frames');
    els.recDuration = document.getElementById('rec-duration');
    els.recEvents   = document.getElementById('rec-events');

    // Часы
    _startClock();
  }

  function _startClock() {
    const clockEl = document.getElementById('hud-clock');
    if (!clockEl) return;
    function update() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const s = String(now.getSeconds()).padStart(2,'0');
      clockEl.textContent = `${h}:${m}:${s}`;
    }
    update();
    clockInterval = setInterval(update, 1000);
  }

  // ── СТАТУСЫ ──────────────────────────────────────────────────────

  function _setStatus(el, state, labelText) {
    if (!el) return;
    const dot = el.querySelector('.dot');
    const label = el.querySelector('.label');
    dot.className = 'dot';
    if (state === 'loading') dot.classList.add('dot--loading');
    else if (state === 'ok')  dot.classList.add('dot--ok');
    else if (state === 'warn' || state === 'error') dot.classList.add('dot--warn');
    else dot.classList.add('dot--off');
    if (labelText && label) label.textContent = labelText;
  }

  const camLabels  = { off:'КАМЕРА', loading:'СТАРТ…', ok:'КАМЕРА ✓', warn:'НЕТ', error:'ОШИБКА' };
  const modLabels  = { off:'МОДЕЛЬ', loading:'ЗАГРУЗКА', ok:'МОДЕЛЬ ✓', warn:'ОШИБКА', error:'ОШИБКА' };
  const persLabels = { off:'ТЕЛО', ok:'ТЕЛО ✓', warn:'НЕТ ТЕЛА' };
  const faceLabels = { off:'ЛИЦО', ok:'ЛИЦО ✓', warn:'НЕТ ЛИЦА' };

  function setCameraStatus(s) { _setStatus(els.statusCamera, s, camLabels[s]); }
  function setModelStatus(s)  { _setStatus(els.statusModel,  s, modLabels[s]); }
  function setPersonStatus(s) { _setStatus(els.statusPerson, s, persLabels[s]); }
  function setFaceStatus(s)   { _setStatus(els.statusFace,   s, faceLabels[s]); }

  function setFPS(v) { if (els.fpsValue) els.fpsValue.textContent = v; }

  // ── ЗАГРУЗКА ─────────────────────────────────────────────────────

  function showLoading(text) {
    if (!els.loadingOverlay) return;
    els.loadingOverlay.classList.remove('hidden');
    if (text && els.loadingText) els.loadingText.textContent = text;
  }

  function hideLoading() {
    if (els.loadingOverlay) els.loadingOverlay.classList.add('hidden');
    if (els.liveBadge) els.liveBadge.classList.add('active');
  }

  function setLoadingText(text) {
    if (els.loadingText) els.loadingText.textContent = text;
  }

  // ── КНОПКИ ───────────────────────────────────────────────────────

  function setStartEnabled(v) { if (els.btnStart) els.btnStart.disabled = !v; }
  function setStopEnabled(v)  { if (els.btnStop)  els.btnStop.disabled  = !v; }

  function setRecordEnabled(v) {
    if (els.btnRecord) els.btnRecord.disabled = !v;
  }

  function setRecordActive(active) {
    if (els.btnRecord) {
      els.btnRecord.textContent = active ? '⏹ СТОП REC' : '⏺ ЗАПИСЬ';
      els.btnRecord.classList.toggle('active', active);
    }
    if (els.recIndicator) {
      els.recIndicator.style.display = active ? 'flex' : 'none';
    }
  }

  function setExportEnabled(v) { if (els.btnExport) els.btnExport.disabled = !v; }

  // ── ПОЗИЦИЯ ЛИЦА ─────────────────────────────────────────────────

  function updateFacePosition(faceResult) {
    if (!faceResult) return;

    const { position, distance } = faceResult;

    // Статус-бар
    if (els.playerPosition) {
      els.playerPosition.textContent = position.label;
    }

    // Текст позиции
    if (els.positionText) {
      els.positionText.textContent = position.label + ' · ' + distance;
    }

    // Радар
    if (els.radarDot) {
      const radar = document.getElementById('position-radar');
      if (radar) {
        const rw = radar.offsetWidth;
        const dotX = position.x * rw;
        els.radarDot.style.left = dotX + 'px';
      }
    }

    // Лицо
    if (els.faceInfo) {
      els.faceInfo.textContent = `${position.label} · ${distance}`;
    }
    if (els.faceIcon) {
      els.faceIcon.classList.add('active');
    }

    // История позиций
    const history = FaceTracker.getHistory();
    if (els.faceHistory && history.length > 0) {
      const last = history[history.length - 1];
      const entry = document.createElement('div');
      entry.className = 'face-pos-entry';
      entry.textContent = `${last.time} · ${last.position} · ${last.distance}`;
      els.faceHistory.insertBefore(entry, els.faceHistory.firstChild);
      while (els.faceHistory.children.length > 8) {
        els.faceHistory.removeChild(els.faceHistory.lastChild);
      }
    }
  }

  // ── ОЧКИ ─────────────────────────────────────────────────────────

  function updateScore(state) {
    if (els.scoreValue) els.scoreValue.textContent = state.total;
    if (els.scoreBig) {
      els.scoreBig.textContent = state.total;
      els.scoreBig.style.textShadow = state.combo > 2
        ? '0 0 40px rgba(255,107,53,0.9)' : '';
    }
    if (els.scHits)     els.scHits.textContent     = state.hits;
    if (els.scZones)    els.scZones.textContent    = state.zones;
    if (els.scActivity) els.scActivity.textContent = state.activity;
  }

  function setCombo(count) {
    if (!els.scoreCombo) return;
    if (count > 1) {
      els.scoreCombo.textContent = `КОМБО x${count}`;
      els.scoreCombo.style.animation = 'none';
      setTimeout(() => els.scoreCombo.style.animation = '', 10);
    } else {
      els.scoreCombo.textContent = '';
    }
  }

  function showScorePopup(text) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
  }

  // ── АКТИВНОСТЬ ───────────────────────────────────────────────────

  function setActivityBars(data) {
    const barArms = document.getElementById('bar-arms');
    const barLegs = document.getElementById('bar-legs');
    const barBody = document.getElementById('bar-body');
    if (barArms) barArms.style.width = Math.min(data.arms, 100) + '%';
    if (barLegs) barLegs.style.width = Math.min(data.legs, 100) + '%';
    if (barBody) barBody.style.width = Math.min(data.body, 100) + '%';
  }

  // ── СОБЫТИЯ ──────────────────────────────────────────────────────

  function addEvent(text, type = '') {
    if (!els.eventLog) return;
    const item = document.createElement('div');
    item.className = 'event-item' + (type ? ` event-item--${type}` : '');
    item.textContent = `[${_ts()}] ${text}`;
    els.eventLog.insertBefore(item, els.eventLog.firstChild);
    while (els.eventLog.children.length > MAX_EVENTS) {
      els.eventLog.removeChild(els.eventLog.lastChild);
    }
  }

  function _ts() {
    const d = new Date();
    return `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  // ── ЗАПИСЬ СТАТИСТИКА ────────────────────────────────────────────

  function updateRecStats(stats) {
    if (els.recFrames)   els.recFrames.textContent   = stats.frames;
    if (els.recDuration) els.recDuration.textContent = stats.duration + 'с';
    if (els.recEvents)   els.recEvents.textContent   = stats.events;
  }

  // ── TOGGLES ──────────────────────────────────────────────────────

  function getToggles() {
    return {
      showSkeleton:  els.toggleSkeleton?.checked  ?? true,
      showKeypoints: els.toggleKeypoints?.checked ?? true,
      showLabels:    els.toggleLabels?.checked    ?? false,
      showZones:     els.toggleZones?.checked     ?? true,
      showFaceBox:   els.toggleFaceBox?.checked   ?? true,
      showTrails:    els.toggleTrails?.checked    ?? false,
      showScore:     els.toggleScore?.checked     ?? true,
    };
  }

  function onToggleChange(callback) {
    ['toggle-skeleton','toggle-keypoints','toggle-labels','toggle-zones',
     'toggle-face-box','toggle-trails','toggle-score'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => callback(getToggles()));
    });
  }

  // ── ПУБЛИЧНЫЙ API ────────────────────────────────────────────────
  return {
    init,
    setCameraStatus, setModelStatus, setPersonStatus, setFaceStatus,
    setFPS,
    showLoading, hideLoading, setLoadingText,
    setStartEnabled, setStopEnabled, setRecordEnabled, setRecordActive, setExportEnabled,
    updateFacePosition,
    updateScore, setCombo, showScorePopup,
    setActivityBars,
    addEvent,
    updateRecStats,
    getToggles, onToggleChange,
  };

})();
