import { useEffect, useState, useRef, useCallback } from "react";
import profile from "./assets/tejas-profile.png";
import {
  github,
  projects,
  skillCategories,
  skillsData,
  aboutBlocks,
  journeyPhases,
  labExperiments,
  roadmap,
  stats
} from "./data";

/* ---- Cursor Glow ---- */
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + "px";
        ref.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return <div className="cursor-glow" ref={ref} />;
}

/* ---- Floating Particles ---- */
function Particles() {
  const particles = useRef(
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 25,
      duration: 18 + Math.random() * 30,
      size: 1 + Math.random() * 2,
      opacity: 0.08 + Math.random() * 0.2,
    }))
  ).current;

  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ---- Preloader ---- */
function Preloader() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (sessionStorage.getItem("tejas-intro") === "1") {
      setShow(false);
      return;
    }
    sessionStorage.setItem("tejas-intro", "1");
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="preloader">
      <div className="preloader-name">
        TEJAS <span>2.0</span>
      </div>
      <div className="loader-line"><i /></div>
      <small>ENGINEERING THE FUTURE</small>
    </div>
  );
}

/* ---- Navigation ---- */
function Nav() {
  const [open, setOpen] = useState(false);
  const items = [
    ["ABOUT", "about"],
    ["SKILLS", "skills"],
    ["PROJECTS", "projects"],
    ["JOURNEY", "journey"],
    ["ROADMAP", "roadmap"],
    ["CONTACT", "contact"],
  ];
  return (
    <header className="nav">
      <a href="#top" className="brand">
        TB <span>/ 2.0</span>
      </a>
      <nav className={open ? "nav-links open" : "nav-links"}>
        {items.map(([label, id]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
      <div className="build-status">
        <b /> CURRENTLY BUILDING
      </div>
      <button
        className="menu"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? "✕" : "☰"}
      </button>
    </header>
  );
}

/* ---- Reveal on Scroll ---- */
function Reveal({ children, className = "", id }) {
  return (
    <section className={`reveal ${className}`} id={id}>
      {children}
    </section>
  );
}

/* ---- Animated Counter ---- */
function Counter({ end }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1400;
          const startTime = performance.now();
          function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{String(count).padStart(2, "0")}</span>;
}

/* ---- Project Card Component ---- */
function ProjectCard({ p }) {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-8px) scale(1.01) perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = "";
    }
  }, []);

  return (
    <article
      className={`project-card ${p.tone}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="project-visual">
        <div className="project-code">{p.number}</div>
        <div className="visual-symbol">{p.symbol}</div>
        <span className="scan" />
      </div>
      <div className="project-body">
        <div className="project-meta">
          <span>{p.kicker}</span>
          <b>{p.status}</b>
        </div>
        <h3>{p.title}</h3>
        {p.subtitle && <span className="project-subtitle">{p.subtitle}</span>}
        <p>{p.description}</p>

        {p.capabilities && (
          <ul className="project-capabilities">
            {p.capabilities.map((cap) => (
              <li key={cap}>{cap}</li>
            ))}
          </ul>
        )}

        <div className="tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="project-actions">
          {p.repo && (
            <a
              href={p.repo}
              target="_blank"
              rel="noreferrer"
              className="btn-repo"
            >
              VIEW REPOSITORY ↗
            </a>
          )}
          {p.demo && (
            <a
              href={p.demo}
              target="_blank"
              rel="noreferrer"
              className="btn-demo"
            >
              LIVE DEMO ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---- Main App ---- */
export default function App() {
  const [selectedSkillCategory, setSelectedSkillCategory] = useState("all");

  useEffect(() => {
    /* scroll progress bar */
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty(
        "--scroll",
        `${max ? (scrollY / max) * 100 : 0}`
      );
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* intersection observer for reveals */
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            if (e.target.classList.contains("timeline")) {
              e.target.classList.add("animated");
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    document
      .querySelectorAll(
        ".reveal, .timeline-item, .roadmap-item, .timeline, .journey-phase-card"
      )
      .forEach((el) => obs.observe(el));

    return () => {
      removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  const filteredSkills =
    selectedSkillCategory === "all"
      ? skillsData
      : skillsData.filter((s) => s.category === selectedSkillCategory);

  return (
    <>
      <Preloader />
      <CursorGlow />
      <Particles />
      <div className="progress-bar" />
      <Nav />

      <main id="top">
        {/* ---- Hero Section (Exact Master Reference Screenshot 1) ---- */}
        <section className="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow">
              ECE · SOFTWARE · AI · EMBEDDED · ENTREPRENEURSHIP
            </div>
            <p className="hero-kicker">MAHARASHTRA, INDIA · 2026</p>
            <h1>
              ENGINEERING
              <br />
              THE FUTURE,
              <br />
              <em>ONE BUILD</em>
              <br />
              AT A TIME.
            </h1>
            <p className="hero-desc">
              Second-year ECE student turning curiosity into code, circuits, AI
              experiments and useful product ideas.
            </p>
            <div className="actions">
              <a className="btn primary" href="#projects">
                EXPLORE MY WORK ↓
              </a>
              <a
                className="btn ghost"
                href={github}
                target="_blank"
                rel="noreferrer"
              >
                GITHUB ↗
              </a>
            </div>
          </div>
          <div className="hero-photo-wrap">
            <img src={profile} className="hero-photo" alt="Tejas Rajesh Bargat" />
            <div className="photo-label">TEJAS / 01</div>
          </div>
          <div className="hero-bottom">
            <span>SCROLL TO EXPLORE</span>
            <span>02 / ECE · TGPCET</span>
          </div>
        </section>

        {/* ---- About Section ---- */}
        <Reveal id="about" className="about section">
          <div className="section-no">01 / THE BUILDER</div>
          <div className="two-col">
            <h2>
              NOT JUST LEARNING TECHNOLOGY.
              <br />
              <span>BUILDING WITH IT.</span>
            </h2>
            <div>
              <p>
                I'm Tejas Rajesh Bargat, a second-year Electronics and
                Communication Engineering student interested in connecting
                hardware, software and artificial intelligence.
              </p>
              <p>
                I enjoy understanding how systems work, experimenting with new
                technologies, developing software and building practical
                engineering projects.
              </p>
              <p>
                My journey combines electronics, programming, embedded systems,
                AI, automation and entrepreneurship. I believe engineering is
                not just about understanding technology. It's about using it to
                solve meaningful problems.
              </p>
              <div className="facts">
                <span>ECE · YEAR 02 · TGPCET</span>
                <span>MAHARASHTRA, INDIA</span>
                <span>GATE 2028 ASPIRANT</span>
                <span>BUILDING IN PUBLIC</span>
              </div>
            </div>
          </div>

          {/* 4 Editorial Information Blocks */}
          <div className="about-blocks-grid">
            {aboutBlocks.map((b) => (
              <div className="about-block-card" key={b.code}>
                <span className="about-block-code">{b.code} — {b.title}</span>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ---- Stats Row ---- */}
        <div className="stats-row reveal">
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-value">
                <Counter end={s.value} />
              </div>
              <span className="stat-label">{s.label}</span>
              <span className="stat-detail">{s.detail}</span>
            </div>
          ))}
        </div>

        {/* ---- Technical Skills Section ---- */}
        <Reveal id="skills" className="section">
          <div className="section-no">02 / CAPABILITY MAP</div>
          <h2>
            THE TOOLS <span>BEHIND THE BUILDS.</span>
          </h2>
          <p className="muted">
            Organized into learning areas and developing skills across the
            engineering stack—focusing on practical application, active builds,
            and honest progress.
          </p>

          {/* Category Filter Tabs */}
          <div className="skills-filter">
            {skillCategories.map((cat) => (
              <button
                key={cat.id}
                className={selectedSkillCategory === cat.id ? "active" : ""}
                onClick={() => setSelectedSkillCategory(cat.id)}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Technical Skills Cards Grid */}
          <div className="skills-cards-grid">
            {filteredSkills.map((s) => (
              <div className="skill-card" key={s.name}>
                <div className="skill-card-top">
                  <h3>{s.name}</h3>
                  <span className="skill-badge">{s.status}</span>
                </div>
                <p>{s.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ---- Featured Projects Section ---- */}
        <Reveal id="projects" className="section projects">
          <div className="section-no">03 / FEATURED WORK</div>
          <h2>
            IDEAS INTO <span>ENGINEERED SYSTEMS.</span>
          </h2>
          <p className="muted">
            Physical hardware prototypes, AI assistant concepts, campus
            management systems, and disciplined public code logs built to solve
            real friction.
          </p>
          <div className="project-grid">
            {projects.map((p) => (
              <ProjectCard p={p} key={p.id} />
            ))}
          </div>
        </Reveal>

        {/* ---- Build Journey Section ---- */}
        <Reveal id="journey" className="section journey">
          <div className="section-no">04 / BUILD JOURNEY</div>
          <div className="two-col">
            <div>
              <div className="eyebrow">CHRONOLOGICAL DEVELOPMENT TIMELINE</div>
              <h2>
                EVERY BUILD <span>HAS A STORY.</span>
              </h2>
              <p className="muted">
                An evolving journey from first-principles circuit theory and
                electronics to embedded firmware, terminal workflows, and
                intelligent software architectures.
              </p>
              <a
                className="text-link"
                href={github}
                target="_blank"
                rel="noreferrer"
              >
                EXPLORE ALL REPOSITORIES ON GITHUB ↗
              </a>
            </div>
            <div className="journey-phases-list">
              {journeyPhases.map((phase) => (
                <div className="journey-phase-card" key={phase.phase}>
                  <div className="journey-phase-header">
                    <strong>{phase.phase} — {phase.title}</strong>
                    <span className="journey-phase-status">{phase.status}</span>
                  </div>
                  <h3>{phase.title}</h3>
                  <span className="journey-subtitle">{phase.subtitle}</span>
                  <p>{phase.description}</p>
                  <div className="journey-phase-points">
                    {phase.points.map((pt) => (
                      <span key={pt}>{pt}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ---- Engineering Lab Section ---- */}
        <Reveal id="lab" className="section lab">
          <div className="section-no">05 / ENGINEERING LAB</div>
          <h2>
            EXPERIMENT. TEST. <span>BUILD. REPEAT.</span>
          </h2>
          <p className="muted">
            Hardware breadboards, microcontroller tests, and computational
            experiments where logic meets physical consequence.
          </p>
          <div className="lab-grid">
            {labExperiments.map((exp) => (
              <article key={exp.code}>
                <div className="lab-card-top">
                  <small>{exp.code} · {exp.tag}</small>
                  <span
                    className={`lab-card-status ${
                      exp.status === "ACTIVE"
                        ? "lab-status-active"
                        : exp.status === "PROTOTYPED"
                        ? "lab-status-prototyped"
                        : exp.status === "IN PROGRESS"
                        ? "lab-status-in-progress"
                        : "lab-status-planned"
                    }`}
                  >
                    {exp.status}
                  </span>
                </div>
                <h3>{exp.title}</h3>
                <p>{exp.desc}</p>
              </article>
            ))}
          </div>
        </Reveal>

        {/* ---- Career Roadmap Section ---- */}
        <Reveal id="roadmap" className="section roadmap">
          <div className="section-no">06 / CAREER ROADMAP</div>
          <h2>
            2026 → <span>2028+</span>
          </h2>
          <div className="roadmap-list">
            {roadmap.map((item) => (
              <article className="roadmap-item" key={item.year}>
                <strong>{item.year}</strong>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        {/* ---- GitHub Proof of Work ---- */}
        <Reveal className="section github-panel">
          <div className="section-no">07 / PROOF OF WORK</div>
          <div className="github-box">
            <div>
              <span className="live-dot" /> GITHUB / ACTIVE LEARNING
            </div>
            <h2>
              THE WORK IS <span>IN PROGRESS.</span>
            </h2>
            <p>
              Follow the code, experiments and learning journey instead of
              taking a polished headline on faith. Every line committed in
              public.
            </p>
            <a
              className="btn primary"
              href={github}
              target="_blank"
              rel="noreferrer"
            >
              OPEN GITHUB ↗
            </a>
          </div>
        </Reveal>

        {/* ---- Footer / Contact ---- */}
        <footer id="contact" className="footer">
          <div className="section-no">08 / CONTACT</div>
          <h2>
            LET'S BUILD THE
            <br />
            <span>NEXT USEFUL THING.</span>
          </h2>
          <div className="actions">
            <a
              className="btn primary"
              href={github}
              target="_blank"
              rel="noreferrer"
            >
              GITHUB ↗
            </a>
            <button className="btn ghost" disabled>
              RESUME · COMING SOON
            </button>
          </div>
          <div className="footer-meta">
            <span>MAHARASHTRA, INDIA</span>
            <span>ECE STUDENT · DEVELOPER · BUILDER</span>
            <a href="#top">BACK TO TOP ↑</a>
          </div>
        </footer>
      </main>
    </>
  );
}
