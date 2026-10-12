/* Case study "next / previous project" navigation.
   One list drives every case study page. To add a project, add an entry below in the
   order the case studies should run; each page's <nav data-work-nav data-current="slug">
   then links onwards automatically. With two projects, each page shows a single
   "Next project" card (the list loops); with three or more it shows previous and next. */
(function () {
  var PROJECTS = [
    {
      slug: 'supercupni',
      url: 'supercupni.html',
      client: "Budget Energy SuperCupNI",
      line: "We shaped the story. Then built everything to carry it.",
      tags: "Strategy, PR & comms, Web & Apps",
      image: '../assets/img/work/supercupni/hero.webp'
    },
    {
      slug: 'braininjurymatters',
      url: 'braininjurymatters.html',
      client: "Brain Injury Matters",
      line: "A warmer front door for everyone affected by brain injury.",
      tags: "UX, Design & Web",
      image: '../assets/img/work/braininjurymatters/hero.webp'
    },
    {
      slug: 'uniqueplants',
      url: 'uniqueplants.html',
      client: "Unique Plants",
      line: "A practice built on plants. A brand and website to match.",
      tags: "Web & Brand",
      image: '../assets/img/work/uniqueplants/hero.webp'
    }
  ];

  var nav = document.querySelector('[data-work-nav]');
  if (!nav) return;
  var current = nav.getAttribute('data-current');
  var i = -1;
  for (var k = 0; k < PROJECTS.length; k++) if (PROJECTS[k].slug === current) i = k;
  if (i < 0 || PROJECTS.length < 2) return;

  var n = PROJECTS.length;
  var next = PROJECTS[(i + 1) % n];
  var prev = PROJECTS[(i - 1 + n) % n];
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function card(p, kind) {
    return '<a class="wn-card wn-card--' + kind + '" href="' + esc(p.url) + '">' +
      '<img src="' + esc(p.image) + '" alt="" loading="lazy">' +
      '<span class="wn-card__body">' +
        '<span class="wn-card__label">' + (kind === 'next' ? 'Next project' : 'Previous project') + '</span>' +
        '<span class="wn-card__client">' + esc(p.client) + '</span>' +
        '<span class="wn-card__line">' + esc(p.line) + '</span>' +
        '<span class="wn-card__tags">' + esc(p.tags) + '</span>' +
      '</span>' +
      '<span class="wn-card__go">' + arrow + '</span>' +
    '</a>';
  }

  var html = '<p class="wn__title">More of our work</p><div class="wn__grid' + (prev === next ? ' wn__grid--single' : '') + '">';
  if (prev !== next) html += card(prev, 'prev');
  html += card(next, 'next') + '</div>';
  nav.innerHTML = html;
})();
