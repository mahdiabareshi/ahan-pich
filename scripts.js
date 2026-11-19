/* ============================================
   آهن‌پیچ — scripts.js
   Main JS for the spiral stairs site.
   Loads after vendor libraries (Lenis, barba, GSAP, ScrollTrigger).
   ============================================ */

/* ============================================
   LOADING / INTRO OVERLAY
   Shows on every full page reload. Max duration 2000ms.
   Timeline: logo fade+scale (0-350ms) → light trace (300-850ms) →
   brand name (650-1050ms) → overlay slide-up exit (1100-1700ms).
   ============================================ */
(function initLoadingIntro() {
  var overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAPLocal = typeof window.gsap !== 'undefined';

  // Lock body scroll while overlay is visible
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  function hideOverlay() {
    // Restore scroll
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    overlay.classList.add('is-done');
    // After CSS visibility:hidden kicks in, remove from DOM flow
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      // Refresh ScrollTrigger since the overlay (which had layout) is gone
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 100);
  }

  // ---- Safety timeout: never let the intro exceed 2000ms ----
  var safetyTimer = setTimeout(hideOverlay, 2000);

  // ---- If reduced motion, finish almost instantly ----
  if (reduced || !hasGSAPLocal) {
    // Just a tiny beat so the brand is seen, then exit
    setTimeout(function() {
      clearTimeout(safetyTimer);
      hideOverlay();
    }, reduced ? 300 : 100);
    return;
  }

  // ---- Full luxury intro timeline ----
  var logoSvg = overlay.querySelector('.loading-logo__svg');
  var halo = overlay.querySelector('.loading-logo__halo');
  var brand = overlay.querySelector('.loading-brand');
  var lightTrace = overlay.querySelector('#loadingLightTrace');
  var highlightCircle = overlay.querySelector('circle[fill=\"url(#loadingHighlight)\"]');
  var dotMotion = overlay.querySelector('#loadingDotMotion');
  var travelDot = overlay.querySelector('#loadingTravelDot');

  // Calculate the light-trace path length so we can animate strokeDashoffset
  var pathLength = 320;
  if (lightTrace && lightTrace.getTotalLength) {
    try { pathLength = lightTrace.getTotalLength(); } catch (e) { /* keep default */ }
  }
  if (lightTrace) {
    gsap.set(lightTrace, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
  }

  var tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: function() {
      clearTimeout(safetyTimer);
      hideOverlay();
    }
  });

  // Stage 1 — Logo emergence (0 → 350ms)
  tl.to(logoSvg, {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    duration: 0.35,
    ease: 'power2.out'
  }, 0)
  .to(halo, { opacity: 0.6, duration: 0.45, ease: 'power2.out' }, 0.05);

  // Stage 2 — Light trace draws along the spiral (300 → 850ms)
  if (lightTrace) {
    tl.to(lightTrace, {
      strokeDashoffset: 0,
      duration: 0.55,
      ease: 'power2.inOut'
    }, 0.30);
  }

  // Traveling glow dot rides the same path
  if (travelDot && dotMotion) {
    tl.to(travelDot, { opacity: 1, duration: 0.1 }, 0.30)
      .add(function() {
        try { dotMotion.beginElement(); } catch (e) { /* SVG anim not supported, ignore */ }
      }, 0.30)
      .to(travelDot, { opacity: 0, duration: 0.15 }, 0.80);
  }

  // Stage 3 — Subtle highlight sweep on the emblem (500 → 950ms)
  if (highlightCircle) {
    tl.to(highlightCircle, { opacity: 0.7, duration: 0.45, ease: 'power1.inOut' }, 0.50)
      .to(highlightCircle, { opacity: 0.25, duration: 0.45, ease: 'power1.inOut' }, 0.75);
  }

  // Stage 4 — Brand name fades in (650 → 1050ms)
  tl.to(brand, {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'power2.out'
  }, 0.65);

  // Stage 5 — Overlay slide-up exit (1100 → 1700ms)
  tl.to(overlay, {
    y: '-100%',
    duration: 0.6,
    ease: 'power3.inOut'
  }, 1.10)
  .to(overlay, {
    opacity: 0,
    duration: 0.15,
    ease: 'power2.in'
  }, 1.55);
})();
/* END LOADING INTRO ============================================ */

