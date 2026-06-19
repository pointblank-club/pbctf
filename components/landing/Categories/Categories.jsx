import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useRetroSound } from '../hooks/useRetroSound';
import './Categories.css';

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   Category data — all using the site's primary green
   --------------------------------------------------------------- */
const GREEN = '#00ff88';

const CATEGORIES = [
  {
    id: 'cat-web',
    hexId: '0x01',
    title: 'Web Exploitation',
    desc: 'Find vulnerabilities in modern web apps — XSS, SQLi, SSRF, and beyond.',
    difficulty: 3,
    accent: GREEN,
    tag: 'OFFENSIVE',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    id: 'cat-pwn',
    hexId: '0x02',
    title: 'Binary Exploitation',
    desc: 'Reverse and exploit compiled binaries — stack smashing, ROP chains, heap pwn.',
    difficulty: 5,
    accent: GREEN,
    tag: 'HARD',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
  },
  {
    id: 'cat-rev',
    hexId: '0x03',
    title: 'Reverse Engineering',
    desc: 'Analyze software and uncover hidden logic in compiled code and firmware.',
    difficulty: 4,
    accent: GREEN,
    tag: 'ANALYSIS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/>
        <line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/>
        <line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/>
        <line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'cat-crypto',
    hexId: '0x04',
    title: 'Cryptography',
    desc: 'Break or implement secure cryptographic systems — ciphers, math, protocol flaws.',
    difficulty: 4,
    accent: GREEN,
    tag: 'MATH',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    id: 'cat-forensics',
    hexId: '0x05',
    title: 'Digital Forensics',
    desc: 'Recover and investigate digital evidence from disk images, pcap, and memory.',
    difficulty: 3,
    accent: GREEN,
    tag: 'RECON',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    id: 'cat-stego',
    hexId: '0x06',
    title: 'Steganography',
    desc: 'Reveal hidden information concealed within images, audio, and other digital media.',
    difficulty: 2,
    accent: GREEN,
    tag: 'HIDDEN',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    id: 'cat-osint',
    hexId: '0x07',
    title: 'OSINT',
    desc: 'Gather intelligence from public sources — track footprints and find the unfindable.',
    difficulty: 2,
    accent: GREEN,
    tag: 'INTEL',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" y1="12" x2="18" y2="12"/>
        <line x1="6" y1="12" x2="2" y2="12"/>
        <line x1="12" y1="6" x2="12" y2="2"/>
        <line x1="12" y1="22" x2="12" y2="18"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    id: 'cat-misc',
    hexId: '0x08',
    title: 'Miscellaneous',
    desc: 'Unconventional challenges — expect the unexpected, break everything.',
    difficulty: 1,
    accent: GREEN,
    tag: 'WILDCARD',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
];

/* ---------------------------------------------------------------
   DifficultyBar — 1-5 pip visual indicator
   --------------------------------------------------------------- */
function DifficultyBar({ level, accent }) {
  return (
    <div className="categories__difficulty">
      <span className="categories__difficulty-label">THREAT LEVEL</span>
      <div className="categories__difficulty-pips">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            className={`categories__pip ${i <= level ? 'categories__pip--active' : ''}`}
            style={i <= level ? { background: accent, boxShadow: `0 0 10px ${accent}` } : {}}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Categories — main section (Cyber Database Interface)
   --------------------------------------------------------------- */
export default function Categories() {
  const sectionRef = useRef(null);
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const { playHover, playSelect } = useRetroSound();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveId((currentId) => {
        const currentIndex = CATEGORIES.findIndex(c => c.id === currentId);
        const nextIndex = (currentIndex + 1) % CATEGORIES.length;
        return CATEGORIES[nextIndex].id;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const activeCat = CATEGORIES.find(c => c.id === activeId);

  useGSAP(() => {
    const layout = sectionRef.current?.querySelector('.categories__database');
    if (!layout) return;

    gsap.from(layout, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="categories" className="section categories" ref={sectionRef}>
      <div className="container">
        {/* Header */}
        <header className="categories__header">
          <h2 className="section__title">Challenge Domains</h2>
        </header>

        {/* Database Interface */}
        <div className="categories__database">
          
          {/* Left Panel: Navigation Matrix */}
          <div className="categories__nav">
            <div className="categories__nav-header">
              AVAILABLE DIRECTORIES
            </div>
            <div className="categories__nav-list">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`categories__nav-item ${activeId === cat.id ? 'active' : ''}`}
                  onMouseEnter={playHover}
                  onClick={() => { playSelect(); setActiveId(cat.id); }}
                >
                  <span className="categories__nav-title">{cat.title}</span>
                  {activeId === cat.id && <span className="categories__nav-indicator">█</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Data Readout */}
          <div className="categories__readout">
            <div className="categories__readout-bg-scanlines" />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeCat.id}
                initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="categories__readout-content"
              >
                
                <div className="categories__readout-top">
                  <div className="categories__readout-icon-wrapper">
                    <div className="categories__readout-icon">
                      {activeCat.icon}
                    </div>
                  </div>
                  
                  <div className="categories__readout-wave">
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                  </div>
                </div>

                <div className="categories__readout-body">
                  <h3 className="categories__readout-title">{activeCat.title}</h3>
                  <div className="categories__readout-divider"></div>
                  <p className="categories__readout-desc">
                    <span className="desc-prompt">&gt; _desc: </span>
                    {activeCat.desc}
                  </p>
                </div>

                <div className="categories__readout-footer">
                  <DifficultyBar level={activeCat.difficulty} accent={activeCat.accent} />
                </div>
                
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
