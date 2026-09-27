/*
  MAIN INTERACTIONS
  Each feature is isolated below so it can be edited or removed independently.
  The site still works if JavaScript is disabled; only enhanced motion is lost.
*/

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// CURRENT YEAR --------------------------------------------------
document.querySelectorAll('[data-year]').forEach((year) => {
  year.textContent = new Date().getFullYear();
});

// MOBILE NAVIGATION ---------------------------------------------
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const willOpen = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(willOpen));
    navLinks.classList.toggle('is-open', willOpen);
  });

  navLinks.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
  });
}

// REVEAL ON ENTRY -----------------------------------------------
// Change `threshold` to reveal items earlier/later in the viewport.
const revealItems = document.querySelectorAll('.reveal');
if (!reduceMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

// ACTIVE SECTION IN NAV ----------------------------------------
const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const linkedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => {
        link.toggleAttribute('aria-current', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  linkedSections.forEach((section) => sectionObserver.observe(section));
}

// PROJECT FLIGHT ------------------------------------------------
/*
  Four real cover elements travel from the hero stack into the card grid.
  EDITING GUIDE:
  - `stackOffsets` controls each cover's initial x/y position and rotation.
  - `flightStart` and `flightEnd` control how much scroll completes the move.
  - Mobile values are intentionally tighter and place the stack below the intro.
*/
const covers = [...document.querySelectorAll('[data-flying-cover]')];
const projectImages = [...document.querySelectorAll('.project-media img')];
const projectLoops = [...document.querySelectorAll('[data-project-loop]')];
const heroStack = document.querySelector('[data-hero-stack]');
const flightLayer = document.querySelector('.cover-flight-layer');
const workSection = document.querySelector('#work');
// This matches the CSS breakpoint where the hero switches to one column.
const mobileFlightDisabled = window.matchMedia('(max-width: 900px)');
let flightGeometry = [];
let ticking = false;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const mix = (start, end, amount) => start + (end - start) * amount;
const ease = (value) => 1 - Math.pow(1 - value, 3);

// CARD LOOPS ----------------------------------------------------
// A loop plays only while its card is hovered and fully handed off from the
// hero animation. Touch devices therefore keep the static poster. Add
// data-project-loop to future card videos to reuse this behavior.
function syncProjectLoop(video) {
  const media = video.closest('.project-media');
  if (!media) return;

  const shouldPlay = !reduceMotion
    && video.dataset.hovered === 'true'
    && media.classList.contains('is-settled');

  if (shouldPlay && video.paused) {
    video.play().catch(() => media.classList.remove('is-loop-playing'));
  } else if (!shouldPlay && !video.paused) {
    video.pause();
  }
}

function syncProjectLoopForMedia(media) {
  const video = media.querySelector('[data-project-loop]');
  if (video) syncProjectLoop(video);
}

projectLoops.forEach((video) => {
  const media = video.closest('.project-media');
  const card = video.closest('.project-card');
  // Browsers may restore media playback across a reload. Establish the
  // intended idle state explicitly so a loop never resumes without hover.
  video.pause();
  video.dataset.hovered = 'false';
  media?.classList.remove('is-loop-playing');
  video.addEventListener('playing', () => media?.classList.add('is-loop-playing'));
  video.addEventListener('pause', () => media?.classList.remove('is-loop-playing'));
  card?.addEventListener('mouseenter', () => {
    video.dataset.hovered = 'true';
    syncProjectLoop(video);
  });
  card?.addEventListener('mouseleave', () => {
    video.dataset.hovered = 'false';
    syncProjectLoop(video);
  });
});

function measureFlight() {
  if (!heroStack || !flightLayer || !workSection || !covers.length || reduceMotion) return;

  // Mobile uses a static, full-color card grid. Keeping the complex flight
  // desktop-only avoids fragile geometry as cards collapse to one column.
  if (mobileFlightDisabled.matches) {
    flightGeometry = [];
    document.querySelectorAll('.project-media').forEach((media) => {
      media.classList.add('is-settled');
      syncProjectLoopForMedia(media);
    });
    return;
  }

  document.querySelectorAll('.project-media').forEach((media) => media.classList.remove('is-settled'));

  const stackRect = heroStack.getBoundingClientRect();
  const layerRect = flightLayer.getBoundingClientRect();
  const layerOriginX = layerRect.left + window.scrollX;
  const layerOriginY = layerRect.top + window.scrollY;
  // Match the fixed 1:1 circle in styles.css, then use its center as the
  // origin for every card. This keeps the composition aligned at any width.
  const circleSize = Math.min(stackRect.width * .92, stackRect.height * .92, 460);
  const circleCenterX = stackRect.left + window.scrollX + stackRect.width / 2;
  const circleCenterY = stackRect.top + window.scrollY + stackRect.height / 2;
  const stackWidth = Math.min(circleSize * .92, 430);
  const stackHeight = stackWidth * .72;

  // Array order matches DOM order: Art, Salesforce, Adobe, ESPN (top card).
  // x/y are proportions of the circle, so the fan scales with the circle.
  const stackOffsets = [
    { x: -.04, y: .13, r: -9 },
    { x: .05, y: .08, r: 7 },
    { x: -.05, y: .02, r: -4 },
    { x: .02, y: -.06, r: 3 }
  ];

  flightGeometry = covers.map((cover, index) => {
    const id = cover.dataset.flyingCover;
    const destination = document.querySelector(`[data-cover-destination="${id}"]`);
    if (!destination) return null;
    const targetRect = destination.getBoundingClientRect();
    const offset = stackOffsets[index];
    return {
      cover,
      destination,
      start: {
        // Flying covers are children of flightLayer, so document-space
        // measurements must be converted into that layer's local space.
        x: circleCenterX - stackWidth / 2 + offset.x * circleSize - layerOriginX,
        y: circleCenterY - stackHeight / 2 + offset.y * circleSize - layerOriginY,
        width: stackWidth,
        height: stackHeight,
        rotation: offset.r
      },
      end: {
        x: targetRect.left + window.scrollX - layerOriginX,
        y: targetRect.top + window.scrollY - layerOriginY,
        width: targetRect.width,
        height: targetRect.height,
        rotation: 0
      }
    };
  }).filter(Boolean);

  updateFlight();
}

function updateFlight() {
  if (!flightGeometry.length || reduceMotion) return;

  const flightStart = 0;
  // The covers settle shortly after the Work heading enters the viewport.
  const flightEnd = Math.max(workSection.offsetTop + window.innerHeight * .18, 1);
  const progress = ease(clamp((window.scrollY - flightStart) / flightEnd));

  flightGeometry.forEach(({ cover, destination, start, end }) => {
    const x = mix(start.x, end.x, progress);
    const y = mix(start.y, end.y, progress);
    const width = mix(start.width, end.width, progress);
    const height = mix(start.height, end.height, progress);
    const rotation = mix(start.rotation, end.rotation, progress);

    cover.style.width = `${width}px`;
    cover.style.height = `${height}px`;
    cover.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    // Buffered handoff: paint the static image underneath first, then remove
    // the aligned flying cover. The overlap is invisible but prevents a blank
    // frame between the two independently rendered image elements.
    const destinationReady = progress >= .997;
    const flyingCoverDone = progress >= .9995;
    destination.classList.toggle('is-settled', destinationReady);
    syncProjectLoopForMedia(destination);
    cover.style.opacity = flyingCoverDone ? '0' : '1';
  });
  ticking = false;
}

if (!reduceMotion && covers.length) {
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateFlight);
  }, { passive: true });
  window.addEventListener('resize', measureFlight);
  window.addEventListener('load', measureFlight);
  // ResizeObserver also catches layout changes caused by browser zoom,
  // display scaling, font settling, and resizable browser side panels.
  if ('ResizeObserver' in window) {
    const flightResizeObserver = new ResizeObserver(measureFlight);
    flightResizeObserver.observe(heroStack);
    flightResizeObserver.observe(workSection);
  }
  if (document.fonts?.ready) document.fonts.ready.then(measureFlight);
  // Explicit decoding makes the destination pixels ready before the first
  // possible swap; failures fall back to the browser's normal image handling.
  Promise.allSettled(projectImages.map((img) => img.decode?.() ?? Promise.resolve()))
    .then(measureFlight);
  // Fonts and cached images can change geometry after DOMContentLoaded.
  window.setTimeout(measureFlight, 150);
} else {
  document.querySelectorAll('.project-media').forEach((media) => {
    media.classList.add('is-settled');
    syncProjectLoopForMedia(media);
  });
}

// CONTACT FORM --------------------------------------------------
// GitHub Pages cannot process forms itself, so this safely prepares a mailto.
const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nReply to: ${email}`);
    const status = contactForm.querySelector('[data-form-status]');
    if (status) status.textContent = 'Opening your email app…';
    window.location.href = `mailto:pletzsean@gmail.com?subject=${subject}&body=${body}`;
  });
}
