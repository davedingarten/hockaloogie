// The landing page: its motion (GSAP + ScrollTrigger) and the few interactive bits.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// The game's own Daily Poost headlines (scripts/ui/daily_poost.gd).
const HEADLINES = [
  "KAREN DEMANDS TO SPEAK TO THE SKY'S MANAGER", 'SLEEPY JOE WAKES UP WET', "CYBERCAB'S WIPERS FINALLY TESTED",
  'HOW DARE YOU? EASILY.', 'FAKE NEWS? REAL SPIT!', 'PIGEON GETS A TASTE OF ITS OWN MEDICINE',
  "STREAMER'S CHAT GOES WILD: 'W SPIT'", "WINE MOM'S ROSÉ WATERED DOWN", 'ROBOTAXI BOOKS UNSCHEDULED CAR WASH',
  'CONGRESSWOMAN TAXED BY THE SKY', 'SENATE TURTLE RETREATS INTO SHELL', 'TOP FLOOR STRIKES AGAIN',
];
const SLOGANS = ['STAND ON THE ROOF', 'SPIT ON THE STREET', 'COLLECT LIBERAL TEARS', 'LEAD THE WALKERS', 'MIND THE FRIENDLIES', 'NO LIVES · NO RETRIES', 'HOLD · RELEASE · SPLAT'];

// ---------- content that motion relies on ----------
for (const [el, items] of [[$('#track-a'), HEADLINES], [$('#track-b'), SLOGANS]]) {
  const row = items.map(t => `<span>${t}</span>`).join('');
  el.innerHTML = row + row;
}
// Headings rise a word at a time: each word in a clipping box.
for (const h of $$('.split')) {
  const wrap = node => {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.textContent = part;
        w.append(i); frag.append(w);
      });
      node.replaceWith(frag);
    } else if (node.classList?.contains('hl')) {
      const w = document.createElement('span'); w.className = 'w';
      node.replaceWith(w);
      const i = document.createElement('span'); i.append(node); w.append(i);
    }
  };
  [...h.childNodes].forEach(wrap);
}

// ---------- share ----------
function toast(text) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('on'), 2400);
}
$('#share').addEventListener('click', async () => {
  const data = { title: 'Hock-A-Loogie', text: 'Stand on the roof. Spit on the street.', url: location.href.split('#')[0] };
  if (navigator.share) { try { await navigator.share(data); } catch { /* closed */ } return; }
  try { await navigator.clipboard.writeText(data.url); toast('Link copied. Go on, send it.'); } catch { toast(data.url); }
});

// ---------- FAQ: answers open and close smoothly ----------
for (const d of $$('.faq details')) {
  const a = d.querySelector('.faq-a');
  d.querySelector('summary').addEventListener('click', e => {
    if (!window.gsap || reduced) return;
    e.preventDefault();
    if (d.open) {
      gsap.to(a, { height: 0, duration: 0.32, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(a, { clearProps: 'height' }); } });
    } else {
      d.open = true;
      gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: 0.5, ease: 'back.out(1.3)', clearProps: 'height' });
      gsap.fromTo(a.firstElementChild, { y: -10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, delay: 0.08 });
    }
  });
}

// ---------- top bar ----------
const topbar = $('.topbar');
const solid = () => topbar.classList.toggle('solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', solid, { passive: true });
solid();

if (!window.gsap || !window.ScrollTrigger || reduced) {
  html.classList.remove('motion');
} else {
  motion();
}

