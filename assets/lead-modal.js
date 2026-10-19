/* Popup de captura (nome + WhatsApp) antes de encaminhar ao WhatsApp.
   Os dados são enviados ao Google Sheets via Google Apps Script (ver docs/google-sheets-setup.md). */
(function () {
  'use strict';

  // Cole aqui a URL do Web App publicado no Apps Script (termina em /exec).
  var SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyKIupTAUKuQlX_MD8jR1jnh8yflRrHQGrVy4JraN12Mqf2-gRswiDXGfW4Q3DedGWK/exec';

  // Nome da página gravado na coluna "Origem" (definido em data-origem na tag do script).
  var ORIGEM = (document.currentScript && document.currentScript.getAttribute('data-origem')) || 'Site';

  var overlay, form, nameInput, phoneInput, nameErr, phoneErr, submitBtn, lastFocus, targetHref;

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '.lm-ov{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(27,34,50,.6);backdrop-filter:blur(4px)}' +
      '.lm-ov.on{display:flex}' +
      '.lm-box{position:relative;width:100%;max-width:340px;background:#F7F6F2;color:#1B2232;border-radius:18px;padding:24px 22px 20px;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:Manrope,system-ui,sans-serif;max-height:calc(100vh - 40px);overflow:auto}' +
      '.lm-x{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;background:none;font-size:26px;line-height:1;color:#4B5A7D;cursor:pointer;border-radius:50%}' +
      '.lm-x:hover{background:rgba(75,90,125,.12)}' +
      '.lm-t{margin:0;font-family:Outfit,sans-serif;font-weight:400;font-size:22px;line-height:1.15;letter-spacing:-.02em;padding-right:28px}' +
      '.lm-s{margin:6px 0 10px;font-size:14px;line-height:1.45;color:#33413A}' +
      '.lm-l{display:block;margin-top:10px;font-size:13px;font-weight:600;color:#1B2232}' +
      '.lm-i{display:block;width:100%;box-sizing:border-box;margin-top:4px;height:44px;padding:0 12px;font:inherit;font-size:16px;color:#1B2232;background:#fff;border:1.5px solid #C9CFDB;border-radius:10px;outline:none}' +
      '.lm-i:focus{border-color:#4B5A7D;box-shadow:0 0 0 3px rgba(75,90,125,.2)}' +
      '.lm-i[aria-invalid=true]{border-color:#B3261E}' +
      '.lm-e{min-height:16px;margin:2px 0 0;font-size:12px;color:#B3261E}' +
      '.lm-b{display:flex;align-items:center;justify-content:center;text-align:center;margin-top:8px;width:100%;height:48px;padding:0 16px;border:0;border-radius:999px;background:#2E6B52;color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer}' +
      '.lm-b:hover{background:#265a45}.lm-b:disabled{opacity:.7;cursor:wait}' +
      '.lm-p{margin:10px 0 0;font-size:11px;color:#5b6678;text-align:center}' +
      '.lm-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}';
    document.head.appendChild(s);
  }

  function build() {
    css();
    overlay = document.createElement('div');
    overlay.className = 'lm-ov';
    overlay.innerHTML =
      '<div class="lm-box" role="dialog" aria-modal="true" aria-labelledby="lm-t">' +
      '<button type="button" class="lm-x" aria-label="Fechar">&times;</button>' +
      '<h2 class="lm-t" id="lm-t">Antes de continuar</h2>' +
      '<p class="lm-s">Informe seus dados para falar com a equipe do Dr. Phelype pelo WhatsApp.</p>' +
      '<form novalidate>' +
      '<label class="lm-l" for="lm-nome">Nome</label>' +
      '<input class="lm-i" id="lm-nome" name="nome" type="text" autocomplete="name" placeholder="Seu nome completo" maxlength="80">' +
      '<p class="lm-e" id="lm-nome-e" role="alert"></p>' +
      '<label class="lm-l" for="lm-tel">WhatsApp</label>' +
      '<input class="lm-i" id="lm-tel" name="whatsapp" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(85) 99999-9999" maxlength="15">' +
      '<p class="lm-e" id="lm-tel-e" role="alert"></p>' +
      '<input class="lm-hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="lm-b">Continuar para o WhatsApp</button>' +
      '<p class="lm-p">Seus dados são usados apenas para o atendimento.</p>' +
      '</form></div>';
    document.body.appendChild(overlay);

    form = overlay.querySelector('form');
    nameInput = overlay.querySelector('#lm-nome');
    phoneInput = overlay.querySelector('#lm-tel');
    nameErr = overlay.querySelector('#lm-nome-e');
    phoneErr = overlay.querySelector('#lm-tel-e');
    submitBtn = overlay.querySelector('.lm-b');

    overlay.querySelector('.lm-x').addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    phoneInput.addEventListener('input', function () { phoneInput.value = mask(phoneInput.value); });
    form.addEventListener('submit', onSubmit);
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      var f = overlay.querySelectorAll('button,input:not(.lm-hp)');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // (85) 99999-9999 ou (85) 9999-9999
  function mask(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length > 6) {
      var cut = d.length > 10 ? 7 : 6;
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, cut) + '-' + d.slice(cut);
    }
    if (d.length > 2) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 0) return '(' + d;
    return '';
  }

  function open(href) {
    if (!overlay) build();
    targetHref = href;
    lastFocus = document.activeElement;
    form.reset();
    setErr(nameInput, nameErr, '');
    setErr(phoneInput, phoneErr, '');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continuar para o WhatsApp';
    overlay.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    nameInput.focus();
  }

  function close() {
    overlay.classList.remove('on');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function setErr(input, el, msg) {
    el.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function validate() {
    var ok = true;
    var nome = nameInput.value.trim().replace(/\s+/g, ' ');
    var tel = phoneInput.value.replace(/\D/g, '');
    if (nome.length < 2) { setErr(nameInput, nameErr, 'Informe seu nome.'); ok = false; }
    else setErr(nameInput, nameErr, '');
    // DDD (11-99) + celular iniciado em 9 (9 dígitos) ou fixo (8 dígitos)
    if (!/^[1-9][1-9](9\d{8}|[2-8]\d{7})$/.test(tel)) { setErr(phoneInput, phoneErr, 'Informe um WhatsApp válido com DDD.'); ok = false; }
    else setErr(phoneInput, phoneErr, '');
    if (!ok) (nameErr.textContent ? nameInput : phoneInput).focus();
    return ok;
  }

  // Envio "dispara e esquece": não bloqueia o redirecionamento.
  function sendToSheet(data) {
    if (!SHEETS_URL) return;
    try {
      fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).catch(function () {});
    } catch (_) {}
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (form.website.value) return; // honeypot: bots

    var data = {
      nome: nameInput.value.trim().replace(/\s+/g, ' '),
      whatsapp: phoneInput.value,
      pagina: location.href,
      origem: ORIGEM,
      referencia: document.referrer || 'direto'
    };
    sendToSheet(data);
    if (typeof gtag === 'function') { try { gtag('event', 'generate_lead', { method: 'whatsapp_popup' }); } catch (_) {} }

    // Redireciona na hora, ainda dentro do clique (evita bloqueio de pop-up).
    var win = window.open(targetHref, '_blank');
    if (win) { try { win.opener = null; } catch (_) {} } else location.href = targetHref;
    close();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    open(a.href);
  }, true);
})();
