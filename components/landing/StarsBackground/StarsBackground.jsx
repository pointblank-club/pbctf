import React, { useEffect, useRef } from 'react';
import './StarsBackground.css';

const StarsBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let stars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 2500); // Density of stars
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5,
          alpha: Math.random(),
          speed: Math.random() * 0.015 + 0.005,
          // Subtle color variations (mostly white, some slightly blue or yellow)
          color: Math.random() > 0.8 
            ? Math.random() > 0.5 ? 'rgba(200, 220, 255, ' : 'rgba(255, 250, 200, '
            : 'rgba(255, 255, 255, '
        });
      }
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scrollY = window.scrollY;

      stars.forEach(star => {
        // Parallax effect based on star size for depth
        const parallaxOffset = scrollY * star.radius * 0.2;
        let finalY = star.y - parallaxOffset;
        
        // Wrap vertically so stars don't disappear
        finalY = ((finalY % canvas.height) + canvas.height) % canvas.height;

        ctx.beginPath();
        ctx.arc(star.x, finalY, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${star.alpha})`;
        ctx.fill();

        // Twinkling effect
        star.alpha += star.speed;
        if (star.alpha <= 0.2 || Math.random() < 0.001) {
          star.speed = Math.abs(star.speed); // start fading in
        } else if (star.alpha >= 1 || Math.random() < 0.001) {
          star.speed = -Math.abs(star.speed); // start fading out
        }
      });
      animationFrameId = requestAnimationFrame(drawStars);
    };

    window.addEventListener('resize', resize);
    resize();
    drawStars();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="stars-background" />;
};

export default StarsBackground;