function motion() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.set(['.topbar', '.hh-copy > *', '.hh-phones .phone'], { autoAlpha: 0 });
  html.classList.remove('motion');
  const logo = $('.hh-logo');

  // ---------- the drop: it hangs from the logo's tears, falls with you, splats at the end ----------
  const drop = (() => {
    const el = $('#scroll-drop'), splat = $('#drop-splat'), soak = $('#soak');
    let g = null, landed = false, last = scrollY, stretch = 1, on = false;
    const update = force => {
      if (!g || !on) return;
      const s = scrollY, p = clamp(s / g.end, 0, 1);
      const v = s - last; last = s;
      stretch = lerp(stretch, 1 + clamp(Math.abs(v) * 0.02, 0, 0.6), 0.3);
      let x;
      if (p < 0.1) x = lerp(g.sx, g.lane, smooth(p / 0.1));
      else if (p > 0.86) x = lerp(g.lane, g.ex, smooth((p - 0.86) / 0.14));
      else x = g.lane + Math.sin(p * 46) * 5;
      const y = lerp(g.sy, g.ey, p);
      gsap.set(el, { x, y, scaleY: stretch, scaleX: 1 / Math.sqrt(stretch), rotation: clamp(v * 0.4, -14, 14) });
      const hit = p >= 1;
      if (hit !== landed || force === true) {
        landed = hit;
        if (hit) {
          gsap.set(splat, { x: g.ex, y: g.ey });
          gsap.to(el, { autoAlpha: 0, duration: 0.08 });
          gsap.fromTo(splat, { autoAlpha: 1, scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
          gsap.fromTo(soak, { scaleX: 1, scaleY: 1 }, { keyframes: [{ scaleX: 1.12, scaleY: 0.8, duration: 0.1 }, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1, 0.35)' }], transformOrigin: '30% 100%' });
        } else {
          gsap.to(splat, { autoAlpha: 0, scale: 0.6, duration: 0.25 });
          gsap.to(el, { autoAlpha: 1, duration: 0.2 });
        }
      }
    };
    const measure = () => {
      const lr = logo.getBoundingClientRect(), sr = soak.getBoundingClientRect();
      const lane = innerWidth > 1290 ? (innerWidth + 1200) / 2 + 22 : innerWidth - 16;
      g = { sx: lr.left + lr.width * 0.9, sy: lr.top + scrollY + lr.height * 0.55, ex: sr.left + sr.width * 0.24, ey: sr.top + scrollY + sr.height * 0.12, lane };
      g.end = Math.max(1, Math.min(g.ey - innerHeight * 0.55, html.scrollHeight - innerHeight - 40));
      update(true);
    };
    return {
      ready() {
        on = true;
        measure();
        if (!landed) gsap.fromTo(el, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' });
        addEventListener('scroll', update, { passive: true });
        ScrollTrigger.addEventListener('refresh', measure);
        addEventListener('resize', measure);
        gsap.ticker.add(() => { if (Math.abs(stretch - 1) > 0.002) { stretch = lerp(stretch, 1, 0.08); update(); } });
      },
    };
  })();

  // ---------- hero entrance ----------
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: idle });
  tl.fromTo('.hh-bg', { scale: 1.14 }, { scale: 1, duration: 2.8, ease: 'power2.out' }, 0)
    .to('.topbar', { autoAlpha: 1, duration: 0.6 }, 0.2)
    .fromTo('.pill', { autoAlpha: 0, y: -30, scale: 0.7 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(2.4)' }, 0.3)
    // The logo drops in, stretched as it falls, and lands gooey (as on the title).
    .fromTo(logo, { autoAlpha: 0, y: -170, scaleX: 0.86, scaleY: 1.22 }, {
      keyframes: [
        { autoAlpha: 1, y: 0, scaleX: 0.86, scaleY: 1.22, duration: 0.42, ease: 'power2.in' },
        { scaleX: 1.16, scaleY: 0.82, duration: 0.1, ease: 'power1.out' },
        { scaleX: 0.95, scaleY: 1.07, duration: 0.16, ease: 'sine.inOut' },
        { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' },
      ],
    }, 0.45)
    .fromTo('.tag', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 1.15)
    .fromTo('.sub', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 1.27)
    .fromTo('.hh-copy .cta-row', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 1.39)
    .fromTo('.p-title', { autoAlpha: 0, y: 160, rotation: -20 }, { autoAlpha: 1, y: 0, rotation: -7, duration: 1.4, ease: 'elastic.out(1, 0.78)' }, 0.7)
    .fromTo('.p-play', { autoAlpha: 0, y: 190, rotation: 18 }, { autoAlpha: 1, y: 0, rotation: 5, duration: 1.4, ease: 'elastic.out(1, 0.78)' }, 0.86);

  // The logo's shine, as the game sweeps it: once on landing, then every 5.5 s.
  gsap.timeline({ repeat: -1, repeatDelay: 4.6, delay: 1.5 })
    .fromTo('.hh-logo .shine', { backgroundPosition: '140% 0' }, { backgroundPosition: '-40% 0', duration: 0.9, ease: 'power2.inOut' });

  function idle() {
    // At rest: a slow goo wave in the logo, the phones float out of step.
    gsap.to('.hh-logo img', { skewX: 1.2, scaleY: 1.012, transformOrigin: '50% 100%', duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.p-title .phone-body', { y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.p-play .phone-body', { y: -14, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.9 });
    drop.ready();
  }

  // ---------- the mouse: depth in the hero, tilt on cards and the icon ----------
  if (finePointer) {
    const q = (el, prop, d = 1) => gsap.quickTo(el, prop, { duration: d, ease: 'power3.out' });
    const bgX = q('.hh-bg', 'x', 1.4), bgY = q('.hh-bg', 'y', 1.4);
    const cpX = q('.hh-copy', 'x', 1.2);
    const phones = $$('.hh-phones .phone').map(p => ({ ry: q(p, 'rotationY'), rx: q(p, 'rotationX'), x: q(p, 'x') }));
    addEventListener('pointermove', e => {
      if (scrollY > innerHeight) return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      bgX(-nx * 14); bgY(-ny * 8); cpX(nx * 6);
      phones.forEach((p, i) => { p.ry(nx * 14); p.rx(-ny * 10); p.x(nx * (i ? 18 : 10)); });
    });
    for (const card of $$('.feat')) {
      const ry = q(card, 'rotationY', 0.6), rx = q(card, 'rotationX', 0.6), y = q(card, 'y', 0.6);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10); rx(-((e.clientY - r.top) / r.height - 0.5) * 8); y(-6);
      });
      card.addEventListener('pointerleave', () => { ry(0); rx(0); y(0); });
    }
    const icon = $('.soon-icon');
    gsap.set(icon, { transformPerspective: 800 });
    const iry = q(icon, 'rotationY', 0.8), irx = q(icon, 'rotationX', 0.8);
    addEventListener('pointermove', e => {
      const r = icon.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      iry(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 36);
      irx(-((e.clientY - (r.top + r.height / 2)) / innerHeight) * 28);
    });
  }

  // ---------- leaving the roof ----------
  const hero = { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hh-bg', { yPercent: 12, ease: 'none', scrollTrigger: hero });
  gsap.to('.hh-copy', { yPercent: -18, autoAlpha: 0.15, ease: 'none', scrollTrigger: { ...hero, end: '80% top' } });
  gsap.to('.hh-phones', { y: -160, ease: 'none', scrollTrigger: hero });

  // ---------- the ticker runs with the scroll ----------
  const tA = gsap.to('#track-a', { xPercent: -50, ease: 'none', duration: 46, repeat: -1 });
  const tB = gsap.fromTo('#track-b', { xPercent: -50 }, { xPercent: 0, ease: 'none', duration: 58, repeat: -1 });
  tA.totalTime(tA.duration() * 200); tB.totalTime(tB.duration() * 200); // room to run backwards
  let dir = 1, boost = 1, skew = 0;
  ScrollTrigger.create({
    onUpdate: self => {
      const v = self.getVelocity();
      if (v) dir = Math.sign(v);
      boost = Math.max(boost, 1 + Math.min(Math.abs(v) / 260, 7));
      skew = clamp(-v / 320, -7, 7);
    },
  });
  gsap.set('.band-a', { rotation: -3 }); gsap.set('.band-b', { rotation: 2.2 });
  const skA = gsap.quickTo('.band-a', 'skewX', { duration: 0.5, ease: 'power3.out' });
  const skB = gsap.quickTo('.band-b', 'skewX', { duration: 0.5, ease: 'power3.out' });
  gsap.ticker.add(() => {
    boost += (1 - boost) * 0.05;
    skew *= 0.9;
    tA.timeScale(dir * boost); tB.timeScale(dir * boost);
    skA(skew); skB(-skew * 0.6);
  });

  // ---------- section reveals ----------
  for (const k of $$('.kicker')) {
    gsap.fromTo(k, { autoAlpha: 0, scale: 0.6, rotation: -6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.4)', scrollTrigger: { trigger: k, start: 'top 88%' } });
  }
  for (const h of $$('.split')) {
    const words = h.querySelectorAll('.w > span');
    const hl = h.querySelector('.hl');
    const t = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 86%' } });
    t.fromTo(words, { yPercent: 115, rotation: 7 }, { yPercent: 0, rotation: 0, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.07 });
    if (hl) t.fromTo(hl, { '--hl': 0 }, { '--hl': 1, duration: 0.7, ease: 'power3.inOut' }, '-=0.45');
  }
  const batch = (sel, from, to) => {
    gsap.set(sel, from);
    ScrollTrigger.batch(sel, { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { ...to, overwrite: true }) });
  };
  batch('.step', { autoAlpha: 0, y: 70, rotation: i => [-5, 3, -3][i % 3] }, { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: 'back.out(1.4)', stagger: 0.12 });
  batch('.rules li', { autoAlpha: 0, scale: 0.5, y: 14 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.06 });
  batch('.feat', { autoAlpha: 0, y: 90, rotationX: -28, transformOrigin: '50% 100%' }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1 });
  batch('.faq details', { autoAlpha: 0, x: 50 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });

  // ---------- the numbers count up (and the lives count down to nothing) ----------
  gsap.fromTo('.stats-bg', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });
  for (const b of $$('.stat b')) {
    const end = +b.dataset.count, from = end === 0 ? 9 : 0, n = { v: from };
    b.textContent = from;
    gsap.timeline({ scrollTrigger: { trigger: '.stats', start: 'top 80%' } })
      .to(n, { v: end, duration: end === 0 ? 1.2 : 1.6, ease: end === 0 ? 'steps(9)' : 'power2.out', onUpdate: () => { b.textContent = Math.round(n.v); } })
      .fromTo(b, { scale: 1 }, { keyframes: [{ scale: 1.25, duration: 0.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }] });
  }

  // ---------- coming soon ----------
  gsap.timeline({ scrollTrigger: { trigger: '#soon', start: 'top 75%' } })
    .fromTo('.tile', { autoAlpha: 0, scale: 0.4, rotation: -40 }, { autoAlpha: 1, scale: 1, rotation: -6, duration: 1.2, ease: 'elastic.out(1, 0.6)' })
    .fromTo('.soon-copy > *', { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 0.15)
    .add(() => gsap.to('.tile', { y: -12, rotation: -3, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }));

  // ---------- active section in the nav ----------
  for (const id of ['how', 'features', 'faq']) {
    const link = $(`.topbar nav a[href="#${id}"]`);
    ScrollTrigger.create({ trigger: `#${id}`, start: 'top 55%', end: 'bottom 55%', onToggle: s => link.classList.toggle('on', s.isActive) });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
}
