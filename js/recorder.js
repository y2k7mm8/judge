const Recorder = (() => {
  let isRecording = false;
  let frames = [];
  let events = [];
  let startTime = 0;
  let frameCount = 0;

  function start() {
    isRecording = true;
    frames = [];
    events = [];
    startTime = Date.now();
    frameCount = 0;
    console.log("[Recorder] Запись начата");
  }

  function stop() {
    isRecording = false;
    console.log(`[Recorder] Запись остановлена. Кадров: ${frames.length}`);
    return getExportData();
  }

  function recordFrame(pose, faceData, score, zones) {
    if (!isRecording) return;
    frameCount++;

    if (frameCount % 3 !== 0) return;

    const entry = {
      t: Date.now() - startTime,
      score,
      keypoints: pose
        ? pose.keypoints.map((kp) => ({
            x: Math.round(kp.x),
            y: Math.round(kp.y),
            s: parseFloat(kp.score.toFixed(2)),
          }))
        : null,
    };

    if (faceData) {
      entry.face = {
        position: faceData.position.label,
        distance: faceData.distance,
        x: Math.round(faceData.box.cx),
        y: Math.round(faceData.box.cy),
      };
    }

    if (zones) {
      entry.hits = zones.hits;
    }

    frames.push(entry);
  }

  function addEvent(type, data) {
    if (!isRecording) return;
    events.push({ t: Date.now() - startTime, type, ...data });
  }

  function getStats() {
    return {
      frames: frames.length,
      duration: Math.round((Date.now() - startTime) / 1000),
      events: events.length,
    };
  }

  function getExportData() {
    return {
      meta: {
        version: "2.0",
        exportTime: new Date().toISOString(),
        duration: Date.now() - startTime,
        frameCount: frames.length,
        eventCount: events.length,
      },
      events,
      frames,
    };
  }

  function exportJSON() {
    const data = getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-judge-record-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    start,
    stop,
    recordFrame,
    addEvent,
    getStats,
    exportJSON,
    get isRecording() {
      return isRecording;
    },
  };
})();
