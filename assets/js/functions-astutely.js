// gsap.registerPlugin(ScrollTrigger);

// let coloredSections = gsap.utils.toArray("[data-color]");
// coloredSections.forEach((section, i) => {
//   // grab the colors from the attribute
//   let [bgColor, color] = section.getAttribute("data-color").split(" ");
//   ScrollTrigger.create({
//     trigger: section,
//     start: "top center",
//     end: "bottom center",
//     markers: true,
//     onToggle: (self) => {
//       // whenever we enter a section from either direction (scrolling up or down), animate to its color
//       if (self.isActive) {
//         gsap.to("body", {
//           backgroundColor: bgColor, // target properties directly
//           '--color': color, // or css vars
//           overwrite: "auto"
//         });
//       }
//     }
//   });
// });

// Hero logo mouse-parallax removed — the logo stays fixed in scene 1 (no wobble).


// might also be helpful: https://codepen.io/GreenSock/pen/wvZraYz?editors=0010

gsap.registerPlugin(ScrollTrigger,ScrollSmoother);

// Don't re-refresh (and jump the pinned scenes) when the mobile address bar
// hides/shows, which only changes the viewport height. Keeps mobile scenes stable.
ScrollTrigger.config({ ignoreMobileResize: true });

// Reloading while scrolled down lets the browser restore that mid-page position BEFORE
// ScrollSmoother + the pinned scenes initialise, so they measure against the wrong scroll
// offset and scrolling can jam. It shows up on local reloads far more than a fast/cached
// production load. Turn off the browser's restore and force a clean start from the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
// Always open at the very top — also covers reloads and back/forward (bfcache) restores,
// which otherwise drop you mid-journey.
window.addEventListener('pageshow', function () { window.scrollTo(0, 0); });

// Recalculate every scene's pin position once the webfont (ModernEra) has loaded —
// it shifts the layout after ScrollTrigger's first measurement, which otherwise makes
// the scenes reveal at the wrong scroll point. NOTE: we deliberately do NOT refresh on
// window 'load' (all images). Homepage images have reserved space (aspect-ratio), so
// they don't move the layout, and that refresh fired seconds later — often mid-scroll
// through a scene — snapping the page and making later scenes flash/revert.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
}

// Only ScrollSmoother (the smooth-scroll layer) is disabled on mobile/touch — it
// is the fragile part that left the page stuck on scene 1. The pinned + scrubbed
// scenes themselves run everywhere; ScrollTrigger pinning works fine with native
// mobile scroll, so mobile keeps the same scene experience as desktop.
const isMobile =
  window.matchMedia('(max-width: 900px)').matches ||
  window.matchMedia('(pointer: coarse)').matches ||
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints || 0) > 0;

// ScrollSmoother is intentionally NOT created any more: the whole experience (desktop + mobile)
// is now the intent-driven transform slider further down, which owns all movement.

// Apply a scene's background + svg colour with a soft crossfade.
function setSceneColors(bgColor, svgColor) {
  gsap.to("body", {
    backgroundColor: bgColor,
    '--color': svgColor,
    overwrite: "auto",
    duration: 0.5
  });
  gsap.to(".wave-path", {
    fill: svgColor,
    overwrite: "auto",
    duration: 0.5
  });
}

// Each scene's background + watermark colour comes from its data-color attribute; the slider
// applies it on arrival (this replaces the old scroll-position colour triggers).
function sceneColorsFor(el) {
  const dc = el && el.getAttribute && el.getAttribute("data-color");
  return dc ? dc.split(" ") : null;
}

// Removed: the hero pin, the scroll-driven colour toggles, and the watermark's scroll-scrub
// travel. The slider sets each scene's colour on arrival and drifts the watermark per transition.

// gsap.to(":root", {
//   "--bg": bgColor,
//   "--svg-fill": svgColor,
//   duration: 0.5
// });

gsap.registerPlugin(SplitText);
const _splitInstances = [];   // so mobile can revert them to plain text
let heroIntro = null;         // hero reveal timeline; played once everything has loaded (loader lifts)
const sceneReveals = new Map();   // scene element -> its (paused) reveal timeline, played on arrival by the slider
let advanceScene = function () {};   // set by the slider; the scene arrows call it to go to the next scene

