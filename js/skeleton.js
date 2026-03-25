/**
 * skeleton.js v2.0
 * Реалистичный 3D-стилизованный скелет с:
 * - Градиентными костями (толще у суставов, тоньше посередине)
 * - Светящимися суставами (пульсирующее свечение)
 * - Цветовое разделение: голова / левая / правая / корпус
 * - Следы движения (trails)
 */

const Skeleton = (() => {

  // COCO 17 точек
  const KP = {
    NOSE:0, L_EYE:1, R_EYE:2, L_EAR:3, R_EAR:4,
    L_SHOULDER:5, R_SHOULDER:6, L_ELBOW:7, R_ELBOW:8,
    L_WRIST:9, R_WRIST:10, L_HIP:11, R_HIP:12,
    L_KNEE:13, R_KNEE:14, L_ANKLE:15, R_ANKLE:16,
  };

  // Соединения [от, до, группа]
  const CONNECTIONS = [
    // Голова
    [KP.NOSE, KP.L_EYE, 'head'],
    [KP.NOSE, KP.R_EYE, 'head'],
    [KP.L_EYE, KP.L_EAR, 'head'],
    [KP.R_EYE, KP.R_EAR, 'head'],
    // Торс
    [KP.L_SHOULDER, KP.R_SHOULDER, 'torso'],
    [KP.L_SHOULDER, KP.L_HIP, 'torso'],
    [KP.R_SHOULDER, KP.R_HIP, 'torso'],
    [KP.L_HIP, KP.R_HIP, 'torso'],
    // Левая рука
    [KP.L_SHOULDER, KP.L_ELBOW, 'left'],
    [KP.L_ELBOW, KP.L_WRIST, 'left'],
    // Правая рука
    [KP.R_SHOULDER, KP.R_ELBOW, 'right'],
    [KP.R_ELBOW, KP.R_WRIST, 'right'],
    // Левая нога
    [KP.L_HIP, KP.L_KNEE, 'left'],
    [KP.L_KNEE, KP.L_ANKLE, 'left'],
    // Правая нога
    [KP.R_HIP, KP.R_KNEE, 'right'],
    [KP.R_KNEE, KP.R_ANKLE, 'right'],
  ];

  const KEYPOINT_NAMES = [
    'Нос','Л.глаз','П.глаз','Л.ухо','П.ухо',
    'Л.плечо','П.плечо','Л.локоть','П.локоть',
    'Л.запястье','П.запястье','Л.бедро','П.бедро',
    'Л.колено','П.колено','Л.голень','П.голень',
  ];

  // Тема цветов
  const THEME = {
    head:  { bone: '#00e5ff', joint: '#00e5ff', glow: 'rgba(0,229,255,0.8)' },
    left:  { bone: '#00ff88', joint: '#00ff88', glow: 'rgba(0,255,136,0.8)' },
    right: { bone: '#ff6b35', joint: '#ff6b35', glow: 'rgba(255,107,53,0.8)' },
    torso: { bone: '#c0d8ff', joint: '#a0c0ff', glow: 'rgba(160,192,255,0.6)' },
  };

  // Размер суставов по типу
  const JOINT_RADIUS = {
    [KP.NOSE]:       7,
    [KP.L_SHOULDER]: 9, [KP.R_SHOULDER]: 9,
    [KP.L_ELBOW]:    7, [KP.R_ELBOW]:    7,
    [KP.L_WRIST]:    6, [KP.R_WRIST]:    6,
    [KP.L_HIP]:      9, [KP.R_HIP]:      9,
    [KP.L_KNEE]:     7, [KP.R_KNEE]:     7,
    [KP.L_ANKLE]:    6, [KP.R_ANKLE]:    6,
  };

  const CFG = {
    minScore: 0.25,
    boneBaseWidth: 4,
    glowBlur: 12,
    trailLength: 12,
  };

  // Буфер следов для каждой точки
  const trails = new Array(17).fill(null).map(() => []);
  let frameCount = 0;

  /**
   * Главная функция рисования скелета
   */
  function draw(ctx, keypoints, options = {}) {
    const {
      showSkeleton  = true,
      showKeypoints = true,
      showLabels    = false,
      showTrails    = false,
    } = options;

    frameCount++;

    // Обновляем следы
    if (showTrails) {
      _updateTrails(keypoints);
      _drawTrails(ctx, keypoints);
    }

    if (showSkeleton)  _drawBones(ctx, keypoints);
    if (showKeypoints) _drawJoints(ctx, keypoints, showLabels);
  }

  // ── СЛЕДЫ ──────────────────────────────────────────────────────

  function _updateTrails(keypoints) {
    const trackedKPs = [9, 10, 15, 16]; // запястья и лодыжки
    for (const idx of trackedKPs) {
      const kp = keypoints[idx];
      if (kp && kp.score >= CFG.minScore) {
        trails[idx].push({ x: kp.x, y: kp.y, t: frameCount });
        if (trails[idx].length > CFG.trailLength) trails[idx].shift();
      }
    }
  }

  function _drawTrails(ctx, keypoints) {
    const trackedKPs = [
      { idx: 9,  color: '#00ff88' },
      { idx: 10, color: '#ff6b35' },
      { idx: 15, color: '#00ff88' },
      { idx: 16, color: '#ff6b35' },
    ];

    for (const { idx, color } of trackedKPs) {
      const trail = trails[idx];
      if (trail.length < 2) continue;

      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.6;
        const width = (i / trail.length) * 3;
        ctx.beginPath();
        ctx.moveTo(trail[i-1].x, trail[i-1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── КОСТИ (реалистичные, с градиентом) ─────────────────────────

  function _drawBones(ctx, kps) {
    // Сначала рисуем свечение (толстое, прозрачное)
    for (const [a, b, group] of CONNECTIONS) {
      const kpA = kps[a], kpB = kps[b];
      if (!kpA || !kpB) continue;
      if (kpA.score < CFG.minScore || kpB.score < CFG.minScore) continue;

      const theme = THEME[group];

      // Glow layer
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(kpA.x, kpA.y);
      ctx.lineTo(kpB.x, kpB.y);
      ctx.lineWidth = CFG.boneBaseWidth * 3;
      ctx.strokeStyle = theme.glow;
      ctx.globalAlpha = 0.2;
      ctx.lineCap = 'round';
      ctx.filter = `blur(${CFG.glowBlur}px)`;
      ctx.stroke();
      ctx.restore();
    }

    // Затем основные кости с градиентом
    for (const [a, b, group] of CONNECTIONS) {
      const kpA = kps[a], kpB = kps[b];
      if (!kpA || !kpB) continue;
      if (kpA.score < CFG.minScore || kpB.score < CFG.minScore) continue;

      _drawBone(ctx, kpA, kpB, group);
    }
  }

  function _drawBone(ctx, kpA, kpB, group) {
    const theme = THEME[group];
    const mx = (kpA.x + kpB.x) / 2;
    const my = (kpA.y + kpB.y) / 2;
    const len = Math.hypot(kpB.x - kpA.x, kpB.y - kpA.y);
    const angle = Math.atan2(kpB.y - kpA.y, kpB.x - kpA.x);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);

    const hw = len / 2;
    const maxW = CFG.boneBaseWidth;
    const minW = CFG.boneBaseWidth * 0.45;

    // Форма кости: широкая у суставов, узкая посередине
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    ctx.bezierCurveTo(-hw * 0.4, -maxW, -hw * 0.1, -minW, 0, -minW);
    ctx.bezierCurveTo( hw * 0.1, -minW,  hw * 0.4, -maxW,  hw, 0);
    ctx.bezierCurveTo( hw * 0.4,  maxW,  hw * 0.1,  minW,  0,  minW);
    ctx.bezierCurveTo(-hw * 0.1,  minW, -hw * 0.4,  maxW, -hw, 0);
    ctx.closePath();

    // Градиент вдоль кости
    const grad = ctx.createLinearGradient(-hw, 0, hw, 0);
    grad.addColorStop(0,   theme.joint);
    grad.addColorStop(0.3, theme.bone);
    grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.7, theme.bone);
    grad.addColorStop(1,   theme.joint);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    // Тонкая обводка
    ctx.strokeStyle = theme.joint;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.stroke();

    ctx.restore();
  }

  // ── СУСТАВЫ ─────────────────────────────────────────────────────

  function _drawJoints(ctx, kps, showLabels) {
    for (let i = 0; i < kps.length; i++) {
      const kp = kps[i];
      if (!kp || kp.score < CFG.minScore) continue;

      const group = _getGroup(i);
      const theme = THEME[group];
      const r = JOINT_RADIUS[i] || 5;

      // Внешнее свечение
      ctx.save();
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, r * 2.5, 0, Math.PI * 2);
      const glowGrad = ctx.createRadialGradient(kp.x, kp.y, 0, kp.x, kp.y, r * 2.5);
      glowGrad.addColorStop(0, theme.glow);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.restore();

      // Тёмное ядро сустава
      ctx.save();
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, r, 0, Math.PI * 2);
      const innerGrad = ctx.createRadialGradient(
        kp.x - r*0.3, kp.y - r*0.3, 0,
        kp.x, kp.y, r
      );
      innerGrad.addColorStop(0, '#fff');
      innerGrad.addColorStop(0.3, theme.joint);
      innerGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Яркий обод
      ctx.strokeStyle = theme.joint;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.restore();

      // Блик
      ctx.save();
      ctx.beginPath();
      ctx.arc(kp.x - r * 0.28, kp.y - r * 0.28, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      ctx.restore();

      // Подписи
      if (showLabels && KEYPOINT_NAMES[i]) {
        ctx.save();
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = theme.joint;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = theme.joint;
        ctx.shadowBlur = 4;
        ctx.fillText(KEYPOINT_NAMES[i], kp.x + r + 4, kp.y + 4);
        ctx.restore();
      }
    }
  }

  function _getGroup(idx) {
    if ([0,1,2,3,4].includes(idx))    return 'head';
    if ([5,7,9,11,13,15].includes(idx)) return 'left';
    if ([6,8,10,12,14,16].includes(idx)) return 'right';
    return 'torso';
  }

  function clearTrails() {
    for (let i = 0; i < trails.length; i++) trails[i] = [];
  }

  return {
    draw,
    clearTrails,
    KEYPOINT_NAMES,
    CONNECTIONS,
    KP,
    CFG,
  };

})();
