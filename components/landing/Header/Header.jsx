import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetroSound } from '../hooks/useRetroSound';
import './Header.css';

const NAV_LINKS = [
  { id: 'nav-about', label: 'About', href: '#about' },
  { id: 'nav-timeline', label: 'Timeline', href: '#timeline' },
  { id: 'nav-categories', label: 'Categories', href: '#categories' },
  { id: 'nav-prizes', label: 'Prizes', href: '#prizes' },
  { id: 'nav-faq', label: 'FAQ', href: '#faq' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    playHover,
    playClick,
    playNav,
    playWindowOpen,
    playWindowClose,
    toggleMute,
    muted,
  } = useRetroSound();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleMenuToggle = () => {
    setMenuOpen((prev) => {
      if (prev) playWindowClose();
      else playWindowOpen();
      return !prev;
    });
  };

  return (
    <header
      id="site-header"
      className={`header${scrolled ? ' header--scrolled' : ''}${menuOpen ? ' header--menu-open' : ''}`}
    >
      <div className="header__container">
        {/* Logo */}
        <a
          href="#hero"
          className="header__logo"
          id="header-logo"
          onMouseEnter={playHover}
          onClick={playNav}
        >
          <span className="header__logo-text">PBCTF5.0</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              id={link.id}
              href={link.href}
              className="header__link"
              onMouseEnter={playHover}
              onClick={playNav}
            >
              <span className="header__link-brackets">[</span>
              {link.label}
              <span className="header__link-brackets">]</span>
            </a>
          ))}
        </nav>

        {/* Right-side controls */}
        <div className="header__actions">
          {/* Sound toggle */}
          <button
            id="header-sound-toggle"
            className="header__sound-toggle"
            onClick={toggleMute}
            onMouseEnter={playHover}
            aria-label={muted ? 'Unmute interface sounds' : 'Mute interface sounds'}
            aria-pressed={!muted}
            title={muted ? 'Sound off' : 'Sound on'}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            )}
          </button>

          {/* Desktop CTA */}
          <a
            href="/register"
            className="btn btn--primary header__cta"
            id="header-cta"
            onMouseEnter={playHover}
            onClick={playClick}
          >
            Register Now
          </a>

          {/* Mobile Hamburger */}
          <button
            id="header-menu-toggle"
            className={`header__hamburger${menuOpen ? ' header__hamburger--open' : ''}`}
            onClick={handleMenuToggle}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="header__hamburger-line" />
            <span className="header__hamburger-line" />
            <span className="header__hamburger-line" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="header__overlay"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(32px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
          >
            <div className="header__overlay-bg" />
            <div className="header__overlay-content">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.id}
                  href={link.href}
                  className="header__overlay-link"
                  onClick={() => { playNav(); closeMenu(); }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="header__overlay-number">0{i + 1}</span>
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="/register"
                className="btn btn--primary header__overlay-cta"
                onClick={() => { playClick(); closeMenu(); }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + NAV_LINKS.length * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                Register Now
              </motion.a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
