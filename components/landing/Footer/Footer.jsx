import './Footer.css';

/* Minimal inline SVG icons — 24×24, stroke-only */
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l6.5 8L4 20" />
    <path d="M20 4l-6.5 8L20 20" />
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 8C7.5 8 5 9 4 10c0 3 .5 6 2 8l2.5-1.5c1 .5 2 .5 3.5.5s2.5 0 3.5-.5L18 18c1.5-2 2-5 2-8-1-1-3.5-2-5.5-2" />
    <circle cx="9.5" cy="13.5" r="1" />
    <circle cx="14.5" cy="13.5" r="1" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 11v5" />
    <path d="M8 8v.01" />
    <path d="M12 16v-5c0-1 1-2 2-2s2 1 2 2v5" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 21c0-3 0-4 1-5-2-.5-4-1.5-4-5 0-1.2.5-2 1-2.7-.1-.3-.5-1.3.1-2.7 0 0 1-.3 3 1a10.5 10.5 0 015.6 0c2-1.3 3-1 3-1 .6 1.4.2 2.4.1 2.7.5.7 1 1.5 1 2.7 0 3.5-2 4.5-4 5 .7.7 1 1.7 1 3v3" />
  </svg>
);

const InstaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const SOCIALS = [
  { id: 'social-linkedin', label: 'LinkedIn', href: 'https://linkedin.com/company/pointblank-club', icon: <LinkedInIcon /> },
  { id: 'social-twitter', label: 'Twitter / X', href: 'https://x.com/pointblank_club', icon: <TwitterIcon /> },
  { id: 'social-insta', label: 'Instagram', href: 'https://instagram.com/pointblank_club_', icon: <InstaIcon /> },
];

export default function Footer() {
  return (
    <footer id="footer" className="footer">
      <div className="footer__bottom-content">
        <div className="footer__left">
          <a href="https://www.pointblank.club" target="_blank" rel="noopener noreferrer">
            <img src="/pb.png" alt="Point Blank Logo" className="footer__pb-logo" />
          </a>
          
          <div className="footer__legal-links">
            <a href="https://www.pointblank.club/events" className="footer__legal-link" target="_blank" rel="noopener noreferrer">Events</a>
          </div>
        </div>
        
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} PBCTF. All rights reserved.
        </p>

        <div className="footer__social-row">
          {SOCIALS.map((s) => (
            <a
              key={s.id}
              id={s.id}
              href={s.href}
              className="footer__social-icon"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
