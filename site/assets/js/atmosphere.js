/* ==========================================================================
   Kingston Barbershop — атмосфера
   Открывающая сцена, свет ламп, пылинки, курсор, наклон карточек.
   Файл можно отключить целиком, убрав <script> из index.html —
   страница останется рабочей.
   ========================================================================== */

(function (global) {
  'use strict';

  var K = global.Kingston || {};
  var reduce = global.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = global.matchMedia('(hover: hover) and (pointer: fine)');

  var hero = document.getElementById('hero');
  var glow = document.getElementById('heroGlow');
  var lamps = document.getElementById('heroLamps');
  var dust = document.getElementById('heroDust');

  /* ==========================================================================
     Открывающая сцена: герб, линия, затем занавес расходится
     Показывается один раз за визит.
     ========================================================================== */
  function intro() {
    var el = document.getElementById('intro');
    if (!el) return;

    var seen = false;
    try { seen = sessionStorage.getItem('kingston-intro') === '1'; } catch (e) { /* приватный режим */ }
    if (seen || reduce.matches) return;

    try { sessionStorage.setItem('kingston-intro', '1'); } catch (e) { /* приватный режим */ }

    el.hidden = false;
    document.body.classList.add('is-locked');

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.classList.add('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(function () {
        el.remove();
        if (K.layoutHero) K.layoutHero();
      }, 1100);
    }

    requestAnimationFrame(function () { el.classList.add('is-lit'); });
    var timer = setTimeout(finish, 2100);

    // сцену можно пропустить
    function skip() { clearTimeout(timer); finish(); }
    el.addEventListener('click', skip);
    document.addEventListener('keydown', function onKey(e) {
      if (done) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    });
  }

  /* ==========================================================================
     Лампы интерьера
     Координаты — доли кадра reception.jpg: где на визуализации висят
     светильники и где подсвечены полки.
     ========================================================================== */
  var LAMPS = [
    { x: 36.3, y: 34.8, kind: 'spot', delay: 0 },
    { x: 62.0, y: 34.1, kind: 'spot', delay: -2.4 },
    { x: 29.0, y: 45.0, kind: 'wash', delay: -1.2 },
    { x: 71.0, y: 45.0, kind: 'wash', delay: -3.6 },
    { x: 8.0, y: 47.0, kind: 'wash', delay: -5.0 }
  ];

  function lightLamps() {
    if (!lamps) return;
    LAMPS.forEach(function (l) {
      var d = document.createElement('div');
      d.className = 'lamp lamp-' + l.kind;
      d.style.left = l.x + '%';
      d.style.top = l.y + '%';
      d.style.marginLeft = '0';
      d.style.animationDelay = l.delay + 's';
      lamps.appendChild(d);
    });
  }

  /* ==========================================================================
     Пылинки в свете
     ========================================================================== */
  function initDust() {
    if (!dust || !hero || reduce.matches) return;

    var ctx = dust.getContext('2d');
    var motes = [];
    var w = 0, h = 0, dpr = Math.min(global.devicePixelRatio || 1, 2);
    var running = true;

    function size() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      dust.width = Math.round(w * dpr);
      dust.height = Math.round(h * dpr);
      dust.style.width = w + 'px';
      dust.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.round(Math.min(70, Math.max(24, w / 22)));
      motes = [];
      for (var i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.7,
          a: 0.05 + Math.random() * 0.16,
          vy: -(0.06 + Math.random() * 0.16),
          sway: 0.3 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.y += m.vy;
        m.phase += 0.006;
        if (m.y < -6) { m.y = h + 6; m.x = Math.random() * w; }
        var x = m.x + Math.sin(m.phase) * m.sway * 14;
        ctx.beginPath();
        ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(232,206,150,' + m.a + ')';
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    size();
    requestAnimationFrame(frame);

    var rt;
    global.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(size, 160);
    });

    // не крутим анимацию, когда шапка ушла из вида
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
          if (!en.isIntersecting) running = false;
        });
      }, { threshold: 0 }).observe(hero);
    }
  }

  /* ==========================================================================
     Свет за курсором и сдвиг слоёв
     ========================================================================== */
  function initHeroPointer() {
    if (!hero || !glow || reduce.matches || !fine.matches) return;

    var pX = 0, pY = 0, gX = 0, gY = 0, raf = null, inside = false;

    function loop() {
      gX += (pX - gX) * 0.07;
      gY += (pY - gY) * 0.07;
      var r = hero.getBoundingClientRect();
      glow.style.transform = 'translate3d(' +
        (r.width / 2 + gX * r.width / 2) + 'px,' +
        (r.height / 2 + gY * r.height / 2) + 'px,0)';
      if (K.setPointer) K.setPointer(gX, gY);

      if (!inside && Math.abs(gX - pX) < 0.005 && Math.abs(gY - pY) < 0.005) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function wake() { if (!raf) raf = requestAnimationFrame(loop); }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      pX = (e.clientX - r.left) / r.width * 2 - 1;
      pY = (e.clientY - r.top) / r.height * 2 - 1;
      wake();
    });
    hero.addEventListener('pointerenter', function () {
      inside = true;
      glow.classList.add('is-on');
      wake();
    });
    hero.addEventListener('pointerleave', function () {
      inside = false;
      glow.classList.remove('is-on');
      pX = 0; pY = 0;
      wake();
    });

    // светим сразу по центру, чтобы шапка не выглядела мёртвой до первого движения
    glow.style.transform = 'translate3d(' + (hero.clientWidth / 2) + 'px,' + (hero.clientHeight * 0.42) + 'px,0)';
    setTimeout(function () { if (!inside) glow.classList.add('is-on'); }, 900);
  }

  /* ==========================================================================
     Курсор
     ========================================================================== */
  function initCursor() {
    var cur = document.getElementById('cursor');
    if (!cur || reduce.matches || !fine.matches) return;

    var label = cur.querySelector('.cursor-label');
    var x = global.innerWidth / 2, y = global.innerHeight / 2;
    var cx = x, cy = y, raf = null;

    document.body.classList.add('cursor-on');

    function loop() {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      // догнали курсор — останавливаем цикл до следующего движения
      if (Math.abs(x - cx) < 0.4 && Math.abs(y - cy) < 0.4) { raf = null; return; }
      raf = requestAnimationFrame(loop);
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      cur.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);

      var view = e.target.closest ? e.target.closest('[data-gallery],[data-gallery-index]') : null;
      var link = e.target.closest ? e.target.closest('a,button,[data-book]') : null;

      cur.classList.toggle('on-view', !!view);
      cur.classList.toggle('on-link', !view && !!link);
      if (view) {
        label.textContent = document.documentElement.lang === 'en' ? 'View' : 'Смотреть';
      }
    }, { passive: true });

    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); });
    document.addEventListener('pointerdown', function () { cur.classList.add('on-link'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('on-link'); });
  }

  /* ==========================================================================
     Наклон снимков в карточках
     ========================================================================== */
  function initTilt() {
    if (reduce.matches || !fine.matches) return;

    var figs = document.querySelectorAll('.card-fig, .svc-figure, .gal-item');
    Array.prototype.forEach.call(figs, function (fig) {
      var img = fig.querySelector('img');
      if (!img) return;

      fig.addEventListener('pointermove', function (e) {
        var r = fig.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = 'scale(1.07) translate3d(' + (dx * -16) + 'px,' + (dy * -16) + 'px,0)';
      });
      fig.addEventListener('pointerleave', function () { img.style.transform = ''; });
    });
  }

  /* -------------------------------- запуск -------------------------------- */
  intro();
  lightLamps();
  initDust();
  initHeroPointer();
  initCursor();
  initTilt();
})(window);
