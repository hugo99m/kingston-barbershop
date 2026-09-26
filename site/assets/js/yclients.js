/* ==========================================================================
   Онлайн-запись через YClients
   --------------------------------------------------------------------------
   Форма записи открывается в модальном окне через iframe. У страниц YClients
   не выставлены X-Frame-Options и CSP frame-ancestors, поэтому встраивание
   работает. Iframe грузится только в момент открытия окна — до первого клика
   к YClients не уходит ни одного запроса.

   Все идентификаторы ниже взяты с действующего сайта kingston-spa.com.
   Если в YClients сменится филиал или маршруты — правится только CONFIG.
   ========================================================================== */

(function (global) {
  'use strict';

  var CONFIG = {
    host: 'https://n131174.yclients.com', // поддомен филиала (Москва-Сити)
    companyId: 140204,                    // id компании в YClients
    loyalty: 'https://o1413.yclients.com/loyalty', // сертификаты и бонусная карта

    // Маршруты формы записи. `o` — служебный параметр YClients:
    // пустой = без предвыбора, `m<id>` = сразу выбран мастер.
    routes: {
      menu: '/company/{company}/personal/menu',                 // общий вход
      master: '/company/{company}/personal/select-master',      // выбор мастера
      service: '/company/{company}/personal/select-services'    // выбор услуги
    }
  };

  // id мастеров в YClients — с карточек действующего сайта.
  // Проверено 22.09.2026 по живому списку записи: эти четверо в штате,
  // ссылка открывает услуги с уже выбранным мастером.
  var MASTERS = {
    anastasia: 1472348,
    sabir: 696379,
    ranar: 1127857,
    dastan: 344955
  };

  // В YClients есть ещё Али, Мухаммад-Али и Бахруз — их id со старого сайта
  // не подтверждены, поэтому их кнопки ведут на экран выбора мастера.
  // Алексея (1311926) и Ивана (720784) в списке записи больше нет.

  /**
   * Собирает ссылку на форму записи.
   * @param {Object} [opts]
   * @param {string} [opts.step]   'menu' | 'master' | 'service'
   * @param {string|number} [opts.master]  ключ из MASTERS или числовой id
   * @returns {string}
   */
  function buildUrl(opts) {
    opts = opts || {};
    var step = CONFIG.routes[opts.step] ? opts.step : 'menu';
    var path = CONFIG.routes[step].replace('{company}', CONFIG.companyId);

    var o = '';
    if (opts.master) {
      var id = MASTERS[opts.master] || opts.master;
      if (/^\d+$/.test(String(id))) { o = 'm' + id; }
    }
    return CONFIG.host + path + '?o=' + o;
  }

  /* ----------------------------- модальное окно ----------------------------- */

  var modal = null;
  var frame = null;
  var note = null;
  var extLink = null;
  var titleEl = null;
  var lastFocused = null;
  var currentUrl = '';

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'yc-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ycTitle');

    modal.innerHTML = [
      '<div class="yc-dialog">',
      '  <div class="yc-bar">',
      '    <img class="crest" src="assets/img/crest.svg" alt="">',
      '    <span class="yc-title" id="ycTitle" data-ru="Онлайн-запись" data-en="Online booking">Онлайн-запись</span>',
      '    <a class="yc-ext" target="_blank" rel="noopener" href="#" data-ru="Открыть отдельно" data-en="Open in a new tab">Открыть отдельно</a>',
      '    <button type="button" class="yc-close" aria-label="Закрыть">&times;</button>',
      '  </div>',
      '  <div class="yc-body">',
      '    <div class="yc-note">',
      '      <span class="lbl" data-ru="Загружаем запись" data-en="Loading booking">Загружаем запись</span>',
      '      <span data-ru="Форма YClients откроется через пару секунд." data-en="The YClients form will open in a moment.">Форма YClients откроется через пару секунд.</span>',
      '    </div>',
      '    <iframe class="yc-frame" title="Онлайн-запись Kingston Barbershop" allow="payment; geolocation" hidden></iframe>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    frame = modal.querySelector('.yc-frame');
    note = modal.querySelector('.yc-note');
    extLink = modal.querySelector('.yc-ext');
    titleEl = modal.querySelector('.yc-title');

    frame.addEventListener('load', function () {
      note.hidden = true;
      frame.hidden = false;
    });

    modal.querySelector('.yc-close').addEventListener('click', close);
    modal.addEventListener('mousedown', function (e) {
      if (e.target === modal) { close(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) { close(); }
    });

    // простая ловушка фокуса
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('a[href], button, iframe');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function open(opts) {
    if (!modal) { buildModal(); }

    var url = buildUrl(opts);
    lastFocused = document.activeElement;

    // перезагружаем iframe только если адрес изменился
    if (url !== currentUrl) {
      currentUrl = url;
      note.hidden = false;
      frame.hidden = true;
      frame.src = url;
    }
    extLink.href = url;

    modal.hidden = false;
    document.body.classList.add('is-locked');
    if (global.Kingston && global.Kingston.applyLang) { global.Kingston.applyLang(modal); }
    modal.querySelector('.yc-close').focus();
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
  }

  /* ----------------------------- привязка к разметке ----------------------------- */
  /* Любой элемент с data-book открывает запись:
       data-book             — общий вход
       data-book="master"    — экран выбора мастера
       data-book="service"   — экран выбора услуги
       data-master="sabir"   — сразу этот мастер                                */

  function bind() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-book]') : null;
      if (!el) return;
      e.preventDefault();
      open({ step: el.getAttribute('data-book') || 'menu', master: el.getAttribute('data-master') });
    });
  }

  global.YClients = {
    config: CONFIG,
    masters: MASTERS,
    url: buildUrl,
    open: open,
    close: close,
    bind: bind
  };
})(window);
