(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const themeButton = document.querySelector('.theme-toggle');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const menu = document.querySelector('.nav-links');
  const progressBar = document.querySelector('.scroll-progress span');
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const internalAnchors = [...document.querySelectorAll('a[href^="#"]')];
  const sections = [...document.querySelectorAll('main section[id]')];
  const revealItems = [...document.querySelectorAll('.reveal, .skill-card')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobilePerformanceMode = window.matchMedia('(max-width: 900px), (hover: none), (pointer: coarse)');

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Keep in sync with --theme-fade-in / --theme-fade-out in styles.css.
  const THEME_FADE_IN_MS = 120;
  const THEME_FADE_OUT_MS = 180;
  const THEME_BG = { dark: '#0b1020', light: '#e9eef5' };

  // Overlay used to mask the theme swap. Created once, lazily, and
  // only when an animated swap actually happens.
  let themeFade = null;
  const getThemeFade = () => {
    if (!themeFade) {
      themeFade = document.createElement('div');
      themeFade.className = 'theme-fade';
      themeFade.setAttribute('aria-hidden', 'true');
      document.body.appendChild(themeFade);
    }
    return themeFade;
  };

  let themeFadeTimers = [];
  const clearThemeFadeTimers = () => {
    themeFadeTimers.forEach(window.clearTimeout);
    themeFadeTimers = [];
  };

  const setThemeAttributes = nextTheme => {
    const isDark = nextTheme === 'dark';
    root.dataset.theme = nextTheme;
    themeButton?.setAttribute('aria-pressed', String(isDark));
    themeButton?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton?.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeColorMeta?.setAttribute('content', THEME_BG[nextTheme]);
  };

  const applyTheme = (theme, { persist = false, animate = false } = {}) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';

    if (persist) {
      try { localStorage.setItem('portfolio-theme', nextTheme); } catch (_) {}
    }

    if (!animate || reducedMotion) {
      setThemeAttributes(nextTheme);
      return;
    }

    // Re-entrant clicks: drop any in-flight sequence and start clean
    // from whatever opacity the overlay currently has.
    clearThemeFadeTimers();

    const fade = getThemeFade();
    // Paint the mask in the INCOMING theme's base colour, so the fade
    // reads as the page becoming the new theme rather than as a flash
    // of the old one.
    fade.style.backgroundColor = THEME_BG[nextTheme];

    root.classList.add('theme-transitioning');
    // Flush so the transition rules and starting opacity are committed
    // before .is-masking is added -- otherwise the browser may collapse
    // both into one style resolution and skip the fade entirely.
    void fade.offsetWidth;

    fade.style.transitionDuration = `${THEME_FADE_IN_MS}ms`;
    fade.classList.add('is-masking');

    // At full mask, swap the theme unseen, then reveal.
    themeFadeTimers.push(window.setTimeout(() => {
      setThemeAttributes(nextTheme);
      fade.style.transitionDuration = `${THEME_FADE_OUT_MS}ms`;
      // Let the swapped colours paint under the mask for one frame
      // before starting the reveal.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fade.classList.remove('is-masking'));
      });
    }, THEME_FADE_IN_MS));

    themeFadeTimers.push(window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
      fade.style.transitionDuration = '';
    }, THEME_FADE_IN_MS + THEME_FADE_OUT_MS + 50));
  };

  applyTheme(root.dataset.theme || 'light');
  themeButton?.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', { persist: true, animate: true });
  });
  window.addEventListener('storage', event => {
    if (event.key === 'portfolio-theme') applyTheme(event.newValue === 'dark' ? 'dark' : 'light', { animate: true });
  });

  const releaseDecorativeMotion = () => root.classList.remove('motion-pending');
  if (reducedMotion || mobilePerformanceMode.matches) {
    releaseDecorativeMotion();
  } else {
    window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(releaseDecorativeMotion, { timeout: 350 });
      } else {
        releaseDecorativeMotion();
      }
    }, 650);
  }


  const backdrop = document.querySelector('.nav-backdrop');
  let lastFocusedBeforeMenu = null;

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!menu || !menuButton) return;
    menu.classList.remove('open');
    body.classList.remove('menu-open');
    menuButton.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menu.setAttribute('aria-hidden', window.innerWidth <= 900 ? 'true' : 'false');
    menu.inert = window.innerWidth <= 900;
    if (restoreFocus && lastFocusedBeforeMenu instanceof HTMLElement) lastFocusedBeforeMenu.focus();
  };

  const openMenu = () => {
    if (!menu || !menuButton) return;
    lastFocusedBeforeMenu = document.activeElement;
    menu.classList.add('open');
    body.classList.add('menu-open');
    menuButton.classList.add('open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close navigation');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    requestAnimationFrame(() => menu.querySelector('a')?.focus({ preventScroll: true }));
  };

  const syncMobileMenuState = () => {
    if (!menu) return;
    if (window.innerWidth > 900) {
      closeMenu();
      menu.setAttribute('aria-hidden', 'false');
      menu.inert = false;
    } else if (!menu.classList.contains('open')) {
      menu.setAttribute('aria-hidden', 'true');
      menu.inert = true;
    }
  };

  menuButton?.addEventListener('click', event => {
    event.stopPropagation();
    menu?.classList.contains('open') ? closeMenu({ restoreFocus: true }) : openMenu();
  });

  backdrop?.addEventListener('click', () => closeMenu({ restoreFocus: true }));

  document.addEventListener('click', event => {
    if (menu?.classList.contains('open')) {
      const target = event.target;
      if (target instanceof Node && !menu.contains(target) && !menuButton?.contains(target)) {
        closeMenu({ restoreFocus: true });
      }
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.classList.contains('open')) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  window.addEventListener('resize', syncMobileMenuState, { passive: true });
  syncMobileMenuState();

  const showAllContent = () => revealItems.forEach(item => item.classList.add('visible'));
  const replayRevealItems = new Set(document.querySelectorAll('.glass.reveal, .timeline-item.reveal, .hero-visual.reveal'));
  let revealObserver = null;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    showAllContent();
  } else {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = entry.target;
        if (entry.isIntersecting) {
          item.classList.add('visible');
          if (!replayRevealItems.has(item)) revealObserver?.unobserve(item);
        } else if (replayRevealItems.has(item)) {
          // Reset only after the card leaves the viewport so the same rise-in
          // transition plays again the next time the user scrolls back to it.
          item.classList.remove('visible');
        }
      });
    }, { threshold: 0.075, rootMargin: '0px 0px -22px' });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  const motionZones = [...document.querySelectorAll('.hero-visual, .section-art')];
  if (!reducedMotion && !mobilePerformanceMode.matches && 'IntersectionObserver' in window) {
    // Flag that the observer is live. The CSS pause rules key off this class,
    // so decorative motion is only ever gated when something is actually
    // toggling .motion-active -- otherwise (mobile perf mode, reduced motion,
    // no IntersectionObserver) the animations must be left to run untouched
    // rather than paused forever.
    root.classList.add('motion-gated');
    const motionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('motion-active', entry.isIntersecting));
    }, { threshold: 0.01, rootMargin: '120px 0px' });
    motionZones.forEach(zone => motionObserver.observe(zone));
  }

  const currentHashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
  currentHashTarget?.querySelectorAll('.reveal, .skill-card').forEach(item => item.classList.add('visible'));

  let activeScrollFrame = 0;

  const finishProgrammaticScroll = () => {
    if (activeScrollFrame) cancelAnimationFrame(activeScrollFrame);
    activeScrollFrame = 0;
    root.classList.remove('js-scroll-controlled');
    body.classList.remove('is-programmatic-scrolling');
    header?.classList.remove('header-hidden');
    headerHidden = false;
    lastScrollY = window.scrollY;
  };

  const cancelProgrammaticScroll = () => {
    finishProgrammaticScroll();
  };

  const scrollToTarget = target => {
    cancelProgrammaticScroll();

    const startY = window.scrollY;
    const headerOffset = Math.ceil(header?.getBoundingClientRect().height || 58) + 18;
    const rawTargetY = target === body ? 0 : target.getBoundingClientRect().top + startY - headerOffset;
    const maxTargetY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = Math.min(Math.max(0, rawTargetY), maxTargetY);
    const distance = targetY - startY;

    if (Math.abs(distance) < 2 || reducedMotion) {
      window.scrollTo({ top: targetY, behavior: 'auto' });
      finishProgrammaticScroll();
      return;
    }

    root.classList.add('js-scroll-controlled');
    body.classList.add('is-programmatic-scrolling');

    // Move immediately, then ease more gently as the target approaches.
    // The slightly longer cap keeps multi-section jumps fluid without feeling slow.
    const duration = Math.min(740, Math.max(450, 395 + Math.abs(distance) * .12));
    const startedAt = performance.now();
    const easeOutQuart = progress => 1 - Math.pow(1 - progress, 4);

    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo({ top: startY + distance * easeOutQuart(progress), behavior: 'auto' });

      if (progress < 1) {
        activeScrollFrame = requestAnimationFrame(step);
      } else {
        window.scrollTo({ top: targetY, behavior: 'auto' });
        finishProgrammaticScroll();
      }
    };

    activeScrollFrame = requestAnimationFrame(step);
  };

  internalAnchors.forEach(anchor => {
    anchor.addEventListener('click', event => {
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      body.classList.add('nav-jump');
      closeMenu();

      if (window.location.hash !== hash) history.pushState(null, '', hash);

      requestAnimationFrame(() => {
        scrollToTarget(target);
        requestAnimationFrame(() => body.classList.remove('nav-jump'));
      });
    });
  });

  window.addEventListener('touchstart', cancelProgrammaticScroll, { passive: true });
  window.addEventListener('wheel', cancelProgrammaticScroll, { passive: true });

  let scrollTicking = false;
  let scrollStopTimer = 0;
  let geometryFrame = 0;
  let maxScroll = 1;
  let sectionStops = [];
  let activeSection = '';
  let headerScrolled = false;
  let lastScrollY = window.scrollY;
  let headerHidden = false;

  const refreshScrollGeometry = () => {
    const scrollTop = window.scrollY;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    sectionStops = sections.map(section => ({
      id: section.id,
      top: section.getBoundingClientRect().top + scrollTop - 130
    }));
  };

  const updateScrollUI = () => {
    const scrollTop = Math.max(0, window.scrollY);
    const nextHeaderScrolled = scrollTop > 16;

    if (nextHeaderScrolled !== headerScrolled) {
      headerScrolled = nextHeaderScrolled;
      header?.classList.toggle('scrolled', headerScrolled);
    }

    // Auto-hide navigation bar on scroll down, slide back in on scroll up
    const isMenuOpen = menuButton?.getAttribute('aria-expanded') === 'true';
    if (!isMenuOpen) {
      const scrollDiff = scrollTop - lastScrollY;
      if (scrollTop <= 40) {
        if (headerHidden) {
          headerHidden = false;
          header?.classList.remove('header-hidden');
        }
      } else if (scrollDiff > 8 && scrollTop > 60) {
        // Scrolling down -> slide away
        if (!headerHidden) {
          headerHidden = true;
          header?.classList.add('header-hidden');
        }
      } else if (scrollDiff < -5) {
        // Scrolling up -> slide back in
        if (headerHidden) {
          headerHidden = false;
          header?.classList.remove('header-hidden');
        }
      }
    } else if (headerHidden) {
      headerHidden = false;
      header?.classList.remove('header-hidden');
    }
    lastScrollY = scrollTop;

    if (progressBar) progressBar.style.transform = `scaleX(${Math.min(1, scrollTop / maxScroll)})`;

    let current = 'top';
    for (const section of sectionStops) {
      if (scrollTop < section.top) break;
      current = section.id;
    }

    if (current !== activeSection) {
      activeSection = current;
      navAnchors.forEach(anchor => anchor.classList.toggle('active', anchor.getAttribute('href') === `#${current}`));
    }

    scrollTicking = false;
  };

  const scheduleGeometryRefresh = () => {
    if (geometryFrame) cancelAnimationFrame(geometryFrame);
    geometryFrame = requestAnimationFrame(() => {
      geometryFrame = 0;
      refreshScrollGeometry();
      updateScrollUI();
    });
  };

  const onScroll = () => {
    if (!body.classList.contains('is-scrolling')) body.classList.add('is-scrolling');
    window.clearTimeout(scrollStopTimer);
    scrollStopTimer = window.setTimeout(() => body.classList.remove('is-scrolling'), 130);

    if (!scrollTicking) {
      requestAnimationFrame(updateScrollUI);
      scrollTicking = true;
    }
  };

  refreshScrollGeometry();
  updateScrollUI();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleGeometryRefresh, { passive: true });
  window.addEventListener('load', scheduleGeometryRefresh, { once: true });
  document.fonts?.ready.then(scheduleGeometryRefresh);

  const staggerGroups = [
    '.skills-grid .skill-card',
    '.tools-grid .tool-group-card',
    '.timeline .timeline-item',
    '.education-grid .education-card',
    '.recognition-grid .recognition-card'
  ];
  staggerGroups.forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (!element.dataset.delay) element.style.setProperty('--delay', `${Math.min(index * 42, 168)}ms`);
    });
  });
  document.querySelectorAll('[data-delay]').forEach(element => {
    element.style.setProperty('--delay', `${Math.min(Number(element.dataset.delay) || 0, 190)}ms`);
  });

  // Keep one subtle tilt interaction on the hero card only.
  // Avoid per-card pointer tracking across all glass panels to reduce main-thread work.
  if (!reducedMotion && finePointer) {
    const card = document.querySelector('.profile-card.tilt-card');
    if (card) {
      const maxTilt = 2.2;
      let frame = null;
      card.addEventListener('pointerenter', () => {
        card.style.transition = 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 1200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 1000ms cubic-bezier(0.16, 1, 0.3, 1)';
      });
      card.addEventListener('pointermove', event => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.transition = 'transform 180ms ease-out, box-shadow 1200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 1000ms cubic-bezier(0.16, 1, 0.3, 1)';
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          card.style.transform = `perspective(1100px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) translateY(-2px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        card.style.transition = 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 1200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 1000ms cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform = 'perspective(1100px) rotateX(0) rotateY(0) translateY(0)';
      });
    }
  }
})();
