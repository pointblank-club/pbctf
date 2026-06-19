import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Hero.css';

const CHARS = '!<>-_\\\\/[]{}—=+*^?#________';

function GlitchText({ text, delay = 0 }) {
  const [displayText, setDisplayText] = useState('');
  
  const [initialScramble] = useState(() => {
    return text.split('').map(char => {
      if (char === ' ') return ' ';
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }).join('');
  });

  useEffect(() => {
    let timeout;
    let frame;
    let iteration = 0;

    const scramble = () => {
      setDisplayText(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) {
              return text[index];
            }
            return initialScramble[index];
          })
          .join('')
      );

      if (iteration >= text.length) {
        cancelAnimationFrame(frame);
      } else {
        iteration += 1 / 3; // speed of decryption
        frame = requestAnimationFrame(scramble);
      }
    };

    timeout = setTimeout(() => {
      frame = requestAnimationFrame(scramble);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [text, delay, initialScramble]);

  return <span>{displayText || initialScramble}</span>;
}

const stagger = (i) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
});

export default function Hero() {
  return (
    <section id="hero" className="hero synthwave-hero">
      {/* Retro Synthwave Backdrop */}
      <div className="synthwave-sky" />
      <div className="synthwave-sun" />

      {/* SVG Wireframe Mountains */}
      <svg className="synthwave-mountains" viewBox="0 0 1000 250" preserveAspectRatio="none">
        <defs>
          <pattern id="mountain-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0, 255, 136, 0.15)" strokeWidth="1" />
            <path d="M 0 30 L 30 0" fill="none" stroke="rgba(0, 255, 136, 0.1)" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="mountain-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#050505" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Left Mountain Range */}
        <path 
          d="M 0 250 L 80 180 L 160 220 L 240 140 L 320 200 L 400 100 L 480 210 L 520 190 L 560 250 Z" 
          fill="url(#mountain-grad)" 
        />
        <path 
          d="M 0 250 L 80 180 L 160 220 L 240 140 L 320 200 L 400 100 L 480 210 L 520 190 L 560 250 Z" 
          fill="url(#mountain-grid)" 
          stroke="rgba(0, 255, 136, 0.5)" 
          strokeWidth="1.5" 
        />
        
        {/* Right Mountain Range */}
        <path 
          d="M 440 250 L 480 200 L 520 220 L 600 120 L 680 190 L 760 90 L 840 180 L 920 140 L 1000 250 Z" 
          fill="url(#mountain-grad)" 
        />
        <path 
          d="M 440 250 L 480 200 L 520 220 L 600 120 L 680 190 L 760 90 L 840 180 L 920 140 L 1000 250 Z" 
          fill="url(#mountain-grid)" 
          stroke="rgba(0, 255, 136, 0.5)" 
          strokeWidth="1.5" 
        />
      </svg>

      <div className="synthwave-grid">
        <div className="synthwave-grid-lines" />
      </div>
      <div className="synthwave-horizon" />

      <div className="container hero__container--centered">
        <div className="hero__content--centered">
          <motion.h1 className="hero__headline--centered" {...stagger(12)}>
            <span className="hero__headline-neon">
              <GlitchText text="PBCTF 5.0" delay={1.2} />
            </span>
          </motion.h1>
          <motion.p className="hero__tagline--centered" {...stagger(13)}>
            <GlitchText text="The Hunt Begins Here." delay={1.4} />
          </motion.p>
        </div>
      </div>

      <div className="hero__actions-wrapper">
        <motion.div className="hero__actions" {...stagger(15)}>
          <a href="/register" className="btn btn--primary" id="hero-register-cta">
            Register Now
          </a>
          <a href="/login" className="btn btn--secondary" id="hero-login-cta">
            Login
          </a>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <div className="hero__scroll-indicator" aria-hidden="true">
        <span className="hero__scroll-chevron" />
      </div>

      {/* Cinematic Letterbox */}
      <motion.div 
        className="hero__letterbox hero__letterbox--top"
        initial={{ height: '50vh' }}
        animate={{ height: 0 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
      />
      <motion.div 
        className="hero__letterbox hero__letterbox--bottom"
        initial={{ height: '50vh' }}
        animate={{ height: 0 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
      />
    </section>
  );
}
