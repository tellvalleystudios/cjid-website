// Duplicate the partner logos so the marquee loops seamlessly (track moves by -50%)
const logos = document.querySelector('.partners__logos');
const copy = logos.cloneNode(true);
copy.setAttribute('aria-hidden', 'true');
logos.after(copy);

// Journalism & Innovation tabs swap the copy in the dark card
const impactText = document.getElementById('impact-panel');
const tabs = [...document.querySelectorAll('.tab')];
const impactPhotos = [...document.querySelectorAll('.impact__photo')];
let journalismScroll = null; // set in initMotion when the section is pinned

function setActiveTab(index) {
  const tab = tabs[index];
  if (tab.classList.contains('is-active')) return;
  tabs.forEach(t => {
    t.classList.toggle('is-active', t === tab);
    t.setAttribute('aria-selected', t === tab);
  });
  impactPhotos.forEach((photo, i) => photo.classList.toggle('is-active', i === index));
  swapImpactText(tab.dataset.text);
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    // While pinned, a click scrolls to that tab's step so scroll and tabs stay in sync
    if (journalismScroll) journalismScroll(i);
    else setActiveTab(i);
  });
});

function swapImpactText(text) {
  if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    impactText.textContent = text;
    return;
  }
  gsap.killTweensOf(impactText);
  gsap.timeline()
    .to(impactText, { autoAlpha: 0, y: -12, filter: 'blur(4px)', duration: 0.3, ease: 'power2.in' })
    .add(() => { impactText.textContent = text; })
    .fromTo(impactText,
      { autoAlpha: 0, y: 16, filter: 'blur(4px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' });
}

// Featured publications carousel: one dot per card, auto-advances and loops forward.
// The cards are followed by aria-hidden copies, so after the last card the track keeps
// moving on to (a copy of) the first, then silently jumps back to the real first card.
const pubTrack = document.querySelector('.pub-track');
const pubCards = [...pubTrack.children];
pubCards.forEach(card => {
  const copy = card.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('a, button').forEach(el => el.setAttribute('tabindex', '-1'));
  pubTrack.append(copy);
});
const pubLoopStart = () => pubTrack.children[pubCards.length].offsetLeft; // where the copies begin
const pubDotsWrap = document.querySelector('.pub-dots');
const PUB_INTERVAL = 5000; // ms between auto-advances
let pubIndex = 0;
let pubTimer = null;
let pubInView = false;
let pubHovered = false;
let pubAutoScrolling = false;
let pubAutoScrollTimer;

const pubDots = pubCards.map((card, i) => {
  const dot = document.createElement('button');
  dot.className = 'pub-dot';
  dot.setAttribute('role', 'tab');
  dot.setAttribute('aria-label', `Show publication ${i + 1} of ${pubCards.length}`);
  dot.addEventListener('click', () => { goToPub(i); restartPubTimer(); });
  pubDotsWrap.append(dot);
  return dot;
});

function markPubDot(index) {
  pubIndex = index;
  pubDots.forEach((dot, i) => {
    dot.classList.toggle('is-active', i === index);
    dot.setAttribute('aria-selected', i === index);
  });
}

// Scroll to a card; index === pubCards.length means "the copy of the first card"
function goToPub(index) {
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = pubTrack.children[index];
  pubAutoScrolling = true; // don't let scroll syncing flicker the dots mid-glide
  clearTimeout(pubAutoScrollTimer);
  pubAutoScrollTimer = setTimeout(() => { pubAutoScrolling = false; wrapPubLoop(); }, smooth ? 900 : 0);
  pubTrack.scrollTo({ left: target.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
  markPubDot(index % pubCards.length);
}

// Once we're resting on the copies, jump back by one loop length (looks identical)
function wrapPubLoop() {
  const loop = pubLoopStart();
  if (pubTrack.scrollLeft >= loop - 2) {
    pubTrack.style.scrollSnapType = 'none';
    pubTrack.scrollLeft -= loop;
    pubTrack.style.scrollSnapType = '';
  }
}

// Keep the dots in sync (and wrap the loop) when people swipe or scroll the track themselves
let pubSettleTimer;
pubTrack.addEventListener('scroll', () => {
  if (pubAutoScrolling) return;
  clearTimeout(pubSettleTimer);
  pubSettleTimer = setTimeout(() => {
    wrapPubLoop();
    const all = [...pubTrack.children];
    let nearest = 0;
    all.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - pubTrack.scrollLeft) < Math.abs(all[nearest].offsetLeft - pubTrack.scrollLeft)) nearest = i;
    });
    markPubDot(nearest % pubCards.length);
  }, 120);
});

