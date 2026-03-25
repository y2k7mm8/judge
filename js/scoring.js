const Scoring = (() => {
  const state = {
    total: 0,
    hits: 0,
    zones: 0,
    activity: 0,
    combo: 0,
    lastHitTime: 0,
  };

  let prevKeypoints = null;
  let activityBuffer = [];

  const COMBO_TIMEOUT = 2000;
  const HIT_COOLDOWN = 800;

  const POINTS = {
    HEAD_HIT: 10,
    BODY_HIT: 5,
    ACTIVE: 1,
    ZONE_ENTER: 3,
  };

  let lastZoneState = { head: false, body: false };
  let callbacks = { onScore: null, onHit: null };

  function update(pose, zoneResult) {
    if (!pose) return state;

    const kps = pose.keypoints;
    const now = Date.now();

    if (prevKeypoints) {
      const movement = _calcMovement(kps, prevKeypoints);
      activityBuffer.push(movement);
      if (activityBuffer.length > 30) activityBuffer.shift();

      const avgActivity =
        activityBuffer.reduce((a, b) => a + b, 0) / activityBuffer.length;

      const armsMove = _limbMovement(kps, prevKeypoints, [9, 10, 7, 8]);
      const legsMove = _limbMovement(kps, prevKeypoints, [15, 16, 13, 14]);
      const bodyMove = _limbMovement(kps, prevKeypoints, [5, 6, 11, 12]);

      UI.setActivityBars({
        arms: Math.min(armsMove * 5, 100),
        legs: Math.min(legsMove * 5, 100),
        body: Math.min(bodyMove * 3, 100),
      });

      if (avgActivity > 8) {
        state.activity++;
        state.total++;
        if (callbacks.onScore) callbacks.onScore(POINTS.ACTIVE, "Движение");
      }
    }
    prevKeypoints = kps.map((k) => ({ ...k }));

    if (zoneResult && zoneResult.hits) {
      const { hits } = zoneResult;
      const elapsed = now - state.lastHitTime;

      if (elapsed > HIT_COOLDOWN) {
        if (hits.head) {
          _addHit(POINTS.HEAD_HIT, "УДАР В ГОЛОВУ", "hit");
        } else if (hits.body) {
          _addHit(POINTS.BODY_HIT, "УДАР В КОРПУС", "hit");
        }
      }

      if (hits.head && !lastZoneState.head) {
        state.zones++;
        state.total += POINTS.ZONE_ENTER;
      }
      if (hits.body && !lastZoneState.body) {
        state.zones++;
        state.total += POINTS.ZONE_ENTER;
      }
      lastZoneState = { head: hits.head, body: hits.body };
    }

    if (now - state.lastHitTime > COMBO_TIMEOUT && state.combo > 0) {
      state.combo = 0;
      UI.setCombo(0);
    }

    UI.updateScore(state);
    return state;
  }

  function _addHit(points, label, type) {
    const now = Date.now();
    state.hits++;
    state.combo++;
    state.lastHitTime = now;

    const multiplier = Math.min(state.combo, 5);
    const earned = points * multiplier;
    state.total += earned;

    UI.setCombo(state.combo);
    UI.showScorePopup("+" + earned);
    UI.addEvent(label + (multiplier > 1 ? ` x${multiplier}` : ""), type);
    Recorder.addEvent("hit", { label, points: earned, combo: state.combo });
  }

  function _calcMovement(curr, prev) {
    let total = 0,
      count = 0;
    for (let i = 0; i < curr.length; i++) {
      if (curr[i] && prev[i] && curr[i].score > 0.3 && prev[i].score > 0.3) {
        total += Math.hypot(curr[i].x - prev[i].x, curr[i].y - prev[i].y);
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  function _limbMovement(curr, prev, indices) {
    let total = 0,
      count = 0;
    for (const i of indices) {
      if (curr[i] && prev[i] && curr[i].score > 0.3) {
        total += Math.hypot(curr[i].x - prev[i].x, curr[i].y - prev[i].y);
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  function reset() {
    state.total = 0;
    state.hits = 0;
    state.zones = 0;
    state.activity = 0;
    state.combo = 0;
    state.lastHitTime = 0;
    prevKeypoints = null;
    activityBuffer = [];
    lastZoneState = { head: false, body: false };
    UI.updateScore(state);
    UI.setCombo(0);
  }

  function getState() {
    return { ...state };
  }

  return { update, reset, getState };
})();
