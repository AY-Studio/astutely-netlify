/* Entrance motion shared by the case studies and the work index.
   Pages mark content with the hooks they already use:
     [data-hero]     above the fold; plays in order once the page is ready
     [data-reveal]   a block that animates in as it scrolls into view
     [data-stagger]  its children animate in one after another
   Each element picks a treatment from what it is:
     headings  rise line by line from behind a mask
     imagery   opens from a soft inset while the picture settles from a slight zoom
     the rest  drifts up and comes into focus
   data-wm="lines|media|fade" overrides the guess.
   The <head> snippet adds html.wm (unless reduced motion is on) so these start hidden
   from first paint; this file sets the start states, then removes the class. If this
   file never runs, the head snippet removes the class itself after a few seconds. */
(function () {
  var root = document.documentElement;
  function ready() { root.classList.remove('wm'); window.__wmReady = true; }
  if (!root.classList.contains('wm') || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') { ready(); return; }
  gsap.registerPlugin(ScrollTrigger);
  var canSplit = typeof SplitText !== 'undefined';
  if (canSplit) gsap.registerPlugin(SplitText);

  var all = function (sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); };
  var HEADING = 'h1, h2, h3';

  function kind(el) {
    var k = el.getAttribute('data-wm');
    if (k) return k;
    if (el.matches(HEADING) || el.closest(HEADING)) return 'lines';
    if (el.matches('img, picture, video, figure')) return 'media';
    if (el.querySelector('img, video') && el.textContent.trim().length < 60 && el.offsetWidth * el.offsetHeight > 40000) return 'media';
    return 'fade';
  }

  // A block that holds a heading plays its parts in turn rather than as one slab.
  function parts(el) {
    if (el.matches(HEADING) || !el.querySelector(':scope > h1, :scope > h2, :scope > h3')) return [el];
    gsap.set(el, { autoAlpha: 1 });
    return [].slice.call(el.children).filter(function (c) { return !c.matches('[data-reveal], [data-stagger], script, style'); });
  }

  // Start states. Each returns a function that plays the entrance after a delay.
  function prep(el, forced) {
    var k = forced || kind(el);
    if (k === 'lines' && canSplit && el.textContent.trim()) {
      var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'wm-line' });
      gsap.set(split.lines, { yPercent: 115 });
      gsap.set(el, { autoAlpha: 1 });
      return function (d) {
        gsap.to(split.lines, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.11, delay: d, onComplete: function () { split.revert(); gsap.set(el, { clearProps: 'opacity,visibility' }); } });
      };
    }
    if (k === 'media') {
      var r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      var img = el.matches('img, video') ? null : el.querySelector('img, video');
      gsap.set(el, { autoAlpha: 0, clipPath: 'inset(7% 5% 7% 5% round ' + (r + 10) + 'px)' });
      if (img) gsap.set(img, { scale: 1.16 });
      return function (d) {
        gsap.to(el, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round ' + r + 'px)', duration: 1.6, ease: 'expo.out', delay: d, clearProps: 'clipPath,opacity,visibility' });
        if (img) gsap.to(img, { scale: 1, duration: 2.2, ease: 'expo.out', delay: d });
      };
    }
    gsap.set(el, { autoAlpha: 0, y: 34, filter: 'blur(8px)' });
    return function (d) {
      gsap.to(el, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out', delay: d, clearProps: 'filter,opacity,visibility,transform' });
    };
  }

  function start() {
    // Hero: the picture settles in as it arrives; copy follows in order.
    all('[class*="hero__media"] img').forEach(function (img) {
      gsap.set(img, { autoAlpha: 0, scale: 1.14 });
      var go = function () { gsap.to(img, { autoAlpha: 1, scale: 1, duration: 2.6, ease: 'expo.out' }); };
      if (img.complete) go(); else { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); }
    });
    var heroes = [];
    all('[data-hero]').forEach(function (el) { parts(el).forEach(function (p) { heroes.push(prep(p)); }); });

    // Scroll reveals: whatever enters together plays as a gentle cascade.
    var plays = new Map();
    var add = function (el, forced) { plays.set(el, prep(el, forced)); };
    all('[data-reveal]').forEach(function (el) {
      if (el.closest('[data-hero]')) return;
      parts(el).forEach(function (p) { add(p); });
    });
    all('[data-work-nav] .wn__head').forEach(function (el) { add(el, 'fade'); });
    all('[data-work-nav] .wn-card').forEach(function (el) { add(el, 'media'); });

    var rows = all('[data-stagger]').filter(function (row) { return !row.closest('[data-hero]'); }).map(function (row) {
      return { row: row, kids: [].slice.call(row.children).map(function (c) { return prep(c); }) };
    });

    ready();

    heroes.forEach(function (play, i) { play(0.15 + i * 0.12); });

    ScrollTrigger.batch(Array.from(plays.keys()), {
      start: 'top 88%', once: true, interval: 0.12,
      onEnter: function (els) { els.forEach(function (el, i) { plays.get(el)(i * 0.12); }); }
    });
    rows.forEach(function (r) {
      ScrollTrigger.create({ trigger: r.row, start: 'top 88%', once: true, onEnter: function () { r.kids.forEach(function (play, i) { play(i * 0.1); }); } });
    });
  }

  // Split lines only once the web fonts are in, so the line breaks are the real ones.
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1500); })]).then(start, start);
})();
