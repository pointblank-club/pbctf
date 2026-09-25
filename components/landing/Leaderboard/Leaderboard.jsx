import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useRetroSound } from '../hooks/useRetroSound';
import { getTopThree, RANKED_COUNT, BANNED_COUNT } from '@/data/leaderboard';
import Podium from './Podium';
import './Leaderboard.css';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

const TOP_THREE = getTopThree();

export default function Leaderboard() {
  const sectionRef = useRef(null);
  const { playHover, playClick } = useRetroSound();

  useGSAP(() => {
    const ctx = sectionRef.current;
    if (!ctx) return;

    const cards = ctx.querySelectorAll('.lb-podium__card');
    gsap.set(cards, { opacity: 0, y: 40 });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: ctx,
        start: 'top 75%',
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="leaderboard" className="section lb-section" ref={sectionRef}>
      <div className="container">
        <header className="lb-section__header">
          <span className="section__label">Final_Standings</span>
          <h2 className="section__title">Hall of Fame</h2>
          <p className="section__subtitle">
            The dust has settled. Out of {RANKED_COUNT} ranked teams, these
            three claimed the podium.
          </p>
        </header>

        <Podium teams={TOP_THREE} />

        <div className="lb-section__cta">
          <Link
            href="/leaderboard"
            className="btn btn--secondary"
            onMouseEnter={playHover}
            onClick={playClick}
          >
            View Full Scoreboard
            <svg
              className="btn__arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <p className="lb-section__note">
            {BANNED_COUNT} teams were disqualified for rule violations and hold no rank.
          </p>
        </div>
      </div>
    </section>
  );
}
