import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRetroSound } from '../hooks/useRetroSound';
import './Prizes.css';

gsap.registerPlugin(ScrollTrigger);

function Barcode() {
  return (
    <div className="prizes__barcode">
      <div className="prizes__barcode-bars"></div>
      <span className="prizes__barcode-text">AUTH_OK // PB5.0</span>
    </div>
  );
}

const FlyingMoney = () => {
  return (
    <div className="prizes__lcd-money-container">
      {Array.from({ length: 15 }).map((_, i) => (
        <span key={i} className={`prizes__lcd-money-note prizes__lcd-money-note--${i}`}>
          {i % 3 === 0 ? '$' : '₹'}
        </span>
      ))}
    </div>
  );
};

const TotalPrizeCard = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [bursts, setBursts] = useState([]);
  const [isGlitching, setIsGlitching] = useState(false);
 const { playHover, playCoinBurst } = useRetroSound();
  const burstIdRef = useRef(0);

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleRedButtonClick = (e) => {
    e.stopPropagation();
     playCoinBurst();
    const id = burstIdRef.current++;
    setBursts((prev) => [...prev, id]);
    // Trigger glitch effect
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 800);
    // Remove burst after animation completes
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b !== id));
    }, 5000);
  };

  return (
    <div className="prizes__total-wrapper">
      {/* Money burst layers rendered BEHIND the bezel */}
      {bursts.map((id) => (
        <div key={id} className="prizes__money-burst">
          {Array.from({ length: 70 }).map((_, i) => {
            const angle = (Math.random() * 360);
            const distance = 500 + Math.random() * 600;
            const dx = Math.cos((angle * Math.PI) / 180) * distance;
            const dy = Math.sin((angle * Math.PI) / 180) * distance;
            const rotEnd = Math.random() * 1440 - 720;
            const size = 36 + Math.random() * 28;
            const delay = Math.random() * 0.4;
            const spinDuration = 0.3 + Math.random() * 0.4;
            return (
              <span
                key={i}
                className="prizes__money-burst-note"
                style={{
                  '--dx': `${dx}px`,
                  '--dy': `${dy}px`,
                  '--rot': `${rotEnd}deg`,
                  '--size': `${size}px`,
                  '--delay': `${delay}s`,
                  '--spin-dur': `${spinDuration}s`,
                }}
              >
                <span className="prizes__coin">
                  <span className="prizes__coin-face">₹</span>
                </span>
              </span>
            );
          })}
        </div>
      ))}

      <motion.article
        className="prizes__lcd-bezel"
        onMouseEnter={() => { playHover(); setIsHovered(true); }}
        onMouseLeave={handleMouseLeave}
      >
        <div className="prizes__lcd-screen">
          <div className="prizes__lcd-grid-overlay"></div>
          <FlyingMoney />
          
          <div className="prizes__lcd-content">
            <div className="prizes__lcd-header">
              <span className="prizes__lcd-status">● SYSTEM.ONLINE</span>
              <span className="prizes__lcd-title">PRIZE_POOL_ALLOCATION</span>
            </div>
            
            <div className={`prizes__lcd-amount-container${isGlitching ? ' prizes__lcd-glitch' : ''}`}>
              <p className="prizes__lcd-amount">
                <span className="prizes__lcd-currency">₹</span>
                1,00,000<span className="prizes__lcd-plus">+</span>
              </p>
              {/* LCD ghosting effect */}
              <p className="prizes__lcd-amount prizes__lcd-amount--ghost">
                <span className="prizes__lcd-currency">₹</span>
                1,00,000<span className="prizes__lcd-plus">+</span>
              </p>
            </div>

            <div className="prizes__lcd-footer">
              <span className="prizes__lcd-footer-text">REWARDS // pbctf5.0</span>
              <Barcode />
            </div>
          </div>
        </div>

        {/* Red button on the bezel */}
        <button
          className="prizes__red-button"
          onClick={handleRedButtonClick}
          aria-label="Release prize money"
        />
      </motion.article>
    </div>
  );
};

export default function Prizes() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = sectionRef.current;
    if (!ctx) return;

    const wrapper = ctx.querySelector('.prizes__total-wrapper');
    gsap.set(wrapper, { opacity: 0, scale: 0.9, y: 40 });
    gsap.to(wrapper, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: ctx,
        start: 'top 75%',
      },
    });

  }, { scope: sectionRef });

  return (
    <section id="prizes" className="section prizes" ref={sectionRef}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <header className="prizes__header" style={{marginBottom: '0'}}>
          <h2 className="section__title">Prize Pool</h2>
        </header>

        <TotalPrizeCard />
      </div>
    </section>
  );
}
