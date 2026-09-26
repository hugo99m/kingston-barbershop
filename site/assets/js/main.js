/* ==========================================================================
   Kingston Barbershop — поведение страницы
   Глубина в шапке, свет за курсором, лайтбокс, часы клуба, RU/EN.
   ========================================================================== */

(function (global) {
  'use strict';

  /* Исходник reception.jpg. EDGE — кромка стойки ресепшена по вертикали,
     COUNTER_L / COUNTER_R — её левый и правый край. Все в пикселях исходника. */
  var IMG_W = 1255, IMG_H = 1567, EDGE = 929;
  var COUNTER_L = 0.072, COUNTER_R = 0.924;  // доли ширины кадра
  var WORD_FIT = 0.88;                        // какую долю стойки занимает надпись
  var OVERSCAN = 1.03;                        // запас, чтобы не оголялись края при сдвиге

  var doc = document.documentElement;
  var reduce = global.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = global.matchMedia('(hover: hover) and (pointer: fine)');

  doc.classList.add('js');

  var hero = document.getElementById('hero');
  var bg = document.getElementById('heroBg');
  var fg = document.getElementById('heroFg');
  var word = document.getElementById('heroWord');
  var wordText = document.getElementById('heroWordText');
  var glow = document.getElementById('heroGlow');
  var lamps = document.getElementById('heroLamps');
  var head = document.getElementById('siteHead');
  var bands = Array.prototype.slice.call(document.querySelectorAll('[data-parallax-band]'));

  /* ==========================================================================
     Раскладка слоёв шапки
     Масштаб и смещение подбираются так, чтобы кромка стойки всегда шла на одной
     доле высоты экрана, а надпись по ширине укладывалась внутрь стойки.
     ========================================================================== */
  function layoutHero() {
    if (!hero || !bg || !fg || !word) return;

    var w = hero.clientWidth, h = hero.clientHeight;
    // доля высоты, где проходит кромка стойки; на узких экранах выше,
    // чтобы надпись не прижималась к тексту под ней
    var f = w < 700 ? 0.50 : 0.67;

    var s = Math.max(w / IMG_W, (f * h) / EDGE, ((1 - f) * h) / (IMG_H - EDGE)) * OVERSCAN;
    var dw = IMG_W * s, dh = IMG_H * s;
    var left = (w - dw) / 2;
    var top = f * h - EDGE * s;

    [bg, fg, lamps].forEach(function (el) {
      if (!el) return;
      el.style.width = dw + 'px';
      el.style.height = dh + 'px';
      el.style.left = left + 'px';
      el.style.top = top + 'px';
    });

    /* Надпись укладывается внутрь стойки, но на узких экранах сама стойка
       шире вьюпорта — поэтому берём меньшее из двух ограничений. */
    var counterW = (COUNTER_R - COUNTER_L) * dw;
    var targetW = Math.min(counterW * WORD_FIT, w * 0.9);

    wordText.style.fontSize = '100px';
    var natural = wordText.offsetWidth || 1;
    var fs = Math.max(34, Math.min(380, 100 * targetW / natural));
    wordText.style.fontSize = fs + 'px';

    // ~35% высоты капители уходит за стойку
    word.style.top = (f * h - 0.6892 * fs) + 'px';
  }

  /* ------------------------------- движение ------------------------------- */
  var scrollY = 0, pX = 0, pY = 0, gX = 0, gY = 0, ticking = false;

  function applyHero() {
    if (!hero) return;
    var shift = 'translate3d(' + (pX * -9) + 'px,' + (scrollY * 0.3 + pY * -7) + 'px,0)';
    bg.style.transform = shift;
    fg.style.transform = shift;
    if (lamps) lamps.style.transform = shift;
    word.style.transform = 'translate3d(' + (pX * 5) + 'px,' + (scrollY * 0.06 + pY * 4) + 'px,0)';
  }

  /* Курсорный сдвиг приходит из atmosphere.js */
  function setPointer(x, y) { pX = x; pY = y; applyHero(); }

  function update() {
    ticking = false;
    scrollY = global.pageYOffset;

    if (reduce.matches) { head.classList.toggle('is-stuck', scrollY > 40); return; }

    if (hero && scrollY < hero.offsetHeight + 200) applyHero();

    var vh = global.innerHeight;
    bands.forEach(function (band) {
      var r = band.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var img = band.querySelector('img');
      if (!img) return;
      var progress = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = 'translate3d(0,' + (progress * -46) + 'px,0) scale(1.2)';
    });

    head.classList.toggle('is-stuck', scrollY > 40);
  }

  function onScroll() {
    if (!ticking) { ticking = true; global.requestAnimationFrame(update); }
  }

  /* ---------------------- появление секций при скролле ---------------------- */
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reduce.matches || !('IntersectionObserver' in global)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------- часы клуба ------------------------------- */
  var OPEN_HOUR = 10, CLOSE_HOUR = 22;
  var hoursBox = document.getElementById('hours');
  var hoursText = document.getElementById('hoursText');

  function moscowNow() {
    // время клуба, независимо от часового пояса гостя
    var parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10);
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });
    return h * 60 + m;
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function renderHours() {
    if (!hoursBox || !hoursText) return;
    var now, open;
    try { now = moscowNow(); } catch (e) { return; } // старый браузер — оставляем расписание
    open = now >= OPEN_HOUR * 60 && now < CLOSE_HOUR * 60;

    hoursBox.classList.toggle('is-open', open);

    var left = CLOSE_HOUR * 60 - now;
    var text;

    if (!open) {
      text = lang === 'ru' ? 'Закрыто · откроемся в 10:00' : 'Closed · we open at 10:00';
    } else if (left <= 60) {
      text = lang === 'ru'
        ? 'Открыто · закрываемся через ' + left + ' ' + plural(left, 'минуту', 'минуты', 'минут')
        : 'Open · closing in ' + left + ' min';
    } else {
      var hrs = Math.floor(left / 60);
      text = lang === 'ru'
        ? 'Открыто · ещё ' + hrs + ' ' + plural(hrs, 'час', 'часа', 'часов')
        : 'Open · ' + hrs + ' ' + (hrs === 1 ? 'hour' : 'hours') + ' left';
    }
    hoursText.textContent = text;
  }

  /* -------------------------------- лайтбокс -------------------------------- */
  var lb = null, lbImg = null, lbCount = null, lbTitle = null, lbCap = null;
  var shots = [], shotIdx = 0, lbOpener = null;

  var INTERIOR = [
    { src: 'workplace.jpg', ru: 'Кресло у зеркала в золотой раме', en: 'A chair at the gilt-framed mirror' },
    { src: 'lounge2.jpg', ru: 'Кресла под люстрой у бордовой стены', en: 'Armchairs under the chandelier' },
    { src: 'chairs.jpg', ru: 'Рабочий ряд и мойки', en: 'The working row and basins' },
    { src: 'reception.jpg', ru: 'Ресепшн из чёрного мрамора', en: 'The black marble reception' },
    { src: 'wc.jpg', ru: 'Санузел: графит, латунь и мрамор', en: 'The washroom: graphite, brass, marble' },
    { src: 'facade.jpg', ru: 'Витрина со стороны атриума', en: 'The storefront from the atrium' }
  ];

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Галерея');

    lb.innerHTML = [
      '<div class="lb-bar">',
      '  <span class="lb-title"></span>',
      '  <span class="lb-count"></span>',
      '  <button type="button" class="lb-close" aria-label="Закрыть">&times;</button>',
      '</div>',
      '<div class="lb-stage">',
      '  <button type="button" class="lb-nav lb-prev" aria-label="Предыдущий снимок">&#8249;</button>',
      '  <img alt="">',
      '  <button type="button" class="lb-nav lb-next" aria-label="Следующий снимок">&#8250;</button>',
      '</div>',
      '<div class="lb-cap"></div>'
    ].join('');

    document.body.appendChild(lb);
    lbImg = lb.querySelector('.lb-stage img');
    lbCount = lb.querySelector('.lb-count');
    lbTitle = lb.querySelector('.lb-title');
    lbCap = lb.querySelector('.lb-cap');

    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.addEventListener('mousedown', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-stage')) closeLb();
    });

    // свайп
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      x0 = null;
    });

    document.addEventListener('keydown', function (e) {
      if (!lb || lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  function render() {
    var shot = shots[shotIdx];
    lbImg.src = 'assets/img/' + shot.src;
    lbImg.alt = shot[lang] || shot.ru || '';
    lbCap.textContent = shot[lang] || shot.ru || '';
    lbCount.textContent = (shotIdx + 1) + ' / ' + shots.length;
    var many = shots.length > 1;
    lb.querySelector('.lb-prev').hidden = !many;
    lb.querySelector('.lb-next').hidden = !many;
  }

  function step(d) {
    shotIdx = (shotIdx + d + shots.length) % shots.length;
    render();
  }

  function openLb(list, title, index, opener) {
    if (!lb) buildLightbox();
    shots = list;
    shotIdx = index || 0;
    lbOpener = opener || null;
    lbTitle.textContent = title || '';
    render();
    lb.hidden = false;
    document.body.classList.add('is-locked');
    lb.querySelector('.lb-close').focus();
  }

  function closeLb() {
    if (!lb) return;
    lb.hidden = true;
    document.body.classList.remove('is-locked');
    if (lbOpener && lbOpener.focus) lbOpener.focus();
  }

  function initGallery() {
    document.addEventListener('click', function (e) {
      var fig = e.target.closest ? e.target.closest('[data-gallery]') : null;
      if (fig) {
        var list = fig.getAttribute('data-gallery').split(',').map(function (name) {
          var src = name.trim();
          return { src: src, ru: fig.getAttribute('data-gallery-title') || '', en: fig.getAttribute('data-gallery-title') || '' };
        });
        openLb(list, fig.getAttribute('data-gallery-title'), 0, fig);
        return;
      }
      var item = e.target.closest ? e.target.closest('[data-gallery-index]') : null;
      if (item) {
        openLb(INTERIOR, lang === 'ru' ? 'Интерьер' : 'Interior',
          parseInt(item.getAttribute('data-gallery-index'), 10) || 0, item);
      }
    });
  }

  /* ----------------------------- мобильное меню ----------------------------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  var drawerClose = document.getElementById('drawerClose');

  function setDrawer(open) {
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('is-locked', open);
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
    drawerClose.addEventListener('click', function () { setDrawer(false); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a, [data-book]')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) setDrawer(false);
    });
  }

  /* --------------------------------- RU / EN --------------------------------- */
  var ruBtn = document.getElementById('langRu');
  var enBtn = document.getElementById('langEn');
  var lang = 'ru';

  function applyLang(root) {
    (root || document).querySelectorAll('[data-ru]').forEach(function (el) {
      var text = el.getAttribute('data-' + lang);
      if (text === null) return;
      if (text.indexOf('|') === -1) { el.textContent = text; return; }
      el.textContent = '';
      text.split('|').forEach(function (line, i) {
        if (i) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line));
      });
    });
  }

  function setLang(next) {
    lang = next;
    applyLang(document);
    renderHours();
    if (lb && !lb.hidden) render();
    ruBtn.setAttribute('aria-pressed', lang === 'ru' ? 'true' : 'false');
    enBtn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    doc.lang = lang;
    try { localStorage.setItem('kingston-lang', lang); } catch (e) { /* приватный режим */ }
  }

  /* ----------------------------- плавная прокрутка ----------------------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-book')) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------------------------- старт ---------------------------------- */
  var resizeTimer;
  global.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layoutHero(); update(); }, 120);
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHero);

  layoutHero();
  update();
  global.addEventListener('scroll', onScroll, { passive: true });

  initReveal();
  initGallery();

  renderHours();
  setInterval(renderHours, 30000);

  if (ruBtn && enBtn) {
    ruBtn.addEventListener('click', function () { setLang('ru'); });
    enBtn.addEventListener('click', function () { setLang('en'); });
    try {
      if (localStorage.getItem('kingston-lang') === 'en') setLang('en');
    } catch (e) { /* приватный режим */ }
  }

  global.Kingston = {
    applyLang: applyLang,
    layoutHero: layoutHero,
    applyHero: applyHero,
    setPointer: setPointer,
    openGallery: openLb,
    hero: hero,
    glow: glow,
    reduce: reduce,
    fine: fine
  };
  if (global.YClients) global.YClients.bind();
})(window);
