/* Sphynx Shuttle : script des pages Webflow (session admin, thème, bibliothèque, visionneuse, commentaires).
   Servi par l'app Webflow Cloud : /app/shuttle.js. API : /app/api. */
(function () {
  'use strict';
  (function () { var st = document.createElement('style'); st.setAttribute('data-shuttle', ''); st.textContent = '.cw-tags{display:flex;flex-wrap:wrap;gap:6px}\n.cw-badge{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:10px;font-size:11px;font-weight:500;letter-spacing:.01em;background:var(--_sphynx---surface2);color:var(--_sphynx---ink2)}\n.cw-badge.is-ok{color:var(--_sphynx---ok)}\n.cw-badge.is-ok::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}\n.cw-item.is-resolved .cw-text,.cw-item.is-resolved .cw-name{color:var(--_sphynx---ink2)}\n.cw-item.is-hidden{opacity:.55}\n.cw-mod{display:flex;gap:6px;margin-top:2px}\n.cw-act{height:26px;padding:0 10px;border:0;border-radius:13px;background:var(--_sphynx---surface2);color:var(--_sphynx---ink2);font:inherit;font-size:12px;font-weight:500;cursor:pointer}\n.cw-act:hover{background:var(--_sphynx---surface3);color:var(--_sphynx---ink)}\n.cw-act:focus-visible{outline:2px solid currentColor;outline-offset:2px}'; document.head.appendChild(st); })();
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
  // L'espace Sopht est protégé par le mot de passe du site Webflow. L'app ne connaît que la session
  // administrateur (publication et modération), signalée par data-admin="ok" sur <html>.
  var holder = $('[data-doc-frame]');
  html.setAttribute('data-auth', 'ok'); store.del('auth');
  function setAdmin(admin) {
    if (admin) { html.setAttribute('data-admin', 'ok'); store.set('admin', '1'); }
    else { html.removeAttribute('data-admin'); store.del('admin'); }
  }
  $$('[data-logout]').forEach(function (b) {
    b.removeAttribute('href');
    activate(b, function () { api('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(function () {}).then(function () { setAdmin(false); location.reload(); }); });
  });

  api('/session').then(function (s) { setAdmin(!!s.admin); }).catch(function () {}).then(function () {
    if (holder) loadDoc(); else loadLibrary();
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
        fill(el, 'comments', d.comments ? plural(d.comments, 'commentaire', 'commentaires') + (d.resolved ? ', dont ' + plural(d.resolved, 'validé', 'validés') : '') : 'Aucun commentaire');
        var c = $('[data-f="comments"]', el); if (c && d.last_comment) c.title = 'Dernier commentaire le ' + fmtLong.format(new Date(d.last_comment));
        var s = $('[data-f="summary"]', el); if (s) s.style.display = d.summary ? '' : 'none';
        list.appendChild(el);
      });
      if (count) count.textContent = docs.length ? plural(docs.length, 'document', 'documents') : '';
      if (empty) { empty.style.display = docs.length ? 'none' : ''; empty.textContent = 'Aucun document partagé pour l’instant.'; }
    }).catch(function (e) {
      if (empty) { empty.style.display = ''; empty.textContent = 'La bibliothèque n’est pas joignable pour le moment. Réessayez dans un instant.'; }
    });
  }

  /* ---------- visionneuse ---------- */
  var docSlug = '', docTitle = 'Document';
  function loadDoc() {
    var msg = $('[data-doc-msg]', holder), open = $('[data-doc-open]'), dl = $('[data-doc-download]');
    docSlug = (new URLSearchParams(location.search).get('d') || '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(docSlug)) { if (msg) msg.textContent = 'Document introuvable.'; if (open) open.style.display = 'none'; if (dl) dl.style.display = 'none'; return; }
    api('/docs/' + docSlug).then(function (data) {
      var d = data.doc; docTitle = d.title;
      document.title = d.title + ' · Sphynx Shuttle';
      fill(document, 'title', d.title); fill(document, 'version', d.version || '');
      $$('[data-f="version"]').forEach(function (el) { el.style.display = d.version ? '' : 'none'; });
      var src = BASE + '/d/' + encodeURIComponent(d.slug) + '?v=' + encodeURIComponent(d.updated_at);
      if (open) { open.href = src; open.target = '_blank'; open.rel = 'noopener'; }
      if (dl) { dl.href = src + '&download=1'; dl.setAttribute('download', ''); }
      frameEl = document.createElement('iframe');
      frameEl.className = 'docframe'; frameEl.title = d.title; frameEl.src = src;
      frameEl.setAttribute('allow', 'clipboard-write; fullscreen');
      frameEl.addEventListener('load', function () { if (msg) msg.style.display = 'none'; paintTheme(); });
      holder.appendChild(frameEl);
      if (msg) msg.style.display = 'none';
      initComments(d.comments || 0);
    }).catch(function (e) {
      if (msg) msg.textContent = e.status === 404 ? 'Ce document n’existe pas ou n’est plus partagé.' : 'Le document n’est pas joignable pour le moment. Réessayez dans un instant.';
      if (open) open.style.display = 'none';
      if (dl) dl.style.display = 'none';
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
    var items = [], loaded = false, busy = false, toastTimer, isAdmin = html.getAttribute('data-admin') === 'ok';

    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function render() {
      $$('.cw-item', list).forEach(function (x) { x.parentNode.removeChild(x); });
      var visible = items.filter(function (c) { return !c.hidden; });
      if (count) count.textContent = String(visible.length);
      if (empty) {
        empty.style.display = items.length ? 'none' : '';
        empty.textContent = loaded ? 'Aucun commentaire sur ce document pour l’instant. Le premier sera le vôtre.' : 'Chargement des commentaires…';
      }
      items.forEach(function (c) {
        if (!tpl) return;
        var item = tpl.cloneNode(true), d = new Date(c.created_at);
        var n = $('[data-cw-name]', item), t = $('[data-cw-time]', item), m = $('[data-cw-text]', item), h = $('.cw-item-h', item) || item;
        if (n) n.textContent = c.name;
        if (t) { t.textContent = fmt.format(d); t.title = fmtLong.format(d); }
        if (m) m.textContent = c.message;
        var resolved = c.status === 'resolved';
        item.classList.toggle('is-resolved', resolved);
        item.classList.toggle('is-hidden', !!c.hidden);
        if (resolved || c.hidden) {
          var tags = el('div', 'cw-tags');
          if (resolved) {
            var b = el('span', 'cw-badge is-ok', 'Validé' + (c.resolved_version ? ' en ' + c.resolved_version : ''));
            if (c.resolved_at) b.title = 'Validé le ' + fmtLong.format(new Date(c.resolved_at));
            tags.appendChild(b);
          }
          if (c.hidden) tags.appendChild(el('span', 'cw-badge', 'Masqué pour Sopht'));
          h.parentNode.insertBefore(tags, h.nextSibling);
        }
        if (isAdmin) {
          var mod = el('div', 'cw-mod');
          var v = el('button', 'cw-act', resolved ? 'Rouvrir' : 'Valider'); v.type = 'button';
          v.title = resolved ? 'Remettre ce commentaire à traiter' : 'Marquer comme corrigé dans la version en ligne';
          v.addEventListener('click', function () { moderate(c, { status: resolved ? 'open' : 'resolved' }); });
          var k = el('button', 'cw-act', c.hidden ? 'Afficher' : 'Masquer'); k.type = 'button';
          k.title = c.hidden ? 'Rendre ce commentaire visible pour Sopht' : 'Masquer ce commentaire pour Sopht (il reste archivé)';
          k.addEventListener('click', function () { moderate(c, { hidden: !c.hidden }); });
          mod.appendChild(v); mod.appendChild(k); item.appendChild(mod);
        }
        list.appendChild(item);
      });
    }
    function moderate(c, patch) {
      api('/comments?id=' + encodeURIComponent(c.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
        .then(function (res) {
          items = items.map(function (x) { return x.id === c.id ? res.comment : x; }); render();
          showToast(patch.status === 'resolved' ? 'Commentaire validé.' : patch.status === 'open' ? 'Commentaire rouvert.' : patch.hidden ? 'Commentaire masqué pour Sopht.' : 'Commentaire de nouveau visible.');
        })
        .catch(function (e) { showToast(e.message || 'Action impossible.'); });
    }
    function load() {
      return api('/comments?doc=' + encodeURIComponent(docSlug))
        .then(function (data) { isAdmin = !!data.admin; items = data.comments || []; loaded = true; render(); })
        .catch(function (e) {
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
        .catch(function (e) { showError(e.message || 'Enregistrement impossible. Réessayez dans un instant.'); })
        .then(function () { busy = false; submit.disabled = false; });
    }
    if (form) {
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); send(); }, true);
    }
  }
})();