function restartPubTimer() {
  clearInterval(pubTimer);
  pubTimer = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Only auto-advance while the section is on screen, the tab is visible and nobody is hovering
  if (reduced || !pubInView || pubHovered || document.hidden) return;
  pubTimer = setInterval(() => goToPub(pubIndex + 1), PUB_INTERVAL);
}

['pointerenter', 'focusin'].forEach(e => pubTrack.addEventListener(e, () => { pubHovered = true; restartPubTimer(); }));
['pointerleave', 'focusout'].forEach(e => pubTrack.addEventListener(e, () => { pubHovered = false; restartPubTimer(); }));
document.addEventListener('visibilitychange', restartPubTimer);
new IntersectionObserver(([entry]) => { pubInView = entry.isIntersecting; restartPubTimer(); }, { threshold: 0.4 })
  .observe(pubTrack);
markPubDot(0);

// Hero focus word cycles through CJID's areas of work
const focus = document.querySelector('.hero__focus');
const focusWords = focus.dataset.words.split('|');
let focusIndex = focusWords.indexOf(focus.textContent.trim());
const nextFocusWord = () => focusWords[(focusIndex = (focusIndex + 1) % focusWords.length)];
const FOCUS_HOLD = 4; // seconds each word stays before switching

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const libsLoaded = window.gsap && window.ScrollTrigger && window.SplitText && window.ScrambleTextPlugin && window.Lenis;

