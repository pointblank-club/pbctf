"use client";

import { useState, useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollProgress } from "./hooks/useScrollProgress";
import Loader from "./Loader/Loader";
import Header from "./Header/Header";
import Hero from "./Hero/Hero";
import MissionBrief from "./MissionBrief/MissionBrief";
import Timeline from "./Timeline/Timeline";
import Categories from "./Categories/Categories";
import Prizes from "./Prizes/Prizes";
import AboutPointBlank from "./AboutPointBlank/AboutPointBlank";
import Venue from "./Venue/Venue";
import FAQ from "./FAQ/FAQ";
import Sponsors from "./Sponsors/Sponsors";
import FinalCTA from "./FinalCTA/FinalCTA";
import Footer from "./Footer/Footer";
import StarsBackground from "./StarsBackground/StarsBackground";
import "./landing.css";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  useScrollProgress();
  const [loading, setLoading] = useState(() => {
    return !sessionStorage.getItem("pbctf_loader_seen");
  });

  useEffect(() => {
    // Late-loading content (images, fonts) shifts layout after the triggers
    // are created; refresh repeatedly so reveal animations fire at the right
    // scroll positions instead of popping in late.
    const refresh = () => ScrollTrigger.refresh();
    const timers = [
      setTimeout(refresh, 300),
      setTimeout(refresh, 900),
      setTimeout(refresh, 1800),
    ];
    window.addEventListener("load", refresh);
    document.fonts?.ready?.then(refresh);

    // Handle hash navigation for smooth scroll
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!link) return;
      const targetId = link.getAttribute("href")!.slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", refresh);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="pbctf-landing">
      <MotionConfig reducedMotion="user">
        {/* Space Theme Background */}
        <StarsBackground />

        {/* Cyberpunk overlays */}
        <div className="scanlines" />

        {/* Glitch Loading Screen */}
        {loading && (
          <Loader
            onComplete={() => {
              setLoading(false);
              sessionStorage.setItem("pbctf_loader_seen", "true");
            }}
          />
        )}

        {/* Fixed header */}
        <Header />

        {/* Scrollable content */}
        <main style={{ position: "relative", zIndex: 1 }}>
          <Hero />
          <MissionBrief />
          <Timeline />
          <Categories />
          <Prizes />
          <Sponsors />
          <AboutPointBlank />
          <Venue />
          <FAQ />
          <FinalCTA />
        </main>

        <Footer />
      </MotionConfig>
    </div>
  );
}