// --- "A NEW ERA FOR AY" scene -------------------------------------------------
// Same principle as the hero: pin the section and reveal the heading, then the
// supporting text, as the user scrolls. The arrow holds in place (visible)
// until the reveal is complete, then fades so the user continues down.
// Shared scene timing (used by every pinned scene below). Declared outside the
// mobile guard so it stays in scope for the team/work/contact/sign-off scenes.
// Every pinned scene is driven at the SAME scrub rate: the pin's scroll length is
// proportional to its timeline duration (SCENE_RATE viewports per timeline second).
// Each scene ends with a fixed SCENE_HOLD, so the "breathing room" after the reveal
// completes is an identical ~1 viewport of still, un-animating scroll on every scene.
const SCENE_RATE = 0.55;   // viewports of scroll per second of timeline
const SCENE_HOLD = 2.0;    // seconds of hold => SCENE_RATE*SCENE_HOLD viewports of buffer
const sceneEnd = (getTl) => () => {
  const tl = getTl();
  return "+=" + ((tl ? tl.duration() : 2) * SCENE_RATE * window.innerHeight);
};

// Smoothly scroll a fraction into a pinned scene so its scrubbed reveal eases in as we
// arrive. Driven by a long eased tween (not the smoother's quick default), via scrollTo()
// so the native scrollbar stays in sync and ScrollSmoother doesn't snap at the end.
function gentleScrollToScene(triggerId, fraction) {
  const st = (window.ScrollTrigger && ScrollTrigger.getById) ? ScrollTrigger.getById(triggerId) : null;
  if (!st) return;
  const smoother = (window.ScrollSmoother && ScrollSmoother.get) ? ScrollSmoother.get() : null;
  const target = st.start + (st.end - st.start) * fraction;
  const getY = smoother ? () => smoother.scrollTop() : () => window.scrollY;
  const setY = smoother ? (y) => smoother.scrollTo(y) : (y) => window.scrollTo(0, y);
  const proxy = { y: getY() };
  gsap.to(proxy, { y: target, duration: 2.6, ease: "power2.inOut", overwrite: true, onUpdate: () => setY(proxy.y) });
}

{  // "A New Era" scene — runs on all devices (pins work with native scroll)
  const eraHeading = SplitText.create(".body h2", { type: "chars", mask: "chars" });
  _splitInstances.push(eraHeading);
  const eraText = SplitText.create(".body .text", { type: "words" });
  _splitInstances.push(eraText);

  // start state: heading + text hidden, arrow visible
  gsap.set(eraHeading.chars, { yPercent: 100, opacity: 0 });
  gsap.set(eraText.words, { y: 30, opacity: 0, color: "#F5F5F5" });
  gsap.set(".era-logo", { autoAlpha: 0 });          // the "Astutely" wordmark
  gsap.set(".era-logo__hi-fill", { scaleX: 0 });    // highlighter swipe, drawn on scroll
  gsap.set(".era-logo__ink", { width: "0%" });      // black wordmark, revealed with the swipe
  gsap.set(".body .arrow", { autoAlpha: 1 });

  let eraTimeline = gsap.timeline({ paused: true });   // played on arrival by the slider

  eraTimeline
    // heading rises in, character by character (clipped by its mask)
    .to(eraHeading.chars, {
      yPercent: 0, opacity: 1,
      stagger: 0.04, ease: "power3.out"
    })
    // supporting text rises in word by word, settling from green to navy
    .to(eraText.words, {
      y: 0, opacity: 1, color: "#F5F5F5",
      stagger: 0.03, ease: "power2.out"
    }, "-=0.2")
    // the Astutely wordmark fades in just after "AY Studio is now" has landed...
    .to(".era-logo", {
      autoAlpha: 1, duration: 0.4, ease: "power2.out"
    }, "<0.5")
    // ...then the highlighter sweeps across it, bottom-left to top-right,
    // and the black wordmark is revealed in the same motion so highlighted letters read black
    .to(".era-logo__hi-fill", {
      scaleX: 1, duration: 0.5, ease: "power2.out"
    }, ">-0.1")
    .to(".era-logo__ink", {
      width: "100%", duration: 0.5, ease: "power2.out"
    }, "<");
  sceneReveals.set(document.querySelector(".body"), eraTimeline);
}