/* ============================================
   LIBRARY INITIALIZATION (Lenis + GSAP + barba)
   ============================================ */
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var hasGSAP = typeof window.gsap !== 'undefined';
var hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
if (hasGSAP && hasScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// ---- Lenis (smooth scroll with inertia) ----
var lenis = null;
if (!prefersReducedMotion && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({
    duration: 1.2,
    easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    smoothTouch: false,
    touchMultiplier: 1.5,
    wheelMultiplier: 1
  });
  window.__lenis = lenis;
  // Standalone RAF loop (not gsap.ticker — that was interfering with gsap.set)
  var raf = function(time) { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

// Mark document as JS-enabled
document.documentElement.classList.add('js-anim');

// ---- GSAP entrance animations (skipped if reduced motion) ----
// Pattern: gsap.set() applies initial "from" state IMMEDIATELY, then
// IntersectionObserver triggers gsap.to() when element enters viewport.
// This avoids the ScrollTrigger/Lenis desync that caused blink effect.
if (hasGSAP && !prefersReducedMotion) {

  // Animation definitions: each entry knows how to compute initial state per index
  var ANIMATIONS = [
    { sel: '.product-card',  fromVars: function(i) { return { opacity: 0, x: (i % 2 === 0) ? 50 : -50, y: 20 }; },
      toVars: { opacity: 1, x: 0, y: 0, duration: 0.8, ease: 'power3.out' } },
    { sel: '.material-card', fromVars: function()  { return { opacity: 0, x: 60 }; },
      toVars: { opacity: 1, x: 0, duration: 0.75, ease: 'power3.out' } },
    { sel: '.process-step',  fromVars: function(i) { return { opacity: 0, y: 50, x: (i % 2 === 0) ? 20 : -20 }; },
      toVars: { opacity: 1, y: 0, x: 0, duration: 0.7, ease: 'power3.out' } },
    { sel: '.project-card',  fromVars: function(i) { return { opacity: 0, x: (i % 2 === 0) ? -60 : 60, y: 24 }; },
      toVars: { opacity: 1, x: 0, y: 0, duration: 0.85, ease: 'power3.out' } },
    { sel: '.why-card',      fromVars: function(i) { return { opacity: 0, x: (i % 2 === 0) ? 40 : -40, y: 24 }; },
      toVars: { opacity: 1, x: 0, y: 0, duration: 0.75, ease: 'power3.out' } },
    { sel: '.qc-item',       fromVars: function()  { return { opacity: 0, x: 30 }; },
      toVars: { opacity: 1, x: 0, duration: 0.65, ease: 'power3.out' } },
    { sel: '.stats-bar .stat', fromVars: function() { return { opacity: 0, y: 24, scale: 0.92 }; },
      toVars: { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' } },
    { sel: '.cta-card',      fromVars: function()  { return { opacity: 0, y: 60, scale: 0.97 }; },
      toVars: { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' } },
    { sel: '.quality-image-wrap', fromVars: function() { return { opacity: 0, x: -50 }; },
      toVars: { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' } },
    { sel: '.tolerance-box', fromVars: function()  { return { opacity: 0, y: 20, scale: 0.95 }; },
      toVars: { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' } }
  ];

  // Apply initial states to all animated elements
  ANIMATIONS.forEach(function(anim) {
    gsap.utils.toArray(anim.sel).forEach(function(el, i) {
      gsap.set(el, anim.fromVars(i));
      el.__animToVars = anim.toVars;
    });
  });

  // Section headers — separate handling (eyebrow from right, title from below, desc from left)
  gsap.utils.toArray('.section, .section-alt').forEach(function(section) {
    var eyebrow = section.querySelector('.section-eyebrow');
    var title   = section.querySelector('.section-title');
    var desc    = section.querySelector('.section-desc');
    if (eyebrow) { gsap.set(eyebrow, { opacity: 0, x: 24 }); eyebrow.__animToVars = { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }; }
    if (title)   { gsap.set(title,   { opacity: 0, y: 32 }); title.__animToVars  = { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', delay: 0.05 }; }
    if (desc)    { gsap.set(desc,    { opacity: 0, x: -24 }); desc.__animToVars   = { opacity: 1, x: 0, duration: 0.75, ease: 'power3.out', delay: 0.10 }; }
  });

  // Hero — staggered entrance on load (auto-play timeline)
  var heroTL = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });
  heroTL
    .from('.hero-tag',         { opacity: 0, x: 30 },  0.15)
    .from('.hero h1',          { opacity: 0, y: 28 },  0.30)
    .from('.hero-subtitle',    { opacity: 0, y: 20 },  0.55)
    .from('.hero-ctas > *',    { opacity: 0, y: 16, stagger: 0.08 }, 0.75)
    .from('.hero-trust .item', { opacity: 0, y: 14, stagger: 0.10 }, 0.95)
    .from('.hero-image',       { opacity: 0, x: -40, scale: 0.96, duration: 1.1, ease: 'expo.out' }, 0.20);

  // NOTE: Header CTA (phone icon + consult button) intentionally NOT animated by GSAP.
  // The previous gsap.from('.header-cta > *') was making the icon "disappear" on
  // some reloads because gsap.from() sets opacity:0 first — if anything delayed
  // the timeline, the header stayed invisible. Critical UI should be visible
  // immediately, no exceptions.

  // ---- IntersectionObserver: trigger gsap.to() when element enters viewport ----
  var animatedSelector = '.product-card, .material-card, .process-step, .project-card, .why-card, .qc-item, .stats-bar .stat, .cta-card, .quality-image-wrap, .tolerance-box, .section-eyebrow, .section-title, .section-desc';
  var animatedElements = gsap.utils.toArray(animatedSelector);

  if ('IntersectionObserver' in window) {
    var animObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          if (el.__animToVars && !el.__animPlayed) {
            el.__animPlayed = true;
            gsap.to(el, el.__animToVars);
            animObserver.unobserve(el);
          }
        }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    animatedElements.forEach(function(el) { animObserver.observe(el); });
  } else {
    // Fallback: animate everything immediately
    animatedElements.forEach(function(el) {
      if (el.__animToVars) gsap.to(el, el.__animToVars);
    });
  }

  // ---- Safety fallback: 4s after load, force-animate any stuck element ----
  // If IntersectionObserver never fired (e.g., element already in viewport at load
  // but observer missed it), this forces the entrance animation to play.
  // Note: this only PLAYS the animation (gsap.to), it does NOT reset state.
  setTimeout(function() {
    animatedElements.forEach(function(el) {
      if (!el.__animPlayed && el.__animToVars) {
        var rect = el.getBoundingClientRect();
        var inViewportNow = rect.top < window.innerHeight && rect.bottom > 0;
        if (inViewportNow) {
          el.__animPlayed = true;
          gsap.to(el, el.__animToVars);
        }
      }
    });
  }, 4000);
}

// ---- barba.js (page transitions — disabled for single-page site) ----
// barba is loaded but NOT initialized because this is a single-page site.
// Initializing barba here would intercept all link clicks and try to do
// PJAX page loads, which breaks in-page anchor navigation.
// To enable barba in the future when this becomes a multi-page site,
// add data-barba attributes to <body>/<main> and call barba.init() here.
if (typeof window.barba !== 'undefined' && false) {
  // intentionally disabled
  barba.init({});
}

// ============================================
// SITE BEHAVIOR
// ============================================

// Header scroll effect
(function() {
  var header = document.getElementById('header');
  function onScroll() {
    if (window.scrollY > 12) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Bottom Navigation: smooth scroll + auto-active via IntersectionObserver
(function() {
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.bottom-nav-item'));
  var sections = {};
  navItems.forEach(function(item) {
    var id = item.getAttribute('data-target');
    var el = document.getElementById(id);
    if (el) sections[id] = el;
  });

  function setActive(id) {
    navItems.forEach(function(item) {
      var isActive = item.getAttribute('data-target') === id;
      if (isActive) item.classList.add('is-active');
      else item.classList.remove('is-active');
    });
  }

  navItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      var id = item.getAttribute('data-target');
      var target = sections[id];
      if (!target) return;
      e.preventDefault();
      var headerHeight = 64;
      if (window.__lenis) {
        window.__lenis.scrollTo(target, { offset: -headerHeight, duration: 1.2 });
      } else {
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
      setActive(id);
    });
  });

  var visibleSections = {};
  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var id = entry.target.id;
        if (entry.isIntersecting) {
          visibleSections[id] = entry.intersectionRatio;
        } else {
          delete visibleSections[id];
        }
      });
      var bestId = null;
      var bestRatio = 0;
      for (var sid in visibleSections) {
        if (visibleSections[sid] > bestRatio) {
          bestRatio = visibleSections[sid];
          bestId = sid;
        }
      }
      if (bestId) setActive(bestId);
    }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    for (var id in sections) navObserver.observe(sections[id]);
  } else {
    var ticking = false;
    function onScrollDetect() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        var scrollY = window.pageYOffset + window.innerHeight * 0.4;
        var current = null;
        for (var sid in sections) {
          var rect = sections[sid].getBoundingClientRect();
          var top = rect.top + window.pageYOffset;
          if (scrollY >= top) current = sid;
        }
        if (current) setActive(current);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScrollDetect, { passive: true });
    onScrollDetect();
  }
})();

// Form submission
(function() {
  var form = document.getElementById('ctaForm');
  var submit = document.getElementById('formSubmit');
  var submitText = document.getElementById('submitText');
  var toast = document.getElementById('toast');

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    submit.disabled = true;
    submitText.textContent = 'در حال ارسال...';
    submit.innerHTML = '<span class="spinner"></span><span>در حال ارسال...</span>';

    setTimeout(function() {
      submit.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>ثبت شد — منتظر تماس باشید</span>';
      form.reset();

      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 3500);

      setTimeout(function() {
        submit.disabled = false;
        submit.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg><span>ثبت درخواست مشاوره</span>';
      }, 3500);
    }, 1100);
  });
})();
