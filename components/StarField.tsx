
import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  targetOpacity: number;
  fadeSpeed: number;
  isFadingOut: boolean;
  driftX: number;
  driftY: number;
  offsetX: number;
  offsetY: number;
  moveSpeedX: number;
  moveSpeedY: number;
  originX: number;
  originY: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  opacity: number;
  active: boolean;
  color: string;
}

interface StarFieldProps {
  isDimmed?: boolean;
  isLightMode?: boolean;
  isHomePage?: boolean;
}

export const StarField: React.FC<StarFieldProps> = ({ isDimmed = false, isLightMode = false, isHomePage = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const isDimmedRef = useRef(isDimmed);
  const isLightModeRef = useRef(isLightMode);
  const isHomePageRef = useRef(isHomePage);
  const currentDimFactorRef = useRef(isDimmed ? 0.3 : 1.5);

  useEffect(() => {
    isDimmedRef.current = isDimmed;
    isLightModeRef.current = isLightMode;
    
    // If isHomePage changed, update existing stars
    if (isHomePageRef.current !== isHomePage) {
      isHomePageRef.current = isHomePage;
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (isHomePage) {
          star.size = Math.random() * 2.0 + 0.8;
          star.targetOpacity = Math.random() * 0.9 + 0.3;
          star.driftX = (Math.random() - 0.5) * 0.02;
          star.driftY = (Math.random() - 0.5) * 0.02;
          star.originX = star.x;
          star.originY = star.y;
          star.offsetX = Math.random() * 1000;
          star.offsetY = Math.random() * 1000;
          star.moveSpeedX = 0.005 + Math.random() * 0.01;
          star.moveSpeedY = 0.005 + Math.random() * 0.01;
        } else {
          star.size = Math.random() * 1.4 + 0.4;
          star.targetOpacity = Math.random() * 0.9 + 0.1;
          star.driftX = (Math.random() - 0.5) * 0.03;
          star.driftY = (Math.random() - 0.5) * 0.03;
        }
      }
    }
  }, [isDimmed, isLightMode, isHomePage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization for static backgrounds
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createStar = (): Star => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      
      const isHome = isHomePageRef.current;
      
      const startX = Math.random() * w;
      const startY = Math.random() * h;
      
      return {
        x: startX,
        y: startY,
        originX: startX,
        originY: startY,
        size: isHome ? (Math.random() * 2.0 + 0.8) : (Math.random() * 1.4 + 0.4),
        opacity: 0,
        targetOpacity: isHome ? (Math.random() * 0.9 + 0.3) : (Math.random() * 0.9 + 0.1),
        fadeSpeed: 0.0005 + Math.random() * 0.003,
        isFadingOut: false,
        driftX: isHome ? (Math.random() - 0.5) * 0.02 : (Math.random() - 0.5) * 0.03,
        driftY: isHome ? (Math.random() - 0.5) * 0.02 : (Math.random() - 0.5) * 0.03,
        offsetX: Math.random() * 1000,
        offsetY: Math.random() * 1000,
        moveSpeedX: 0.005 + Math.random() * 0.01,
        moveSpeedY: 0.005 + Math.random() * 0.01,
      };
    };

    const createShootingStar = (): ShootingStar => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      
      if (side === 0) { x = Math.random() * w; y = 0; }
      else if (side === 1) { x = w; y = Math.random() * h; }
      else if (side === 2) { x = Math.random() * w; y = h; }
      else { x = 0; y = Math.random() * h; }

      const angle = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 12 + 8;
      
      const lightModeColors = ['rgba(0, 0, 0,', 'rgba(139, 92, 246,', 'rgba(100, 100, 100,'];
      const darkModeColors = ['rgba(255, 255, 255,', 'rgba(167, 139, 250,', 'rgba(139, 92, 246,'];
      
      const activeColors = isLightModeRef.current ? lightModeColors : darkModeColors;
      const colorBase = activeColors[Math.floor(Math.random() * activeColors.length)];

      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.random() * 60 + 30,
        opacity: 1,
        active: true,
        color: colorBase
      };
    };

    const initStars = () => {
      // Optimization: Reduce star count on mobile/smaller screens to save CPU
      const isMobile = window.innerWidth < 768;
      const count = isMobile ? 150 : 350;
      starsRef.current = Array.from({ length: count }, createStar);
    };

    const update = () => {
      const targetDim = isLightModeRef.current ? 0.6 : (isDimmedRef.current ? 0.4 : 1.5);
      const lerpSpeed = 0.035; 
      
      if (Math.abs(currentDimFactorRef.current - targetDim) > 0.001) {
        currentDimFactorRef.current += (targetDim - currentDimFactorRef.current) * lerpSpeed;
      }

      const w = canvas.width;
      const h = canvas.height;

      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (!star.isFadingOut) {
          star.opacity += star.fadeSpeed;
          if (star.opacity >= star.targetOpacity) {
            star.opacity = star.targetOpacity;
            if (Math.random() < 0.001) star.isFadingOut = true;
          }
        } else {
          star.opacity -= star.fadeSpeed;
          if (star.opacity <= 0) {
            stars[i] = createStar();
          }
        }
        
        if (isHomePageRef.current) {
          // Slow floating movement
          star.offsetX += star.moveSpeedX;
          star.offsetY += star.moveSpeedY;
          
          // Drift the origin slowly
          star.originX += star.driftX;
          star.originY += star.driftY;
          
          // Add oscillation
          star.x = star.originX + Math.sin(star.offsetX) * 15;
          star.y = star.originY + Math.cos(star.offsetY) * 15;
        } else {
          star.x += star.driftX;
          star.y += star.driftY;
          star.originX = star.x;
          star.originY = star.y;
        }

        // Wrap around
        if (star.x < -20) { star.x = w + 20; star.originX = w + 20; }
        else if (star.x > w + 20) { star.x = -20; star.originX = -20; }
        if (star.y < -20) { star.y = h + 20; star.originY = h + 20; }
        else if (star.y > h + 20) { star.y = -20; star.originY = -20; }
      }

      if (Math.random() < 0.0003) {
        shootingStarsRef.current.push(createShootingStar());
      }

      const shootingStars = shootingStarsRef.current;
      if (shootingStars.length > 0) {
        shootingStarsRef.current = shootingStars.filter(ss => {
          ss.x += ss.vx;
          ss.y += ss.vy;
          ss.opacity -= 0.015;
          return ss.opacity > 0 && ss.x > -100 && ss.x < w + 100 && ss.y > -100 && ss.y < h + 100;
        });
      }
    };

    const draw = () => {
      // Optimization: Fill background once instead of clearRect with alpha true
      ctx.fillStyle = isLightModeRef.current ? '#fcfcfd' : '#030304';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const dimFactor = currentDimFactorRef.current;
      const isLight = isLightModeRef.current;
      const stars = starsRef.current;

      // Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (star.opacity <= 0) continue;
        const finalOpacity = Math.min(1, star.opacity * dimFactor);
        
        ctx.fillStyle = isLight 
          ? `rgba(0, 0, 0, ${finalOpacity})` 
          : `rgba(255, 255, 255, ${finalOpacity})`;
        
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Draw Shooting Stars
      const shootingStars = shootingStarsRef.current;
      for (let i = 0; i < shootingStars.length; i++) {
        const ss = shootingStars[i];
        const finalOpacity = ss.opacity * Math.min(1, dimFactor);
        if (finalOpacity <= 0) continue;

        ctx.save();
        const grad = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.vx * (ss.len / 10), ss.y - ss.vy * (ss.len / 10)
        );
        grad.addColorStop(0, `${ss.color} ${finalOpacity})`);
        grad.addColorStop(1, `${ss.color} 0)`);

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = isLight ? 1 : 1.5;
        ctx.lineCap = 'round';
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * (ss.len / 15), ss.y - ss.vy * (ss.len / 15));
        ctx.stroke();

        ctx.fillStyle = isLight 
          ? `rgba(0, 0, 0, ${finalOpacity})` 
          : `rgba(255, 255, 255, ${finalOpacity})`;
        ctx.fillRect(ss.x - 0.5, ss.y - 0.5, 1, 1);
        ctx.restore();
      }
    };

    const loop = () => {
      // Only process if the tab is visible to save battery/CPU
      if (document.visibilityState === 'visible') {
        update();
        draw();
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resize();
    initStars();
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" 
      style={{ mixBlendMode: isLightMode ? 'normal' : 'screen' }}
    />
  );
};
