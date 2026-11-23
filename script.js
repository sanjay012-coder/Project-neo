/* Update these fields when business details are confirmed. Empty fields show honest placeholders. */
const business = {
  address: '',
  mapsUrl: '',
  hours: '',
  email: ''
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const header = $('.site-header');
const navToggle = $('.nav-toggle');
const navLinks = $('#nav-links');

function closeMenu() {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  navLinks.classList.remove('open');
}

navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navLinks.classList.toggle('open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav')) closeMenu();
});
$$('.nav-links a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 800) closeMenu(); });

const setHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
setHeader();
window.addEventListener('scroll', setHeader, { passive: true });

const sectionLinks = $$('.nav-link');
const sections = ['home', 'about', 'menu', 'gallery', 'contact'].map(id => document.getElementById(id));
function updateActiveNavigation() {
  const boundary = window.scrollY + Math.min(window.innerHeight * .32, 220);
  let current = 'home';
  sections.forEach(section => { if (section.offsetTop <= boundary) current = section.id; });
  sectionLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${current}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
updateActiveNavigation();
window.addEventListener('scroll', updateActiveNavigation, { passive: true });

const filters = $$('.filter');
const cards = $$('.menu-card');
const menuGrid = $('.menu-grid');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pageTransition = $('#page-transition');
let transitioning = false;
let transitionRun = 0;

function jumpToSection(section, focus = true) {
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  const top = section.id === 'home' ? 0 : window.scrollY + section.getBoundingClientRect().top - header.offsetHeight - 12;
  window.scrollTo(0, Math.max(0, top));
  document.documentElement.style.scrollBehavior = previousScrollBehavior;
  if (focus) {
    const heading = section.querySelector('h1, h2') || section;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  }
  updateActiveNavigation();
}

async function navigateToSection(section, hash) {
  const run = ++transitionRun;
  const startTransform = transitioning ? getComputedStyle(pageTransition).transform : 'translateY(100%)';
  pageTransition.getAnimations().forEach(animation => animation.cancel());
  if (reducedMotion.matches) pageTransition.classList.remove('is-active');
  transitioning = true;
  closeMenu();
  try {
    if (!reducedMotion.matches && typeof pageTransition.animate === 'function') {
      pageTransition.classList.add('is-active');
      await pageTransition.animate(
        [{ transform: startTransform }, { transform: 'translateY(0)' }],
        { duration: 320, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
      ).finished;
      if (run !== transitionRun) return;
    }
    if (run !== transitionRun) return;
    if (window.location.hash !== hash) history.pushState(null, '', hash);
    jumpToSection(section);
    if (pageTransition.classList.contains('is-active')) {
      await pageTransition.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
        { duration: 420, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
      ).finished;
    }
  } catch (error) {
    if (run === transitionRun) {
      console.error('Section navigation failed; switching without animation.', error);
      if (window.location.hash !== hash) history.pushState(null, '', hash);
      jumpToSection(section);
    }
  } finally {
    if (run === transitionRun) {
      pageTransition.getAnimations().forEach(animation => animation.cancel());
      pageTransition.classList.remove('is-active');
      transitioning = false;
    }
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains('skip-link') || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
  const hash = link.getAttribute('href');
  const section = hash && document.getElementById(hash.slice(1));
  if (!section || !['home', 'menu', 'about', 'gallery', 'contact'].includes(section.id)) return;
  event.preventDefault();
  navigateToSection(section, hash).catch(error => console.error('Section navigation failed.', error));
});

window.addEventListener('popstate', () => {
  const run = ++transitionRun;
  if (transitioning) {
    pageTransition.getAnimations().forEach(animation => animation.cancel());
    pageTransition.classList.remove('is-active');
    transitioning = false;
  }
  const section = document.getElementById(window.location.hash.slice(1));
  if (section && ['home', 'menu', 'about', 'gallery', 'contact'].includes(section.id)) {
    requestAnimationFrame(() => { if (run === transitionRun) jumpToSection(section); });
  } else if (!window.location.hash) {
    requestAnimationFrame(() => { if (run === transitionRun) jumpToSection(document.getElementById('home')); });
  }
});

let filterChange = 0;
filters.forEach(button => button.addEventListener('click', async () => {
  const category = button.dataset.filter;
  if (button.classList.contains('is-selected')) return;
  const change = ++filterChange;
  menuGrid.getAnimations().forEach(animation => animation.cancel());
  cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
  menuGrid.style.overflow = '';
  filters.forEach(filter => {
    const selected = filter === button;
    filter.classList.toggle('is-selected', selected);
    filter.setAttribute('aria-pressed', String(selected));
  });

  if (!reducedMotion.matches) {
    const outgoing = cards.filter(card => !card.hidden && category !== 'all' && card.dataset.category !== category);
    await Promise.all(outgoing.map(card => card.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }],
      { duration: 140, easing: 'ease-in' }
    ).finished.catch(() => {})));
    if (change !== filterChange) return;
  }

  const oldHeight = menuGrid.getBoundingClientRect().height;
  let count = 0;
  cards.forEach(card => {
    const show = category === 'all' || card.dataset.category === category;
    card.hidden = !show;
    if (show) {
      count++;
      card.classList.add('is-visible');
    }
  });
  $('#filter-status').textContent = `Showing ${count} ${category === 'all' ? 'menu items' : category + ' items'}.`;

  if (reducedMotion.matches) return;
  const newHeight = menuGrid.getBoundingClientRect().height;
  menuGrid.style.overflow = 'hidden';
  const animations = cards.filter(card => !card.hidden).map((card, index) => card.animate(
    [{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }],
    { duration: 420, delay: Math.min(index, 4) * 35, easing: 'cubic-bezier(.22,1,.36,1)' }
  ));
  if (Math.abs(newHeight - oldHeight) > 1) {
    animations.push(menuGrid.animate(
      [{ height: `${oldHeight}px` }, { height: `${newHeight}px` }],
      { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }
    ));
  }
  await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  if (change === filterChange) menuGrid.style.overflow = '';
}));

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -24px 0px', threshold: .08 });
  $$('.reveal').forEach(el => revealObserver.observe(el));
  document.documentElement.classList.add('js-reveal');
}

$('#year').textContent = new Date().getFullYear();
if (business.address) {
  $('#business-address').textContent = business.address;
  $('#business-address').nextElementSibling.textContent = 'We look forward to welcoming you';
}
if (business.hours) {
  $('#business-hours').textContent = business.hours;
  $('#business-hours').nextElementSibling.textContent = 'Local opening hours';
}
if (business.email) {
  $('#business-email').textContent = business.email;
  $('#business-email').nextElementSibling.textContent = 'Get in touch anytime';
}

const dialog = $('#info-dialog');
const message = $('#dialog-message');
function showMessage(text) {
  message.textContent = text;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else window.alert(text);
}
$('#directions-button').addEventListener('click', () => {
  if (business.mapsUrl && /^https:\/\//i.test(business.mapsUrl)) {
    window.open(business.mapsUrl, '_blank', 'noopener,noreferrer');
  } else showMessage('The business address and map link have not been added yet. Please check back for directions.');
});
$('#contact-button').addEventListener('click', () => {
  if (business.email) {
    window.location.href = `mailto:${business.email}`;
  } else showMessage('The business contact email has not been added yet. Please check back to get in touch.');
});
$('#dialog-close').addEventListener('click', () => dialog.close());
$('#dialog-ok').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });


