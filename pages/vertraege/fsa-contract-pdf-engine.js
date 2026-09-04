(function (global) {
  'use strict';

  const VERSION = 'FSA_CONTRACT_PDF_ENGINE_V1';
  const A4 = { width: 595.28, height: 841.89 };
  const M = { left: 46, right: 46, top: 58, bottom: 48 };
  const C = {
    navy: [0.075, 0.133, 0.22],
    mint: [0, 0.655, 0.678],
    magenta: [0.776, 0, 0.435],
    ink: [0.10, 0.14, 0.20],
    muted: [0.38, 0.42, 0.48],
    pale: [0.95, 0.98, 0.98],
    line: [0.82, 0.87, 0.89],
    white: [1, 1, 1]
  };

  function safeFilePart(value) {
    return String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'Unbekannt';
  }

  function pdfText(value) {
    return String(value == null ? '' : value)
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201c|\u201d|\u201e/g, '"')
      .replace(/\u2022/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }

  function latin1Bytes(str) {
    const map = {
      '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135,
      'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145,
      '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152,
      '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159
    };
    const out = [];
    for (const ch of pdfText(str)) {
      const code = ch.charCodeAt(0);
      if (code <= 255) out.push(code);
      else if (map[ch] != null) out.push(map[ch]);
      else out.push(63);
    }
    return out;
  }

  function hexPdfString(str) {
    return '<' + latin1Bytes(str).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase() + '>';
  }

  function approxTextWidth(text, size, bold) {
    let units = 0;
    for (const ch of String(text || '')) {
      if ('ilI.,:;!|\'`'.includes(ch)) units += 0.25;
      else if ('MW@%&'.includes(ch)) units += 0.9;
      else if ('ABCDEFGHJKLMNOPQRSTUVWXYZÄÖÜ'.includes(ch)) units += bold ? 0.66 : 0.62;
      else if (ch === ' ') units += 0.28;
      else units += bold ? 0.54 : 0.50;
    }
    return units * size;
  }

  function wrap(text, maxWidth, size, bold) {
    const clean = pdfText(text).replace(/\s+/g, ' ').trim();
    if (!clean) return [''];
    const words = clean.split(' ');
    const lines = [];
    let line = '';
    for (let word of words) {
      if (approxTextWidth(word, size, bold) > maxWidth) {
        const chunks = [];
        let chunk = '';
        for (const ch of word) {
          const next = chunk + ch;
          if (approxTextWidth(next + '-', size, bold) > maxWidth && chunk) {
            chunks.push(chunk + '-');
            chunk = ch;
          } else chunk = next;
        }
        if (chunk) chunks.push(chunk);
        for (const c of chunks) {
          if (line) { lines.push(line); line = ''; }
          if (c !== chunks[chunks.length - 1]) lines.push(c);
          else line = c;
        }
        continue;
      }
      const next = line ? line + ' ' + word : word;
      if (approxTextWidth(next, size, bold) <= maxWidth) line = next;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function rgb(c) { return `${c[0]} ${c[1]} ${c[2]} rg`; }
  function RGB(c) { return `${c[0]} ${c[1]} ${c[2]} RG`; }

  class PdfBuilder {
    constructor(opts) {
      this.opts = opts || {};
      this.pages = [];
      this.page = null;
      this.y = 0;
      this.pageNo = 0;
    }

    newPage() {
      this.pageNo += 1;
      this.page = { ops: [] };
      this.pages.push(this.page);
      this.y = A4.height - M.top;
      this.header();
    }

    op(s) { this.page.ops.push(s); }

    header() {
      this.op(`${RGB(C.mint)} 1.4 w ${M.left} ${A4.height - 32} m ${A4.width - M.right} ${A4.height - 32} l S`);
      this.textAt(M.left, A4.height - 24, 'LIQUIDITYBOOSTER  |  ONLY INSIDE SOFTWARE-SOLUTION GMBH', 8.4, true, C.navy);
    }

    footer(totalPages) {
      const y = 27;
      this.op(`${RGB(C.line)} 0.6 w ${M.left} 39 m ${A4.width - M.right} 39 l S`);
      this.textAt(M.left, y, this.opts.footerLeft || 'Club-Partner-Vereinbarung / Club Partner Plus', 7.6, false, C.muted);
      const s = `${this.opts.pageWord || 'Seite'} ${this.pageNo} ${this.opts.ofWord || 'von'} ${totalPages}`;
      const w = approxTextWidth(s, 7.6, false);
      this.textAt(A4.width - M.right - w, y, s, 7.6, false, C.muted);
    }

    textAt(x, y, text, size, bold, color) {
      const font = bold ? '/F2' : '/F1';
      this.op(`BT ${rgb(color || C.ink)} ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${hexPdfString(text)} Tj ET`);
    }

    ensure(height) {
      if (!this.page) this.newPage();
      if (this.y - height < M.bottom + 8) this.newPage();
    }

    gap(h) { this.y -= h; }

    title(text, subtitle) {
      this.ensure(92);
      this.y -= 12;
      this.textAt(M.left, this.y, text, 22, true, C.navy);
      this.y -= 28;
      if (subtitle) {
        this.textAt(M.left, this.y, subtitle, 10.4, false, C.muted);
        this.y -= 19;
      }
      this.op(`${RGB(C.mint)} 2.0 w ${M.left} ${this.y} m ${M.left + 86} ${this.y} l S`);
      this.y -= 17;
    }

    section(text) {
      this.ensure(38);
      this.y -= 5;
      this.op(`${rgb(C.pale)} ${M.left} ${(this.y - 23).toFixed(2)} ${A4.width - M.left - M.right} 29 re f`);
      this.op(`${rgb(C.mint)} ${M.left} ${(this.y - 23).toFixed(2)} 4 29 re f`);
      this.textAt(M.left + 12, this.y - 15, text, 12.2, true, C.navy);
      this.y -= 39;
    }

    subheading(text) {
      this.ensure(27);
      this.textAt(M.left, this.y - 12, text, 10.7, true, C.navy);
      this.y -= 27;
    }

    paragraph(text, options) {
      options = options || {};
      const size = options.size || 9.5;
      const lineH = options.lineHeight || 13.2;
      const x = M.left + (options.indent || 0);
      const width = A4.width - M.left - M.right - (options.indent || 0);
      const lines = wrap(text, width, size, !!options.bold);
      for (const line of lines) {
        this.ensure(lineH + 2);
        this.textAt(x, this.y - size, line, size, !!options.bold, options.color || C.ink);
        this.y -= lineH;
      }
      this.y -= options.after == null ? 7 : options.after;
    }

    numbered(items) {
      (items || []).forEach((item, idx) => {
        const size = 9.5, lineH = 13.2, prefix = `${idx + 1}.`;
        const indent = 18, width = A4.width - M.left - M.right - indent;
        const lines = wrap(item, width, size, false);
        lines.forEach((line, li) => {
          this.ensure(lineH + 2);
          if (li === 0) this.textAt(M.left, this.y - size, prefix, size, true, C.navy);
          this.textAt(M.left + indent, this.y - size, line, size, false, C.ink);
          this.y -= lineH;
        });
        this.y -= 4;
      });
      this.y -= 2;
    }

    bullets(items) {
      (items || []).forEach(item => {
        const size = 9.5, lineH = 13.2, indent = 15;
        const lines = wrap(item, A4.width - M.left - M.right - indent, size, false);
        lines.forEach((line, li) => {
          this.ensure(lineH + 2);
          if (li === 0) this.textAt(M.left + 2, this.y - size, '-', size, true, C.magenta);
          this.textAt(M.left + indent, this.y - size, line, size, false, C.ink);
          this.y -= lineH;
        });
        this.y -= 3;
      });
      this.y -= 3;
    }

    notice(title, text) {
      const size = 9.4, lineH = 13.0;
      const width = A4.width - M.left - M.right - 24;
      const lines = wrap(text, width, size, false);
      const h = 34 + lines.length * lineH;
      if (h < 250) this.ensure(h + 8);
      const top = this.y;
      this.op(`${rgb(C.pale)} ${M.left} ${(top - Math.min(h, 235)).toFixed(2)} ${A4.width - M.left - M.right} ${Math.min(h,235).toFixed(2)} re f`);
      this.textAt(M.left + 12, this.y - 18, title, 10.0, true, C.navy);
      this.y -= 31;
      lines.forEach(line => {
        this.ensure(lineH + 2);
        this.textAt(M.left + 12, this.y - size, line, size, false, C.ink);
        this.y -= lineH;
      });
      this.y -= 11;
    }

    keyValues(rows) {
      const labelW = 175;
      const totalW = A4.width - M.left - M.right;
      (rows || []).forEach(row => {
        const labelLines = wrap(row[0] || '', labelW - 14, 8.8, true);
        const valueLines = wrap(row[1] || '-', totalW - labelW - 18, 9.1, false);
        const lines = Math.max(labelLines.length, valueLines.length);
        const h = Math.max(27, 9 + lines * 12.2);
        this.ensure(h + 1);
        const yb = this.y - h;
        this.op(`${rgb(C.pale)} ${M.left} ${yb.toFixed(2)} ${labelW} ${h.toFixed(2)} re f`);
        this.op(`${RGB(C.line)} 0.5 w ${M.left} ${yb.toFixed(2)} m ${A4.width - M.right} ${yb.toFixed(2)} l S`);
        labelLines.forEach((l, i) => this.textAt(M.left + 8, this.y - 16 - i * 12.2, l, 8.8, true, C.navy));
        valueLines.forEach((l, i) => this.textAt(M.left + labelW + 8, this.y - 16 - i * 12.2, l, 9.1, false, C.ink));
        this.y -= h;
      });
      this.y -= 10;
    }

    table(headers, rows, widths) {
      const totalW = A4.width - M.left - M.right;
      widths = widths || [0.22, 0.48, 0.30];
      const colW = widths.map(w => totalW * w);
      const drawRow = (cells, header) => {
        const fontSize = header ? 8.2 : 8.4;
        const lineH = 11.3;
        const wrapped = cells.map((cell, i) => wrap(cell || '', colW[i] - 12, fontSize, header));
        const lines = Math.max.apply(null, wrapped.map(a => a.length));
        const h = Math.max(28, 9 + lines * lineH);
        this.ensure(h + 1);
        const yb = this.y - h;
        if (header) this.op(`${rgb(C.navy)} ${M.left} ${yb.toFixed(2)} ${totalW.toFixed(2)} ${h.toFixed(2)} re f`);
        else this.op(`${RGB(C.line)} 0.45 w ${M.left} ${yb.toFixed(2)} m ${A4.width - M.right} ${yb.toFixed(2)} l S`);
        let x = M.left;
        wrapped.forEach((arr, ci) => {
          if (ci > 0) this.op(`${RGB(C.line)} 0.4 w ${x.toFixed(2)} ${yb.toFixed(2)} m ${x.toFixed(2)} ${this.y.toFixed(2)} l S`);
          arr.forEach((l, li) => this.textAt(x + 6, this.y - 15 - li * lineH, l, fontSize, header, header ? C.white : C.ink));
          x += colW[ci];
        });
        this.y -= h;
      };
      drawRow(headers, true);
      (rows || []).forEach(row => drawRow(row, false));
      this.y -= 12;
    }

    confirmations(items) {
      (items || []).forEach(item => {
        const box = item.checked ? 'X' : ' ';
        const size = 9.2, lineH = 12.8, indent = 22;
        const lines = wrap(item.text, A4.width - M.left - M.right - indent, size, false);
        lines.forEach((line, li) => {
          this.ensure(lineH + 2);
          if (li === 0) {
            this.op(`${RGB(C.navy)} 0.8 w ${M.left + 1} ${(this.y - 11).toFixed(2)} 10 10 re S`);
            if (item.checked) this.textAt(M.left + 3.2, this.y - 9.5, box, 8.5, true, C.navy);
          }
          this.textAt(M.left + indent, this.y - size, line, size, false, C.ink);
          this.y -= lineH;
        });
        this.y -= 5;
      });
      this.y -= 5;
    }

    signature(rows) {
      this.ensure(150);
      const totalW = A4.width - M.left - M.right;
      this.op(`${RGB(C.line)} 0.7 w ${M.left} ${this.y} m ${A4.width - M.right} ${this.y} l S`);
      this.y -= 20;
      (rows || []).forEach(row => {
        const label = row[0], value = row[1] || '-';
        this.textAt(M.left, this.y - 9, label, 8.5, true, C.muted);
        this.textAt(M.left + 145, this.y - 9, value, 10.0, false, C.navy);
        this.op(`${RGB(C.line)} 0.55 w ${M.left + 145} ${(this.y - 13).toFixed(2)} m ${M.left + totalW} ${(this.y - 13).toFixed(2)} l S`);
        this.y -= 30;
      });
      this.y -= 10;
    }

    render(blocks) {
      this.newPage();
      (blocks || []).forEach(block => {
        switch (block.type) {
          case 'title': this.title(block.text, block.subtitle); break;
          case 'section': this.section(block.text); break;
          case 'subheading': this.subheading(block.text); break;
          case 'paragraph': this.paragraph(block.text, block); break;
          case 'numbered': this.numbered(block.items); break;
          case 'bullets': this.bullets(block.items); break;
          case 'notice': this.notice(block.title, block.text); break;
          case 'keyValues': this.keyValues(block.rows); break;
          case 'table': this.table(block.headers, block.rows, block.widths); break;
          case 'confirmations': this.confirmations(block.items); break;
          case 'signature': this.signature(block.rows); break;
          case 'pageBreak': this.newPage(); break;
          case 'gap': this.gap(block.height || 8); break;
        }
      });
      return this.finalize();
    }

    finalize() {
      const totalPages = this.pages.length;
      this.pages.forEach((page, idx) => {
        const prevPage = this.page, prevNo = this.pageNo;
        this.page = page; this.pageNo = idx + 1;
        this.footer(totalPages);
        this.page = prevPage; this.pageNo = prevNo;
      });

      const objects = [];
      const add = body => { objects.push(body); return objects.length; };
      const catalogId = add('');
      const pagesId = add('');
      const font1Id = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const font2Id = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const infoId = add(`<< /Title ${hexPdfString(this.opts.title || 'Club-Partner-Vereinbarung')} /Author ${hexPdfString('ONLY INSIDE Software-Solution GmbH')} /Producer ${hexPdfString(VERSION)} >>`);
      const kids = [];

      this.pages.forEach(page => {
        const content = page.ops.join('\n');
        const contentBytes = latin1Bytes(content);
        const streamId = add(`<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`);
        const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> /Contents ${streamId} 0 R >>`);
        kids.push(`${pageId} 0 R`);
      });

      objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

      const chunks = [];
      const offsets = [0];
      let byteCount = 0;
      const pushAscii = str => {
        const bytes = latin1Bytes(str);
        chunks.push(Uint8Array.from(bytes));
        byteCount += bytes.length;
      };
      pushAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
      objects.forEach((body, i) => {
        offsets[i + 1] = byteCount;
        pushAscii(`${i + 1} 0 obj\n${body}\nendobj\n`);
      });
      const xref = byteCount;
      pushAscii(`xref\n0 ${objects.length + 1}\n`);
      pushAscii('0000000000 65535 f \n');
      for (let i = 1; i <= objects.length; i++) pushAscii(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
      pushAscii(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF`);

      const blob = new Blob(chunks, { type: 'application/pdf' });
      return { blob, pages: totalPages, bytes: blob.size, version: VERSION };
    }
  }

  function generate(options) {
    if (!options || !Array.isArray(options.blocks)) throw new Error('blocks required');
    const builder = new PdfBuilder(options);
    const result = builder.render(options.blocks);
    result.filename = options.filename || 'Vertrag.pdf';
    return Promise.resolve(result);
  }

  global.FsaContractPdf = {
    version: VERSION,
    generate,
    safeFilePart
  };
})(typeof window !== 'undefined' ? window : globalThis);
