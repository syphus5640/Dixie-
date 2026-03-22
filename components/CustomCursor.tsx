
import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface CustomCursorProps {
  isLightMode?: boolean;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ isLightMode = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Tightened spring config to reduce lag during fast movement
  const dotSpringConfig = { damping: 30, stiffness: 800, mass: 0.3 };

  const cursorX = useSpring(mouseX, dotSpringConfig);
  const cursorY = useSpring(mouseY, dotSpringConfig);

  useEffect(() => {
    // Robust check for touch capability
    const checkTouch = () => {
      // Only disable if it's EXCLUSIVELY a coarse pointer device (like a phone)
      // and doesn't support a fine pointer (mouse/trackpad)
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      
      if (hasCoarsePointer && !hasFinePointer) {
        setIsTouchDevice(true);
      }
    };
    
    checkTouch();

    const moveMouse = (e: MouseEvent) => {
      // If we see mouse movement, we definitely want to show the cursor
      // even if we previously thought it was a touch device
      if (isTouchDevice) setIsTouchDevice(false);
      
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    let lastMouseOverTime = 0;
    const handleMouseOver = (e: MouseEvent) => {
      if (isTouchDevice) return;
      
      const now = Date.now();
      if (now - lastMouseOverTime < 50) return; // Throttle to 20fps for hover checks
      lastMouseOverTime = now;
      
      const target = e.target as HTMLElement;
      if (!target) return;

      const isPointer = !!(
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('button') || 
        target.closest('a') ||
        target.classList.contains('cursor-pointer') ||
        window.getComputedStyle(target).cursor === 'pointer'
      );

      setIsHovered(isPointer);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);
    
    // Explicitly detect touch start to disable custom cursor immediately
    const handleTouchStart = () => {
      setIsTouchDevice(true);
      setIsVisible(false);
      document.documentElement.classList.remove('has-custom-cursor');
      // Remove cursor-none from body for touch devices
      document.documentElement.style.cursor = 'auto';
    };

    if (!isTouchDevice) {
      document.documentElement.classList.add('has-custom-cursor');
    } else {
      document.documentElement.classList.remove('has-custom-cursor');
    }

    window.addEventListener('mousemove', moveMouse, { passive: true });
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', moveMouse);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [isVisible, mouseX, mouseY, isTouchDevice]);

  // Completely bypass rendering if we've identified this as a touch interaction
  if (isTouchDevice) return null;

  const cursorColor = isLightMode ? 'black' : 'white';
  const shadowColor = isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
  const glowColor = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)';

  return (
    <motion.div
      className="custom-cursor fixed top-0 left-0 w-2.5 h-2.5 rounded-full pointer-events-none z-[9999]"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: '-50%',
        translateY: '-50%',
        opacity: isVisible ? 1 : 0,
        scale: isHovered ? 1.6 : 1,
        backgroundColor: cursorColor,
        boxShadow: isHovered 
          ? `0 0 15px ${glowColor}, 0 0 0 1px ${shadowColor}` 
          : `0 0 8px ${shadowColor}, 0 0 0 1px ${shadowColor}`,
      }}
      transition={{ 
        scale: { type: 'spring', stiffness: 300, damping: 20 },
        boxShadow: { duration: 0.2 },
        backgroundColor: { duration: 0.5 }
      }}
    />
  );
};
