import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './FinalCTA.css';

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTA() {
  const sectionRef = useRef(null);

  useGSAP(() => {
    const headline = sectionRef.current.querySelector('.final-cta__headline');
    const text = sectionRef.current.querySelector('.final-cta__text');
    const actions = sectionRef.current.querySelector('.final-cta__actions');

    gsap.from([headline, text, actions], {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        once: true,
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="register" className="section final-cta" ref={sectionRef}>
      <div className="container">
        <h2 className="final-cta__headline">
          Ready To Enter The Arena?
        </h2>
        <p className="final-cta__text">
          Registrations are now open. Form your team, sharpen your skills, and
          compete against some of the brightest minds in cybersecurity.
        </p>
        <div className="final-cta__actions">
          <a href="/register" className="btn btn--primary" id="cta-register-now">
            Register Now
          </a>

        </div>
      </div>
    </section>
  );
}
