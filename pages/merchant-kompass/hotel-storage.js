/*
 * LiquidityBooster · Hotel Suite Storage
 * Gemeinsame lokale Datenbasis fuer die bestehenden Hotel-Seiten.
 * WICHTIG: Diese Datei veraendert kein Layout und keine PDF-Gestaltung.
 */
(function (window) {
  'use strict';

  const STORAGE_KEY = 'lbHotelSuiteV1';
  const SCHEMA_VERSION = 1;

  const EMPTY_DATA = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: ''
    },
    hotel: {
      name: '',
      contactName: '',
      contactRole: '',
      meetingWith: '',
      meetingDate: ''
    },
    directBooking: {},
    businessBooster: {},
    directMix: {},
    voucher: {},
    vtravel: {}
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function mergeDeep(target, source) {
    const out = isObject(target) ? clone(target) : {};
    if (!isObject(source)) return out;

    Object.keys(source).forEach(function (key) {
      const value = source[key];
      if (isObject(value)) {
        out[key] = mergeDeep(isObject(out[key]) ? out[key] : {}, value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  function normalize(raw) {
    const merged = mergeDeep(EMPTY_DATA, isObject(raw) ? raw : {});
    merged.meta.schemaVersion = SCHEMA_VERSION;
    return merged;
  }

  function read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(EMPTY_DATA);
      return normalize(JSON.parse(raw));
    } catch (error) {
      console.warn('[HotelStorage] Lesen fehlgeschlagen:', error);
      return clone(EMPTY_DATA);
    }
  }

  function emit(data) {
    try {
      window.dispatchEvent(new CustomEvent('lbHotelSuiteChange', {
        detail: clone(data)
      }));
    } catch (_) {}
  }

  function write(data) {
    const normalized = normalize(data);
    normalized.meta.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      emit(normalized);
      return normalized;
    } catch (error) {
      console.warn('[HotelStorage] Speichern fehlgeschlagen:', error);
      return normalized;
    }
  }

  function replace(data) {
    return write(data);
  }

  function update(patch) {
    return write(mergeDeep(read(), patch || {}));
  }

  function getSection(section) {
    const data = read();
    return clone(data[section] || {});
  }

  function updateSection(section, patch) {
    if (!section || !isObject(patch)) return read();
    const data = read();
    data[section] = mergeDeep(data[section] || {}, patch);
    return write(data);
  }

  function clearSection(section) {
    if (!section || !Object.prototype.hasOwnProperty.call(EMPTY_DATA, section)) return read();
    const data = read();
    data[section] = clone(EMPTY_DATA[section]);
    return write(data);
  }

  function clearAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    const empty = clone(EMPTY_DATA);
    emit(empty);
    return empty;
  }

  function getPath(path, fallback) {
    if (!path) return fallback;
    const parts = String(path).split('.').filter(Boolean);
    let value = read();
    for (let i = 0; i < parts.length; i += 1) {
      if (!value || !Object.prototype.hasOwnProperty.call(value, parts[i])) return fallback;
      value = value[parts[i]];
    }
    return value === undefined ? fallback : clone(value);
  }

  function setPath(path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return read();
    const data = read();
    let cursor = data;
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (!isObject(cursor[parts[i]])) cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
    return write(data);
  }

  function fieldValue(el) {
    if (!el) return '';
    if (el.type === 'checkbox') return !!el.checked;
    if (el.type === 'radio') return el.checked ? el.value : undefined;
    return el.value;
  }

  function applyFieldValue(el, value) {
    if (!el || value === undefined || value === null || value === '') return;
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else if (el.type === 'radio') {
      el.checked = String(el.value) === String(value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /*
   * map-Beispiel:
   * {
   *   hotelNameInput: 'name',
   *   bookingValue: 'bookingValue'
   * }
   * Die bestehenden Rechner bleiben unangetastet; wir lesen/schreiben nur ihre Felder.
   */
  function bindFields(section, map, options) {
    const opts = options || {};
    const root = opts.root || document;
    const current = getSection(section);
    const bindings = [];

    Object.keys(map || {}).forEach(function (id) {
      const key = map[id];
      const el = root.getElementById ? root.getElementById(id) : null;
      if (!el) return;

      if (Object.prototype.hasOwnProperty.call(current, key)) {
        applyFieldValue(el, current[key]);
      }

      const save = function () {
        const value = fieldValue(el);
        if (value === undefined) return;
        const patch = {};
        patch[key] = value;
        updateSection(section, patch);
      };

      el.addEventListener('input', save);
      el.addEventListener('change', save);
      bindings.push({ el: el, save: save });
    });

    return function unbind() {
      bindings.forEach(function (item) {
        item.el.removeEventListener('input', item.save);
        item.el.removeEventListener('change', item.save);
      });
    };
  }

  function cleanFilePart(value, fallback) {
    let text = String(value || '').trim();
    if (!text) text = fallback || 'Hotel';
    text = text
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-. ]+|[-. ]+$/g, '');
    return text || (fallback || 'Hotel');
  }

  function localDateISO(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function pdfFilename(kind, options) {
    const opts = options || {};
    const data = read();
    const hotelName = opts.hotelName || data.hotel.name || 'Hotel';
    const date = opts.date || data.hotel.meetingDate || localDateISO();
    const prefix = cleanFilePart(kind || 'Hotel', 'Hotel');
    return prefix + '_' + cleanFilePart(hotelName, 'Hotel') + '_' + cleanFilePart(date, localDateISO()) + '.pdf';
  }

  /*
   * Fuer iPad/Safari: aus einem fertigen PDF-Blob eine echte benannte Datei machen.
   * Die PDF selbst wird dabei nicht veraendert.
   */
  function makeNamedPdfFile(blob, kind, options) {
    if (!(blob instanceof Blob)) throw new TypeError('PDF-Blob erwartet');
    const name = pdfFilename(kind, options);
    try {
      return new File([blob], name, {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    } catch (_) {
      blob.name = name;
      return blob;
    }
  }

  function snapshot() {
    return clone(read());
  }

  window.LBHotelStorage = Object.freeze({
    key: STORAGE_KEY,
    schemaVersion: SCHEMA_VERSION,
    read: read,
    write: write,
    replace: replace,
    update: update,
    getSection: getSection,
    updateSection: updateSection,
    clearSection: clearSection,
    clearAll: clearAll,
    getPath: getPath,
    setPath: setPath,
    bindFields: bindFields,
    cleanFilePart: cleanFilePart,
    pdfFilename: pdfFilename,
    makeNamedPdfFile: makeNamedPdfFile,
    snapshot: snapshot
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    emit(read());
  });
})(window);
