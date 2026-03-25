const FaceTracker = (() => {
  let detector = null;
  let isLoaded = false;
  let lastFaceBox = null;
  let positionHistory = [];
  let frameSkip = 0;
  const FRAME_SKIP = 3;

  const POSITIONS = {
    LEFT: { label: "ЛЕВЫЙ", x: 0.25 },
    CENTER: { label: "ЦЕНТР", x: 0.5 },
    RIGHT: { label: "ПРАВЫЙ", x: 0.75 },
  };

  const DISTANCES = {
    CLOSE: "БЛИЗКО",
    NORMAL: "НОРМА",
    FAR: "ДАЛЕКО",
  };

  async function load() {
    try {
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      detector = await faceDetection.createDetector(model, {
        runtime: "tfjs",
        maxFaces: 1,
        modelType: "short",
      });
      isLoaded = true;
      console.log("[FaceTracker] Загружен");
      return true;
    } catch (err) {
      console.warn("[FaceTracker] Не удалось загрузить:", err.message);
      return false;
    }
  }

  async function detect(videoEl) {
    if (!isLoaded || !detector) return null;

    frameSkip++;
    if (frameSkip % FRAME_SKIP !== 0) return lastFaceBox;

    try {
      const faces = await detector.estimateFaces(videoEl);
      if (faces.length === 0) {
        lastFaceBox = null;
        return null;
      }

      const face = faces[0];
      const box = face.box;
      const canvasW = videoEl.videoWidth;

      const mirroredX = canvasW - box.xMin - box.width;

      lastFaceBox = {
        x: mirroredX,
        y: box.yMin,
        w: box.width,
        h: box.height,
        cx: mirroredX + box.width / 2,
        cy: box.yMin + box.height / 2,
      };

      const normX = lastFaceBox.cx / canvasW;
      const position = _getPosition(normX);
      const distance = _getDistance(box.width, canvasW);

      const entry = {
        time: new Date().toLocaleTimeString("ru", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        position: position.label,
        distance,
        normX: normX.toFixed(2),
        faceW: Math.round(box.width),
      };

      positionHistory.push(entry);
      if (positionHistory.length > 50) positionHistory.shift();

      return { box: lastFaceBox, position, distance, entry };
    } catch (err) {
      return null;
    }
  }

  function drawBox(ctx, faceData, canvasW, canvasH) {
    if (!faceData) return;

    const { box } = faceData;
    const now = Date.now();

    ctx.save();

    const cornerLen = Math.min(box.w, box.h) * 0.25;
    const x = box.x,
      y = box.y,
      w = box.w,
      h = box.h;

    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerLen, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerLen);
    ctx.stroke();

    const cx = x + w / 2,
      cy = y + h / 2;
    ctx.strokeStyle = "rgba(0,229,255,0.4)";
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    ctx.font = '9px "Orbitron", monospace';
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 6;
    ctx.fillText("ЛИЦО · " + faceData.position.label, x, y - 8);

    ctx.fillStyle = "rgba(0,229,255,0.7)";
    ctx.shadowBlur = 0;
    ctx.fillText(faceData.distance, x, y + h + 14);

    ctx.restore();
  }

  function _getPosition(normX) {
    if (normX < 0.38) return POSITIONS.LEFT;
    if (normX > 0.62) return POSITIONS.RIGHT;
    return POSITIONS.CENTER;
  }

  function _getDistance(faceWidth, canvasWidth) {
    const ratio = faceWidth / canvasWidth;
    if (ratio > 0.28) return DISTANCES.CLOSE;
    if (ratio < 0.12) return DISTANCES.FAR;
    return DISTANCES.NORMAL;
  }

  function getHistory() {
    return positionHistory;
  }
  function getLastBox() {
    return lastFaceBox;
  }
  function isReady() {
    return isLoaded;
  }

  return { load, detect, drawBox, getHistory, getLastBox, isReady };
})();
