(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');
  const themeButton = document.querySelector('.theme-toggle');
  const themeLabel = themeButton?.querySelector('.theme-label');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
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

  const updateThemeButton = () => {
    const dark = root.dataset.theme === 'dark';
    if (themeButton) {
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    if (themeLabel) themeLabel.textContent = dark ? 'Light' : 'Dark';
    if (themeMeta) themeMeta.content = dark ? '#111925' : '#e9eef5';
  };

  updateThemeButton();

  themeButton?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    try { localStorage.setItem('portfolio-theme', nextTheme); } catch (_) {}
    updateThemeButton();
  });

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

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.classList.contains('open')) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  window.addEventListener('resize', syncMobileMenuState, { passive: true });
  syncMobileMenuState();

  const showAllContent = () => revealItems.forEach(item => item.classList.add('visible'));
  let revealObserver = null;

  if (reducedMotion || mobilePerformanceMode.matches || !('IntersectionObserver' in window)) {
    showAllContent();
  } else {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.075, rootMargin: '0px 0px -22px' });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  const enableMobileContent = event => {
    if (!event.matches) return;
    revealObserver?.disconnect();
    revealObserver = null;
    showAllContent();
  };
  mobilePerformanceMode.addEventListener?.('change', enableMobileContent);

  const motionZones = [...document.querySelectorAll('.hero-visual, .section-art, .skill-card')];
  if (!reducedMotion && !mobilePerformanceMode.matches && 'IntersectionObserver' in window) {
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
      target.querySelectorAll('.reveal, .skill-card').forEach(item => item.classList.add('visible'));
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

  const refreshScrollGeometry = () => {
    const scrollTop = window.scrollY;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    sectionStops = sections.map(section => ({
      id: section.id,
      top: section.getBoundingClientRect().top + scrollTop - 130
    }));
  };

  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const nextHeaderScrolled = scrollTop > 16;

    if (nextHeaderScrolled !== headerScrolled) {
      headerScrolled = nextHeaderScrolled;
      header?.classList.toggle('scrolled', headerScrolled);
    }

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

  if (!reducedMotion && finePointer) {
    document.querySelectorAll('.glass').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--glow-x', `${x}%`);
        card.style.setProperty('--glow-y', `${y}%`);
      });
    });

    document.querySelectorAll('.tilt-card').forEach(card => {
      const maxTilt = card.classList.contains('profile-card') ? 3.8 : 1.25;
      let frame = null;
      card.addEventListener('pointermove', event => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          card.style.transform = `perspective(1100px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) translateY(-3px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        card.style.transform = 'perspective(1100px) rotateX(0) rotateY(0) translateY(0)';
      });
    });
  }
})();
