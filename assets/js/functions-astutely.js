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

// create the scrollSmoother before your scrollTriggers (desktop only)
if (!isMobile) {
  ScrollSmoother.create({
    smooth: 1.25, // how long (in seconds) it takes to "catch up" to the native scroll position
    effects: true, // looks for data-speed and data-lag attributes on elements
    smoothTouch: 0.1 // much shorter smoothing time on touch devices (default is NO smoothing on touch devices)
  });
}

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

let coloredSections = gsap.utils.toArray("[data-color]");

coloredSections.forEach((section) => {

  let [bgColor, svgColor] =
    section.getAttribute("data-color").split(" ");

  ScrollTrigger.create({
    trigger: section,
    start: "top center",
    end: "bottom center",
    markers: false,

    onToggle: (self) => {
      if (self.isActive) setSceneColors(bgColor, svgColor);
    }
  });
});

{  // hero pin — runs on mobile too (native scroll); only ScrollSmoother is desktop-only
  ScrollTrigger.create({
    trigger: ".header",
    start: "top top",
    endTrigger: ".body",
    end: "top 78%",
    pin: ".header .container",
    pinSpacing: false,
    scrub: true,
    markers: false
  });

  // Pin the hero arrow alongside the logo so it stays put (doesn't scroll away)
  // while the tagline appears. Same range as the .container pin above.
  ScrollTrigger.create({
    trigger: ".header",
    start: "top top",
    endTrigger: ".body",
    end: "top 78%",
    pin: ".header .arrow",
    pinSpacing: false,
    markers: false
  });
}

// gsap.registerPlugin(ScrollTrigger);

gsap.to(".scroll-svg", {
  // Travel mapped across the whole page so the end of "astutely" is reached just
  // as the site ends. -33 stopped at "Astut", -75 overshot — -65 lands on the
  // final letter at the page bottom. (Tune between those values.)
  xPercent: -85,
  ease: "none",
  scrollTrigger: {
    trigger: "#smooth-content",
    start: "top top",
    end: "bottom bottom",
    scrub: 1, // ~1s smoothing so the watermark glides rather than tracking 1:1
    // Refresh AFTER the pinned scenes (team/work/contact/sign-off) so "bottom bottom"
    // measures the full page including their pin spacing. Without this the travel
    // finishes around "meet the team" (where the pinning starts) and then sits still.
    refreshPriority: -1,
    markers: false
  }
});

// gsap.to(":root", {
//   "--bg": bgColor,
//   "--svg-fill": svgColor,
//   duration: 0.5
// });

gsap.registerPlugin(SplitText);
const _splitInstances = [];   // so mobile can revert them to plain text
let heroIntro = null;         // hero reveal timeline; played once everything has loaded (loader lifts)

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

  let eraTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".body",
      id: "era",
      start: "top top",
      end: sceneEnd(() => eraTimeline),   // length tracks the timeline, incl. the hold
      pin: true,
      pinSpacing: true,
      scrub: true,
      markers: false
    }
  });

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
    }, "<")
    // breathing room: the fully-revealed scene sits still before releasing to the next.
    // (The arrow stays visible as the "advance to Meet the team" cue.)
    .to({}, { duration: SCENE_HOLD });
}

// Scrolling back UP, the centre-based colour trigger above fires too late
// because the body is pinned (its measured edges sit at the top of the pin
// spacer). This anchors the green to a fixed scroll-distance from the scene's
// start instead, so it returns early — before the dark body text is legible.
// "top top" matches the pin start; raise the "190%" to bring the green back even
// sooner when scrolling up (lower it if the footer's text catches the green).
const [bodyBg, bodySvg] = document.querySelector(".body").getAttribute("data-color").split(" ");