// --- Scene 1 intro -----------------------------------------------------------
// Plays once on load: the background (ASTUTELY watermark) fades in, the logo fades
// on, then the tagline words fade in one after another, and the arrow appears last.
// Clicking the arrow advances past the whole hero to scene 2 in one smooth move.
// (The watermark's left drift on scroll lives further up.)
{
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    const heroTag = SplitText.create("#tagline", { type: "words" });
    _splitInstances.push(heroTag);
    gsap.set(".svg-bg", { autoAlpha: 0 });
    gsap.set(".header .logo-outer", { autoAlpha: 0 });
    gsap.set(heroTag.words, { autoAlpha: 0, y: 12 });
    gsap.set(".header .arrow", { autoAlpha: 0 });

    heroIntro = gsap.timeline({ delay: 0.2, paused: true })                                        //    paused: plays when the loader lifts
      .to(".svg-bg", { autoAlpha: 1, duration: 0.9, ease: "power2.out" })                          // 1. background fades in
      .to(".header .logo-outer", { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, "-=0.35")    // 2. logo fades on
      .to(heroTag.words, { autoAlpha: 1, y: 0, stagger: 0.28, duration: 0.5, ease: "power2.out" }, "-=0.15") //    words fade in one after another
      .to(".header .arrow", { autoAlpha: 1, duration: 0.45, ease: "power2.out" }, "-=0.1");        //    arrow appears
  }

  // (The hero reveal timeline is played by the slider's start(), in step with the loader.)

  // Each scene arrow advances to the next scene via the slider.
  const heroArrow = document.querySelector(".header .arrow");
  if (heroArrow) { heroArrow.style.cursor = "pointer"; heroArrow.addEventListener("click", () => advanceScene()); }
  const eraArrow = document.querySelector(".body .arrow");
  if (eraArrow) { eraArrow.style.cursor = "pointer"; eraArrow.addEventListener("click", () => advanceScene()); }
}



// --- Main navigation -------------------------------------------------------
// Hidden through the first (hero) scene only. Once the visitor scrolls past it
// into the second scene it slides in gracefully, and from then on behaves as a
// smart nav everywhere: shows on scroll-up, hides on scroll-down, and stays put
// when idle (a velocity deadzone ignores the smooth-scroll settle so it doesn't
// vanish on its own).
const homeNav = document.querySelector(".home-nav");

if (homeNav) {
  gsap.set(homeNav, { yPercent: -100, autoAlpha: 0 });

  let shown = false;
  let revealed = false;
  let introGrace = false;

  const showNav = () => {
    if (shown) return;
    shown = true;
    gsap.to(homeNav, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", overwrite: true });
  };
  const hideNav = () => {
    if (!shown) return;
    shown = false;
    gsap.to(homeNav, { yPercent: -100, autoAlpha: 0, duration: 0.4, ease: "power2.in", overwrite: true });
  };

  // First reveal — only the once, as the second scene comes in (after the hero).
  ScrollTrigger.create({
    trigger: ".body",
    start: "top 80%",
    once: true,
    onEnter: () => {
      revealed = true;
      showNav();
      introGrace = true; // hold it in place while the reveal scroll settles
      gsap.delayedCall(1.2, () => { introGrace = false; });
    }
  });

  // Smart-nav behaviour across the whole page, active after the first reveal.
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (!revealed || introGrace) return;
      const v = self.getVelocity();
      if (v > 60) hideNav();        // scrolling down
      else if (v < -60) showNav();  // scrolling up
    }
  });
}



const isTouchDevice = 'ontouchstart' in window;

const createCursorFollower = () => {
  const $el = document.querySelector('.cursor-follower');
  
  // Each time the mouse coordinates are updated, we need to pass the values to gsap in order to animate the element
  window.addEventListener('mousemove', (e) => {
    const { target, x, y } = e;

    const isTargetLinkOrBtn = target?.closest('a') || target?.closest('button');

    gsap.to($el, {
      x: x + 3,
      y: y + 3,
      duration: 0.35, // lower = snappier follow (raise toward 0.7 for more lag)
      ease: 'power3', // More easing options here: https://gsap.com/docs/v3/Eases/
      opacity: 1, // keep full opacity so the invert (difference blend) stays clean
      scale: isTargetLinkOrBtn ? 0.5 : 1, // shrink over links/buttons
    });
  });

  document.addEventListener('mouseleave', (e) => {
    gsap.to($el, {
      duration: 0.7,
      opacity: 0,
    });
  });
}

// Only create the cursor follower if device isn't touchable
if (!isTouchDevice) {
  createCursorFollower();
}




