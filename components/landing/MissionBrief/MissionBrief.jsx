import { useRef, useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './MissionBrief.css';

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
   FlappyBird — canvas game rendered inside the monitor screen
   --------------------------------------------------------------- */
function FlappyBird({ onExit }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- Game constants — balanced normal pace ---
    const W = canvas.width;
    const H = canvas.height;
    const BASE_GRAVITY = 0.20;       // natural feel
    const BASE_JUMP = -5.0;          // satisfying hop
    const PIPE_W = 34;
    const BASE_PIPE_GAP = 150;       // comfortable gap
    const BASE_PIPE_SPEED = 1.0;     // steady pace
    const BASE_PIPE_INTERVAL = 160;  // balanced spacing

    // Progressive difficulty — ramps gently up to score 25
    function getGravity()      { return BASE_GRAVITY + Math.min(score, 25) * 0.004; }
    function getJump()         { return BASE_JUMP    - Math.min(score, 25) * 0.025; }
    function getPipeSpeed()    { return BASE_PIPE_SPEED + Math.min(score, 25) * 0.04; }
    function getPipeGap()      { return Math.max(110, BASE_PIPE_GAP - Math.min(score, 20) * 2); }
    function getPipeInterval() { return Math.max(120, BASE_PIPE_INTERVAL - Math.min(score, 25) * 1.5); }

    // --- Frame-rate cap: run logic at 70 fps ---
    const TARGET_FPS = 70;
    const FRAME_MS   = 1000 / TARGET_FPS;
    let lastTime = 0;

    // --- Game state ---
    let bird = { x: W * 0.22, y: H / 2, vy: 0, size: 12 };
    let pipes = [];
    let frame = 0;
    let score = 0;
    let best = parseInt(localStorage.getItem('flappy_best') || '0');
    let state = 'idle'; // idle | playing | dead
    let raf;

    function resetBird() {
      bird = { x: W * 0.22, y: H / 2, vy: 0, size: 12 };
    }

    function spawnPipe() {
      const gap = getPipeGap();
      const topH = 50 + Math.random() * (H - gap - 100);
      pipes.push({ x: W, topH, gap, passed: false });
    }

    function jump() {
      if (state === 'idle') {
        state = 'playing';
        bird.vy = getJump();
      } else if (state === 'playing') {
        bird.vy = getJump();
      } else if (state === 'dead') {
        pipes = [];
        frame = 0;
        score = 0;
        resetBird();
        state = 'playing';
      }
    }

    function drawBg() {
      // Dark terminal background
      ctx.fillStyle = '#010603';
      ctx.fillRect(0, 0, W, H);

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 2);
      }

      // Subtle green glow center
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      g.addColorStop(0, 'rgba(0,255,136,0.04)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawBird() {
      const { x, y, size, vy } = bird;
      const angle = Math.max(-0.4, Math.min(0.6, vy * 0.07));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Body
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00ff88';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eye
      ctx.beginPath();
      ctx.arc(size * 0.45, -size * 0.2, size * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Pupil glint
      ctx.beginPath();
      ctx.arc(size * 0.5, -size * 0.25, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Beak
      ctx.beginPath();
      ctx.moveTo(size * 0.55, size * 0.1);
      ctx.lineTo(size + 4, size * 0.25);
      ctx.lineTo(size * 0.55, size * 0.4);
      ctx.closePath();
      ctx.fillStyle = '#00cc66';
      ctx.fill();

      // Wing flap
      const flapOffset = Math.sin(frame * 0.25) * 3;
      ctx.beginPath();
      ctx.ellipse(-size * 0.1, size * 0.3 + flapOffset, size * 0.55, size * 0.28, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,200,100,0.55)';
      ctx.fill();

      ctx.restore();
    }

    function drawPipes() {
      pipes.forEach(p => {
        const gap = p.gap || BASE_PIPE_GAP;
        // Top pipe
        const grad1 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad1.addColorStop(0, '#1a4a2e');
        grad1.addColorStop(0.4, '#2d7a4a');
        grad1.addColorStop(1, '#0d2216');
        ctx.fillStyle = grad1;
        ctx.strokeStyle = 'rgba(0,255,136,0.25)';
        ctx.lineWidth = 1;
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.strokeRect(p.x, 0, PIPE_W, p.topH);

        // Top pipe cap
        ctx.fillStyle = '#2d7a4a';
        ctx.fillRect(p.x - 4, p.topH - 16, PIPE_W + 8, 16);
        ctx.strokeRect(p.x - 4, p.topH - 16, PIPE_W + 8, 16);

        // Bottom pipe
        const botY = p.topH + gap;
        const grad2 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad2.addColorStop(0, '#1a4a2e');
        grad2.addColorStop(0.4, '#2d7a4a');
        grad2.addColorStop(1, '#0d2216');
        ctx.fillStyle = grad2;
        ctx.fillRect(p.x, botY, PIPE_W, H - botY);
        ctx.strokeRect(p.x, botY, PIPE_W, H - botY);

        // Bottom pipe cap
        ctx.fillStyle = '#2d7a4a';
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 16);
        ctx.strokeRect(p.x - 4, botY, PIPE_W + 8, 16);
      });
    }

    function drawScore() {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff88';
      ctx.textAlign = 'center';
      ctx.fillText(score, W / 2, 40);
      ctx.shadowBlur = 0;

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(0,255,136,0.4)';
      ctx.fillText(`BEST: ${best}`, W / 2, 56);
    }

    function drawIdle() {
      drawBg();
      drawBird();
      drawScore();

      ctx.textAlign = 'center';
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff88';
      ctx.fillText('FLAPPY BIRD', W / 2, H / 2 - 28);
      ctx.shadowBlur = 0;

      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(0,255,136,0.7)';
      ctx.fillText('[ CLICK / SPACE to start ]', W / 2, H / 2);

      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(0,255,136,0.35)';
      ctx.fillText('click screen or press SPACE to flap', W / 2, H / 2 + 20);
    }

    function drawDead() {
      drawBg();
      drawPipes();
      drawBird();

      // Dim overlay
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ff4466';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff4466';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 36);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 - 10);
      ctx.fillText(`BEST:  ${best}`, W / 2, H / 2 + 12);

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(0,255,136,0.6)';
      ctx.fillText('[ click / SPACE to retry ]', W / 2, H / 2 + 38);
    }

    function checkCollision() {
      const bx = bird.x, by = bird.y, bs = bird.size * 0.78;
      if (by - bs <= 0 || by + bs >= H) return true;
      for (const p of pipes) {
        const px = p.x, pw = PIPE_W;
        const gap = p.gap || BASE_PIPE_GAP;
        const topBot = p.topH;
        const botTop = p.topH + gap;
        if (bx + bs > px - 4 && bx - bs < px + pw + 4) {
          if (by - bs < topBot || by + bs > botTop) return true;
        }
      }
      return false;
    }

    function tick(timestamp) {
      raf = requestAnimationFrame(tick);

      // ----- Throttle to TARGET_FPS -----
      const elapsed = timestamp - lastTime;
      if (elapsed < FRAME_MS) return; // not yet time for next logic tick
      lastTime = timestamp - (elapsed % FRAME_MS);

      if (state === 'idle') {
        bird.y = H / 2 + Math.sin(frame * 0.04) * 10;
        frame++;
        drawIdle();
        return;
      }

      if (state === 'dead') {
        drawDead();
        return;
      }

      // playing
      bird.vy += getGravity();
      bird.y  += bird.vy;
      frame++;

      // Pipes
      if (frame % Math.round(getPipeInterval()) === 0) spawnPipe();
      const spd = getPipeSpeed();
      pipes.forEach(p => { p.x -= spd; });
      pipes = pipes.filter(p => p.x + PIPE_W > 0);

      // Score
      pipes.forEach(p => {
        if (!p.passed && p.x + PIPE_W < bird.x) {
          p.passed = true;
          score++;
          if (score > best) {
            best = score;
            localStorage.setItem('flappy_best', best);
          }
        }
      });

      if (checkCollision()) state = 'dead';

      drawBg();
      drawPipes();
      drawBird();
      drawScore();
    }

    // Input
    function handleInput() { jump(); }
    function handleKey(e) { if (e.code === 'Space') { e.preventDefault(); jump(); } }

    canvas.addEventListener('click', handleInput);
    window.addEventListener('keydown', handleKey);

    raf = requestAnimationFrame(tick);
    gameRef.current = { cancel: () => cancelAnimationFrame(raf) };

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', handleInput);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className="flappy-wrapper">
      <canvas
        ref={canvasRef}
        width={480}
        height={300}
        className="flappy-canvas"
      />
      <button className="flappy-exit-btn" onClick={onExit} title="Exit game">
        ✕ EXIT
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   MissionBrief — main component
   --------------------------------------------------------------- */