ScrollTrigger.create({
  trigger: ".body",
  start: "top top",
  end: "+=190%",
  markers: false,
  onEnterBack: () => setSceneColors(bodyBg, bodySvg)
});

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

  // Play the hero reveal once the page has fully loaded (in step with the loader fading out).
  // Fallback timeout guarantees the hero never stays hidden if 'load' is slow.
  (function () {
    let played = false;
    const playHero = function () { if (played) return; played = true; if (heroIntro) heroIntro.play(0); };
    if (document.readyState === 'complete') playHero();
    else window.addEventListener('load', playHero);
    setTimeout(playHero, 4200);
  })();

  // 3. Each scene arrow gently advances to the next scene, easing its reveal in.
  const heroArrow = document.querySelector(".header .arrow");
  if (heroArrow) {
    heroArrow.style.cursor = "pointer";
    heroArrow.addEventListener("click", () => gentleScrollToScene("era", 0.6));   // hero -> A New Era
  }
  const eraArrow = document.querySelector(".body .arrow");
  if (eraArrow) {
    eraArrow.style.cursor = "pointer";
    eraArrow.addEventListener("click", () => gentleScrollToScene("team", 0.6));    // A New Era -> Meet the team
  }
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

  // Meet the team: the photo cluster rises in, then drifts (parallax) before release.
  const teamPhotos = gsap.utils.toArray(".team__member");
  gsap.set(teamPhotos, { autoAlpha: 0, y: 90, scale: 0.86 });

  const teamTl = gsap.timeline({
    scrollTrigger: { trigger: ".team", id: "team", start: "top top", end: sceneEnd(() => teamTl), pin: true, pinSpacing: true, scrub: true }
  });
  teamTl
    .to(teamPhotos, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.12, duration: 0.8, ease: "power3.out" })
    .to(teamPhotos, {                       // depth drift, then freeze in place
      y: (i) => [-90, 70, -120, 80][i] || 0,
      duration: 0.9, ease: "power1.inOut"
    }, ">")
    // breathing room: photos hold still (frozen) before the scene releases
    .to({}, { duration: SCENE_HOLD });
  // The "Meet the team" title runs as a seamless CSS marquee, independent of scroll.

  // Work: the card slider fades up, the tagline reveals word by word, logos follow.
  const workView = document.querySelector(".work-slider__viewport");
  const logoView = document.querySelector(".logo-slider__viewport");
  const taglineEl = document.querySelector(".work-tagline");
  const taglineWords = taglineEl ? SplitText.create(taglineEl, { type: "words" }) : null;
  if (taglineWords) _splitInstances.push(taglineWords);

  gsap.set(workView, { autoAlpha: 0, y: 70 });
  if (taglineWords) gsap.set(taglineWords.words, { y: 28, opacity: 0 });
  gsap.set(logoView, { autoAlpha: 0, y: 40 });

  const workTl = gsap.timeline({
    scrollTrigger: { trigger: ".work-slider", start: "top top", end: sceneEnd(() => workTl), pin: true, pinSpacing: true, scrub: true }
  });
  workTl.to(workView, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" });
  if (taglineWords) workTl.to(taglineWords.words, { y: 0, opacity: 1, stagger: 0.04, duration: 0.6, ease: "power2.out" }, ">-0.1");
  workTl.to(logoView, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, ">-0.05");
  // breathing room: logos hold visible before the scene releases
  workTl.to({}, { duration: SCENE_HOLD });

  // Contact: heading rises, then details and map.
  const contactTitle = document.querySelector(".footer-info__title");
  const contactLines = gsap.utils.toArray(".footer-line");
  const contactMap = document.querySelector(".footer-map");

  gsap.set([contactTitle, ...contactLines], { y: 42, autoAlpha: 0 });
  gsap.set(contactMap, { autoAlpha: 0, scale: 0.94 });

  const contactTl = gsap.timeline({
    scrollTrigger: { trigger: ".footer--contact", start: "top top", end: sceneEnd(() => contactTl), pin: true, pinSpacing: true, scrub: true }
  });
  contactTl
    .to(contactTitle, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" })
    .to(contactLines, { y: 0, autoAlpha: 1, stagger: 0.14, duration: 0.6, ease: "power2.out" }, "-=0.05")
    .to(contactMap, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" }, "<")
    // breathing room: contact details hold before releasing to the sign-off
    .to({}, { duration: SCENE_HOLD });

  // Sign-off: a separate closing scene — the Astutely wordmark and straplines settle in.
  const signoffItems = gsap.utils.toArray(".footer-base > *");
  gsap.set(signoffItems, { autoAlpha: 0, y: 46 });

  const signoffTl = gsap.timeline({
    scrollTrigger: { trigger: ".footer--signoff", start: "top top", end: sceneEnd(() => signoffTl), pin: true, pinSpacing: true, scrub: true }
  });
  signoffTl
    .to(signoffItems, { autoAlpha: 1, y: 0, stagger: 0.16, duration: 0.7, ease: "power3.out" })
    // breathing room: the sign-off holds fully revealed before the page ends
    .to({}, { duration: SCENE_HOLD });
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
if (window.matchMedia('(max-width: 767px)').matches) {
  // 1. remove every pin / scrub / scroll-driven trigger
  ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
  // restore split headings/copy to plain flowing text (no per-char blocks)
  _splitInstances.forEach(function (s) { if (s && s.revert) s.revert(); });

  // 2. reveal everything the desktop timelines had hidden or transformed (incl. SplitText parts)
  gsap.set([
    '.svg-bg', '.scroll-svg',
    '.header .container', '.header .logo-outer', '.header .arrow', '#tagline', '#tagline *',
    '.body h2', '.body h2 *', '.body .text', '.body .text *',
    '.era-logo', '.era-logo__hi-fill', '.era-logo__ink',
    '.team__member', '.work-slider__viewport', '.logo-slider__viewport', '.work-tagline', '.work-tagline *',
    '.footer--contact .container', '.footer--contact .container *', '.footer-map',
    '.footer--signoff .container', '.footer--signoff .container *'
  ], { clearProps: 'all' });

  // 3. nav: hidden on the hero scene, shown on the rest — driven by the slider (step 5).
  gsap.set('.home-nav', { clearProps: 'all' });
  var mNav = document.querySelector('.home-nav');
  var mNavShown = false;
  var mShowNav = function () {}, mHideNav = function () {};
  if (mNav) {
    gsap.set(mNav, { yPercent: -100, autoAlpha: 0 });   // hidden at rest / at the top
    mShowNav = function () {
      if (mNavShown) return; mNavShown = true;
      gsap.to(mNav, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out', overwrite: true });
    };
    mHideNav = function () {
      if (!mNavShown) return; mNavShown = false;
      gsap.to(mNav, { yPercent: -100, autoAlpha: 0, duration: 0.35, ease: 'power2.in', overwrite: true });
    };
  }
  // 4. one calm background (no scroll-driven colour changes)
  gsap.set('body', { clearProps: 'backgroundColor' });

  // 5. Mobile slider: a locked, one-scene-per-swipe journey (fullPage-style). Native scroll is
  //    disabled, each swipe moves exactly one scene (or back one), the transition can't be
  //    interrupted, and each scene's content animates IN only after the slide has arrived.
  //    Sliding stays locked until the page has fully loaded (the loader covers the screen).
  (function () {
    var scenes = Array.prototype.slice.call(document.querySelectorAll(
      '.header, .body, .team, .work-slider, .footer--contact, .footer--signoff'));
    if (scenes.length < 2) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // content that animates in on arrival, selectors RELATIVE to each scene.
    // scene 0 (hero) is handled by the hero intro timeline, so it's null.
    var sceneSel = [
      null,
      'h2, .text',
      '.team__titlewrap, .team__member',
      '.work-slider__viewport, .work-outro, .logo-slider__viewport',
      '.footer-info, .footer-map',
      '.footer-base'
    ];
    var els = function (i) {
      return sceneSel[i] ? Array.prototype.slice.call(scenes[i].querySelectorAll(sceneSel[i])) : [];
    };
    if (!reduce) { for (var s = 1; s < scenes.length; s++) gsap.set(els(s), { autoAlpha: 0, y: 22 }); }
    var playReveal = function (i) {
      if (reduce || i === 0) return;
      gsap.to(els(i), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', overwrite: true });
    };
    var armReveal = function (i) {
      if (reduce || i === 0) return;
      gsap.set(els(i), { autoAlpha: 0, y: 22 });
    };

    var sceneTop = function (i) { return Math.round(scenes[i].getBoundingClientRect().top + window.scrollY); };
    var current = 0, animating = false, ready = false, sy = 0, sx = 0;

    var goTo = function (i) {
      i = Math.max(0, Math.min(scenes.length - 1, i));
      if (animating || i === current) return;
      animating = true;
      if (i === 0) mHideNav(); else mShowNav();
      armReveal(i);                                    // hide the target so it animates fresh on arrival
      var fromY = window.scrollY, toY = sceneTop(i), t0 = null;
      var dur = reduce ? 0 : 640;
      var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };  // easeInOutCubic
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = dur ? Math.min(1, (ts - t0) / dur) : 1;
        window.scrollTo(0, Math.round(fromY + (toY - fromY) * ease(p)));
        if (p < 1) { requestAnimationFrame(step); }
        else {
          current = i; animating = false;
          window.scrollTo(0, sceneTop(i));             // land exactly on the scene
          playReveal(i);                               // ANIMATE content in only AFTER the slide stops
        }
      };
      requestAnimationFrame(step);
    };

    window.addEventListener('touchstart', function (e) {
      if (!ready) return; sy = e.touches[0].clientY; sx = e.touches[0].clientX;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (ready && e.touches.length === 1) e.preventDefault();   // block single-finger scroll; pinch-zoom still works
    }, { passive: false });
    window.addEventListener('touchend', function (e) {
      if (!ready || animating) return;
      var tt = e.changedTouches[0]; if (!tt) return;
      var dy = sy - tt.clientY, dx = sx - tt.clientX;
      if (Math.abs(dy) < 45 || Math.abs(dy) < Math.abs(dx)) return;   // clear vertical swipe only
      goTo(current + (dy > 0 ? 1 : -1));
    }, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (!ready) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(current - 1); }
    });

    // start at the top; unlock sliding only once fully loaded (loader lifts on 'load')
    var start = function () { current = 0; window.scrollTo(0, 0); ready = true; };
    window.scrollTo(0, 0);
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
    window.addEventListener('pageshow', function () { current = 0; window.scrollTo(0, 0); });  // reset on bfcache restore
    setTimeout(start, 4200);                            // fallback so it's never permanently locked

    window.addEventListener('resize', function () { if (!animating) window.scrollTo(0, sceneTop(current)); });
  })();
}
