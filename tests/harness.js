/*
 * Test-Harness: lädt die Browser-Module (IIFE auf window.TTV) in einen vm-Kontext.
 * Liefert ein minimales document-Stub, damit renderer.js ohne jsdom läuft.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeEl(ns, name) {
  return {
    namespaceURI: ns,
    tagName: name,
    attrs: {},
    children: [],
    style: {},
    textContent: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    appendChild(c) { this.children.push(c); return c; }
  };
}

function makeDocument() {
  return {
    createElementNS: (ns, name) => makeEl(ns, name),
    createElement: (name) => makeEl(null, name)
  };
}

function loadTTV() {
  const ctx = {};
  ctx.window = ctx;            // window.TTV === ctx.TTV
  ctx.document = makeDocument();
  ctx.Math = Math;
  ctx.Object = Object;
  ctx.Array = Array;
  ctx.JSON = JSON;
  ctx.String = String;
  ctx.Date = Date;
  vm.createContext(ctx);
  ['notation', 'geometry', 'resolver', 'replies', 'examples', 'renderer'].forEach(function (f) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f + '.js'), 'utf8');
    vm.runInContext(code, ctx, { filename: f + '.js' });
  });
  return ctx.window.TTV;
}

// i18n.js isoliert laden (mit navigator/localStorage/document-Stubs).
function loadI18n(navLang) {
  const ctx = {};
  ctx.window = ctx;
  ctx.navigator = { language: navLang || 'en' };
  ctx.localStorage = { getItem: () => null, setItem: () => {} };
  ctx.document = { documentElement: { setAttribute() {} }, querySelectorAll: () => [], title: '', dispatchEvent() {} };
  ctx.CustomEvent = function () {};
  ctx.Object = Object; ctx.Array = Array;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'i18n.js'), 'utf8'), ctx, { filename: 'i18n.js' });
  return ctx.window.TTV.i18n;
}

// Baum eines (gestubbten) SVG-Knotens flach auflisten.
function flatten(node, out) {
  out = out || [];
  out.push(node);
  (node.children || []).forEach(function (c) { flatten(c, out); });
  return out;
}
function byTag(svg, tag) { return flatten(svg).filter(function (n) { return n.tagName === tag; }); }
function paths(svg) { return byTag(svg, 'path'); }
function isDashed(p) { return !!p.getAttribute('stroke-dasharray'); }
function hasMarkerStart(p) { return !!p.getAttribute('marker-start'); }
// Doppelpfeil = Pfad mit marker-start (zwei Spitzen). Einzelpfeil = nur marker-end.
function doubleArrows(svg) { return paths(svg).filter(hasMarkerStart); }
function singleArrows(svg) { return paths(svg).filter(function (p) { return p.getAttribute('marker-end') && !hasMarkerStart(p); }); }
function texts(svg) { return byTag(svg, 'text').map(function (t) { return t.textContent; }); }

module.exports = {
  loadTTV, loadI18n, flatten, byTag, paths, isDashed, hasMarkerStart,
  doubleArrows, singleArrows, texts
};