if (reduceMotion || !libsLoaded) {
  // Show everything as-is if motion is off or a CDN script failed
  document.documentElement.classList.remove('has-anim');
  setInterval(() => { focus.textContent = nextFocusWord(); }, (FOCUS_HOLD + 1) * 1000);
} else {
  initMotion();
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

  /* ---------- Lenis: slow, smooth scrolling driven by GSAP's ticker ---------- */
  const lenis = new Lenis({
    lerp: 0.06,           // lower = smoother / slower catch-up (default 0.1)
    wheelMultiplier: 0.8, // less distance per wheel tick
    touchMultiplier: 1,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.lenis = lenis;

  const ease = 'power3.out';
  const onEnter = el => ({ trigger: el, start: 'top 90%', once: true });
  const reveal = el => gsap.set(el, { autoAlpha: 1 });

  /* ---------- Hero intro ---------- */
  const intro = gsap.timeline({ defaults: { ease, duration: 1 } });
  intro
    .fromTo('[data-anim="hero-nav"]', { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0 })
    .fromTo('[data-anim="hero-eyebrow"]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0 }, '-=0.6');

  let heroTitlePlayed = false;
  SplitText.create('[data-anim="hero-title"]', {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      reveal(self.elements);
      if (heroTitlePlayed) return; // re-splits on resize just keep the text in place
      heroTitlePlayed = true;
      const words = gsap.from(self.words, { yPercent: 110, duration: 1.1, stagger: 0.04, ease });
      intro.add(words, '-=0.6');
      return words;
    },
  });

  intro.fromTo('[data-anim="hero-partners"]', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0 }, '-=0.5');

  // Focus word: RGB-split glitch + scrambled characters resolving into the next word
  focus.addEventListener('animationend', () => focus.classList.remove('is-glitching'));
  const swapFocusWord = () => {
    focus.classList.remove('is-glitching');
    void focus.offsetWidth; // restart the CSS glitch animation
    focus.classList.add('is-glitching');
    gsap.to(focus, {
      duration: 1.8,
      ease: 'none',
      scrambleText: { text: nextFocusWord(), chars: '!<>-_\\/[]{}=+*^?#01', revealDelay: 0.5, speed: 0.3 },
      onComplete: () => gsap.delayedCall(FOCUS_HOLD, swapFocusWord),
    });
  };
  intro.call(() => gsap.delayedCall(FOCUS_HOLD, swapFocusWord));

  // Hero copy drifts up and fades as the hero scrolls away
  gsap.to('.hero__content', {
    yPercent: -25,
    opacity: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* ---------- Generic scroll reveals ---------- */
  gsap.utils.toArray('[data-anim="fade-up"]').forEach(el => {
    gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, ease, scrollTrigger: onEnter(el) });
  });

  // Headings & paragraphs: lines slide up from behind a mask
  gsap.utils.toArray('[data-anim="lines"]').forEach(el => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        reveal(el);
        return gsap.from(self.lines, { yPercent: 100, duration: 1.2, stagger: 0.12, ease, scrollTrigger: onEnter(el) });
      },
    });
  });

  gsap.utils.toArray('[data-anim="stagger"]').forEach(el => {
    reveal(el);
    gsap.from(el.children, { autoAlpha: 0, y: 50, duration: 1, stagger: 0.12, ease, scrollTrigger: onEnter(el) });
  });

  /* ---------- What We Do: cards fan out from behind DAIDAC ---------- */
  // Default state from Figma (node 400:1157): each card's centre relative to the
  // grid centre, in design px on the 1357px-wide grid, plus its tilt.
  const fanStart = {
    dubawa: { x: -144, y: -42, rotation: 30 },
    udeme:  { x: 142,  y: -42, rotation: -30 },
    audio:  { x: -124, y: 79,  rotation: -30 },
    press:  { x: 142,  y: 79,  rotation: 30 },
  };
  const grid = document.querySelector('[data-anim="fan"]');
  const whatHeading = document.querySelector('.what__heading');
  reveal(grid);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const cards = gsap.utils.toArray('[data-fan]', grid);
    // Offset that moves a card from its grid slot to its stacked position
    // (layout offsets, so cards already mid-transform don't skew the maths on refresh)
    const offset = (card, axis) => {
      const scale = grid.offsetWidth / 1357;
      const start = fanStart[card.dataset.fan];
      return axis === 'x'
        ? grid.offsetWidth / 2 + start.x * scale - (card.offsetLeft + card.offsetWidth / 2)
        : grid.offsetHeight / 2 + start.y * scale - (card.offsetTop + card.offsetHeight / 2);
    };
    const section = grid.closest('.what');

    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: () => (section.offsetHeight < innerHeight ? 'center center' : 'top top'),
        end: '+=900',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        refreshPriority: 2, // measure pins first (top to bottom) so triggers below include the pin spacing
      },
    })
      .fromTo(whatHeading, { opacity: 0.1 }, { opacity: 1, ease: 'none', duration: 0.6 }, 0)
      .fromTo(cards, {
        x: i => offset(cards[i], 'x'),
        y: i => offset(cards[i], 'y'),
        rotation: i => fanStart[cards[i].dataset.fan].rotation,
      }, { x: 0, y: 0, rotation: 0, ease: 'power2.inOut', duration: 1, stagger: 0.05 }, 0);
  });
  mm.add('(max-width: 900px)', () => {
    gsap.from(grid.children, { autoAlpha: 0, y: 50, duration: 1, stagger: 0.12, ease, scrollTrigger: onEnter(grid) });
  });

  /* ---------- Journalism & Innovation: pinned, scroll steps through the tabs ---------- */
  mm.add('(min-width: 901px)', () => {
    const section = document.querySelector('.journalism');
    const STEP = 500; // scroll distance per tab
    const st = ScrollTrigger.create({
      trigger: section,
      // Short enough to fit: centre it. Taller: pin by its bottom so the tabs and card stay in view.
      start: () => (section.offsetHeight < innerHeight ? 'center center' : 'bottom bottom'),
      end: () => '+=' + STEP * tabs.length,
      pin: true,
      refreshPriority: 1,
      invalidateOnRefresh: true,
      onUpdate: self => setActiveTab(Math.min(tabs.length - 1, Math.floor(self.progress * tabs.length))),
    });
    journalismScroll = i => lenis.scrollTo(st.start + STEP * (i + 0.5), { duration: 1.2 });
    return () => { journalismScroll = null; };
  });

  gsap.utils.toArray('[data-anim="stagger-x"]').forEach(el => {
    reveal(el);
    gsap.from(el.children, { autoAlpha: 0, x: 120, duration: 1.2, stagger: 0.15, ease, scrollTrigger: onEnter(el) });
  });

  gsap.utils.toArray('[data-anim="reveal-image"]').forEach(el => {
    reveal(el);
    gsap.timeline({ scrollTrigger: onEnter(el) })
      .fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.4, ease: 'power4.inOut' })
      .from(el.querySelector('.is-active') || el, { scale: 1.2, duration: 1.8, ease, clearProps: 'transform' }, 0);
  });

  /* ---------- Stats count up ---------- */
  gsap.utils.toArray('[data-count]').forEach(el => {
    const text = el.textContent.trim();
    const target = parseFloat(text.replace(/,/g, ''));
    const suffix = text.replace(/[\d,.]/g, '');
    const counter = { value: 0 };
    el.textContent = '0' + suffix;
    gsap.to(counter, {
      value: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: onEnter(el),
      onUpdate: () => { el.textContent = Math.round(counter.value).toLocaleString('en-US') + suffix; },
    });
  });

  // Layout can shift once fonts and images finish loading
  window.addEventListener('load', () => ScrollTrigger.refresh());
}