// --- Scene flow: pin each section and reveal its content on scrub -----------
// Same principle as the "A New Era" scene, so the page reads as a sequence of
// scenes rather than reverting to a plain scroll. Initial (hidden) states live
// inside the guard so reduced-motion and mobile users see the content laid out flat.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {

  // Meet the team: the cluster assembles in one continuous motion, each photo
  // drifting in from a different direction (left/right/up/down + slight tilt) to
  // its resting offset. Curated entry vectors + varied durations so it feels
  // organically scattered, not a uniform rise.
  const teamPhotos = gsap.utils.toArray(".team__member");
  const teamEndY = [-90, 70, -120, 80];             // final resting offset per photo
  const teamStartX = [-150, 140, -95, 120];         // entry drift on X per photo
  const teamStartDY = [-80, 105, 135, -110];        // entry drift on Y (added to resting)
  const teamStartRot = [-6, 5, 4.5, -5];            // slight tilt on entry
  const teamDur = [1.75, 2.15, 1.9, 2.3];           // slightly different per photo → floating feel
  gsap.set(teamPhotos, {
    autoAlpha: 0, scale: 0.9,
    x: (i) => teamStartX[i] || 0,
    y: (i) => (teamEndY[i] || 0) + (teamStartDY[i] || 0),
    rotation: (i) => teamStartRot[i] || 0
  });

  const teamTl = gsap.timeline({ paused: true });
  teamTl
    .to(teamPhotos, { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: "power2.out" }, 0)
    .to(teamPhotos, {                       // single drift from its own direction to rest
      x: 0,
      y: (i) => teamEndY[i] || 0,
      rotation: 0,
      duration: (i) => teamDur[i] || 1.9,
      stagger: 0.12, ease: "sine.inOut"
    }, 0);
  sceneReveals.set(document.querySelector(".team"), teamTl);
  // The "Meet the team" title runs as a seamless CSS marquee, independent of the slider.

  // Work: the card slider fades up, the tagline reveals word by word, logos follow.
  const workView = document.querySelector(".work-slider__viewport");
  const logoView = document.querySelector(".logo-slider__viewport");
  const taglineEl = document.querySelector(".work-tagline");
  const taglineWords = taglineEl ? SplitText.create(taglineEl, { type: "words" }) : null;
  if (taglineWords) _splitInstances.push(taglineWords);

  // The viewport container is the "gate": it stays hidden between scenes (its inline
  // style survives the marquee's innerHTML rebuild, unlike the individual cards). On
  // arrival we reveal the gate, then stagger the *live* cards in one after another.
  const workWords = taglineWords ? taglineWords.words : [];
  gsap.set(workView, { autoAlpha: 0 });
  gsap.set(logoView, { autoAlpha: 0, y: 40 });
  if (workWords.length) gsap.set(workWords, { y: 28, opacity: 0 });

  const workReveal = {
    tl: null,
    play: function () {
      if (this.tl) this.tl.kill();
      gsap.set(workView, { autoAlpha: 1 });
      // Query cards live (the marquee rebuilds them); stagger the on-screen ones in.
      var cards = gsap.utils.toArray(".work-marquee > .work-card").slice(0, 6);
      var tl = gsap.timeline();
      tl.fromTo(cards, { autoAlpha: 0, y: 46 },
        { autoAlpha: 1, y: 0, stagger: 0.13, duration: 0.55, ease: "power2.out" }, 0);
      if (workWords.length) tl.fromTo(workWords, { y: 28, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.04, duration: 0.6, ease: "power2.out" }, 0.6);
      tl.fromTo(logoView, { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.85);
      this.tl = tl;
    },
    pause: function () {
      if (this.tl) { this.tl.kill(); this.tl = null; }
      gsap.set([workView, logoView], { autoAlpha: 0 });
      if (workWords.length) gsap.set(workWords, { opacity: 0 });
    }
  };
  sceneReveals.set(document.querySelector(".work-slider"), workReveal);

  // Contact: heading rises, then details and map.
  const contactTitle = document.querySelector(".footer-info__title");
  const contactLines = gsap.utils.toArray(".footer-line");
  const contactMap = document.querySelector(".footer-map");

  gsap.set([contactTitle, ...contactLines], { y: 42, autoAlpha: 0 });
  gsap.set(contactMap, { autoAlpha: 0, scale: 0.94 });

  const contactTl = gsap.timeline({ paused: true });
  contactTl
    .to(contactTitle, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" })
    .to(contactLines, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.42, ease: "power2.out" }, "-=0.1")
    .to(contactMap, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }, "<");
  sceneReveals.set(document.querySelector(".footer--contact"), contactTl);

  // Sign-off: a separate closing scene — the Astutely wordmark and straplines settle in.
  const signoffItems = gsap.utils.toArray(".footer-base > *");
  gsap.set(signoffItems, { autoAlpha: 0, y: 46 });

  const signoffTl = gsap.timeline({ paused: true });
  signoffTl.to(signoffItems, { autoAlpha: 1, y: 0, stagger: 0.16, duration: 0.7, ease: "power3.out" });
  sceneReveals.set(document.querySelector(".footer--signoff"), signoffTl);
}


