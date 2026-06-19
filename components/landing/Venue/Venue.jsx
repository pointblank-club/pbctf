import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './Venue.css';

gsap.registerPlugin(ScrollTrigger);



export default function Venue() {
  const sectionRef = useRef(null);
  const knobRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [mapZoom, setMapZoom] = useState(15);
  
  const minZoom = 5;
  const maxZoom = 20;

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging || !knobRef.current) return;
      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = e.clientX - centerX;
      const y = e.clientY - centerY;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      
      // Shift so 0 degrees is bottom center
      angle = angle + 90;
      if (angle > 180) angle -= 360; 

      let clampedAngle = Math.max(-135, Math.min(135, angle));
      
      const percentage = (clampedAngle + 135) / 270;
      const newZoom = Math.round(minZoom + percentage * (maxZoom - minZoom));
      if (newZoom !== currentZoom) {
        setCurrentZoom(newZoom);
        setMapZoom(newZoom); // Update the map parallel to dragging
      }
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, currentZoom]);

  const getBarClass = (index) => {
    const tierSize = (maxZoom - minZoom) / 4;
    const requiredZoom = minZoom + tierSize * index;
    return currentZoom >= requiredZoom ? "venue__volume-bar active" : "venue__volume-bar";
  };

  useGSAP(() => {
    const left = sectionRef.current.querySelector('.venue__left');
    const right = sectionRef.current.querySelector('.venue__right');

    gsap.from([left, right], {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        once: true,
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="venue" className="section" ref={sectionRef}>
      <div className="container">
        <header className="venue__header">
          <h2 className="section__title">Mission Location</h2>
        </header>

        <div className="venue__layout">
          {/* Left Column */}
          <div className="venue__card venue__left">
            <div className="venue__image-wrapper">
              <div className="venue__image-overlay"></div>
              <img
                src="/venue/venue.jpg"
                alt="Paytm Bengaluru Office — PBCTF venue"
                loading="lazy"
              />
            </div>

            <div className="venue__info">
              <h3 className="venue__name">Paytm Bengaluru Office</h3>
              <p className="venue__address">
                SJR Prime Corporation Pvt Ltd (The Hub),<br />
                1st floor, Paytm, Sarjapur Main Rd,<br />
                Bellandur, Bengaluru, Karnataka 560103
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="venue__card venue__right">
            <div className="venue__map-wrapper">
              <iframe
                id="venue-map-embed"
                src={`https://maps.google.com/maps?q=Paytm,%20SJR%20Prime%20Corporation%20Pvt%20Ltd%20(The%20Hub),%20Sarjapur%20Main%20Rd,%20Bellandur,%20Bengaluru,%20Karnataka%20560103&t=&z=${mapZoom}&ie=UTF8&iwloc=&output=embed`}
                title="PBCTF Venue Location — Google Maps"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Radio / Comms Module */}
            <div className="venue__radio-module">

              <div className="venue__radio-controls venue__radio-controls--knob">
                <div className="venue__volume-display">
                  {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} className={getBarClass(i)}></span>
                  ))}
                </div>
                <div 
                  className="venue__3d-knob" 
                  ref={knobRef}
                  onPointerDown={() => setIsDragging(true)}
                  style={{ touchAction: 'none' }}
                >
                  <div 
                    className="venue__3d-knob-dial"
                    style={{ transform: `rotate(${-135 + ((currentZoom - minZoom) / (maxZoom - minZoom)) * 270}deg)` }}
                  >
                    <div className="venue__3d-knob-indicator"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
