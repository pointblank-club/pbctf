import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRetroSound } from '../hooks/useRetroSound';
import './Prizes.css';

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   Prize tier data
   --------------------------------------------------------------- */
const TIERS = [
  {
    id: 'prize-second',
    rankNumber: '02',
    label: 'SECOND PLACE',
    modifier: 'second',
    color: '#A0E0B0'
  },
  {
    id: 'prize-first',
    rankNumber: '01',
    label: 'FIRST PLACE',
    modifier: 'first',
    color: 'var(--primary)'
  },
  {
    id: 'prize-third',
    rankNumber: '03',
    label: 'THIRD PLACE',
    modifier: 'third',
    color: '#A0E0B0'
  },
];

/* ---------------------------------------------------------------
   Decorative Barcode Element
   --------------------------------------------------------------- */
function Barcode() {
  return (
    <div className="prizes__barcode">
      <div className="prizes__barcode-bars"></div>
      <span className="prizes__barcode-text">AUTH_OK // PB5.0</span>
    </div>
  );
}

/* ---------------------------------------------------------------
   Interactive Prize Card Component (Data Chip)
   --------------------------------------------------------------- */
const PrizeCard = ({ tier }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const { playHover } = useRetroSound();

  const springConfig = { damping: 20, stiffness: 150 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['6deg', '-6deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-6deg', '6deg']);
  
  // Reflection glint effect
  const background = useTransform(
    [mouseXSpring, mouseYSpring],
    ([x, y]) => `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.04) 0%, transparent 60%)`
  );

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <div className={`prizes__card-wrapper prizes__card-wrapper--${tier.modifier}`}>
      <motion.article
        id={tier.id}
        className={`prizes__device prizes__device--${tier.modifier}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => { playHover(); setIsHovered(true); }}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
        }}
      >
        <motion.div className="prizes__device-glint" style={{ background, opacity: isHovered ? 1 : 0 }} />
        
        {/* Hardware Details */}
        <div className="prizes__device-screw prizes__device-screw--tl"></div>
        <div className="prizes__device-screw prizes__device-screw--tr"></div>
        <div className="prizes__device-screw prizes__device-screw--bl"></div>
        <div className="prizes__device-screw prizes__device-screw--br"></div>
        <div className="prizes__device-led"></div>

        
        {/* 1st Place specific animations */}
        {tier.modifier === 'first' && (
          <>
            <div className="prizes__device-glow-bg" />
          </>
        )}

        {/* Inner CRT Screen */}
        <div className="prizes__screen">
          <div className="prizes__screen-scanlines"></div>
          <div className="prizes__screen-content">
            {/* Tech Badge */}
            <div className="prizes__tech-badge">
              <span className="bracket">[</span> TIER // {tier.rankNumber} <span className="bracket">]</span>
            </div>
            
            {/* Main Amount */}
            <div className="prizes__amount-wrapper">
              <p
                className="prizes__amount prize-blur"
                style={{ filter: "blur(8px)", userSelect: "none", opacity: 0.8 }}
              >
                ₹ ??,???
              </p>
              <p className="prizes__label"><span className="prizes__prompt">&gt;</span> {tier.label}</p>
            </div>

            <Barcode />
          </div>
        </div>
      </motion.article>
    </div>
  );
};

/* ---------------------------------------------------------------
   Prizes — main section
   --------------------------------------------------------------- */
export default function Prizes() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const ctx = sectionRef.current;
    if (!ctx) return;

    /* --- Card entrance --- */
    const wrappers = ctx.querySelectorAll('.prizes__card-wrapper');
    gsap.set(wrappers, { opacity: 0, y: 60 });
    gsap.to(wrappers, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: ctx,
        start: 'top 75%',
      },
    });

  }, { scope: sectionRef });

  return (
    <section id="prizes" className="section prizes" ref={sectionRef}>
      <div className="container">
        {/* Header */}
        <header className="prizes__header">
          <h2 className="section__title">Prize Pool</h2>
        </header>

        {/* Total Prize Pool */}
        <div className="prizes__total">
          <div className="prizes__total-label">Total Prize Pool</div>
          <div className="prizes__total-amount prize-blur" style={{ filter: "blur(8px)", userSelect: "none", opacity: 0.8 }}>
            <span className="prizes__total-currency">₹</span>
            <span>??,???</span>
          </div>
          <div className="prizes__total-divider" />
        </div>

        {/* Tiers */}
        <div className="prizes__tiers">
          {TIERS.map((tier) => (
            <PrizeCard key={tier.id} tier={tier} />
          ))}
        </div>

      </div>
    </section>
  );
}