export default function MissionBrief() {
  const sectionRef = useRef(null);
  const [isOn, setIsOn] = useState(false);
  const [gameMode, setGameMode] = useState(false);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    const paragraphs = section.querySelectorAll('.mission-brief__paragraph');
    const computer = section.querySelector('.retro-computer');
    const prompts = section.querySelectorAll('.terminal-prompt');

    gsap.set(paragraphs, { opacity: 0, x: -10 });
    gsap.set(prompts, { opacity: 0 });
    gsap.set(computer, { opacity: 0, y: 50, scale: 0.95 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none none',
      }
    });

    tl.to(computer, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: 'power3.out',
      onStart: () => setIsOn(true),
    })
    .to(prompts[0], { opacity: 1, duration: 0.3 })
    .to(paragraphs, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.2,
      ease: 'power2.out',
    })
    .to(prompts[1], { opacity: 1, duration: 0.3 });

  }, { scope: sectionRef });

  function handleGameBtn() {
    if (!isOn) setIsOn(true);
    setGameMode(g => !g);
  }

  return (
    <section id="about" className="section" ref={sectionRef}>
      <div className="container">

        <header className="mission-brief__header">
          <h2 className="section__title">Mission Briefing</h2>
        </header>

        <div className="mission-brief__layout-terminal">
          {/* Retro Computer Terminal */}
          <div className="retro-computer">
            {/* Monitor Chassis Bezel */}
            <div className="retro-computer__monitor">
              <div className="retro-computer__screen-bezel">
                <div className={`retro-computer__screen ${isOn ? 'retro-computer__screen--on' : 'retro-computer__screen--off'}`}>
                  {/* CRT effects */}
                  <div className="crt-overlay" />
                  <div className="crt-glow" />

                  {/* ── GAME OVERLAY (absolute, doesn't affect layout) ── */}
                  {gameMode && isOn && (
                    <FlappyBird onExit={() => setGameMode(false)} />
                  )}

                  {/* ── TERMINAL CONTENT (always rendered — drives screen height) ── */}
                  <div className="terminal-header">
                    <div className="terminal-dots">
                      <span className="dot dot-close" />
                      <span className="dot dot-min" />
                      <span className="dot dot-max" />
                    </div>
                    <span className="terminal-title">guest@pbctf:~/mission_brief</span>
                  </div>

                  <div className="terminal-body">
                    <div className="terminal-prompt">$ cat brief.txt</div>
                    <div className="mission-brief__content">
                      <p id="mission-brief-paragraph-1" className="mission-brief__paragraph">
                        PBCTF is a Capture The Flag event that brings together hackers, security enthusiasts, and students. We built this competition for both veterans and newcomers to test their abilities across offensive and defensive security.
                      </p>
                      <p id="mission-brief-paragraph-2" className="mission-brief__paragraph">
                        You'll face challenges drawn straight from real-world vulnerabilities, covering everything from web exploitation and binary analysis to cryptography and miscellaneous challenges. These aren't just textbook exercises, but actual problems you might encounter in the wild.
                      </p>
                      <p id="mission-brief-paragraph-3" className="mission-brief__paragraph">
                        If you want to sharpen your technical skills, meet folks in the industry, or just have fun breaking things, PBCTF is the place to do it.
                      </p>
                    </div>
                    <div className="terminal-prompt terminal-prompt--footer">
                      $ <span className="terminal-cursor">_</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="retro-computer__bezel-controls">
                <div className="brand-label">Point Blank</div>

                <div className="power-control-panel">
                  {/* ── GAME BUTTON ── */}
                  <div
                    className={`retro-switch-round retro-switch-game ${gameMode ? 'retro-switch-game--active' : ''}`}
                    onClick={handleGameBtn}
                    role="button"
                    aria-label="Launch Flappy Bird Game"
                    title="Play Flappy Bird"
                  >
                    <div className="retro-switch-round__btn">
                      <span className="retro-switch-game__dot" />
                    </div>
                  </div>

                  {/* ── POWER BUTTON ── */}
                  <div
                    className={`retro-switch-round ${isOn ? 'retro-switch-round--on' : 'retro-switch-round--off'}`}
                    onClick={() => { setIsOn(!isOn); if (isOn) setGameMode(false); }}
                    role="button"
                    aria-label="Power Switch"
                  >
                    <div className="retro-switch-round__btn">
                      <span className="retro-switch-round__icon">⏻</span>
                    </div>
                  </div>

                  <div className={`power-indicator ${isOn ? 'power-indicator--on' : 'power-indicator--off'}`}>
                    <span className="power-led" />
                    <span className="power-label">POWER</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stand */}
            <div className="retro-computer__stand">
              <div className="retro-computer__neck" />
              <div className="retro-computer__base" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
