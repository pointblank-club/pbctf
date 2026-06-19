import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { GridScan } from '../GridScan/GridScan';
import './AboutPointBlank.css';

gsap.registerPlugin(ScrollTrigger);

export default function AboutPointBlank() {
  const sectionRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useGSAP(() => {
    const content = sectionRef.current.querySelector('.about__content');

    gsap.from(content, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 70%',
        once: true,
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="about" className="section about" ref={sectionRef}>
      <div className="about__bg">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#05120a"
          gridScale={0.1}
          scanColor="#00FF88"
          scanOpacity={0.3}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>
      
      <div className="container about__container">
        <div className="about__content">
          <h2 className="section__title about__title">About <span className="highlight-point">Point</span> Blank</h2>
          <div className="about__text-box">
            {!isVideoPlaying ? (
              <>
                <p>
                  Renowned for conducting top-tier Capture The Flag (CTF) competitions, we bring together the brightest minds to solve complex security challenges, ranging from cryptography and reverse engineering to web exploitation and digital forensics.
                </p>
                <p>
                  Our mission is to foster a culture of continuous learning, hands-on hacking, and collaborative problem-solving. Whether you are a seasoned hacker or a curious beginner, Point Blank provides the perfect environment to sharpen your skills, compete at the highest level, and push the boundaries of cybersecurity.
                </p>
                <button className="about__play-btn--monitor" onClick={() => setIsVideoPlaying(true)} aria-label="Play Video" title="Watch Video">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="about__video-container">
                <button className="about__close-btn" onClick={() => setIsVideoPlaying(false)} aria-label="Close Video">
                  ✕
                </button>
                <div className="about__video-wrapper">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/vhk-l2RFnWQ?autoplay=1&controls=0&modestbranding=1&rel=0&disablekb=1&playsinline=1" 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
