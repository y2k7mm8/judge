const Zones = (() => {
  const KP = {
    NOSE: 0,
    L_EYE: 1,
    R_EYE: 2,
    L_EAR: 3,
    R_EAR: 4,
    L_SHOULDER: 5,
    R_SHOULDER: 6,
    L_HIP: 11,
    R_HIP: 12,
    L_WRIST: 9,
    R_WRIST: 10,
    L_ANKLE: 15,
    R_ANKLE: 16,
  };

  const CFG = {
    minScore: 0.3,
    headColor: "rgba(0,229,255,0.10)",
    headBorder: "rgba(0,229,255,0.8)",
    bodyColor: "rgba(0,255,136,0.07)",
    bodyBorder: "rgba(0,255,136,0.7)",
    labelFont: '10px "Orbitron", monospace',
    borderWidth: 1.5,
    headPad: 0.38,
    bodyPad: 0.12,
    hitFlash: 500,
  };

  const hitState = {
    headHitTime: 0,
    bodyHitTime: 0,
  };

  function _headBox(kps) {
    const pts = [KP.NOSE, KP.L_EYE, KP.R_EYE, KP.L_EAR, KP.R_EAR]
      .map((i) => kps[i])
      .filter((p) => p && p.score >= CFG.minScore);
    if (pts.length < 2) return null;

    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const w = maxX - minX,
      h = maxY - minY;
    const pad = Math.max(w, h) * CFG.headPad;

    return {
      x: minX - pad,
      y: minY - pad * 1.8,
      w: w + pad * 2,
      h: h + pad * 3,
    };
  }

  function _bodyBox(kps) {
    const pts = [KP.L_SHOULDER, KP.R_SHOULDER, KP.L_HIP, KP.R_HIP]
      .map((i) => kps[i])
      .filter((p) => p && p.score >= CFG.minScore);
    if (pts.length < 3) return null;

    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const pad = (maxX - minX) * CFG.bodyPad;

    return {
      x: minX - pad,
      y: minY - pad * 0.5,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad,
    };
  }

  function draw(ctx, keypoints) {
    const head = _headBox(keypoints);
    const body = _bodyBox(keypoints);
    const now = Date.now();

    const hits = { head: false, body: false };
    const wrists = [KP.L_WRIST, KP.R_WRIST];

    for (const wIdx of wrists) {
      const w = keypoints[wIdx];
      if (!w || w.score < CFG.minScore) continue;
      if (head && isInZone(w, head)) hits.head = true;
      if (body && isInZone(w, body)) hits.body = true;
    }

    if (hits.head) hitState.headHitTime = now;
    if (hits.body) hitState.bodyHitTime = now;

    ctx.save();
    ctx.lineWidth = CFG.borderWidth;

    if (body) {
      const isHit = now - hitState.bodyHitTime < CFG.hitFlash;
      ctx.strokeStyle = isHit ? "rgba(255,255,0,0.9)" : CFG.bodyBorder;
      ctx.fillStyle = isHit ? "rgba(255,255,0,0.15)" : CFG.bodyColor;
      if (isHit) {
        ctx.shadowColor = "yellow";
        ctx.shadowBlur = 20;
      }
      _roundRect(ctx, body.x, body.y, body.w, body.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = CFG.labelFont;
      ctx.fillStyle = isHit ? "yellow" : CFG.bodyBorder;
      ctx.fillText("КОРПУС", body.x + 6, body.y - 5);
    }

    if (head) {
      const isHit = now - hitState.headHitTime < CFG.hitFlash;
      ctx.strokeStyle = isHit ? "rgba(255,50,50,0.9)" : CFG.headBorder;
      ctx.fillStyle = isHit ? "rgba(255,50,50,0.2)" : CFG.headColor;
      if (isHit) {
        ctx.shadowColor = "red";
        ctx.shadowBlur = 25;
      }
      _roundRect(ctx, head.x, head.y, head.w, head.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = CFG.labelFont;
      ctx.fillStyle = isHit ? "#ff3333" : CFG.headBorder;
      ctx.fillText("ГОЛОВА", head.x + 6, head.y - 5);
    }

    ctx.restore();
    return { head, body, hits };
  }

  function isInZone(point, zone) {
    if (!zone || !point) return false;
    return (
      point.x >= zone.x &&
      point.x <= zone.x + zone.w &&
      point.y >= zone.y &&
      point.y <= zone.y + zone.h
    );
  }

  function distance(kpA, kpB) {
    if (!kpA || !kpB) return Infinity;
    return Math.hypot(kpA.x - kpB.x, kpA.y - kpB.y);
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { draw, isInZone, distance, KP };
})();
