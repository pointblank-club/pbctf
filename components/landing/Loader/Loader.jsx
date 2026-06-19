import { useState, useEffect } from 'react';
import { useRetroSound } from '../hooks/useRetroSound';
import './Loader.css';

export default function Loader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { playBoot, playAccessGranted } = useRetroSound();

  useEffect(() => {
    // Animate progress to 100% over 2 seconds
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;
    let lastBootMark = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(100, Math.floor((currentStep / steps) * 100));
      setProgress(newProgress);

      // Tick out a boot blip every ~20% of the load.
      // (Best-effort — browsers keep audio muted until the first gesture, so on
      // a cold first paint this stays silent and simply no-ops.)
      if (newProgress - lastBootMark >= 20 && newProgress < 100) {
        lastBootMark = newProgress;
        playBoot();
      }

      if (newProgress >= 100) {
        clearInterval(timer);
        playAccessGranted();
        // Wait a brief moment at 100% before exiting
        setTimeout(() => {
          setIsExiting(true);
          // Wait for the CSS exit animation to finish before calling onComplete
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 800);
        }, 400);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`premium-loader ${isExiting ? 'premium-loader--exit' : ''}`}>
      
      {/* Background Tiles Pattern */}
      <div className="premium-loader__bg" />
      
      {/* Subtle vignette/gradient overlay so the grid fades out at edges */}
      <div className="premium-loader__vignette" />

      <div className="premium-loader__content">
        {/* Branding Removed */}

        {/* Loading Text */}
        <div className="premium-loader__status">
          {progress < 100 ? 'INITIALIZING SYSTEM...' : 'ACCESS GRANTED'}
        </div>

        {/* Progress Bar Container */}
        <div className="premium-loader__bar-container">
          <div 
            className="premium-loader__bar-fill" 
            style={{ width: `${progress}%` }}
          />
          <div className="premium-loader__bar-glow" style={{ width: `${progress}%` }} />
        </div>

        {/* Percentage text */}
        <div className="premium-loader__percentage">
          {progress}%
        </div>
      </div>
    </div>
  );
}