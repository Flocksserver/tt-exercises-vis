/*
 * voice.js — EXPERIMENT (Branch experiment/voice-vosk): On-device Spracheingabe via VOSK.
 *
 * Vosk (Kaldi als WASM, im Web-Worker) mit FESTER GRAMMATIK: der Erkenner darf nur die erlaubten
 * Wörter ausgeben -> für unser festes Kommando-Vokabular deutlich zuverlässiger als offenes Whisper.
 * Streaming/Echtzeit, kleines Modell (~46 MB DE), kein GPU. Strikt lokal: kein Cloud, kein Key.
 * Lib + Modell werden ERST beim ersten Mic-Klick geladen; Modell wird (Cache API) gecacht -> offline.
 *
 * API (window.TTV.voice) — identisch zur Whisper-Variante, damit app.js unverändert bleibt:
 *   isSupported() · normalize(text) · snap(text) · isRecording() · toggle(lang,{onStatus,onResult})
 * onStatus(state[, info]) state ∈ 'loading'(info=%)|'listening'|'ready'|'done'|'error'
 */
(function (TTV) {
  'use strict';

  var LIB = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.5/dist/vosk.js';
  var MODELS = {
    de: 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-de-0.15.tar.gz',
    en: 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz'
  };
  // Erlaubte Wörter (Grammatik) – der Erkenner gibt nur diese aus. „[unk]“ = Rest verwerfen.
  var GRAMMAR = {
    de: 'vorhand rückhand mitte links rechts weit tief über ecke diagonal parallel kurz halblang lang frei dann danach und zwei drei vier fünf sechs sieben acht mal topspin block schupf konter flip aufschlag',
    en: 'forehand backhand middle left right wide over corner diagonal parallel short long free then and two three four five six seven eight times topspin block push counter flip serve'
  };

  var libP = null, models = {}, recognizer = null, audioCtx = null, source = null, proc = null,
    stream = null, recording = false, cb = {}, acc = '', lastPartial = '';

  function hasAC() { return !!(window.AudioContext || window.webkitAudioContext); }
  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && hasAC() && typeof WebAssembly !== 'undefined';
  }
  function isRecording() { return recording; }

  // ── Wortschatz-Snapping + Normalisierung (Sicherheitsnetz zusätzlich zur Grammatik) ──
  var NUM = { zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  function normalize(text) {
    var t = String(text == null ? '' : text).trim();
    t = t.replace(/[.!?,;]+/g, ' ');
    t = t.replace(/\b([a-zäöüß]+)\s*mal\b/gi, function (m, w) { var n = NUM[w.toLowerCase()]; return n ? (n + ' mal') : m; });
    t = t.replace(/\b[a-zäöüß]+\b/gi, function (w) { var n = NUM[w.toLowerCase()]; return n != null ? String(n) : w; });
    return t.replace(/\s+/g, ' ').trim();
  }
  var VOCAB = ('vorhand vh rückhand rueckhand rh mitte fh bh forehand backhand middle mid weit weite tief tiefe über ecke links rechts diagonal parallel kurz halblang lang aus in oder dann danach then frei free endlos endless zwei drei vier fünf fuenf sechs sieben acht mal two three four five six topspin block schupf konter flip aufschlag').split(' ');
  var ALIAS = { vorderhand: 'vorhand', vorder: 'vorhand', rück: 'rückhand', rueck: 'rückhand', mittel: 'mitte', mitter: 'mitte', mitt: 'mitte' };
  function lev(a, b) {
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var prev = [], cur = [], i, j; for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) { cur[0] = i; for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1)); var t = prev; prev = cur; cur = t; }
    return prev[n];
  }
  function snap(text) {
    var toks = String(text == null ? '' : text).toLowerCase().split(/\s+/), out = [];
    for (var k = 0; k < toks.length; k++) {
      var w = toks[k].replace(/[^a-zäöüß0-9]/g, ''); if (!w) continue;
      if (/^\d+$/.test(w)) { out.push(w); continue; }
      if (ALIAS[w]) { out.push(ALIAS[w]); continue; }
      var best = null, bd = 99; for (var i = 0; i < VOCAB.length; i++) { var d = lev(w, VOCAB[i]); if (d < bd) { bd = d; best = VOCAB[i]; } }
      if (best && bd <= Math.max(1, Math.floor(w.length / 3))) out.push(best);
    }
    return out.join(' ');
  }

  function loadLib() {
    if (window.Vosk) return Promise.resolve(window.Vosk);
    if (libP) return libP;
    libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LIB;
      s.onload = function () { res(window.Vosk); }; s.onerror = function () { rej(new Error('lib')); };
      document.head.appendChild(s);
    });
    return libP;
  }

  // Modell-tar.gz mit Fortschritt laden (Cache API -> 2. Mal sofort/offline), als Blob-URL.
  async function modelUrl(url, onPct) {
    try {
      var cache = await caches.open('ttv-vosk');
      var hit = await cache.match(url);
      if (hit) { if (onPct) onPct(100); return URL.createObjectURL(await hit.blob()); }
      var resp = await fetch(url);
      var total = +resp.headers.get('content-length') || 0, loaded = 0, chunks = [];
      var reader = resp.body.getReader();
      for (;;) { var r = await reader.read(); if (r.done) break; chunks.push(r.value); loaded += r.value.length; if (total && onPct) onPct(Math.min(100, Math.round(loaded / total * 100))); }
      var blob = new Blob(chunks);
      try { await cache.put(url, new Response(blob, { headers: { 'content-type': 'application/gzip' } })); } catch (e) { /* ignore */ }
      return URL.createObjectURL(blob);
    } catch (e) { return url; }   // Fallback: direkte URL, Lib lädt selbst (ohne %)
  }

  async function ensureModel(lang, onStatus) {
    if (models[lang]) return models[lang];
    var Vosk = await loadLib();
    if (onStatus) onStatus('loading', 0);
    var url = MODELS[lang] || MODELS.de;
    var src = await modelUrl(url, function (p) { if (onStatus) onStatus('loading', p); });
    try { models[lang] = await Vosk.createModel(src); }
    catch (e) { if (src !== url) models[lang] = await Vosk.createModel(url); else throw e; }
    if (onStatus) onStatus('ready');
    return models[lang];
  }

  function start(lang, opts) {
    if (recording) return;
    cb = opts || {}; acc = ''; lastPartial = '';
    ensureModel(lang, cb.onStatus).then(function (model) {
      return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
        stream = s; recording = true;
        var AC = window.AudioContext || window.webkitAudioContext; audioCtx = new AC();
        recognizer = new model.KaldiRecognizer(audioCtx.sampleRate, JSON.stringify([GRAMMAR[lang] || GRAMMAR.de, '[unk]']));
        recognizer.on('result', function (m) { if (m && m.result && m.result.text) acc += ' ' + m.result.text; });
        recognizer.on('partialresult', function (m) { if (m && m.result) lastPartial = m.result.partial || ''; });
        source = audioCtx.createMediaStreamSource(s);
        proc = audioCtx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = function (e) { try { recognizer.acceptWaveform(e.inputBuffer); } catch (err) { /* ignore */ } };
        source.connect(proc); proc.connect(audioCtx.destination);
        if (cb.onStatus) cb.onStatus('listening');
      });
    }).catch(function (e) { recording = false; if (cb.onStatus) cb.onStatus('error', e); });
  }

  function stop() {
    if (!recording && !stream) return;
    recording = false;
    try { if (proc) { proc.disconnect(); proc.onaudioprocess = null; } if (source) source.disconnect(); } catch (e) { /* ignore */ }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (audioCtx && audioCtx.close) { try { audioCtx.close(); } catch (e) { /* ignore */ } }
    var raw = (acc.trim() || lastPartial || '');
    var text = normalize(snap(raw));
    if (cb.onStatus) cb.onStatus('done');
    if (text && cb.onResult) cb.onResult(text);
  }

  function toggle(lang, opts) { if (recording) stop(); else start(lang, opts); }

  TTV.voice = { isSupported: isSupported, isRecording: isRecording, normalize: normalize, snap: snap, toggle: toggle, start: start, stop: stop };
})(window.TTV = window.TTV || {});
