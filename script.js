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

  const currentHashTarget = window.location.hash && document.querySelector(window.location.hash);
  currentHashTarget?.querySelectorAll('.reveal, .skill-card').forEach(item => item.classList.add('visible'));

  let activeScrollFrame = 0;

  const cancelProgrammaticScroll = () => {
    if (activeScrollFrame) cancelAnimationFrame(activeScrollFrame);
    activeScrollFrame = 0;
    root.classList.remove('js-scroll-controlled');
    body.classList.remove('is-programmatic-scrolling');
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
      root.classList.add('js-scroll-controlled');
      window.scrollTo(0, targetY);
      requestAnimationFrame(() => root.classList.remove('js-scroll-controlled'));
      return;
    }

    const duration = Math.min(500, Math.max(280, 240 + Math.abs(distance) * 0.055));
    const startedAt = performance.now();
    const easeInOutCubic = progress => progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    root.classList.add('js-scroll-controlled');
    body.classList.add('is-programmatic-scrolling');

    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        activeScrollFrame = requestAnimationFrame(step);
      } else {
        activeScrollFrame = 0;
        root.classList.remove('js-scroll-controlled');
        body.classList.remove('is-programmatic-scrolling');
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
      showAllContent();
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
  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle('scrolled', scrollTop > 16);
    if (progressBar) progressBar.style.transform = `scaleX(${maxScroll > 0 ? scrollTop / maxScroll : 0})`;

    let current = '';
    for (const section of sections) {
      if (scrollTop >= section.offsetTop - 130) current = section.id;
    }
    navAnchors.forEach(anchor => anchor.classList.toggle('active', anchor.getAttribute('href') === `#${current}`));
    scrollTicking = false;
  };

  const onScroll = () => {
    body.classList.add('is-scrolling');
    window.clearTimeout(scrollStopTimer);
    scrollStopTimer = window.setTimeout(() => body.classList.remove('is-scrolling'), 130);

    if (!scrollTicking) {
      requestAnimationFrame(updateScrollUI);
      scrollTicking = true;
    }
  };
  updateScrollUI();
  window.addEventListener('scroll', onScroll, { passive: true });

  const staggerGroups = [
    '.skills-grid .skill-card',
    '.timeline .timeline-item',
    '.education-grid .education-card',
    '.recognition-grid .recognition-card'
  ];
  staggerGroups.forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (!element.dataset.delay) element.style.setProperty('--delay', `${Math.min(index * 55, 220)}ms`);
    });
  });
  document.querySelectorAll('[data-delay]').forEach(element => {
    element.style.setProperty('--delay', `${Math.min(Number(element.dataset.delay) || 0, 240)}ms`);
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
      const maxTilt = card.classList.contains('profile-card') ? 3.2 : 1.25;
      let frame = null;
      card.addEventListener('pointermove', event => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          card.style.transform = `perspective(1100px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) translateY(-2px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        card.style.transform = 'perspective(1100px) rotateX(0) rotateY(0) translateY(0)';
      });
    });
  }
})();
