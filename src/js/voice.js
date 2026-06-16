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

  // transformers.js + Modell-Pipeline (einmalig, gecacht). Lädt vom CDN.
  function ensurePipeline(onStatus) {
    if (transcriberP) return transcriberP;
    if (onStatus) onStatus('loading');
    transcriberP = (async function () {
      var mod = await import(/* @vite-ignore */ CDN);
      try { mod.env.allowLocalModels = false; } catch (e) { /* ignore */ }
      var device = navigator.gpu ? 'webgpu' : 'wasm';
      return await mod.pipeline('automatic-speech-recognition', MODEL, { device: device, dtype: 'q8' });
    })().catch(function (e) { transcriberP = null; throw e; });
    return transcriberP;
  }

  function start(lang, opts) {
    if (recording) return;
    cb = opts || {}; chunks = [];
    ensurePipeline(cb.onStatus);   // Modell schon mal laden, während aufgenommen wird
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
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
      var ctx = new AC({ sampleRate: 16000 });
      var audio = await ctx.decodeAudioData(buf);
      var pcm = audio.getChannelData(0);          // Mono, ~16 kHz
      if (ctx.close) ctx.close();
      var tr = await ensurePipeline(cb.onStatus);
      var out = await tr(pcm, { language: lang === 'en' ? 'english' : 'german', task: 'transcribe' });
      var text = normalize((out && out.text) || '');
      if (cb.onStatus) cb.onStatus('done');
      if (cb.onResult) cb.onResult(text);
    } catch (e) {
      if (cb.onStatus) cb.onStatus('error', e);
    }
  }

  TTV.voice = { isSupported: isSupported, isRecording: isRecording, normalize: normalize, toggle: toggle, start: start, stop: stop };
})(window.TTV = window.TTV || {});