// --- Robust infinite marquees: work cards + client logos --------------------
// A CSS translate-marquee with two copies leaves a blank gap (which reads as the
// scroll "stopping") whenever one copy is narrower than the viewport — always the
// case for the logos, and for the work cards on wide screens. This measures the
// content, clones it until it always over-fills the viewport, then drives it with
// a constant-velocity GSAP tween. Seamless at any item count / width / screen size,
// and it re-measures once images load and on resize.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function buildMarquee(track, speed, direction) {   // speed = px/sec; direction 1 = left, -1 = right
    if (!track) return null;
    const viewport = track.parentElement;
    const base = track.dataset.marqueeBase || (track.dataset.marqueeBase = track.innerHTML);
    let tween = null, hovered = false;

    function layout() {
      if (tween) { tween.kill(); tween = null; }
      track.innerHTML = base;                    // reset to the pristine content
      gsap.set(track, { x: 0 });
      const baseWidth = track.scrollWidth;
      if (!baseWidth || !viewport.offsetWidth) return;
      // Clone the whole content until there's always a full base copy beyond the
      // viewport to translate into (guarded against a runaway loop).
      let guard = 0;
      while (track.scrollWidth < viewport.offsetWidth + baseWidth && guard++ < 30) {
        track.insertAdjacentHTML('beforeend', base);
      }
      tween = gsap.fromTo(track,
        { x: direction < 0 ? -baseWidth : 0 },
        { x: direction < 0 ? 0 : -baseWidth, duration: baseWidth / speed, ease: 'none', repeat: -1 }
      );
      if (hovered) tween.pause();
      // Image widths drive baseWidth; if any are still loading, re-measure when each
      // finishes so the loop distance stays exact and the marquee doesn't jump/restart.
      track.querySelectorAll('img').forEach(function (img) {
        if (!img.complete || !img.naturalWidth) img.addEventListener('load', layout, { once: true });
      });
    }

    layout();
    viewport.addEventListener('mouseenter', () => { hovered = true; if (tween) tween.pause(); });
    viewport.addEventListener('mouseleave', () => { hovered = false; if (tween) tween.resume(); });
    return layout;
  }

  const relayouts = [
    buildMarquee(document.querySelector('.work-marquee'), 55, 1),   // work cards scroll left
    buildMarquee(document.querySelector('.logo-marquee'), 45, -1)   // logos scroll right
  ].filter(Boolean);

  const relayoutAll = () => relayouts.forEach(function (fn) { fn(); });
  // Re-measure once images are loaded (logo widths depend on them) and on resize.
  window.addEventListener('load', relayoutAll);
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    // Ignore height-only changes (mobile address bar hiding/showing on scroll) — those
    // fire "resize" constantly while scrolling and would restart the marquee every time.
    // Only re-measure when the WIDTH actually changes (orientation flip / real resize).
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayoutAll, 200);
  });
})();


