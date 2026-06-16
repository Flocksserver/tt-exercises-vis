/*
 * voice.js — EXPERIMENT (Branch experiment/voice-input): On-device Spracheingabe fürs Sequenzfeld.
 *
 * Strikt lokal: Whisper läuft per WASM/WebGPU im Browser (transformers.js), KEIN Cloud-Dienst,
 * kein API-Key, kein Backend. Die schwere Bibliothek + das Modell werden ERST beim ersten
 * Mikro-Klick per dynamischem import() von einem ESM-CDN geladen (kein Build-Step). Im Ruhezustand
 * lädt nichts — die statische Seite bleibt schlank.
 *
 * API (window.TTV.voice):
 *   isSupported()                 -> boolean (Mic + MediaRecorder + AudioContext vorhanden)
 *   normalize(text)               -> string  (Zahlwörter -> Ziffern, Satzzeichen weg) – pure/testbar
 *   isRecording()                 -> boolean
 *   toggle(lang, { onStatus, onResult })   // startet/stoppt Push-to-talk
 *
 * onStatus(state[, err]) state ∈ 'loading'|'listening'|'transcribing'|'done'|'error'
 * onResult(text) – normalisiertes Transkript (in die Sequenz schreiben).
 */
(function (TTV) {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';
  var MODEL = 'onnx-community/whisper-base';   // multilingual; whisper-tiny = kleiner/schneller

  var rec = null, chunks = [], stream = null, transcriberP = null, recording = false, cb = {};

  function hasAC() { return !!(window.AudioContext || window.webkitAudioContext); }
  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof MediaRecorder !== 'undefined' && hasAC();
  }
  function isRecording() { return recording; }

  // Zahlwörter als Wiederholungs-Anzahl (eins/ein bewusst NICHT – kollidiert mit Artikel „eine Ecke").
  var NUM = {
    zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8,
    two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8
  };
  function normalize(text) {
    var t = String(text == null ? '' : text).trim();
    t = t.replace(/[.!?,;]+/g, ' ');                                  // Satzzeichen -> Trenner/Leer
    t = t.replace(/\b([a-zäöüß]+)\s*mal\b/gi, function (m, w) {        // „zweimal", „zwei mal" -> „2 mal"
      var n = NUM[w.toLowerCase()]; return n ? (n + ' mal') : m;
    });
    t = t.replace(/\b[a-zäöüß]+\b/gi, function (w) {                  // einzelne Zahlwörter -> Ziffer
      var n = NUM[w.toLowerCase()]; return n != null ? String(n) : w;
    });
    return t.replace(/\s+/g, ' ').trim();
  }

  // Geschlossenes Sprach-Vokabular: jedes erkannte Wort wird an das nächste erlaubte Wort
  // „eingerastet" (Whisper-Murks wie „Vorderhand mitter rück hand" -> „vorhand mitte rückhand"),
  // Füllwörter fallen weg. Das hebt die nutzbare Genauigkeit bei festem Wortschatz stark.
  var VOCAB = ('vorhand vh rückhand rueckhand rh mitte fh bh forehand backhand middle mid ' +
    'weit weite tief tiefe über ecke links rechts diagonal parallel kurz halblang lang ' +
    'aus in oder dann danach then frei free endlos endless ' +
    'zwei drei vier fünf fuenf sechs sieben acht mal two three four five six ' +
    'topspin block schupf konter flip aufschlag').split(' ');
  var ALIAS = {
    vorderhand: 'vorhand', vorder: 'vorhand', 'für hand': 'vorhand',
    rück: 'rückhand', rueck: 'rückhand', rückhand: 'rückhand',
    mittel: 'mitte', mitter: 'mitte', mitt: 'mitte', mide: 'mitte',
    übereck: 'über ecke', eck: 'ecke'
  };
  function lev(a, b) {
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var prev = [], cur = [], i, j; for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }
  function snap(text) {
    var toks = String(text == null ? '' : text).toLowerCase().split(/\s+/), out = [];
    for (var k = 0; k < toks.length; k++) {
      var w = toks[k].replace(/[^a-zäöüß0-9]/g, '');
      if (!w) continue;
      if (/^\d+$/.test(w)) { out.push(w); continue; }            // Ziffern behalten
      if (ALIAS[w]) { out.push(ALIAS[w]); continue; }
      var best = null, bd = 99;
      for (var i = 0; i < VOCAB.length; i++) { var d = lev(w, VOCAB[i]); if (d < bd) { bd = d; best = VOCAB[i]; } }
      var max = Math.max(1, Math.floor(w.length / 3));
      if (best && bd <= max) out.push(best);                     // einrasten; sonst Füllwort verwerfen
    }
    return out.join(' ');
  }

  // transformers.js + Modell-Pipeline (einmalig, gecacht). Lädt vom CDN.
  function ensurePipeline(onStatus) {
    if (transcriberP) return transcriberP;
    if (onStatus) onStatus('loading', 0);
    // Aggregierter Download-Fortschritt über alle Modell-Dateien (zuverlässig in %).
    var files = {};
    function report() {
      var loaded = 0, total = 0;
      for (var f in files) if (files[f].total) { loaded += files[f].loaded; total += files[f].total; }
      if (total && onStatus) onStatus('loading', Math.min(100, Math.round(loaded / total * 100)));
    }
    function onProgress(e) {
      if (!e || !e.file) return;
      if (e.status === 'progress') { files[e.file] = { loaded: e.loaded || 0, total: e.total || 0 }; report(); }
      else if (e.status === 'done' && files[e.file]) { files[e.file].loaded = files[e.file].total; report(); }
    }
    transcriberP = (async function () {
      var mod = await import(/* @vite-ignore */ CDN);
      try { mod.env.allowLocalModels = false; } catch (e) { /* ignore */ }
      var device = navigator.gpu ? 'webgpu' : 'wasm';
      var p = await mod.pipeline('automatic-speech-recognition', MODEL, { device: device, dtype: 'q8', progress_callback: onProgress });
      if (onStatus) onStatus('ready');   // Modell bereit -> Status wieder freigeben
      return p;
    })().catch(function (e) { transcriberP = null; throw e; });
    return transcriberP;
  }

  function start(lang, opts) {
    if (recording) return;
    cb = opts || {}; chunks = [];
    ensurePipeline(cb.onStatus);   // Modell schon mal laden, während aufgenommen wird
    var constraints = { audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
    navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
      stream = s; rec = new MediaRecorder(s); recording = true;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () { transcribe(lang); };
      rec.start();
      if (cb.onStatus) cb.onStatus('listening');
    }).catch(function (e) { recording = false; if (cb.onStatus) cb.onStatus('error', e); });
  }

  function stop() {
    if (rec && rec.state !== 'inactive') rec.stop();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    recording = false;
  }

  function toggle(lang, opts) { if (recording) stop(); else start(lang, opts); }

  async function transcribe(lang) {
    try {
      if (cb.onStatus) cb.onStatus('transcribing');
      var blob = new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' });
      var buf = await blob.arrayBuffer();
      var AC = window.AudioContext || window.webkitAudioContext;
      var ac = new AC();
      var decoded = await ac.decodeAudioData(buf);
      if (ac.close) ac.close();
      // sauber auf 16 kHz Mono resamplen (robuster als decodeAudioData mit fixer Rate).
      var pcm;
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (OAC && decoded.sampleRate !== 16000) {
        var off = new OAC(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
        var src = off.createBufferSource(); src.buffer = decoded; src.connect(off.destination); src.start();
        pcm = (await off.startRendering()).getChannelData(0);
      } else {
        pcm = decoded.getChannelData(0);
      }
      var tr = await ensurePipeline(cb.onStatus);
      var out = await tr(pcm, { language: lang === 'en' ? 'english' : 'german', task: 'transcribe' });
      var text = normalize(snap((out && out.text) || ''));   // erst an erlaubte Wörter einrasten
      if (cb.onStatus) cb.onStatus('done');
      if (cb.onResult) cb.onResult(text);
    } catch (e) {
      if (cb.onStatus) cb.onStatus('error', e);
    }
  }

  TTV.voice = { isSupported: isSupported, isRecording: isRecording, normalize: normalize, snap: snap, toggle: toggle, start: start, stop: stop };
})(window.TTV = window.TTV || {});
