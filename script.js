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
  // Timestamp of the most recent programmatic scroll start. Touch
  // events arriving within the grace window below are treated as
  // part of the tap that triggered the scroll, not as a new gesture.
  let programmaticScrollStartedAt = 0;
  // Android Chrome commonly emits a second touchstart just after the
  // click that starts the scroll -- from the tap's residual sequence,
  // and from the menu closing (which releases body.menu-open's
  // `overflow:hidden; touch-action:none`, retargeting the gesture).
  // iOS does not, which is why the jump only showed up on Android.
  const TOUCH_GRACE_MS = 220;

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

  // Where the given target should sit once scrolled to, measured live.
  // Called every frame during an animated scroll -- see the note in
  // scrollToTarget about content-visibility reflow.
  const measureTargetY = target => {
    if (target === body) return 0;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const offset = Math.ceil(header?.getBoundingClientRect().height || 58) + 18;
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    return Math.min(Math.max(0, y), maxY);
  };

  const scrollToTarget = target => {
    cancelProgrammaticScroll();

    const startY = window.scrollY;
    const targetY = measureTargetY(target);
    const distance = targetY - startY;

    if (Math.abs(distance) < 2 || reducedMotion) {
      window.scrollTo({ top: targetY, behavior: 'instant' });
      finishProgrammaticScroll();
      return;
    }

    root.classList.add('js-scroll-controlled');
    body.classList.add('is-programmatic-scrolling');
    programmaticScrollStartedAt = performance.now();

    // Move immediately, then ease more gently as the target approaches.
    // The slightly longer cap keeps multi-section jumps fluid without feeling slow.
    const duration = Math.min(740, Math.max(450, 395 + Math.abs(distance) * .12));
    const startedAt = performance.now();
    const easeOutQuart = progress => 1 - Math.pow(1 - progress, 4);

    // The destination is re-measured every frame rather than trusted
    // from the start. `main > section` uses content-visibility:auto
    // with contain-intrinsic-size: auto 900px, so every not-yet-
    // rendered section below us is a 900px *estimate*. Passing one
    // resolves it to its real height and reflows the document, which
    // moves the target mid-flight -- landing short of, or past, the
    // section. Re-reading keeps the easing aimed at where the section
    // actually is now.
    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const liveTargetY = measureTargetY(target);
      // Re-derive the span from the live target so a reflow adjusts
      // the remaining travel instead of shifting the whole curve.
      const eased = easeOutQuart(progress);
      // 'instant', not 'auto': `auto` defers to CSS scroll-behavior,
      // and html sets `scroll-behavior: smooth` -- so each frame's
      // scrollTo would kick off its own native smooth animation and
      // fight this easing. html.js-scroll-controlled also sets
      // scroll-behavior:auto for the duration, but being explicit here
      // keeps the loop correct regardless of that class.
      window.scrollTo({ top: startY + (liveTargetY - startY) * eased, behavior: 'instant' });

      if (progress < 1) {
        activeScrollFrame = requestAnimationFrame(step);
      } else {
        window.scrollTo({ top: measureTargetY(target), behavior: 'instant' });
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

  // A touch is only a real interruption if it lands after the grace
  // window -- otherwise it is the tail of the tap that asked for this
  // scroll in the first place, and cancelling would snap us there.
  const cancelOnUserTouch = () => {
    if (!activeScrollFrame) return;
    if (performance.now() - programmaticScrollStartedAt < TOUCH_GRACE_MS) return;
    cancelProgrammaticScroll();
  };

  window.addEventListener('touchstart', cancelOnUserTouch, { passive: true });
  // touchmove is the unambiguous signal: the user is actually dragging,
  // so honour it immediately with no grace period.
  window.addEventListener('touchmove', cancelProgrammaticScroll, { passive: true });
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

  /* `main > section` uses content-visibility:auto with
     contain-intrinsic-size: auto 900px, so any section that has not
     been rendered yet contributes a 900px *estimate* to the document
     height. As sections resolve to their real heights the geometry
     shifts under us -- measured on this page, section stops drift by
     up to ~716px and total scrollHeight by ~1022px.

     Geometry was previously only refreshed on resize/load/fonts, so
     both the active-nav threshold and the scroll-progress denominator
     stayed at their load-time estimates: the progress bar topped out
     at ~82% instead of 100%, and 3 of 5 nav links highlighted the
     wrong section. Re-measure when the document height actually
     changes, which is cheap because we only pay it on change. */
  let lastMeasuredHeight = 0;
  const refreshGeometryIfStale = () => {
    const height = document.documentElement.scrollHeight;
    if (height === lastMeasuredHeight) return;
    lastMeasuredHeight = height;
    refreshScrollGeometry();
  };

  const updateScrollUI = () => {
    refreshGeometryIfStale();

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
      lastMeasuredHeight = document.documentElement.scrollHeight;
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

  /* Deep links and history navigation.

     The browser performs its native hash jump before content-
     visibility has resolved the real heights of the sections above
     the target, so the landing position is computed against 900px
     estimates. Measured on this page that put #experience 256px too
     far down (header overlapping its heading) and #recognition 371px
     short. scroll-padding-top cannot help -- it applies to the same
     premature jump.

     Re-anchor once layout has settled. `auto` behaviour, not the
     animation, because the user asked for a position, not a journey:
     on a deep link there is nothing to travel from. */
  const settleHashTarget = (behavior = 'instant') => {
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#top') return;
    let target = null;
    try { target = document.querySelector(hash); } catch (_) { return; }
    if (!target) return;

    target.querySelectorAll('.reveal, .skill-card').forEach(item => item.classList.add('visible'));
    refreshScrollGeometry();
    // Default behaviour is 'instant' rather than 'auto' for the same
    // reason: 'auto' would inherit html's `scroll-behavior: smooth`,
    // and each correction would animate and be interrupted by the
    // next one -- which is exactly why the deep-link fix appeared to
    // have no effect until this was found.
    window.scrollTo({ top: measureTargetY(target), behavior });
    refreshScrollGeometry();
    updateScrollUI();
  };

  if (window.location.hash) {
    /* content-visibility resolves progressively as sections come into
       range, and the last one can settle after `load` has fired -- a
       one-shot correction landed #recognition 207px short. Watch the
       document height instead and re-anchor until it stops changing,
       with a hard cap so this can never loop indefinitely. */
    let settleAttempts = 0;
    let lastOffset = -1;
    const settleUntilStable = () => {
      settleHashTarget();
      // Compare the resulting position AFTER settling, not the height
      // before it: scrolling into a region resolves more sections,
      // which changes the document height again (measured here: 6155
      // -> 5445 across two frames). Keep going until the landing spot
      // stops moving, capped so this can never loop indefinitely.
      const offset = Math.round(window.scrollY);
      if (offset !== lastOffset && settleAttempts++ < 20) {
        lastOffset = offset;
        requestAnimationFrame(settleUntilStable);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(settleUntilStable));
    window.addEventListener('load', () => {
      settleAttempts = 0;
      lastOffset = -1;
      settleUntilStable();
    }, { once: true });
  }

  // Back/forward between in-page sections changes only the hash, which
  // fires popstate without moving the page -- previously the browser
  // was left showing whatever section the user had scrolled to.
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    if (!hash || hash === '#top') {
      cancelProgrammaticScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      updateScrollUI();
      return;
    }
    cancelProgrammaticScroll();
    // The browser applies its own scroll restoration on popstate, which
    // lands against stale content-visibility geometry (measured 88px
    // off going back). Correct on the next two frames, after that
    // restoration has been committed.
    settleHashTarget();
    requestAnimationFrame(() => requestAnimationFrame(() => settleHashTarget()));
  });


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

  /* Contact channel picker.

     One markup source, two presentations (anchored popover on
     desktop/tablet, bottom sheet under 720px) -- the difference is
     entirely CSS. This handles state, focus and dismissal.

     [hidden] is removed one frame before .is-open is added: the
     element must be laid out in its closed state before the browser
     can interpolate to the open one, otherwise it snaps. */
  const contactTrigger = document.querySelector('.contact-trigger');
  const contactSheet = document.querySelector('.contact-sheet');

  if (contactTrigger && contactSheet) {
    const channels = [...contactSheet.querySelectorAll('.contact-channel')];
    let contactOpen = false;
    let contactCloseTimer = null;
    let contactScrim = null;

    const isSheetMode = () => window.matchMedia('(max-width: 720px)').matches;

    /* In sheet mode the panel is position:fixed, but .contact-card
       carries .reveal, whose .visible state sets a transform -- and a
       transformed ancestor becomes the containing block for fixed
       descendants, which pinned the sheet inside the card instead of
       to the viewport. Reparent to <body> for sheet mode so no
       ancestor can capture it, and put it back for the popover, which
       needs to stay anchored to the trigger. */
    const sheetHome = contactSheet.parentElement;
    const placeSheet = () => {
      const wantBody = isSheetMode();
      if (wantBody && contactSheet.parentElement !== document.body) {
        document.body.appendChild(contactSheet);
      } else if (!wantBody && contactSheet.parentElement !== sheetHome) {
        sheetHome.appendChild(contactSheet);
      }
    };

    const getScrim = () => {
      if (!contactScrim) {
        contactScrim = document.createElement('div');
        contactScrim.className = 'contact-scrim';
        contactScrim.setAttribute('aria-hidden', 'true');
        contactScrim.addEventListener('click', () => closeContact({ restoreFocus: true }));
        document.body.appendChild(contactScrim);
      }
      return contactScrim;
    };

    const openContact = () => {
      if (contactOpen) return;
      contactOpen = true;
      window.clearTimeout(contactCloseTimer);

      placeSheet();
      contactSheet.hidden = false;
      if (isSheetMode()) {
        const scrim = getScrim();
        scrim.hidden = false;
        // Same two-step as the sheet: lay out at opacity 0, then animate.
        requestAnimationFrame(() => scrim.classList.add('is-open'));
      }
      contactTrigger.setAttribute('aria-expanded', 'true');

      requestAnimationFrame(() => contactSheet.classList.add('is-open'));
    };

    const closeContact = ({ restoreFocus = false } = {}) => {
      if (!contactOpen) return;
      contactOpen = false;

      contactSheet.classList.remove('is-open');
      contactScrim?.classList.remove('is-open');
      contactTrigger.setAttribute('aria-expanded', 'false');

      // Wait out the exit transition before hiding, so it is visible.
      window.clearTimeout(contactCloseTimer);
      contactCloseTimer = window.setTimeout(() => {
        contactSheet.hidden = true;
        if (contactScrim) contactScrim.hidden = true;
      }, reducedMotion ? 0 : 280);

      if (restoreFocus) contactTrigger.focus({ preventScroll: true });
    };

    contactTrigger.addEventListener('click', event => {
      event.stopPropagation();
      contactOpen ? closeContact({ restoreFocus: true }) : openContact();
    });

    // Open with Down/Up from the trigger, landing on the first item --
    // the standard menu-button keyboard contract.
    contactTrigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      openContact();
      requestAnimationFrame(() => {
        (event.key === 'ArrowDown' ? channels[0] : channels[channels.length - 1])
          ?.focus({ preventScroll: true });
      });
    });

    contactSheet.addEventListener('keydown', event => {
      const index = channels.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = (index + step + channels.length) % channels.length;
        channels[next]?.focus({ preventScroll: true });
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        (event.key === 'Home' ? channels[0] : channels[channels.length - 1])
          ?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') {
        // Tabbing out is a dismissal, not a trap: this is a menu, and
        // the page behind it stays usable.
        closeContact();
      }
    });

    // Following a channel should leave the menu closed behind you.
    channels.forEach(channel => channel.addEventListener('click', () => closeContact()));

    document.addEventListener('click', event => {
      if (!contactOpen) return;
      const target = event.target;
      if (target instanceof Node &&
          !contactSheet.contains(target) &&
          !contactTrigger.contains(target)) {
        closeContact();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && contactOpen) {
        event.preventDefault();
        closeContact({ restoreFocus: true });
      }
    });

    // Crossing the sheet/popover breakpoint mid-open would leave the
    // scrim state mismatched; simplest correct answer is to close.
    window.addEventListener('resize', () => { if (contactOpen) closeContact(); }, { passive: true });
  }

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