// --- Mobile (phones ≤767px): swap the pinned scrollytelling for a clean flat scroll ---------
// Tablet and up keep the full desktop experience. On phones the pins + scroll-scrubbing are
// fragile with touch + the address-bar resize, so we tear them down, reveal everything in its
// final state, and add gentle per-section fade-ins instead. Runs only on phones, so desktop
// and tablet are completely unaffected.
// --- Intent-driven slider (desktop + mobile). Free scroll is removed: a swipe (touch) or a
//     wheel/trackpad notch (desktop) advances exactly one scene, and each scene's content
//     animates in ON ARRIVAL. Desktop plays the rich per-scene timelines; phones revert the
//     split text to flat copy and use lighter fade-ups. Movement is a GPU-composited transform.
(function () {
  var scenes = Array.prototype.slice.call(document.querySelectorAll(
    '.header, .body, .team, .work-slider, .footer--contact, .footer--signoff'));
  var content = document.getElementById('smooth-content');
  if (!content || scenes.length < 2) return;

  var isPhone = window.matchMedia('(max-width: 767px)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav: hidden on the hero, shown only when moving back UP the page.
  gsap.set('.home-nav', { clearProps: 'all' });
  var mNav = document.querySelector('.home-nav'), mNavShown = false;
  var mShowNav = function () {}, mHideNav = function () {};
  if (mNav) {
    gsap.set(mNav, { yPercent: -100, autoAlpha: 0 });
    mShowNav = function () { if (mNavShown) return; mNavShown = true; gsap.to(mNav, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out', overwrite: true }); };
    mHideNav = function () { if (!mNavShown) return; mNavShown = false; gsap.to(mNav, { yPercent: -100, autoAlpha: 0, duration: 0.35, ease: 'power2.in', overwrite: true }); };
  }

  // --- reveal system ---
  // Phones: flatten the split text and fade whole blocks. Desktop: play the registered rich timelines.
  var phoneSel = [ null, 'h2, .text', '.team__titlewrap, .team__member',
    '.work-slider__viewport, .work-outro, .logo-slider__viewport', '.footer-info, .footer-map', '.footer-base' ];
  var phoneEls = function (i) { return phoneSel[i] ? Array.prototype.slice.call(scenes[i].querySelectorAll(phoneSel[i])) : []; };
  if (isPhone) {
    _splitInstances.forEach(function (s) { if (s && s.revert) s.revert(); });
    gsap.set([
      '.header .container', '.header .logo-outer', '.header .arrow', '#tagline',
      '.body h2', '.body .text', '.era-logo', '.era-logo__hi-fill', '.era-logo__ink',
      '.team__member', '.work-slider__viewport', '.logo-slider__viewport', '.work-tagline',
      '.footer-info', '.footer-info__title', '.footer-line', '.footer-map',
      '.footer-base', '.footer-base > *'
    ], { clearProps: 'all' });
    if (!reduce) for (var s2 = 1; s2 < scenes.length; s2++) gsap.set(phoneEls(s2), { autoAlpha: 0, y: 22 });
  }
  var playReveal = function (i) {
    if (reduce) return;
    if (i === 0) { if (heroIntro) heroIntro.play(0); return; }     // hero handled by its own intro
    if (isPhone) gsap.to(phoneEls(i), { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.14, ease: 'power2.out', overwrite: true });
    else { var tl = sceneReveals.get(scenes[i]); if (tl) tl.play(0); }
  };
  var armReveal = function (i) {                                    // reset a scene so it re-animates on return
    if (reduce || i === 0) return;
    if (isPhone) gsap.set(phoneEls(i), { autoAlpha: 0, y: 22 });
    else { var tl = sceneReveals.get(scenes[i]); if (tl) tl.pause(0); }
  };

  // scene background/watermark colour + a subtle watermark drift, applied as each scene arrives.
  var drift = function (i) { return -(i * 85 / (scenes.length - 1)); };
  var applyScene = function (i) {
    var c = sceneColorsFor(scenes[i]);
    if (c) setSceneColors(c[0], c[1]);
    gsap.to('.scroll-svg', { xPercent: drift(i), duration: reduce ? 0 : 0.9, ease: 'power2.inOut', overwrite: true });
  };

  // --- transform-based navigation ---
  var sceneOffset = function (i) { return scenes[i].offsetTop; };
  var vh = function () { return window.innerHeight || document.documentElement.clientHeight; };
  var pos = 0, setY = function (p) { pos = p; content.style.transform = 'translate3d(0,' + (-p) + 'px,0)'; };
  var current = 0, animating = false, ready = false;

  var settleTo = function (i) {
    i = Math.max(0, Math.min(scenes.length - 1, i));
    if (i === current || animating) return;
    animating = true;
    if (i === 0) mHideNav(); else if (i < current) mShowNav(); else mHideNav();
    applyScene(i);                                       // colour + watermark drift DURING the slide
    var fromY = pos, toY = sceneOffset(i);
    var frac = Math.min(1, Math.abs(toY - fromY) / vh());
    var proxy = { y: fromY };
    gsap.to(proxy, {
      y: toY, duration: reduce ? 0 : (0.55 + frac * 0.6), ease: 'power2.inOut', overwrite: true,
      onUpdate: function () { setY(proxy.y); },
      onComplete: function () {
        setY(sceneOffset(i));
        var prev = current; current = i; animating = false;
        armReveal(prev); playReveal(i);                  // content animates IN only after arrival
      }
    });
  };
  advanceScene = function () { if (ready && !animating) settleTo(current + 1); };   // used by the scene arrows

  // --- input: touch (swipe = direction) ---
  var fired = false, sy = 0, sx = 0;
  window.addEventListener('touchstart', function (e) {
    if (!ready || animating || e.touches.length !== 1) { fired = true; return; }
    fired = false; sy = e.touches[0].clientY; sx = e.touches[0].clientX;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!ready) return;
    if (e.touches.length !== 1) { fired = true; return; }          // let pinch-zoom through
    e.preventDefault();
    if (fired || animating) return;
    var dy = sy - e.touches[0].clientY, dx = sx - e.touches[0].clientX;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    fired = true; settleTo(current + (dy > 0 ? 1 : -1));
  }, { passive: false });
  window.addEventListener('touchend', function () { fired = false; }, { passive: true });

  // --- input: wheel / trackpad (desktop) — one notch = one scene, with a momentum cooldown ---
  var wheelLock = false, wheelTimer = null;
  var bumpLock = function () { clearTimeout(wheelTimer); wheelTimer = setTimeout(function () { wheelLock = false; }, 240); };
  window.addEventListener('wheel', function (e) {
    e.preventDefault();                                  // no free scroll
    if (!ready || Math.abs(e.deltaY) < 6) return;
    if (wheelLock || animating) { bumpLock(); return; }  // ignore + keep the lock alive through the momentum
    wheelLock = true; bumpLock();
    settleTo(current + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // --- input: keyboard ---
  window.addEventListener('keydown', function (e) {
    if (!ready || animating) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); settleTo(current + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); settleTo(current - 1); }
  });

  // start at the top; unlock only once fully loaded (the loader covers the screen till then).
  var started = false;
  var start = function () {
    if (started) return; started = true;
    current = 0; setY(0); applyScene(0); playReveal(0); ready = true;
  };
  setY(0);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
  setTimeout(start, 4200);                               // fallback: unlock if 'load' never fires (runs once)
  window.addEventListener('pageshow', function (e) { if (e.persisted && current !== 0) { current = 0; setY(0); } });
  window.addEventListener('resize', function () { if (!animating) setY(sceneOffset(current)); });
})();


// --- "A New Era" copy: match the desktop line breaks on mobile too --------------
// Desktop uses <br class="era-break"> to control the phrasing. On phones we enable the
// same breaks and scale the paragraphs so the longest intended line just fits the
// width — the copy then reads exactly as designed (just smaller). Fallback: if this
// never runs, .era-fit is never added and phones keep natural wrapping.
(function () {
  var body = document.querySelector('.body');
  if (!body) return;
  var paras = Array.prototype.slice.call(body.querySelectorAll('p.text'));
  if (!paras.length) return;
  var mq = window.matchMedia('(max-width: 767px)');

  function widestLine(p) {                        // widest <br>-delimited line box (nowrap)
    var range = document.createRange();
    range.selectNodeContents(p);
    var rects = range.getClientRects(), w = 0;
    for (var i = 0; i < rects.length; i++) if (rects[i].width > w) w = rects[i].width;
    if (range.detach) range.detach();
    return w;
  }

  function fit() {
    if (!mq.matches) {                             // tablet/desktop: leave CSS in charge
      body.classList.remove('era-fit');
      paras.forEach(function (p) { p.style.fontSize = ''; });
      return;
    }
    body.classList.add('era-fit');                 // show the breaks + nowrap the lines
    paras.forEach(function (p) { p.style.fontSize = ''; });   // measure at the CSS base size
    var scale = Infinity;
    paras.forEach(function (p) {
      var cs = getComputedStyle(p);
      var avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var cur = parseFloat(cs.fontSize), widest = widestLine(p);
      if (avail > 0 && cur > 0 && widest > 0) scale = Math.min(scale, cur * avail / widest);
    });
    if (scale === Infinity) return;
    var size = Math.max(11, Math.min(scale * 0.97, 30));      // largest that fits, within reason
    paras.forEach(function (p) { p.style.fontSize = size.toFixed(2) + 'px'; });
  }

  fit();
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (mq.addEventListener) mq.addEventListener('change', fit);
})();
