import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetroSound } from '../hooks/useRetroSound';
import { useAuth } from '@/hooks/use-auth';
import './Header.css';

const NAV_LINKS = [
  { id: 'nav-about', label: 'About', href: '#about' },
  { id: 'nav-timeline', label: 'Timeline', href: '#timeline' },
  { id: 'nav-categories', label: 'Categories', href: '#categories' },
  { id: 'nav-prizes', label: 'Prizes', href: '#prizes' },
  { id: 'nav-faq', label: 'FAQ', href: '#faq' },
];

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
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

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';
  const initials =
    (user?.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';
  const avatarSrc = user?.profile_picture || '';

  const handleLogout = () => {
    playClick();
    logout();
  };

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

          {/* Desktop CTA (logged out) / user controls (logged in) */}
          {isAuthenticated ? (
            <div className="header__user">
              <a
                href="/dashboard/profile"
                className="header__user-tile"
                id="header-profile"
                onMouseEnter={playHover}
                onClick={playClick}
                aria-label="Open profile"
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="header__user-avatar" src={avatarSrc} alt="" />
                ) : (
                  <span className="header__user-avatar header__user-avatar--initials">{initials}</span>
                )}
                <span className="header__user-name">{firstName}</span>
              </a>
              <button
                type="button"
                className="header__logout"
                id="header-logout"
                onMouseEnter={playHover}
                onClick={handleLogout}
                aria-label="Log out"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="header__logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <a
              href="/register"
              className="btn btn--primary header__cta"
              id="header-cta"
              onMouseEnter={playHover}
              onClick={playClick}
            >
              Register Now
            </a>
          )}

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
                href={isAuthenticated ? '/dashboard' : '/register'}
                className="btn btn--primary header__overlay-cta"
                onClick={() => { playClick(); closeMenu(); }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + NAV_LINKS.length * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {isAuthenticated ? 'Access Granted' : 'Register Now'}
              </motion.a>
              {isAuthenticated && (
                <motion.button
                  type="button"
                  className="header__overlay-logout"
                  onClick={() => { handleLogout(); closeMenu(); }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (NAV_LINKS.length + 1) * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  Logout
                </motion.button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
