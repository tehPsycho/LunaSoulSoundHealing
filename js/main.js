'use strict';
const config = window.LUNA_CONFIG || {services: []};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
if (config.siteUrl && /^https:\/\//.test(config.siteUrl)) {
  const base = config.siteUrl.replace(/\/$/, '');
  const canonical = document.createElement('link');
  canonical.rel = 'canonical'; canonical.href = base + '/' + (location.pathname.split('/').pop() || 'index.html');
  document.head.append(canonical);
  document.querySelector('meta[property="og:image"]').content = base + '/assets/images/banner_wide.png';
  const og = document.createElement('meta'); og.setAttribute('property', 'og:url'); og.content = canonical.href; document.head.append(og);
}
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); navigation.classList.remove('open');}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); navigation.classList.toggle('open', open);
});
document.addEventListener('keydown', e => {if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {closeMenu(); menu.focus();}});
document.addEventListener('click', e => {if (!e.target.closest('.site-header')) closeMenu();});
window.matchMedia('(min-width: 801px)').addEventListener('change', e => {if (e.matches) closeMenu();});
const header = document.querySelector('.site-header');
function scrollHeader() {header.classList.toggle('scrolled', scrollY > 20);}
addEventListener('scroll', scrollHeader, {passive:true}); scrollHeader();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-enabled');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {if (entry.isIntersecting) {entry.target.classList.add('visible'); observer.unobserve(entry.target);}}), {threshold: .08});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
const video = document.querySelector('#hero-video');
if (video) {
  const toggle = document.querySelector('.video-toggle');
  const fallback = () => {video.pause(); video.classList.remove('playing'); toggle.hidden = true;};
  if (config.videoReady && !reducedMotion.matches && !navigator.connection?.saveData && innerWidth > 600) {
    video.src = video.dataset.src; video.autoplay = true;
    video.addEventListener('playing', () => {video.classList.add('playing'); toggle.hidden = false; toggle.textContent = 'Pause video'; toggle.setAttribute('aria-label', 'Pause background video');});
    video.addEventListener('error', fallback);
    video.play().catch(fallback);
    toggle.addEventListener('click', () => {
      if (video.paused) video.play().catch(fallback);
      else {video.pause(); toggle.textContent = 'Play video'; toggle.setAttribute('aria-label', 'Play background video');}
    });
  }
  reducedMotion.addEventListener('change', e => {if (e.matches) fallback();});
}
const lightbox = document.querySelector('.lightbox');
if (lightbox) {
  const items = [...document.querySelectorAll('[data-gallery-index]')];
  let current = 0, trigger;
  function show(index) {
    current = (index + items.length) % items.length;
    const source = items[current].querySelector('img');
    const image = lightbox.querySelector('img');
    image.src = source.src.replace('-640.webp', '-1200.webp'); image.alt = source.alt;
    lightbox.querySelector('figcaption').textContent = `${current + 1} / ${items.length} — ${source.alt}`;
  }
  items.forEach((item, index) => item.addEventListener('click', () => {trigger = item; show(index); lightbox.showModal(); lightbox.querySelector('.lightbox-close').focus();}));
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const controls = [...lightbox.querySelectorAll('button')];
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last.focus();}
      else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first.focus();}
    }
  });
  lightbox.addEventListener('keydown', e => {if (e.key === 'ArrowLeft') {e.preventDefault(); show(current - 1);} if (e.key === 'ArrowRight') {e.preventDefault(); show(current + 1);}});
  lightbox.addEventListener('click', e => {if (e.target === lightbox) lightbox.close();});
  lightbox.addEventListener('close', () => trigger?.focus());
}
const form = document.querySelector('#contact-form');
if (form) {
  form.noValidate = true;
  const status = document.querySelector('#form-status');
  const select = form.elements.service;
  config.services.filter(s => s.confirmed).forEach(s => select.add(new Option(s.name, s.id)));
  const requested = config.services.find(s => s.id === new URLSearchParams(location.search).get('service'));
  if (requested?.confirmed) select.value = requested.id;
  else if (requested) form.elements.message.value = `I'd like to learn whether ${requested.name.toLowerCase()} is available.\n\n`;
  let turnstileWidget;
  function setStatus(text, kind = '') {status.textContent = text; status.className = kind;}
  fetch('/api/contact', {headers: {'Accept':'application/json'}}).then(async r => {
    if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw new Error();
    const data = await r.json();
    if (!data.available) {setStatus('Message delivery is not configured yet. Please connect through Instagram or Facebook below.', 'error'); return;}
    if (data.siteKey) {
      setStatus('Complete the spam protection check before sending.');
      window.lunaTurnstileReady = () => {turnstileWidget = window.turnstile.render('#turnstile-container', {sitekey: data.siteKey, theme:'light'});};
      const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=lunaTurnstileReady&render=explicit'; script.async = true;
      script.onerror = () => setStatus('Spam protection could not load. Please try again or reach out on social media.', 'error');
      document.head.append(script);
    }
  }).catch(() => setStatus('Message delivery is unavailable here. Please connect through Instagram or Facebook below.', 'error'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    let firstInvalid;
    ['name','email','phone','service','message'].forEach(name => {
      const field = form.elements[name]; const error = document.getElementById(name + '-error');
      const valid = field.checkValidity() && (!field.required || field.value.trim().length > 0);
      field.setAttribute('aria-invalid', String(!valid)); field.setAttribute('aria-describedby', error.id);
      error.textContent = valid ? '' : (name === 'email' && field.value ? 'Enter a valid email address.' : `Please enter your ${name === 'name' ? 'full name' : name}.`);
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {setStatus('Please check the highlighted fields.', 'error'); firstInvalid.focus(); return;}
    const button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Sending…'; form.setAttribute('aria-busy','true'); setStatus('Sending your message…');
    const data = Object.fromEntries(new FormData(form));
    try {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try {response = await fetch('/api/contact', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data), signal: controller.signal});} finally {clearTimeout(timeout);}
      const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {};
      if (!response.ok) throw new Error(result.error || 'Message delivery is unavailable. Please try again later or reach out on social media.');
      if (!result.success) throw new Error('Delivery could not be confirmed. Please try again later.');
      form.reset(); setStatus('Your message was sent. Thank you for connecting with Luna Soul!', 'success');
    } catch (error) {setStatus(error.name === 'AbortError' ? 'The request timed out; delivery could not be confirmed. Please try again later.' : error.message, 'error');}
    finally {button.disabled = false; button.innerHTML = 'Send Message <span aria-hidden="true"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" aria-hidden=\"true\"><path d=\"M5 19 19 5M5 5h14v14\"/></svg></span>'; form.removeAttribute('aria-busy'); if (turnstileWidget !== undefined) window.turnstile.reset(turnstileWidget);}
  });
}
