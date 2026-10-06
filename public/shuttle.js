/* Sphynx Shuttle : script des pages Webflow (accès, thème, bibliothèque, visionneuse, commentaires).
   Servi par l'app Webflow Cloud : /app/shuttle.js. API : /app/api. */
(function () {
  'use strict';
  var html = document.documentElement;
  var BASE = (html.getAttribute('data-shuttle-base') || '/app').replace(/\/$/, '');
  var API = BASE + '/api';
  var KEY = 'sphynx-shuttle:';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(KEY + k); } catch (e) {} }
  };
  var fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var fmtDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  var fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var plural = function (n, one, many) { return n + ' ' + (n > 1 ? many : one); };
  function api(path, opts) {
    opts = opts || {};
    opts.cache = 'no-store'; opts.credentials = 'same-origin';
    opts.headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ('Erreur ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function activate(el, fn) {
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.addEventListener('click', function (e) { e.preventDefault(); fn(e); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
  }
  function fill(root, f, text) { $$('[data-f="' + f + '"]', root).forEach(function (el) { el.textContent = text; }); }

  /* ---------- thème ---------- */
  var frameEl = null;
  function isDark() { return html.getAttribute('data-theme') === 'dark'; }
  function paintTheme() {
    var d = isDark();
    $$('.shuttle').forEach(function (el) { el.classList.toggle('is-dark', d); });
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-checked', d ? 'true' : 'false');
      b.setAttribute('aria-label', d ? 'Passer en mode clair' : 'Passer en mode sombre');
    });
    if (frameEl && frameEl.contentWindow) { try { frameEl.contentWindow.postMessage({ type: 'sphynx-theme', theme: d ? 'dark' : 'light' }, '*'); } catch (e) {} }
  }
  function setTheme(t) { html.setAttribute('data-theme', t); store.set('theme', t); paintTheme(); }
  $$('[data-theme-toggle]').forEach(function (b) { b.removeAttribute('href'); activate(b, function () { setTheme(isDark() ? 'light' : 'dark'); }); });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { if (!store.get('theme')) { html.setAttribute('data-theme', mq.matches ? 'dark' : 'light'); paintTheme(); } });
  }
  paintTheme();

  /* ---------- accès ---------- */
  var gate = $('[data-gate]');
  var holder = $('[data-doc-frame]');
  function setAuth(ok, admin) {
    if (ok) { html.setAttribute('data-auth', 'ok'); store.set('auth', '1'); }
    else { html.removeAttribute('data-auth'); store.del('auth'); }
    if (ok && admin) { html.setAttribute('data-admin', 'ok'); store.set('admin', '1'); }
    else if (!ok || admin === false) { html.removeAttribute('data-admin'); store.del('admin'); }
  }
  function toGate() {
    var next = location.pathname + location.search;
    location.replace('/' + (next && next !== '/' ? '?next=' + encodeURIComponent(next) : ''));
  }
  $$('[data-logout]').forEach(function (b) {
    b.removeAttribute('href');
    activate(b, function () { api('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(function () {}).then(function () { setAuth(false); location.href = '/'; }); });
  });

  if (gate) {
    var gForm = $('form', gate) || gate, gPass = $('[data-gate-password]', gate), gErr = $('[data-gate-error]', gate), gBtn = $('[data-gate-submit]', gate);
    if (gBtn && gBtn.tagName === 'INPUT') {
      var nb = document.createElement('button'); nb.type = 'button'; nb.className = gBtn.className.replace(/\bw-\S+/g, '').trim(); nb.textContent = gBtn.value || 'Entrer';
      gBtn.parentNode.replaceChild(nb, gBtn); gBtn = nb;
    }
    var tryLogin = function () {
      var pw = (gPass && gPass.value || '').trim();
      if (!pw) { showGateError('Entrez le mot de passe qui vous a été transmis.'); return; }
      if (gBtn) gBtn.disabled = true;
      api('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
        .then(function (res) {
          gPass.value = ''; setAuth(true, !!res.admin);
          var next = new URLSearchParams(location.search).get('next');
          if (next && /^\/(?!\/)/.test(next)) { location.href = next; return; }
          history.replaceState(null, '', '/'); loadLibrary();
        })
        .catch(function (e) { showGateError(e.status === 401 ? 'Mot de passe incorrect. En cas de doute, écrivez à max@sphynx.studio.' : 'Connexion impossible pour le moment. Réessayez.'); if (gPass) gPass.select(); })
        .then(function () { if (gBtn) gBtn.disabled = false; });
    };
    var showGateError = function (t) { if (gErr) { gErr.textContent = t; gErr.classList.add('is-on'); } gate.classList.remove('is-shake'); void gate.offsetWidth; gate.classList.add('is-shake'); };
    if (gPass) gPass.addEventListener('input', function () { if (gErr) gErr.classList.remove('is-on'); });
    if (gBtn) gBtn.addEventListener('click', function (e) { e.preventDefault(); tryLogin(); });
    gForm.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); tryLogin(); }, true);
    if (gForm.setAttribute) gForm.setAttribute('novalidate', '');
  }

  api('/session').then(function (s) {
    setAuth(true, !!s.admin);
    if (gate) loadLibrary(); else if (holder) loadDoc();
  }).catch(function (e) {
    if (e.status === 401) { setAuth(false); if (!gate) toGate(); else if (gate) { var p = $('[data-gate-password]', gate); if (p) setTimeout(function () { p.focus(); }, 60); } }
    else if (gate) { setAuth(store.get('auth') === '1'); if (html.getAttribute('data-auth') === 'ok') loadLibrary(); }
  });

  /* ---------- bibliothèque ---------- */
  function loadLibrary() {
    var list = $('[data-docs-list]'); if (!list) return;
    var tpl = $('[data-doc-template]', list), empty = $('[data-docs-empty]'), count = $('[data-docs-count]');
    if (!tpl) return;
    api('/docs').then(function (data) {
      $$('[data-doc-row]', list).forEach(function (el) { el.parentNode.removeChild(el); });
      var docs = data.docs || [];
      docs.forEach(function (d) {
        var el = tpl.cloneNode(true);
        el.removeAttribute('data-doc-template'); el.setAttribute('data-doc-row', d.slug);
        el.setAttribute('href', '/document?d=' + encodeURIComponent(d.slug));
        fill(el, 'title', d.title); fill(el, 'summary', d.summary || '');
        fill(el, 'kind', d.kind || 'Document'); fill(el, 'version', d.version ? d.version + ' · ' + fmtDay.format(new Date(d.updated_at)) : 'Mis à jour le ' + fmtDay.format(new Date(d.updated_at)));
        fill(el, 'comments', d.comments ? plural(d.comments, 'commentaire', 'commentaires') : 'Aucun commentaire');
        var c = $('[data-f="comments"]', el); if (c && d.last_comment) c.title = 'Dernier commentaire le ' + fmtLong.format(new Date(d.last_comment));
        var s = $('[data-f="summary"]', el); if (s) s.style.display = d.summary ? '' : 'none';
        list.appendChild(el);
      });
      if (count) count.textContent = docs.length ? plural(docs.length, 'document', 'documents') : '';
      if (empty) { empty.style.display = docs.length ? 'none' : ''; empty.textContent = 'Aucun document partagé pour l’instant.'; }
    }).catch(function (e) {
      if (e.status === 401) { setAuth(false); return; }
      if (empty) { empty.style.display = ''; empty.textContent = 'La bibliothèque n’est pas joignable pour le moment. Réessayez dans un instant.'; }
    });
  }

  /* ---------- visionneuse ---------- */
  var docSlug = '', docTitle = 'Document';
  function loadDoc() {
    var msg = $('[data-doc-msg]', holder), open = $('[data-doc-open]');
    docSlug = (new URLSearchParams(location.search).get('d') || '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(docSlug)) { if (msg) msg.textContent = 'Document introuvable.'; if (open) open.style.display = 'none'; return; }
    api('/docs/' + docSlug).then(function (data) {
      var d = data.doc; docTitle = d.title;
      document.title = d.title + ' · Sphynx Shuttle';
      fill(document, 'title', d.title); fill(document, 'version', d.version || '');
      $$('[data-f="version"]').forEach(function (el) { el.style.display = d.version ? '' : 'none'; });
      var src = BASE + '/d/' + encodeURIComponent(d.slug) + '?v=' + encodeURIComponent(d.updated_at);
      if (open) { open.href = src; open.target = '_blank'; open.rel = 'noopener'; }
      frameEl = document.createElement('iframe');
      frameEl.className = 'docframe'; frameEl.title = d.title; frameEl.src = src;
      frameEl.setAttribute('allow', 'clipboard-write; fullscreen');
      frameEl.addEventListener('load', function () { if (msg) msg.style.display = 'none'; paintTheme(); });
      holder.appendChild(frameEl);
      if (msg) msg.style.display = 'none';
      initComments(d.comments || 0);
    }).catch(function (e) {
      if (e.status === 401) { setAuth(false); toGate(); return; }
      if (msg) msg.textContent = e.status === 404 ? 'Ce document n’existe pas ou n’est plus partagé.' : 'Le document n’est pas joignable pour le moment. Réessayez dans un instant.';
      if (open) open.style.display = 'none';
    });
  }

  /* ---------- commentaires ---------- */
  function initComments(initialCount) {
    var cw = $('[data-cw]'); if (!cw) return;
    var panel = $('[data-cw-panel]', cw), toggle = $('[data-cw-toggle]', cw), list = $('[data-cw-list]', cw);
    var empty = $('[data-cw-empty]', cw), count = $('[data-cw-count]', cw), ctx = $('[data-cw-ctx]', cw);
    var form = $('[data-cw-form]', cw), nameIn = $('[data-cw-input-name]', cw), textIn = $('[data-cw-input-text]', cw);
    var err = $('[data-cw-error]', cw), submit = $('[data-cw-submit]', cw), toast = $('[data-toast]');
    var tpl = $('[data-cw-template]', cw);
    if (tpl) { tpl.parentNode.removeChild(tpl); tpl.removeAttribute('data-cw-template'); }
    if (submit) {
      var nb = document.createElement('button');
      nb.type = 'button'; nb.className = 'btn-primary'; nb.textContent = submit.value || submit.textContent || 'Enregistrer';
      submit.parentNode.replaceChild(nb, submit); submit = nb;
      nb.addEventListener('click', function (e) { e.preventDefault(); send(); });
    }
    if (ctx) ctx.textContent = docTitle;
    if (count) count.textContent = String(initialCount);
    var items = [], loaded = false, busy = false, toastTimer;

    function render() {
      $$('.cw-item', list).forEach(function (el) { el.parentNode.removeChild(el); });
      if (count) count.textContent = String(items.length);
      if (empty) {
        empty.style.display = items.length ? 'none' : '';
        empty.textContent = loaded ? 'Aucun commentaire sur ce document pour l’instant. Le premier sera le vôtre.' : 'Chargement des commentaires…';
      }
      items.forEach(function (c) {
        if (!tpl) return;
        var el = tpl.cloneNode(true), d = new Date(c.created_at);
        var n = $('[data-cw-name]', el), t = $('[data-cw-time]', el), m = $('[data-cw-text]', el);
        if (n) n.textContent = c.name;
        if (t) { t.textContent = fmt.format(d); t.title = fmtLong.format(d); }
        if (m) m.textContent = c.message;
        list.appendChild(el);
      });
    }
    function load() {
      return api('/comments?doc=' + encodeURIComponent(docSlug))
        .then(function (data) { items = data.comments || []; loaded = true; render(); })
        .catch(function (e) {
          if (e.status === 401) { setAuth(false); toGate(); return; }
          loaded = true; items = []; render();
          if (empty) { empty.style.display = ''; empty.textContent = 'Les commentaires ne sont pas joignables pour le moment. Réessayez dans un instant.'; }
        });
    }
    function openPanel() {
      panel.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true');
      if (!nameIn.value) nameIn.value = store.get('name') || '';
      setTimeout(function () { (nameIn.value ? textIn : nameIn).focus(); }, 40);
      load();
    }
    function closePanel() { panel.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    activate(toggle, function () { panel.classList.contains('is-open') ? closePanel() : openPanel(); });
    activate($('[data-cw-close]', cw), function () { closePanel(); toggle.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) { closePanel(); toggle.focus(); } });

    function showError(text, field) {
      err.textContent = text; err.classList.add('is-on');
      [nameIn, textIn].forEach(function (f) { f.classList.toggle('is-invalid', f === field); });
      if (field) field.focus();
    }
    function clearError() { err.classList.remove('is-on'); nameIn.classList.remove('is-invalid'); textIn.classList.remove('is-invalid'); }
    [nameIn, textIn].forEach(function (f) { f.addEventListener('input', clearError); });
    textIn.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } });
    function showToast(text) {
      if (!toast) return;
      var t = $('[data-toast-text]', toast); if (t) t.textContent = text;
      toast.classList.add('is-on');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
    }
    function send() {
      if (busy) return;
      var name = nameIn.value.trim(), message = textIn.value.trim();
      if (!name) return showError('Signez votre commentaire : indiquez votre nom.', nameIn);
      if (!message) return showError('Écrivez votre commentaire avant de l’enregistrer.', textIn);
      clearError(); busy = true; submit.disabled = true; store.set('name', name);
      api('/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: docSlug, docTitle: docTitle, name: name, message: message }) })
        .then(function (res) {
          items.unshift(res.comment); loaded = true; render();
          textIn.value = ''; list.scrollTop = 0; textIn.focus();
          showToast('Commentaire signé et enregistré.');
        })
        .catch(function (e) { if (e.status === 401) { setAuth(false); toGate(); return; } showError(e.message || 'Enregistrement impossible. Réessayez dans un instant.'); })
        .then(function () { busy = false; submit.disabled = false; });
    }
    if (form) {
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); send(); }, true);
    }
  }
})();
