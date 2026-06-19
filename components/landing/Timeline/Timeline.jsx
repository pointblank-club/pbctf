import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './Timeline.css';

gsap.registerPlugin(ScrollTrigger);

const EVENTS = [
  {
    date: 'June 22, 2026',
    title: 'Registration Opens',
    desc: 'Team registration portal goes live. Form your squad and secure your spot.',
  },
  {
    date: 'July 15, 2026',
    title: 'Registration Closes',
    desc: 'Final deadline for team submissions. Late entries will not be accepted.',
  },
  {
    date: 'July 18, 2026',
    title: 'Shortlisted Teams',
    desc: 'Selected teams will be announced via email and on the official website.',
  },
  {
    date: 'July 22, 2026',
    title: 'Participant Verification',
    desc: 'Identity verification and credential validation for all participants.',
  },
  {
    date: 'July 26, 2026 · 09:00 AM',
    title: 'PBCTF Begins',
    desc: 'The competition kicks off. 24 hours of non-stop hacking begins.',
  },
  {
    date: 'July 27, 2026 · 09:00 AM',
    title: 'PBCTF Ends',
    desc: 'Submissions close. Final scores are calculated and verified.',
  },
  {
    date: 'July 27, 2026 · 06:00 PM',
    title: 'Winner Announcement',
    desc: 'Champions are crowned at the closing ceremony.',
  },
];

export default function Timeline() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const nodesRef = useRef([]);
  const cardsRef = useRef([]);

  useGSAP(() => {
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!track || !progress) return;

    // --- Progress line grows with scroll ---
    gsap.to(progress, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top 70%',
        end: 'bottom 60%',
        scrub: 0.5,
      },
    });

    // --- Nodes: scale + opacity on scroll ---
    nodesRef.current.forEach((node) => {
      if (!node) return;
      gsap.set(node, { scale: 0.5, opacity: 0.3 });

      gsap.to(node, {
        scale: 1,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: node,
          start: 'top 75%',
          end: 'top 55%',
          scrub: 0.5,
          onEnter: () => node.classList.add('timeline__node--active'),
          onLeaveBack: () => node.classList.remove('timeline__node--active'),
        },
      });
    });

    // --- Cards: slide in and highlight on scroll ---
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const isLeft = i % 2 === 0;
      // On mobile (< 768), always slide from right
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const xOffset = isMobile ? 30 : isLeft ? -30 : 30;

      gsap.set(card, { opacity: 0, x: xOffset });

      // Slide in animation
      gsap.to(card, {
        opacity: 1,
        x: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      // Highlight animation when reached by scroll progress
      ScrollTrigger.create({
        trigger: card,
        start: 'top 55%', // Triggers roughly when the dot hits the card
        end: 'bottom 45%', // Optional end point, controls how long it stays highlighted
        toggleClass: {
          targets: card,
          className: 'timeline__device--highlighted',
        },
      });
    });
  }, { scope: sectionRef });

  return (
    <section id="timeline" className="section" ref={sectionRef}>
      <div className="container">
        {/* Header */}
        <div className="timeline__header">
          <h2 className="section__title">Operation Timeline</h2>
        </div>

        {/* Timeline track */}
        <div className="timeline__track" ref={trackRef}>
          {/* Background line */}
          <div className="timeline__line-bg" aria-hidden="true" />
          {/* Animated progress line */}
          <div
            className="timeline__line-progress"
            ref={progressRef}
            aria-hidden="true"
          />

          {/* Events */}
          {EVENTS.map((event, index) => {
            const side = index % 2 === 0 ? 'left' : 'right';
            const isAccent = index === 4; // "PBCTF Begins"

            return (
              <div
                key={index}
                id={`timeline-event-${index}`}
                className={`timeline__event timeline__event--${side}`}
              >
                {/* Node dot */}
                <div
                  className="timeline__node"
                  ref={(el) => (nodesRef.current[index] = el)}
                  aria-hidden="true"
                />

                {/* Hardware Device Chassis */}
                <article
                  className={`timeline__device${isAccent ? ' timeline__device--accent' : ''}`}
                  ref={(el) => (cardsRef.current[index] = el)}
                >
                  <div className="timeline__device-screw timeline__device-screw--tl"></div>
                  <div className="timeline__device-screw timeline__device-screw--tr"></div>
                  <div className="timeline__device-screw timeline__device-screw--bl"></div>
                  <div className="timeline__device-screw timeline__device-screw--br"></div>
                  
                  <div className="timeline__device-led"></div>
                  <div className="timeline__device-brand">NODE_0{index + 1}</div>

                  {/* Inner CRT Screen */}
                  <div className="timeline__screen">
                    <div className="timeline__screen-scanlines"></div>
                    <div className="timeline__screen-content">
                      <time className="timeline__screen-date">
                        <span className="timeline__prompt">[SYS_TIME]:</span> {event.date}
                      </time>
                      <h3 className="timeline__screen-title">
                        <span className="timeline__prompt">&gt;</span> {event.title}
                      </h3>
                      <p className="timeline__screen-desc">{event.desc}</p>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
