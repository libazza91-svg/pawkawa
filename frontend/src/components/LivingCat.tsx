import { useEffect, useRef } from 'react';

type CatMood = 'sit' | 'walk' | 'sniff' | 'loaf';

type CatFrame = {
  index: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const CAT_FRAME_WIDTH = 362;
const CAT_FRAMES: Record<CatMood, CatFrame> = {
  sit: { index: 0, left: 79, top: 201, right: 307, bottom: 506 },
  walk: { index: 1, left: 16, top: 225, right: 362, bottom: 505 },
  sniff: { index: 2, left: 0, top: 207, right: 362, bottom: 505 },
  loaf: { index: 3, left: 0, top: 333, right: 362, bottom: 506 }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function LivingCat() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const canvasNode = canvas;
    const context = ctx;

    const sprite = new Image();
    let spriteReady = false;
    sprite.onload = () => {
      spriteReady = true;
    };
    sprite.src = '/pet/mochi-natural.png';

    const cat = {
      x: 72,
      y: 44,
      targetX: 72,
      mood: 'sit' as CatMood,
      nextDecision: 0,
      facing: 1
    };

    let width = 0;
    let height = 0;
    let animationId = 0;
    let lastTime = performance.now();

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvasNode.getBoundingClientRect();
      width = Math.max(220, bounds.width);
      height = Math.max(132, bounds.height);
      canvasNode.width = Math.floor(width * ratio);
      canvasNode.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
      cat.y = height - 110;
    }

    function chooseTarget(now: number) {
      const moods: CatMood[] = ['sit', 'walk', 'sniff', 'loaf'];
      cat.targetX = 24 + Math.random() * Math.max(40, width - 150);
      cat.mood = moods[Math.floor(Math.random() * moods.length)];
      cat.facing = cat.targetX >= cat.x ? 1 : -1;
      cat.nextDecision = now + 4200 + Math.random() * 2600;
    }

    function drawCat(now: number) {
      if (!spriteReady) return;
      const frame = CAT_FRAMES[cat.mood];
      const pad = 10;
      const sx = frame.index * CAT_FRAME_WIDTH + Math.max(0, frame.left - pad);
      const sy = Math.max(0, frame.top - pad);
      const sw = Math.min(CAT_FRAME_WIDTH, frame.right + pad) - Math.max(0, frame.left - pad);
      const sh = Math.min(sprite.height, frame.bottom + pad) - Math.max(0, frame.top - pad);
      const dh = cat.mood === 'loaf' ? 58 : 82;
      const dw = dh * (sw / sh);
      const x = clamp(cat.x, 12, width - dw - 12);
      const y = clamp(cat.y, 18, height - dh - 18);
      const bob = cat.mood === 'walk' ? Math.sin(now / 120) * 1.1 : Math.sin(now / 700) * 0.4;

      context.save();
      context.fillStyle = 'rgba(15, 23, 42, 0.1)';
      context.beginPath();
      context.ellipse(x + dw * 0.5, y + dh + 4, dw * 0.32, 4, 0, 0, Math.PI * 2);
      context.fill();
      context.translate(x + (cat.facing < 0 ? dw : 0), y + bob);
      context.scale(cat.facing < 0 ? -1 : 1, 1);
      context.drawImage(sprite, sx, sy, sw, sh, 0, 0, dw, dh);
      context.restore();
    }

    function draw(now: number) {
      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 255, 255, 0.62)';
      roundRect(context, 10, height - 48, width - 20, 34, 14);
      context.fill();

      if (now > cat.nextDecision) chooseTarget(now);
      const dx = cat.targetX - cat.x;
      cat.x += dx * clamp(dt * 1.7, 0, 1);
      if (Math.abs(dx) > 20) cat.mood = 'walk';
      drawCat(now);
      animationId = requestAnimationFrame(draw);
    }

    function roundRect(
      drawingContext: CanvasRenderingContext2D,
      x: number,
      y: number,
      rectWidth: number,
      rectHeight: number,
      radius: number
    ) {
      drawingContext.beginPath();
      drawingContext.moveTo(x + radius, y);
      drawingContext.lineTo(x + rectWidth - radius, y);
      drawingContext.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
      drawingContext.lineTo(x + rectWidth, y + rectHeight - radius);
      drawingContext.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
      drawingContext.lineTo(x + radius, y + rectHeight);
      drawingContext.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
      drawingContext.lineTo(x, y + radius);
      drawingContext.quadraticCurveTo(x, y, x + radius, y);
      drawingContext.closePath();
    }

    resize();
    chooseTarget(performance.now());
    animationId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pet-zone" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="pet-caption">
        <strong>Mochi is checking sources</strong>
        <span>quietly watching nutrition, price and trust signals</span>
      </div>
    </div>
  );
}
