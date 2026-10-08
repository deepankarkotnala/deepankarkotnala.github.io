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
  const revealItems = [...document.querySelectorAll('.reveal')];
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
    if (restoreFocus && lastFocusedBeforeMenu instanceof HTMLElement) lastFocusedBeforeMenu.focus({ preventScroll: true });
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
  // Opening a project can push later cards off screen without any scroll;
  // resetting them then would replay their rise-in when the project closes.
  let revealHoldUntil = 0;
  const holdRevealReplay = () => { revealHoldUntil = performance.now() + 1000; };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    showAllContent();
  } else {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = entry.target;
        if (entry.isIntersecting) {
          item.classList.add('visible');
          if (!replayRevealItems.has(item)) revealObserver?.unobserve(item);
        } else if (replayRevealItems.has(item) && performance.now() > revealHoldUntil) {
          // Reset only after the card leaves the viewport so the same rise-in
          // transition plays again the next time the user scrolls back to it.
          item.classList.remove('visible');
        }
      });
    }, { threshold: 0.075, rootMargin: '0px 0px -22px' });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  const currentHashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
  currentHashTarget?.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));

  // Sliding highlight behind the active desktop nav link. The mobile
  // menu is a grid sheet, so there each link keeps its own background.
  // The pill is built from two fixed-size end caps and a middle strip
  // that is only ever scaled horizontally, so its length can change
  // with transforms alone -- no width/layout per frame, and the
  // rounded ends never distort.
  const navIndicator = document.createElement('span');
  navIndicator.className = 'nav-indicator';
  navIndicator.setAttribute('aria-hidden', 'true');
  const navPillPieces = ['pill-cap pill-cap-l', 'pill-mid', 'pill-cap pill-cap-r'].map(className => {
    const piece = document.createElement('span');
    piece.className = className;
    navIndicator.append(piece);
    return piece;
  });
  menu?.prepend(navIndicator);

  // Link boxes only move when the layout does (resize, font load), so
  // measure them then rather than on every active-section change --
  // reading offset* right after toggling .active forced a synchronous
  // style + layout pass in the middle of scrolling.
  let navLinkBoxes = null;
  const measureNavLinks = () => {
    navLinkBoxes = new Map(navAnchors.map(anchor => [anchor, {
      left: anchor.offsetLeft,
      top: anchor.offsetTop,
      width: anchor.offsetWidth,
      height: anchor.offsetHeight
    }]));
  };

  // Liquid motion: the pill's left and right edges are two independent
  // springs. The edge facing the destination is stiffer, so it races
  // ahead and the pill stretches like a droplet, then the trailing edge
  // catches up and the whole thing settles with a soft wobble.
  //
  // The springs are solved up front, not per frame: the whole path is
  // sampled once and handed to the Web Animations API as transform-only
  // keyframes, which the compositor plays off the main thread. So the
  // pill stays fluid even while a nav click's scroll is busy re-laying
  // out content-visibility sections. Retargeting mid-flight reads the
  // running animation's position and velocity and solves a new path from
  // there, so a new destination bends the motion instead of restarting.
  const LEAD = { stiffness: 1400, damping: 62 };
  const TRAIL = { stiffness: 760, damping: 48 };
  const SPRING_STEP = 1 / 480;
  const STEPS_PER_FRAME = 8; // one keyframe every 1/60 s
  const FRAME_MS = SPRING_STEP * STEPS_PER_FRAME * 1000;
  const MID_BASE = 64; // .pill-mid's CSS width, scaled to fit
  const navPill = {
    l: 0, r: 0, top: -1, height: 0, targetL: 0, targetR: 0,
    motion: null // { samples, animations } while a glide is running
  };

  const solveNavSpring = (start, targetL, targetR) => {
    // Pick lead and trail once per glide. Re-deciding every frame made
    // the roles flip whenever the left edge overshot, which jolted the
    // stiffness and showed up as a wobble.
    const movingRight = targetL > start.l;
    const edges = [
      { x: start.l, v: start.lv, target: targetL, ...(movingRight ? TRAIL : LEAD) },
      { x: start.r, v: start.rv, target: targetR, ...(movingRight ? LEAD : TRAIL) }
    ];
    const samples = [start];
    for (let frame = 0; frame < 150; frame += 1) {
      for (let i = 0; i < STEPS_PER_FRAME; i += 1) {
        edges.forEach(edge => {
          edge.v += (edge.stiffness * (edge.target - edge.x) - edge.damping * edge.v) * SPRING_STEP;
          edge.x += edge.v * SPRING_STEP;
        });
      }
      if (edges.every(edge => Math.abs(edge.target - edge.x) < .3 && Math.abs(edge.v) < 6)) break;
      samples.push({ l: edges[0].x, lv: edges[0].v, r: edges[1].x, rv: edges[1].v });
    }
    samples.push({ l: targetL, lv: 0, r: targetR, rv: 0 });
    return samples;
  };

  // Transforms for [left cap, middle, right cap] with the pill spanning l..r.
  const navPillTransforms = (l, r, restWidth) => {
    const cap = navPill.height / 2;
    const width = Math.max(0, r - l);
    // Stretched pills thin out slightly, like a drawn-out drop of water.
    const stretch = Math.max(0, width / (restWidth || width || 1) - 1);
    const squash = 1 - Math.min(.16, stretch * .22);
    // The middle overlaps each cap by 1px so no seam shows between them.
    const midScale = Math.max(0, width - cap * 2 + 2) / MID_BASE;
    return [
      `translate3d(${l}px,0,0) scaleY(${squash})`,
      `translate3d(${l + cap - 1}px,0,0) scale(${midScale},${squash})`,
      `translate3d(${r - cap}px,0,0) scaleY(${squash})`
    ];
  };

  // Where the pill is right now, read from the running animation.
  const currentNavPillState = () => {
    const { motion } = navPill;
    if (!motion) return { l: navPill.l, lv: 0, r: navPill.r, rv: 0 };
    const t = Math.max(0, motion.animations[0].currentTime || 0) / FRAME_MS;
    const i = Math.min(motion.samples.length - 1, Math.floor(t));
    const a = motion.samples[i];
    const b = motion.samples[Math.min(motion.samples.length - 1, i + 1)];
    const f = Math.min(1, t - i);
    const mix = key => a[key] + (b[key] - a[key]) * f;
    return { l: mix('l'), lv: mix('lv'), r: mix('r'), rv: mix('rv') };
  };

  const stopNavPillMotion = () => {
    navPill.motion?.animations.forEach(animation => animation.cancel());
    navPill.motion = null;
  };

  const placeNavPill = transforms => {
    navPillPieces.forEach((piece, i) => { piece.style.transform = transforms[i]; });
  };

  const glideNavPill = () => {
    const start = currentNavPillState();
    stopNavPillMotion();
    const { targetL, targetR } = navPill;
    navPill.l = targetL;
    navPill.r = targetR;
    const samples = solveNavSpring(start, targetL, targetR);
    const restWidth = targetR - targetL;
    // The resting pose goes inline first, so once the animation ends
    // (fill: none) the pill simply stays where it landed.
    placeNavPill(navPillTransforms(targetL, targetR, restWidth));
    if (samples.length < 3 || !('animate' in navIndicator)) return;
    const keyframes = navPillPieces.map(() => []);
    samples.forEach(({ l, r }) => {
      navPillTransforms(l, r, restWidth).forEach((transform, i) => keyframes[i].push({ transform }));
    });
    const duration = (samples.length - 1) * FRAME_MS;
    const motion = {
      samples,
      animations: navPillPieces.map((piece, i) => piece.animate(keyframes[i], { duration, easing: 'linear' }))
    };
    motion.animations[0].onfinish = () => {
      if (navPill.motion === motion) navPill.motion = null;
    };
    navPill.motion = motion;
  };

  const moveNavIndicator = ({ animate = true } = {}) => {
    if (!menu) return;
    const active = navAnchors.find(anchor => anchor.classList.contains('active'));
    const enabled = Boolean(active) && window.innerWidth > 900;
    menu.classList.toggle('has-indicator', enabled);
    if (!enabled) {
      stopNavPillMotion();
      navIndicator.classList.remove('is-visible');
      return;
    }

    if (!navLinkBoxes) measureNavLinks();
    const box = navLinkBoxes.get(active);
    const nextL = box.left;
    const nextR = box.left + box.width;
    // Height and vertical offset only change with layout, so they are
    // written here rather than animated.
    if (box.top !== navPill.top || box.height !== navPill.height) {
      navPill.top = box.top;
      navPill.height = box.height;
      navIndicator.style.top = `${box.top}px`;
      navIndicator.style.setProperty('--pill-h', `${box.height}px`);
    }

    // Appearing from hidden (first paint, resize, returning from the
    // mobile layout) should land in place, not slide in from 0,0.
    const snap = !animate || reducedMotion || !navIndicator.classList.contains('is-visible');
    if (snap) {
      stopNavPillMotion();
      navPill.targetL = navPill.l = nextL;
      navPill.targetR = navPill.r = nextR;
      placeNavPill(navPillTransforms(nextL, nextR, nextR - nextL));
    } else if (nextL !== navPill.targetL || nextR !== navPill.targetR) {
      navPill.targetL = nextL;
      navPill.targetR = nextR;
      glideNavPill();
    }
    navIndicator.classList.add('is-visible');
  };

  const setActiveNav = id => {
    navAnchors.forEach(anchor => anchor.classList.toggle('active', anchor.getAttribute('href') === `#${id}`));
    moveNavIndicator();
  };

  // While a nav click is scrolling the page, hold the highlight on the
  // destination so it glides there once instead of stepping through
  // every section passed on the way.
  let navLockId = '';

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
    if (navLockId) {
      navLockId = '';
      // Force the next scroll update to re-evaluate from real position.
      activeSection = '';
    }
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
    // Land on the section's content, not its outer edge: `.section`
    // has 52px of top padding, which otherwise stacked on the offset
    // above as an empty band under the nav.
    const paddingTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
    const y = target.getBoundingClientRect().top + window.scrollY + paddingTop - offset;
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
        const id = hash.slice(1);
        if (activeScrollFrame && navAnchors.some(link => link.getAttribute('href') === hash)) {
          navLockId = id;
          activeSection = id;
          setActiveNav(id);
        }
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
     changes. A ResizeObserver on <body> reports that after layout has
     already run, so unlike reading scrollHeight inside the scroll
     handler (which forced a synchronous style + layout on every
     scroll frame) it costs nothing while the user is scrolling. */

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

    if (!navLockId && current !== activeSection) {
      activeSection = current;
      setActiveNav(current);
    }

    scrollTicking = false;
  };

  const scheduleGeometryRefresh = () => {
    if (geometryFrame) cancelAnimationFrame(geometryFrame);
    geometryFrame = requestAnimationFrame(() => {
      geometryFrame = 0;
      // This also fires while scrolling, whenever a content-visibility
      // section resolves its real height. Snapping the pill then cut its
      // glide short mid-flight on long jumps (Home -> Experience), so only
      // snap when the nav links themselves actually moved.
      const previousBoxes = navLinkBoxes;
      measureNavLinks();
      const linksMoved = !previousBoxes || navAnchors.some(anchor => {
        const a = previousBoxes.get(anchor);
        const b = navLinkBoxes.get(anchor);
        return !a || a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height;
      });
      refreshScrollGeometry();
      updateScrollUI();
      moveNavIndicator({ animate: !linksMoved });
    });
  };

  /* No body-level "is-scrolling" class here: toggling a class on <body>
     at the start and end of every scroll invalidated style for the
     whole document and repainted every element whose filters it
     switched, which showed up as dropped frames on Windows. */
  const onScroll = () => {
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
  if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleGeometryRefresh).observe(body);
  }

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

    target.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
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
    '.skills-index li',
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

  // Project accordion: each row toggles its own panel; several can be open.
  // The layout switch is instant (one reflow per click) and the motion is
  // played with transforms only, which the compositor runs off the main
  // thread, so it stays smooth on low-end hardware:
  //  - the panel's clipping box slides from -h while its content
  //    counter-slides from +h, uncovering the details top-down;
  //  - everything below the panel starts drawn h px higher and slides
  //    down into its new place.
  // Closing plays the same motion in reverse, then collapses the layout.
  const ACC_OPEN_MS = 240;
  const ACC_CLOSE_MS = 200;
  const ACC_EASE = 'cubic-bezier(.25, .8, .3, 1)';
  let finishAccordion = null;
  // Re-place the hover highlight after a row's layout or corners change.
  const glideSyncs = [];
  const syncGlides = () => glideSyncs.forEach(sync => sync());

  // Elements after `el` in document order that can be on screen during a
  // shift of `h` px. Document order is top-to-bottom here, so the first
  // one too far down ends the walk; nothing off screen gets promoted.
  const followingOnScreen = (el, h) => {
    const found = [];
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
        if (getComputedStyle(sib).position === 'fixed') continue;
        if (sib.getBoundingClientRect().top - h > window.innerHeight) return found;
        found.push(sib);
      }
    }
    return found;
  };

  // The browser's scroll anchoring would otherwise nudge the page when a
  // panel's height snaps, moving the clicked row away from the pointer.
  // Nothing above the panel changes size, so with anchoring paused for that
  // one layout the clicked row stays exactly where it was.
  const withoutScrollAnchoring = change => {
    root.style.overflowAnchor = 'none';
    change();
    requestAnimationFrame(() => requestAnimationFrame(() => { root.style.overflowAnchor = ''; }));
  };

  const toggleProject = (item, trigger) => {
    finishAccordion?.();
    const open = !item.classList.contains('is-open');
    const close = () => withoutScrollAnchoring(() => item.classList.remove('is-open'));
    trigger.setAttribute('aria-expanded', String(open));
    holdRevealReplay();
    if (open) withoutScrollAnchoring(() => item.classList.add('is-open'));
    // Resize the hover highlight now, alongside the open/close motion.
    syncGlides();

    const inner = item.querySelector('.acc-panel-inner');
    const body = item.querySelector('.acc-body');
    // offsetHeight is in layout px, matching the translate below even
    // when the page is zoomed (getBoundingClientRect would be scaled).
    const h = reducedMotion ? 0 : inner.offsetHeight;
    if (!h || !inner.animate) {
      if (!open) close();
      return;
    }

    // Clip the panel only for the motion (see .is-moving in styles.css).
    item.classList.add('is-moving');
    const timing = { duration: open ? ACC_OPEN_MS : ACC_CLOSE_MS, easing: ACC_EASE, fill: 'both' };
    const [from, to] = open ? [-h, 0] : [0, -h];
    const shift = [{ translate: `0 ${from}px` }, { translate: `0 ${to}px` }];
    const counter = [{ translate: `0 ${-from}px` }, { translate: `0 ${-to}px` }];
    const anims = [
      inner.animate(shift, timing),
      body.animate(counter, timing),
      ...followingOnScreen(item, h).map(el => el.animate(shift, timing))
    ];

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (finishAccordion === finish) finishAccordion = null;
      // Collapse and drop the transforms in the same task: no flash.
      if (!open) close();
      item.classList.remove('is-moving');
      anims.forEach(anim => anim.cancel());
    };
    finishAccordion = finish;
    anims[0].finished.then(finish, () => {});
  };

  document.querySelectorAll('.acc-trigger').forEach(trigger => {
    const item = trigger.closest('.acc-item');
    trigger.addEventListener('click', () => toggleProject(item, trigger));
  });

  // Project hover highlight: one band per accordion glides to whichever
  // project is under the mouse and covers all of it, title row and open
  // details alike, while that project's own tints step aside
  // (.is-hovered) so it reads as one even colour. It is prepended so the
  // rows paint over it and the open/close motion, which shifts only later
  // siblings, leaves it alone.
  if (finePointer) {
    document.querySelectorAll('.project-accordion').forEach(accordion => {
      const glide = document.createElement('span');
      glide.className = 'acc-glide';
      glide.setAttribute('aria-hidden', 'true');
      accordion.prepend(glide);
      accordion.classList.add('has-glide');
      let current = null;

      // offset* values ignore transforms, so this is the project's settled
      // box even while the open/close motion is playing. aria-expanded
      // flips on click, so a closing project shrinks the band at once.
      const place = () => {
        const trigger = current.querySelector('.acc-trigger');
        const body = current.querySelector('.acc-body');
        const bottom = trigger.getAttribute('aria-expanded') === 'true'
          ? body.offsetTop + body.offsetHeight
          : trigger.offsetTop + trigger.offsetHeight;
        glide.style.transform = `translate(${current.offsetLeft + trigger.offsetLeft}px, ${current.offsetTop + trigger.offsetTop}px)`;
        glide.style.width = `${trigger.offsetWidth}px`;
        glide.style.height = `${bottom - trigger.offsetTop}px`;
      };
      const hide = () => {
        current?.classList.remove('is-hovered');
        current = null;
        glide.classList.remove('is-visible');
      };

      accordion.addEventListener('pointerover', event => {
        if (event.pointerType !== 'mouse') return;
        const item = event.target.closest('.acc-item');
        if (!item) return hide();
        if (item === current) return;
        // Arriving from outside: appear in place rather than slide in.
        const arriving = !current;
        current?.classList.remove('is-hovered');
        current = item;
        item.classList.add('is-hovered');
        if (arriving) glide.style.transition = 'none';
        place();
        if (arriving) {
          void glide.offsetWidth;
          glide.style.transition = '';
        }
        glide.classList.add('is-visible');
      });
      accordion.addEventListener('pointerleave', hide);
      glideSyncs.push(() => { if (current) place(); });
    });
    window.addEventListener('resize', syncGlides, { passive: true });
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
