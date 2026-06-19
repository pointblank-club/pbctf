import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useRetroSound } from '../hooks/useRetroSound';
import './FAQ.css';

gsap.registerPlugin(ScrollTrigger);

const faqsByCategory = {
  General: [
    {
      q: 'Who can participate?',
      a: 'PBCTF is open to students, professionals, and cybersecurity enthusiasts of all skill levels. Participants must be at least 18 years old or accompanied by a guardian.',
    },
    {
      q: 'Do I need prior CTF experience?',
      a: 'While prior experience is helpful, it is not mandatory. We offer challenges across multiple difficulty levels, making the competition accessible to beginners while still challenging for veterans.',
    },
    {
      q: 'Will certificates be issued?',
      a: 'Yes. All participants receive a certificate of participation. Winners receive special achievement certificates and trophies.',
    },
  ],
  Teams: [
    {
      q: 'Can I participate individually?',
      a: 'Teams of 2-4 members are required. If you do not have a team, join our Discord community to find teammates before registration closes.',
    },
  ],
  Logistics: [
    {
      q: 'What should I bring?',
      a: 'Bring your laptop, charger, any preferred peripherals, and a valid government-issued ID. All other equipment and resources will be provided at the venue.',
    },
    {
      q: 'Is accommodation provided?',
      a: 'Accommodation is not provided directly, but we have partnered with nearby hotels offering discounted rates for participants. Details will be shared after registration.',
    },
  ],
  Rules: [
    {
      q: 'How are winners selected?',
      a: 'Teams are ranked based on total points earned by solving challenges. In case of a tie, the team that submitted solutions earliest wins.',
    },
    {
      q: 'What is the competition format?',
      a: 'PBCTF is a jeopardy-style CTF with challenges across 8 categories. The competition runs for 24 continuous hours. Teams work together to solve as many challenges as possible.',
    },
  ]
};

const categories = Object.keys(faqsByCategory);

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [openIndex, setOpenIndex] = useState(null);
  const sectionRef = useRef(null);
  const { playHover, playSelect, playWindowOpen, playWindowClose } = useRetroSound();

  useGSAP(() => {
    gsap.from('.faq__gameboy', {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 75%',
        once: true,
      },
    });
  }, { scope: sectionRef });

  const toggle = (index) => {
    setOpenIndex((prev) => {
      if (prev === index) {
        playWindowClose();
        return null;
      }
      playWindowOpen();
      return index;
    });
  };

  const handleCategoryChange = (category) => {
    playSelect();
    setActiveCategory(category);
    setOpenIndex(null); // reset open accordion when switching
  };

  return (
    <section id="faq" className="section faq" ref={sectionRef}>
      <div className="container">
        <h2 className="section__title">Frequently Asked Questions</h2>

        <div className="faq__gameboy-wrapper">
          <div className="faq__gameboy">
            
            {/* Top Section: Screen */}
            <div className="gameboy__top">
              <div className="gameboy__screen-bezel">
                
                <div className="gameboy__screen-header">
                  <div className="gameboy__power-light active"></div>
                  <span className="gameboy__brand">pbctf 5.0</span>
                </div>

                <div className="gameboy__screen">
                  <div className="gameboy__screen-content">
                    <div className="screen__category-title">
                      &gt; DIR: /{activeCategory.toUpperCase()}
                    </div>
                    
                    <div className="faq__list">
                      {faqsByCategory[activeCategory].map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                          <div key={i} className={`faq__item ${isOpen ? 'is-open' : ''}`}>
                            <button
                              className="faq__question"
                              onClick={() => toggle(i)}
                              onMouseEnter={playHover}
                              aria-expanded={isOpen}
                            >
                              <span className="faq__prompt">
                                <span className="faq__prompt-symbol">&gt;</span> {item.q}
                              </span>
                              <motion.span
                                className="faq__chevron"
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                ▼
                              </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  className="faq__answer-wrapper"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="faq__answer">{item.a}</div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle Section: Logo */}
            <div className="gameboy__middle">
              <span className="gameboy__logo">POINT BLANK</span>
            </div>

            {/* Bottom Section: Controls */}
            <div className="gameboy__controls">
              {/* D-Pad (Decorative) */}
              <div className="gameboy__dpad">
                <div className="dpad-vertical"></div>
                <div className="dpad-horizontal"></div>
                <div className="dpad-center"></div>
              </div>

              {/* Action Buttons (Category Selectors) */}
              <div className="gameboy__action-buttons">
                <div className="gameboy__button-row">
                  <div className="action-btn-wrapper">
                    <button 
                      className={`gameboy__btn ${activeCategory === categories[0] ? 'active' : ''}`}
                      onMouseEnter={playHover}
                      onClick={() => handleCategoryChange(categories[0])}
                    >A</button>
                    <span className="gameboy__btn-label">{categories[0]}</span>
                  </div>
                  <div className="action-btn-wrapper btn-raised">
                    <button 
                      className={`gameboy__btn ${activeCategory === categories[1] ? 'active' : ''}`}
                      onMouseEnter={playHover}
                      onClick={() => handleCategoryChange(categories[1])}
                    >B</button>
                    <span className="gameboy__btn-label">{categories[1]}</span>
                  </div>
                </div>
                <div className="gameboy__button-row">
                  <div className="action-btn-wrapper">
                    <button 
                      className={`gameboy__btn ${activeCategory === categories[2] ? 'active' : ''}`}
                      onMouseEnter={playHover}
                      onClick={() => handleCategoryChange(categories[2])}
                    >X</button>
                    <span className="gameboy__btn-label">{categories[2]}</span>
                  </div>
                  <div className="action-btn-wrapper btn-raised">
                    <button 
                      className={`gameboy__btn ${activeCategory === categories[3] ? 'active' : ''}`}
                      onMouseEnter={playHover}
                      onClick={() => handleCategoryChange(categories[3])}
                    >Y</button>
                    <span className="gameboy__btn-label">{categories[3]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Speaker Slits */}
            <div className="gameboy__speaker">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="speaker-slit"></div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
