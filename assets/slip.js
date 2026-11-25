/* NS slips: documents about one payment or one period instead of a list of goods.
   receipt (payment receipt), voucher (payment voucher), rent (rent receipts, one per month), salary (salary slip), petty (petty cash book).
   A site picks one with <section id="tool" data-doc="receipt">. Same data home, history, print and share as docs.js.
   Screen text comes from NS.t; the printed document is always in English. */
(function () {
  'use strict';
  var $ = NS.$, $$ = NS.$$, esc = NS.esc, num = NS.num, r2 = NS.r2, t = NS.t;

  /* prefix = number series; paper = default paper; papers = allowed sizes; copy = Original / Office copy labels */
  var TYPES = {
    receipt: { prefix: 'RCT', title: 'PAYMENT RECEIPT', kinds: ['pay', 'adv', 'ref'], paper: 'a5', papers: ['a4', 'a5', 'th80', 'th58'], copy: true, party: 'party' },
    voucher: { prefix: 'PV', title: 'PAYMENT VOUCHER', paper: 'a5', papers: ['a4', 'a5'], party: 'party', buying: true },
    rent: { prefix: 'RR', title: 'RENT RECEIPT', paper: 'a4', papers: ['a4'] },
    salary: { prefix: 'SAL', title: 'SALARY SLIP', paper: 'a4', papers: ['a4', 'a5'] },
    petty: { prefix: 'PCB', title: 'PETTY CASH BOOK', paper: 'a4', papers: ['a4'] }
  };
  /* TDS sections under the Income-tax Act, 2025 (in force 1 Apr 2026), with the old 1961 section people know; suggestions only, the user types the final text */
  var TDSSEC = ['393(1) Sl. 6(i) (old 194C) contractors', '393(1) Sl. 6(iii) (old 194J) professional or technical fees', '393(1) Sl. 2 (old 194I) rent', '393(1) Sl. 1(ii) (old 194H) commission or brokerage', '393(1) Sl. 8(ii) (old 194Q) purchase of goods'];
  var MODES = ['cash', 'upi', 'cheque', 'bank', 'card', 'dd', 'other'];
  var HEADS = ['Office expenses', 'Travel and conveyance', 'Freight and cartage', 'Repairs and maintenance', 'Printing and stationery', 'Postage and courier', 'Tea and refreshments',
    'Employee welfare', 'Electricity', 'Telephone and internet', 'Rent', 'Salary and wages', 'Advance to employee', 'Purchase', 'Cleaning', 'Fuel', 'Miscellaneous'];
  var EARN = ['Basic salary', 'House rent allowance (HRA)', 'Conveyance allowance', 'Special allowance'], DED = ['Provident fund (PF)', 'ESI', 'Professional tax', 'TDS (income tax)'];
  var ACCENTS = ['#0B3B5B', '#1D4ED8', '#047857', '#B45309', '#9D174D', '#334155'];
  var P = {
    no: 'No.', rno: 'Receipt No.', vno: 'Voucher No.', date: 'Date', for: 'For', sign: 'Authorised signatory', gstin: 'GSTIN', ph: 'Phone', pan: 'PAN',
    recfrom: 'Received with thanks from', sum: 'the sum of', by: 'by', dated: 'dated', drawn: 'drawn on', against: 'against', towards: 'towards', amount: 'Amount', words: 'Amount in words',
    balance: 'Balance still due', tds: 'TDS deducted by payer', billamt: 'Bill amount settled', advnote: 'Advance received. A tax invoice will be issued on supply.', recby: 'Received by', stamp: 'Revenue stamp', orig: 'Original', office: 'Office copy',
    paidto: 'Paid to', part: 'Particulars', head: 'Account head', total: 'Total', mode: 'Mode', ref: 'Ref. / cheque no.', narr: 'Narration', prep: 'Prepared by', appr: 'Approved by', rsign: 'Receiver’s signature',
    rentof: 'towards the rent of the property at', month: 'for the month of', landlord: 'Landlord', tenant: 'Tenant', rentpm: 'Rent', period: 'Period',
    slipfor: 'Salary slip for', emp: 'Employee', code: 'Employee code', desig: 'Designation', dept: 'Department', doj: 'Date of joining', uan: 'UAN', esino: 'ESI No.', bank: 'Bank', acc: 'A/c no.', ifsc: 'IFSC',
    days: 'Days in month', paid: 'Paid days', lop: 'Loss of pay days', earn: 'Earnings', ded: 'Deductions', gross: 'Gross earnings', tded: 'Total deductions', net: 'Net pay', empsign: 'Employee’s signature',
    slipnote: 'This salary slip is generated from the employer’s records.',
    opening: 'Opening balance', recd: 'Received', paid2: 'Paid', bal: 'Balance', closing: 'Closing balance', heads: 'Spent by head', cashier: 'Cashier', vn: 'V. No.', from: 'From', to: 'To',
    rvt: 'RECEIPT VOUCHER', rft: 'REFUND VOUCHER', rfto: 'Refunded to', rvref: 'against receipt voucher', pos: 'Place of supply', sac: 'SAC', taxable: 'Taxable value', cgst: 'CGST', sgst: 'SGST', igst: 'IGST', taxtot: 'Total',
    advgst: 'Receipt voucher under section 31(3)(d) of the CGST Act for an advance received for services. The GST on it is adjusted in the tax invoice.',
    refnote: 'Refund voucher under section 31(3)(e) of the CGST Act: the advance received is refunded because no supply was made.',
    tdsl: 'TDS', on: 'on', netpaid: 'Net amount paid', ppan: 'PAN', rcmnote: 'Payment voucher under section 31(3)(g) of the CGST Act. GST on this supply is payable by us on reverse charge:', regime: 'Income tax regime', rnew: 'New', rold: 'Old',
    cash: 'cash', upi: 'UPI', cheque: 'cheque', bank2: 'bank transfer (NEFT/RTGS/IMPS)', card: 'card', dd: 'demand draft', other: 'other means'
  };
  var MODEP = { cash: 'cash', upi: 'upi', cheque: 'cheque', bank: 'bank2', card: 'card', dd: 'dd', other: 'other' };
  var ACCT = { salary: 1, rent: 1, petty: 1 };   /* slips that can go into the accounts (WP-5) */

  var root, T, type, doc, editingId = null, sheet, CFG = {}, lastAuto = '', dkey;
  function W() { return { doc: t('doc.' + type), docs: t('docs.' + type), Doc: t('Doc.' + type) }; }
  function tw(k, v) { return t(k, Object.assign(W(), v || {})); }
  function month(iso) { return iso ? new Date(iso + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''; }
  function ym(d) { return d.slice(0, 7); }
  function nextYm(m) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) + 1; if (mo > 12) { mo = 1; y++; } return y + '-' + String(mo).padStart(2, '0'); }
  function months(from, to) { var out = []; if (!from) return out; to = to && to >= from ? to : from; for (var m = from; m <= to && out.length < 24; m = nextYm(m)) out.push(m); return out; }
  function lastDay(m) { var d = new Date(+m.slice(0, 4), +m.slice(5, 7), 0); return m + '-' + String(d.getDate()).padStart(2, '0'); }

  function blank() {
    var C = NS.cfgFor(CFG, doc && doc.seller), c = C[type] || {}, inv = C.invoice || {}, m = ym(NS.today());
    var d = {
      type: type, kind: T.kinds ? T.kinds[0] : '', no: '', date: NS.today(), paper: c.paper || T.paper, design: c.design || 'classic', accent: c.accent || inv.accent || ACCENTS[0], copies: 1, copyLabel: T.copy ? 'orig' : '',
      seller: { name: '', addr: '', city: '', pin: '', state: '', gstin: '', phone: '', email: '', pan: '', logo: '', sign: '', bankName: '', bankAcc: '', bankIfsc: '', bankBranch: '', upi: '' },
      buyer: { name: '', addr: '', phone: '', gstin: '', pan: '' }, notes: c.notes || '', status: ''
    };
    if (type === 'receipt') Object.assign(d, { gstAdv: false, rate: '18', pos: '', sac: '', rv: '', rvDate: '', amount: '', tds: '', mode: 'cash', ref: '', refDate: '', bank: '', against: '', purpose: '', balance: '' });
    vtSlip(d, C);   /* C-11 / C-14 */
    if (type === 'voucher') Object.assign(d, { tdsSec: '', tdsRate: '', rcm: false, rcmRate: '18', lines: [{ desc: '', head: '', amt: '' }], mode: 'cash', ref: '', refDate: '', prep: '', appr: '' });
    if (type === 'rent') Object.assign(d, { pan: '', prop: '', rent: '', from: m, to: m, mode: 'cash', ref: '', day: 'last' });
    /* WP-5: a new salary slip, rent receipt or petty cash book goes into the business's accounts unless unticked (a slip printed for
       someone else); erPf / erEsi = the employer's own PF and ESI; payDate / payMode = when and how the net pay was paid */
    if (ACCT[type]) Object.assign(d, { acct: true }, type === 'salary' ? { erPf: '', erEsi: '', payDate: '', payMode: 'bank' } : {});
    if (type === 'salary') Object.assign(d, { regime: 'new', ptState: '', month: m, emp: { code: '', desig: '', dept: '', doj: '', pan: '', uan: '', esi: '', bankName: '', bankAcc: '', bankIfsc: '' }, days: '', paid: '',
      earn: EARN.map(function (x) { return { desc: x, amt: '' }; }), ded: DED.map(function (x) { return { desc: x, amt: '' }; }) });
    if (type === 'petty') Object.assign(d, { from: NS.today().slice(0, 8) + '01', to: NS.today(), opening: '', lines: [{ date: NS.today(), vno: '', desc: '', head: '', recd: '', paid: '' }], cashier: '', appr: '' });
    return d;
  }

  /* ---------- sums ---------- */
  function sums(d) {
    var o = { total: 0 };
    if (type === 'receipt') {
      o.total = r2(num(d.amount));
      /* an advance for services carries GST inside the amount received; so does its refund */
      if (d.gstAdv && d.kind !== 'pay') {
        var rt = num(d.rate); o.tax = r2(o.total * rt / (100 + rt)); o.taxable = r2(o.total - o.tax);
        var pos0 = (d.pos || (/^\d{2}[A-Z]/.test(String(d.buyer && d.buyer.gstin || '').toUpperCase()) ? String(d.buyer.gstin).slice(0, 2) : '')); o.intra = !pos0 || !d.seller.state || pos0 === d.seller.state;   /* the payer's GSTIN when no place of supply is chosen (F4-6) */
        if (o.intra) { o.cgst = r2(o.tax / 2); o.sgst = r2(o.tax - o.cgst); } else o.igst = o.tax;
      }
    }
    if (type === 'voucher') {
      o.total = r2(d.lines.reduce(function (a, l) { return a + num(l.amt); }, 0));
      o.tds = r2(o.total * num(d.tdsRate) / 100); o.net = r2(o.total - o.tds);
      o.rcm = d.rcm ? r2(o.total * num(d.rcmRate) / 100) : 0;
    }
    if (type === 'rent') { o.months = months(d.from, d.to); o.total = r2(num(d.rent) * o.months.length); }
    if (type === 'salary') { o.gross = r2(d.earn.reduce(function (a, l) { return a + num(l.amt); }, 0)); o.ded = r2(d.ded.reduce(function (a, l) { return a + num(l.amt); }, 0)); o.total = r2(o.gross - o.ded); }
    if (type === 'petty') {
      var bal = num(d.opening), heads = {};
      o.rows = d.lines.filter(function (l) { return l.desc || num(l.recd) || num(l.paid); }).map(function (l) {
        bal = r2(bal + num(l.recd) - num(l.paid));
        if (num(l.paid)) { var h = l.head || 'Miscellaneous'; heads[h] = r2((heads[h] || 0) + num(l.paid)); }
        return { l: l, bal: bal };
      });
      o.recd = r2(d.lines.reduce(function (a, l) { return a + num(l.recd); }, 0)); o.paid = r2(d.lines.reduce(function (a, l) { return a + num(l.paid); }, 0));
      o.closing = bal; o.heads = heads; o.total = o.paid;
    }
    return o;
  }

  /* ---------- editor ---------- */
  function field(id, label, o) {
    o = o || {};
    var ty = o.type || 'text', hint = o.hint ? '<small class="hint">' + esc(o.hint) + '</small>' : '';
    var input = ty === 'textarea' ? '<textarea id="' + id + '" rows="' + (o.rows || 2) + '" dir="auto" placeholder="' + esc(o.ph || '') + '"></textarea>'
      : ty === 'select' ? '<select id="' + id + '">' + o.opts.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('') + '</select>'
      : '<input id="' + id + '" type="' + ty + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.list ? ' list="' + o.list + '"' : '') + ' placeholder="' + esc(o.ph || '') + '"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ltr ? ' dir="ltr"' : ' dir="auto"') + '>';
    return '<div class="f' + (o.wide ? ' wide' : '') + '"><label for="' + id + '">' + esc(label) + '</label>' + input + hint + '<small class="err" id="' + id + '-err" hidden></small></div>';
  }
  function card(legend, inner) { return '<fieldset class="card"><legend>' + esc(legend) + '</legend>' + inner + '</fieldset>'; }
  function stateOpts(first) { return [['', first]].concat(NS.STATES.map(function (x) { return [x[0], NS.stateLoc(x[0]) + ' (' + x[0] + ')']; })); }
  function chk(id, label, hint, forKinds) {
    return '<div class="f wide"' + (forKinds ? ' data-for="' + forKinds + '"' : '') + '><label class="chk"><input id="' + id + '" type="checkbox"> ' + esc(label) + '</label>' + (hint ? '<small class="hint">' + esc(hint) + '</small>' : '') + '</div>';
  }
  function only(kinds, html) { return html.replace(/^<div class="f/, '<div data-for="' + kinds + '" class="f'); }
  function modeOpts() { return MODES.map(function (m) { return [m, t('pm.' + m)]; }); }
  function bizCard(lg) {
    return card(lg || t('lg.biz'), '<div class="fg">' +
      field('s-name', t(type === 'rent' ? 's.lname' : 'l.bname'), { ph: t(type === 'rent' ? 's.ph.lname' : 'ph.bname'), wide: true, hint: type === 'rent' ? '' : t('h.bname') }) +
      field('s-addr', t('l.addr'), { type: 'textarea', wide: true, ph: t('ph.addr') }) +
      (type === 'rent' ? field('s-pan', t('s.lpan'), { max: 10, ltr: 1, hint: t('s.h.lpan') }) + field('s-phone', t('l.phone'), { type: 'tel', mode: 'tel', ltr: 1 })
        : field('s-gstin', t('l.gstin'), { ph: t('ph.gstin'), max: 15, ltr: 1 }) + field('s-phone', t('l.phone'), { type: 'tel', mode: 'tel', ltr: 1 }) +
          (type === 'receipt' || type === 'voucher' ? field('s-state', t('l.state'), { type: 'select', opts: stateOpts(t('choose.state')) }) : '')) +
      '</div>' + (type === 'rent' ? '' : '<details class="more"><summary>' + esc(t('s.logo')) + '</summary><div class="fg">' +
        '<div class="f"><label for="s-logo">' + esc(t('l.logo')) + '</label><input id="s-logo" type="file" accept="image/*"><button type="button" class="link" data-clear="logo" hidden>' + esc(t('rm.logo')) + '</button></div>' +
        '<div class="f"><label for="s-sign">' + esc(t('l.sign')) + '</label><input id="s-sign" type="file" accept="image/*"><button type="button" class="link" data-clear="sign" hidden>' + esc(t('rm.sign')) + '</button></div>' +
        '</div></details>'));
  }
  function numCard(extra) {
    return card(tw('lg.details'), '<div class="fg">' +
      (T.kinds ? '<div class="f wide"><label for="d-kind">' + esc(t('l.type')) + '</label><select id="d-kind">' + T.kinds.map(function (k) { return '<option value="' + k + '">' + esc(t('k.' + k)) + '</option>'; }).join('') + '</select><small class="hint" id="kind-hint"></small></div>' : '') +
      field('d-no', tw('l.no'), { max: 16, ltr: 1, hint: t('h.no2') }) + field('d-date', t('l.date'), { type: 'date' }) + (extra || '') + '</div>');
  }
  function payFields() {
    return field('d-mode', t('s.mode'), { type: 'select', opts: modeOpts() }) + field('d-ref', t('s.ref'), { ltr: 1, hint: t('s.h.ref') }) +
      field('d-refDate', t('s.refdate'), { type: 'date' }) + (type === 'receipt' ? field('d-bank', t('s.bank'), {}) : '');
  }
  function lookCard() {
    return card(t('lg.notes'), '<div class="fg">' +
      (type === 'petty' || type === 'salary' ? '' : field('d-notes', t('l.notes'), { type: 'textarea', wide: true })) +
      (T.copy ? field('d-copies', t('l.copies'), { type: 'select', opts: [['1', t('cps.1')], ['2', t('s.cps2')]], hint: t('s.h.copies') }) : '') +
      (T.papers.length > 1 ? field('d-paper', t('l.paper'), { type: 'select', opts: T.papers.map(function (k) { return [k, t('pp.' + k)]; }) }) : '') +
      NS.designField('d-design') +
      '<div class="f"><span class="lbl" id="acc-lbl">' + esc(t('l.colour')) + '</span><div class="swatches" role="radiogroup" aria-labelledby="acc-lbl">' + ACCENTS.map(function (c, i) { return '<button type="button" role="radio" class="sw" data-accent="' + c + '" style="--c:' + c + '" aria-label="' + esc(t('colour.n', { n: i + 1 })) + '"></button>'; }).join('') + '</div></div>' +
      '<p class="hint wide print-note">' + esc(tw(type === 'salary' ? 'print.ens' : 'print.en')) + '</p></div>');   /* a salary slip is read by the employee, not a customer (round C) */
  }
  /* WP-5: "Add to my accounts" and, on a salary slip, the employer's PF / ESI and when the net pay was paid */
  function acctCard() {
    if (!ACCT[type]) return '';
    return card(t('w5.lg'), '<div class="fg">' + chk('d-acct', t('w5.acct'), t('w5.h_' + type)) +
      (type === 'salary' ? field('d-erPf', t('w5.erpf'), { mode: 'decimal', ltr: 1, hint: t('w5.h_erpf') }) + field('d-erEsi', t('w5.eresi'), { mode: 'decimal', ltr: 1 }) +
        field('d-payDate', t('w5.paydate'), { type: 'date', hint: t('w5.h_paydate') }) + field('d-payMode', t('w5.paymode'), { type: 'select', opts: modeOpts() }) +
        '<p class="hint wide">' + esc(t('w5.h_adv')) + '</p>' : '') + '</div>');
  }
  function linesHtml(list, cols, add) {
    return '<div class="ln" data-list="' + list + '">' + doc[list].map(function (l, i) {
      return '<div class="it ln-row" data-i="' + i + '"><div class="it-head"><span>' + esc(t('it.n', { n: i + 1 })) + '</span>' + (doc[list].length > 1 ? '<button type="button" class="link" data-del="' + i + '">' + esc(t('it.rm')) + '</button>' : '') + '</div><div class="ln-grid c' + cols.length + '">' +
        cols.map(function (c) {
          var id = list + '-' + c[0] + '-' + i;
          return '<div class="f' + (c[3] ? ' ' + c[3] : '') + '"><label for="' + id + '">' + esc(t(c[1])) + '</label><input id="' + id + '" data-k="' + c[0] + '" value="' + esc(l[c[0]]) + '"' + (c[2] || '') + '></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div><button type="button" class="btn" data-add="' + list + '">' + esc(t(add)) + '</button>';
  }
  var LINES = {
    voucher: { lines: [['desc', 's.part', ' dir="auto"', 'ln-wide'], ['head', 's.head', ' list="dl-heads" dir="auto"'], ['amt', 's.amt', ' inputmode="decimal" dir="ltr"']] },
    salary: { earn: [['desc', 's.earn1', ' dir="auto"', 'ln-wide'], ['amt', 's.amt', ' inputmode="decimal" dir="ltr"']], ded: [['desc', 's.ded1', ' dir="auto"', 'ln-wide'], ['amt', 's.amt', ' inputmode="decimal" dir="ltr"']] },
    petty: { lines: [['date', 'l.date', ' type="date"'], ['vno', 's.vno', ' dir="ltr"'], ['desc', 's.part', ' dir="auto"', 'ln-wide'], ['head', 's.head', ' list="dl-heads" dir="auto"'], ['recd', 's.recd', ' inputmode="decimal" dir="ltr"'], ['paid', 's.paid', ' inputmode="decimal" dir="ltr"']] }
  };
  function renderLines() {
    var L = LINES[type]; if (!L) return;
    Object.keys(L).forEach(function (list) {
      var box = $('[data-lines="' + list + '"]', root); if (!box) return;
      box.innerHTML = linesHtml(list, L[list], list === 'ded' ? 's.addded' : list === 'earn' ? 's.addearn' : type === 'petty' ? 's.addentry' : 'add.item');
      $('[data-add]', box).addEventListener('click', function () {
        var last = doc[list][doc[list].length - 1] || {};
        doc[list].push(type === 'petty' ? { date: last.date || NS.today(), vno: '', desc: '', head: '', recd: '', paid: '' } : { desc: '', head: '', amt: '' });
        renderLines(); draw(); saveDraft();
        var f = $$('[data-list="' + list + '"] .ln-row', root); f = f[f.length - 1]; if (f) $('input', f).focus();
      });
      $$('[data-del]', box).forEach(function (b) { b.addEventListener('click', function () { doc[list].splice(+b.getAttribute('data-del'), 1); renderLines(); draw(); saveDraft(); }); });
    });
  }

  function buildEditor() {
    var ed = $('#ed', root);
    var hub = (window.NS_CFG && NS_CFG.vault ? new URL(NS_CFG.vault, location.href).origin : 'https://my.niveshsahayak.in') + '/';
    var h = '<p class="hub-link"><a href="' + hub + '" target="_blank" rel="noopener">' + esc(t('hub.link')) + ' ›</a></p>';
    if (type === 'receipt') {
      h += bizCard() + numCard() +
        card(t('s.lg.from'), '<div class="fg">' + field('b-name', t('s.fromname'), { wide: true, ph: t('ph.cname'), hint: t('h.cname') }) + field('b-addr', t('l.addr'), { type: 'textarea', wide: true }) +
          field('b-phone', t('l.phone'), { type: 'tel', mode: 'tel', ltr: 1 }) + field('b-gstin', t('l.cgstin'), { max: 15, ltr: 1 }) + '</div>') +
        card(t('s.lg.pay'), '<div class="fg">' + field('d-amount', t('s.amount'), { mode: 'decimal', ltr: 1, wide: true }) + payFields() +
          field('d-against', t('s.against'), { hint: t('s.h.against') }) + only('pay', '<div class="f wide rb-box" id="rb-bills" aria-live="polite"></div>') + field('d-purpose', t('s.purpose'), { ph: t('s.ph.purpose') }) + field('d-tds', t('s.tds'), { mode: 'decimal', ltr: 1, hint: t('s.h.tds') }) + field('d-balance', t('s.balance'), { mode: 'decimal', ltr: 1, hint: t('s.h.balance') }) +
          only('ref', field('d-rv', t('s.rv'), { ltr: 1, hint: t('s.h.rv'), list: 'dl-rv' }).replace('</div>', '<datalist id="dl-rv"></datalist></div>')) + only('ref', field('d-rvDate', t('s.rvdate'), { type: 'date' })) +
          chk('d-gstAdv', t('s.gstadv'), t('s.h.gstadv'), 'adv ref') + only('adv ref', field('d-rate', t('l.gst'), { mode: 'decimal', ltr: 1, list: 'dl-rates' })) +
          only('adv ref', '<div class="f wide"><p class="hint" id="d-advnote">' + esc(t('s.h.advbooks')) + '</p></div>') +
          only('adv ref', field('d-pos', t('l.pos'), { type: 'select', opts: stateOpts(t('s.samestate')) })) + only('adv ref', field('d-sac', t('s.sacf'), { ltr: 1, max: 8, mode: 'numeric' })) + '</div>');
    } else if (type === 'voucher') {
      h += bizCard() + numCard(payFields()) +
        card(t('s.lg.to'), '<div class="fg">' + field('b-name', t('s.toname'), { wide: true, ph: t('s.ph.toname'), hint: t('h.vname') }) + field('b-phone', t('l.phone'), { type: 'tel', mode: 'tel', ltr: 1 }) + field('b-addr', t('l.addr'), { type: 'textarea', wide: true }) + '</div>') +
        card(t('s.lg.lines'), '<div data-lines="lines"></div><div class="sums" id="ed-sums" aria-live="polite"></div>') +
        card(t('s.lg.tdsrcm'), '<div class="fg">' + field('d-tdsSec', t('s.tdssec'), { list: 'dl-tds', hint: t('s.h.tdssec') }) + field('d-tdsRate', t('s.tdsrate'), { mode: 'decimal', ltr: 1 }) +
          field('b-pan', t('s.ppan'), { max: 10, ltr: 1, hint: t('s.h.ppan') }) + chk('d-rcm', t('s.rcm'), t('s.h.rcm')) + field('d-rcmRate', t('s.rcmrate'), { mode: 'decimal', ltr: 1, list: 'dl-rates' }) +
          field('d-rcmState', t('s.rcmst'), { type: 'select', opts: stateOpts(t('s.rcmst0')), hint: t('s.h.rcmst') }) + field('d-rcmItc', t('s.rcmitc'), { type: 'select', opts: [['ok', t('s.itc.ok')], ['blocked', t('s.itc.blocked')], ['ineligible', t('s.itc.inel')]] }) + '</div>')   /* r1-gst S-8: IGST when the supplier is in another state; credit blocked (s.17(5)) = cost */ +
        card(t('s.lg.sign'), '<div class="fg">' + field('d-prep', t('s.prep')) + field('d-appr', t('s.appr')) + '</div>');
    } else if (type === 'rent') {
      h += bizCard(t('s.lg.landlord')) +
        card(t('s.lg.tenant'), '<div class="fg">' + field('b-name', t('s.tname'), { wide: true, hint: t('s.h.tname') }) + field('d-prop', t('s.prop'), { type: 'textarea', wide: true, ph: t('s.ph.prop') }) + '</div>') +
        card(t('s.lg.rent'), '<div class="fg">' + field('d-rent', t('s.rentpm'), { mode: 'decimal', ltr: 1 }) + field('d-from', t('s.from'), { type: 'month', ltr: 1 }) + field('d-to', t('s.to'), { type: 'month', ltr: 1, hint: t('s.h.to') }) +
          field('d-day', t('s.day'), { type: 'select', opts: [['last', t('s.day.last')], ['first', t('s.day.first')], ['same', t('s.day.same')]] }) + payFields() +
          field('d-no', t('s.rno'), { max: 12, ltr: 1, hint: t('s.h.rno') }) + field('d-date', t('s.made'), { type: 'date' }) + '</div><div class="sums" id="ed-sums" aria-live="polite"></div>');
    } else if (type === 'salary') {
      h += bizCard(t('s.lg.employer')) + numCard(field('d-month', t('s.month'), { type: 'month', ltr: 1 })) +
        card(t('s.lg.emp'), '<div class="fg">' + field('b-name', t('s.ename'), { wide: true, hint: t('s.h.ename') }) + field('e-code', t('s.code'), { ltr: 1 }) + field('e-desig', t('s.desig')) + field('e-dept', t('s.dept')) + field('e-doj', t('s.doj'), { type: 'date' }) +
          field('e-pan', t('s.pan'), { max: 10, ltr: 1 }) + field('e-uan', t('s.uan'), { max: 12, mode: 'numeric', ltr: 1 }) + field('e-esi', t('s.esi'), { ltr: 1 }) +
          field('e-bankName', t('l.bank')) + field('e-bankAcc', t('l.acc'), { mode: 'numeric', ltr: 1 }) + field('e-bankIfsc', t('l.ifsc'), { max: 11, ltr: 1 }) + '</div>') +
        card(t('s.lg.att'), '<div class="fg">' + field('d-days', t('s.days'), { mode: 'numeric', ltr: 1 }) + field('d-paid', t('s.paiddays'), { mode: 'decimal', ltr: 1, hint: t('s.h.paid') }) +
          field('d-regime', t('s.regime'), { type: 'select', opts: [['new', t('s.r.new')], ['old', t('s.r.old')]] }) + field('d-ptState', t('s.ptstate'), { type: 'select', opts: stateOpts(t('s.pt.none')) }) +
          field('d-tdsPrev', t('s.tdsprev'), { mode: 'decimal', ltr: 1, hint: t('s.h.tdsprev') }) + '</div>') +
        card(t('s.lg.earn'), '<div data-lines="earn"></div>') +
        card(t('s.lg.ded'), '<div data-lines="ded"></div><button type="button" class="btn sm" data-pf>' + esc(t('s.pfbtn2')) + '</button><small class="hint">' + esc(t('s.h.pf2')) + '</small><div class="sums" id="ed-sums" aria-live="polite"></div>');
    } else if (type === 'petty') {
      h += bizCard() + numCard(field('d-from', t('s.pfrom'), { type: 'date' }) + field('d-to', t('s.pto'), { type: 'date' }) + field('d-opening', t('s.opening'), { mode: 'decimal', ltr: 1, hint: t('s.h.opening') })) +
        card(t('s.lg.entries'), '<div data-lines="lines"></div><div class="sums" id="ed-sums" aria-live="polite"></div>') +
        card(t('s.lg.sign'), '<div class="fg">' + field('d-cashier', t('s.cashier')) + field('d-appr', t('s.appr')) + '</div>');
    }
    if (window.NSCF) h += NSCF.slipEditor({ doc: function () { return doc; }, changed: function () { draw(); saveDraft(); } });   /* custom fields (ERP Round 2) */
    h += acctCard() + lookCard() + '<datalist id="dl-rates">' + [5, 18, 40, 12, 3, 1.5, 0.25, 0.1].map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>' +
      '<datalist id="dl-tds">' + TDSSEC.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' + '<datalist id="dl-heads">' + HEADS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>';
    ed.innerHTML = h;
    if (window.NSCF) NSCF.slipWire(ed);
    $$('[data-accent]', ed).forEach(function (b) { b.addEventListener('click', function () { doc.accent = b.getAttribute('data-accent'); fillForm(true); draw(); saveDraft(); }); });
    ['logo', 'sign'].forEach(function (k) {
      var inp = $('#s-' + k, ed); if (!inp) return;
      inp.addEventListener('change', function (e) { var f = e.target.files[0]; if (f) shrink(f, k === 'logo' ? 360 : 420).then(function (u) { doc.seller[k] = u; fillForm(true); draw(); saveDraft(); }); });
      $('[data-clear="' + k + '"]', ed).addEventListener('click', function () { doc.seller[k] = ''; inp.value = ''; fillForm(true); draw(); saveDraft(); });
    });
    var pf = $('[data-pf]', ed); if (pf) pf.addEventListener('click', fillPf);
    /* suggestions: businesses from the data home; people from the data home or from earlier documents of this kind */
    if (type === 'rent') NS.suggest($('#s-name', ed), function () { return NSStore.list('biz').then(function (l) { return l.map(function (b) { return { seller: { name: b.name, addr: [b.addr, b.city].filter(Boolean).join(', '), phone: b.phone, pan: b.pan || '' } }; }); }); }, function (d) { return d.seller.name; }, function (d) { doc.seller = Object.assign(doc.seller, { name: d.seller.name, addr: d.seller.addr, phone: d.seller.phone, pan: d.seller.pan || '' }); fillForm(); draw(); saveDraft(); });   /* saved businesses (F6-1) */
    if (type === 'rent') suggestFromDocs($('#s-name', ed), function (d) { return d.seller.name; }, function (d) { doc.seller = Object.assign(doc.seller, { name: d.seller.name, addr: d.seller.addr, phone: d.seller.phone, pan: d.seller.pan || d.pan || '' }); });
    else NS.suggest($('#s-name', ed), function () { return NSStore.list('biz'); }, function (x) { return x.name; }, function (b) {
      doc.seller = Object.assign(blank().seller, b); delete doc.seller.id; delete doc.seller.created; delete doc.seller.updated; fillForm(); suggestNumber(true); draw(); saveDraft();
    });
    if (type === 'receipt' || type === 'voucher') NS.suggest($('#b-name', ed), function () { return NSStore.list('party').then(function (l) { return NS.active(NS.forBiz(l, doc.seller)); }); }, function (x) { return x.name; }, function (p) {
      doc.buyer = { name: p.name, addr: p.addr || '', phone: p.phone || '', gstin: p.gstin || '' }; fillForm(); draw(); saveDraft();
    });
    if (type === 'rent') suggestFromDocs($('#b-name', ed), function (d) { return d.buyer.name; }, function (d) { doc.buyer.name = d.buyer.name; doc.prop = d.prop; doc.rent = d.rent; doc.mode = d.mode; });
    if (type === 'salary' && window.NSStaff) NS.suggest($('#b-name', ed), function () { return NSStaff.forSlip(doc.seller && doc.seller.name); }, function (x) { return x.name; }, function (e) {
      NSStaff.fillSlip(doc, e); fillForm(); draw(); saveDraft(); attDays(false);
    });
    else if (type === 'salary') suggestFromDocs($('#b-name', ed), function (d) { return d.buyer.name; }, function (d) {
      doc.buyer.name = d.buyer.name; doc.emp = JSON.parse(JSON.stringify(d.emp || {})); doc.earn = JSON.parse(JSON.stringify(d.earn)); doc.ded = JSON.parse(JSON.stringify(d.ded)); doc.days = ''; doc.paid = '';
    });
    renderLines();
  }
  /* picks from this kind's saved documents (newest first, one per name) and fills from the chosen one */
  function suggestFromDocs(inp, nameOf, fill) {
    NS.suggest(inp, function () {
      return NSStore.list('doc').then(function (all) {
        var seen = {};
        return all.filter(function (d) { return d.type === type; }).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }).filter(function (d) {
          var k = key(nameOf(d)); if (!k || seen[k]) return false; seen[k] = 1; return true;
        });
      });
    }, nameOf, function (d) { fill(d); fillForm(); draw(); saveDraft(); });
  }
  /* the days of the month from the attendance sheet of the App's Staff area (gap-pay): only when something was marked for this employee */
  function attDays(force) {
    if (type !== 'salary' || !window.NSPayroll || !window.NSStaff || !doc.buyer.name) return;
    var e = NSStaff.find(doc.buyer.name, doc.seller && doc.seller.name); if (!e) return;
    NSPayroll.Store.fillDays(doc, e, force).then(function (did) { if (did) { fillForm(); draw(); saveDraft(); } });
  }
  /* PF 12% of basic (on at most ₹25,000 of basic, the EPF wage ceiling since 17 Sep 2026), ESI 0.75% of gross when gross is ₹21,000 or less */
  function fillPf() {
    var basic = num((doc.earn[0] || {}).amt), gross = sums(doc).gross;
    /* professional tax follows the business's state unless another is chosen (round C: left blank with no word) */
    if (!doc.ptState && doc.seller && doc.seller.state) { doc.ptState = doc.seller.state; var ps = document.getElementById('d-ptState'); if (ps) ps.value = doc.ptState; }
    var set = function (re, v) { var l = doc.ded.filter(function (x) { return re.test(x.desc); })[0]; if (l) l.amt = v ? String(v) : ''; };
    set(/PF|provident/i, Math.round(Math.min(basic, 25000) * 0.12));
    set(/ESI/i, gross && gross <= 21000 ? Math.ceil(gross * 0.0075) : 0);
    var mon = +String(doc.month || '').slice(5, 7), pt = doc.ptState ? ptFor(doc.ptState, gross, mon) : 0;
    if (pt == null) NS.toast(t('s.pt.manual'));
    else set(/professional/i, pt);
    var pf = Math.round(Math.min(basic, 25000) * 0.12), ptm = pt || num((doc.ded.filter(function (x) { return /professional/i.test(x.desc); })[0] || {}).amt);
    set(/TDS|income tax/i, tdsMonth(gross, doc.regime, pf, ptm));
    /* the employer's own share (WP-5): PF 12% of basic up to ₹25,000, ESI 3.25% of gross when gross is ₹21,000 or less */
    doc.erPf = pf ? String(pf) : ''; doc.erEsi = gross && gross <= 21000 ? String(Math.ceil(gross * 0.0325)) : '';
    ['erPf', 'erEsi'].forEach(function (k) { var e = document.getElementById('d-' + k); if (e) e.value = doc[k]; });
    renderLines(); draw(); saveDraft();
    yearTds(gross, pf, ptm);
  }
  /* ERP round 2 (S-30): TDS from the whole tax year when the year projection (saltax.js) is on the page: this employee's slips saved
     earlier in the tax year (pay and TDS so far) + this month + the same pay for the months left; the TDS still due is spread over
     the months left. Without it the slip keeps the simple month x 12 estimate above. */
  function yearTds(gross, pf, ptm) {
    var TX = window.NSSalTax; if (!TX || !doc.month || !doc.buyer.name.trim()) return;
    var ym = doc.month, fy = TX.fyOf(ym), k = key(doc.buyer.name), b = key(doc.seller && doc.seller.name);
    NSStore.list('doc').then(function (all) {
      var paid = 0, tds = 0, pfY = 0, ptY = 0, had = {}, prevT = '', prevM = '';
      all.forEach(function (d) {
        if (d.type !== 'salary' || d.id === editingId || !d.month || d.month >= ym || TX.fyOf(d.month) !== fy || key(d.buyer && d.buyer.name) !== k || key(d.seller && d.seller.name) !== b) return;
        had[d.month] = 1;
        if (String(d.tdsPrev || '').trim() !== '' && d.month > prevM) { prevM = d.month; prevT = d.tdsPrev; }   /* the newest earlier slip's "TDS already cut outside" */
        (d.earn || []).forEach(function (l) { paid += num(l.amt); });
        (d.ded || []).forEach(function (l) { var v = num(l.amt); if (/TDS|income.?tax/i.test(l.desc)) tds += v; else if (/PF|provident/i.test(l.desc)) pfY += v; else if (/professional/i.test(l.desc)) ptY += v; });
      });
      /* months of the year before this one with no slip here (paid before NSBiz was used): counted at this month's pay */
      var doj = String(doc.emp && doc.emp.doj || '').slice(0, 7);
      for (var m = fy.slice(0, 4) + '-04'; m < ym; m = nextYm(m)) if (!had[m] && !(doj && doj > m)) { paid += gross; pfY += pf; ptY += ptm; }
      /* TDS cut this tax year outside this maker (an earlier employer, or months paid before NSBiz): typed on the slip, else taken
         from this employee's newest earlier slip of the year, and shown in the box so it travels to the next month's slip */
      if (String(doc.tdsPrev || '').trim() === '' && prevT !== '') { doc.tdsPrev = String(prevT); var tp = document.getElementById('d-tdsPrev'); if (tp) tp.value = doc.tdsPrev; }
      var left = 12 - TX.monthNo(ym) + 1, y = TX.year({ ym: ym, regime: doc.regime, month: gross, paidYtd: paid, tdsYtd: tds + num(doc.tdsPrev), future: gross * (left - 1), pfEe: pfY + pf * left, pt: ptY + ptm * left });
      var l = doc.ded.filter(function (x) { return /TDS|income tax/i.test(x.desc); })[0]; if (!l) return;
      l.amt = y.perMonth ? String(y.perMonth) : ''; renderLines(); draw(); saveDraft();
    }).catch(function () {});
  }

  /* professional tax a month by state code, for monthly gross pay g (last checked 4 Nov 2026; null = not in this table, type it yourself) */
  var NOPT = { '07': 1, '09': 1, '06': 1, '08': 1, '02': 1, '05': 1, '04': 1, '12': 1, '21': 1 };   /* Odisha repealed PT from 1 Apr 2026 */
  function ptFor(st, g, mon) {
    if (NOPT[st]) return 0;
    switch (st) {
      case '27': return g <= 7500 ? 0 : g <= 10000 ? 175 : mon === 2 ? 300 : 200;             /* Maharashtra (men; women up to 25,000 pay none) */
      case '29': return g >= 25000 ? (mon === 2 ? 300 : 200) : 0;                                /* Karnataka (₹300 in February since 1 Apr 2025) */
      case '19': return g <= 10000 ? 0 : g <= 15000 ? 110 : g <= 25000 ? 130 : g <= 40000 ? 150 : 200; /* West Bengal */
      case '24': return g >= 12000 ? 200 : 0;                                                    /* Gujarat */
      case '36': case '37': return g <= 15000 ? 0 : g <= 20000 ? 150 : 200;                      /* Telangana, Andhra Pradesh */
      case '18': return g <= 15000 ? 0 : g <= 25000 ? 180 : 208;                                  /* Assam */
    }
    return null;
  }
  /* TDS on salary for one month: yearly tax on (monthly gross x 12), FY 2026-27 slabs, 4% cess; no surcharge (pay above ₹50 lakh needs your accountant) */
  function slabTax(x, slabs) { var tax = 0, prev = 0; slabs.forEach(function (s) { if (x > prev) tax += (Math.min(x, s[0]) - prev) * s[1]; prev = s[0]; }); return tax; }
  function tdsMonth(gross, regime, pf, pt) {
    var y = gross * 12, tax;
    if (regime === 'old') {
      var ti = Math.max(0, y - 50000 - pt * 12 - Math.min(pf * 12, 150000));
      tax = slabTax(ti, [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]]);
      if (ti <= 500000) tax = 0;
    } else {
      var tn = Math.max(0, y - 75000);
      tax = slabTax(tn, [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]]);
      if (tn <= 1200000) tax = 0; else tax = Math.min(tax, tn - 1200000);   /* rebate up to ₹12 lakh, with marginal relief just above it */
    }
    return Math.round(tax * 1.04 / 12);
  }
  var SMAP = { 's-name': 'name', 's-addr': 'addr', 's-gstin': 'gstin', 's-phone': 'phone', 's-pan': 'pan', 's-state': 'state' };
  var BMAP = { 'b-name': 'name', 'b-addr': 'addr', 'b-phone': 'phone', 'b-gstin': 'gstin', 'b-pan': 'pan' };
  var EMAP = { 'e-code': 'code', 'e-desig': 'desig', 'e-dept': 'dept', 'e-doj': 'doj', 'e-pan': 'pan', 'e-uan': 'uan', 'e-esi': 'esi', 'e-bankName': 'bankName', 'e-bankAcc': 'bankAcc', 'e-bankIfsc': 'bankIfsc' };
  var DKEYS = ['gstAdv', 'rate', 'pos', 'sac', 'rv', 'rvDate', 'tdsSec', 'tdsRate', 'rcm', 'rcmRate', 'rcmState', 'rcmItc', 'regime', 'ptState', 'tdsPrev', 'kind', 'no', 'date', 'amount', 'tds', 'mode', 'ref', 'refDate', 'bank', 'against', 'purpose', 'balance', 'prep', 'appr', 'prop', 'rent', 'from', 'to', 'day', 'month', 'days', 'paid', 'opening', 'cashier', 'notes', 'copies', 'paper', 'design', 'acct', 'erPf', 'erEsi', 'payDate', 'payMode'];
  function fillForm(onlyLook) {
    var ed = $('#ed', root);
    if (!onlyLook) {
      Object.keys(SMAP).forEach(function (id) { var e = $('#' + id, ed); if (e) e.value = doc.seller[SMAP[id]] || ''; });
      Object.keys(BMAP).forEach(function (id) { var e = $('#' + id, ed); if (e) e.value = doc.buyer[BMAP[id]] || ''; });
      Object.keys(EMAP).forEach(function (id) { var e = $('#' + id, ed); if (e) e.value = (doc.emp || {})[EMAP[id]] || ''; });
      DKEYS.forEach(function (k) { var e = $('#d-' + k, ed); if (!e) return; if (e.type === 'checkbox') e.checked = !!doc[k]; else e.value = doc[k] == null ? '' : doc[k]; });
      renderLines();
      ['s-gstin', 'b-gstin'].forEach(function (id) { if ($('#' + id, ed)) checkGstin(id); });
    }
    $$('[data-accent]', ed).forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-accent') === doc.accent)); });
    NS.designSync(ed, doc.design, doc.accent);
    ['logo', 'sign'].forEach(function (k) { var b = $('[data-clear="' + k + '"]', ed); if (b) b.hidden = !doc.seller[k]; });
    var kh = $('#kind-hint', ed); if (kh) kh.textContent = t('kh.' + doc.kind);
    $$('[data-for]', ed).forEach(function (f) { f.hidden = f.getAttribute('data-for').split(' ').indexOf(doc.kind) < 0 || (f.querySelector('#d-gstAdv') ? false : !!f.querySelector('#d-rate, #d-pos, #d-sac, #d-advnote') && !doc.gstAdv); });
    if (!onlyLook && type === 'receipt') billsSoon();
    if (!onlyLook && window.NSCF) NSCF.slipFill();
  }
  /* receipt: the customer's unpaid bills from the data home (NSBooks.bills). Ticking bills fills "Against", the amount
     (when empty) and the balance still due, and links the money to those bills (alloc), as App > Money received does */
  var rbTimer = 0;
  function billsSoon() { clearTimeout(rbTimer); rbTimer = setTimeout(billsPanel, 300); }
  function allocate() {
    var left = r2(num(doc.amount) + num(doc.tds)), due = 0;
    doc.alloc = (doc.alloc || []).map(function (a) { var x = r2(Math.min(num(a.left), left)); left = r2(left - x); due = r2(due + num(a.left)); return { id: a.id, no: a.no, amt: x, left: a.left }; });
    if (!doc.alloc.length) { delete doc.alloc; return; }
    doc.against = doc.alloc.map(function (a) { return a.no; }).filter(Boolean).join(', ');
    var bal = r2(due - num(doc.amount) - num(doc.tds)); doc.balance = bal > 0 ? String(bal) : '';
  }
  function billsPanel() {
    var box = $('#rb-bills', root); if (!box) return;
    var nm = key(doc.buyer && doc.buyer.name), biz = doc.seller && doc.seller.name;
    if (type !== 'receipt' || doc.kind !== 'pay' || !nm || !String(biz || '').trim() || !window.NSBooks) { box.innerHTML = ''; return; }
    if (!NS.bizModeOf(doc.seller, CFG).billwise) { if (doc.alloc) { delete doc.alloc; } box.innerHTML = '<p class="soft">' + esc(t('nx.bwoff')) + '</p>'; return; }   /* ERP C-9: bill-wise off */
    NSStore.list('doc').then(function (all) {
      var open = NSBooks.bills(all.filter(function (d) { return d.id !== editingId; }), biz, nm).bills.filter(function (b) { return b.side === 'recv'; });
      if (key(doc.buyer.name) !== nm) return;
      var on = {}; (doc.alloc || []).forEach(function (a) { on[a.id] = 1; });
      if (!open.length) { box.innerHTML = '<p class="soft">' + esc(t('rb.none', { p: doc.buyer.name })) + '</p>'; return; }
      box.innerHTML = '<fieldset class="rb-list"><legend>' + esc(t('rb.h', { p: doc.buyer.name })) + '</legend>' + open.map(function (b) {
        return '<label class="chk"><input type="checkbox" data-rb="' + esc(b.id) + '" data-no="' + esc(b.no) + '" data-left="' + b.left + '"' + (on[b.id] ? ' checked' : '') + '> <span><b class="mono" dir="ltr">' + esc(b.no || '—') + '</b> · ' + esc(NS.fmtDate(b.date)) +
          ' · ' + esc(t('rb.due', { a: NS.money(b.left) })) + '</span></label>';
      }).join('') + '<small class="hint">' + esc(t('rb.hint')) + '</small></fieldset>';
      $$('[data-rb]', box).forEach(function (c) {
        c.addEventListener('change', function () {
          var picked = $$('[data-rb]:checked', box).map(function (x) { return { id: x.getAttribute('data-rb'), no: x.getAttribute('data-no'), left: num(x.getAttribute('data-left')) }; });
          if (!num(doc.amount) && picked.length) doc.amount = String(r2(picked.reduce(function (a, x) { return a + x.left; }, 0) - num(doc.tds)));
          doc.alloc = picked;
          if (!picked.length) { delete doc.alloc; doc.against = ''; doc.balance = ''; } else allocate();
          fillForm(); draw(); saveDraft();
        });
      });
    }).catch(function () { box.innerHTML = ''; });
  }
  function checkGstin(id) {
    var inp = $('#' + id, root), err = $('#' + id + '-err', root), r = NS.gstinCheck(inp.value);
    err.hidden = r.ok; err.textContent = r.ok ? '' : r.msg; inp.setAttribute('aria-invalid', String(!r.ok));
    return r;
  }
  /* a refund voucher picks the advance receipt it refunds: its no., date, SAC, rate and place of supply are copied (round C) */
  var ADV = [];
  function advList() {
    if (type !== 'receipt' || doc.kind !== 'ref' || !window.NSStore) return;
    NSStore.list('doc').then(function (all) {
      var who = key(doc.buyer.name);
      ADV = all.filter(function (d) { return d.type === 'receipt' && d.kind === 'adv' && d.no && (!who || key((d.buyer || {}).name) === who); }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 60);
      var dl = document.getElementById('dl-rv'); if (dl) dl.innerHTML = ADV.map(function (d) { return '<option value="' + esc(d.no) + '">' + esc(NS.fmtDate(d.date) + ' · ' + ((d.buyer || {}).name || '') + ' · ' + NS.money(num(d.amount))) + '</option>'; }).join('');
    }).catch(function () {});
  }
  function fromAdv(no) {
    var a = ADV.filter(function (d) { return key(d.no) === key(no); })[0]; if (!a) return;
    doc.rvDate = a.date || ''; if (a.gstAdv) { doc.gstAdv = true; doc.rate = a.rate; doc.sac = a.sac || doc.sac; doc.pos = a.pos || doc.pos; }
    if (!String(doc.buyer.name || '').trim() && a.buyer) doc.buyer = Object.assign(doc.buyer, a.buyer);
    fillForm(); draw(); saveDraft();
  }
  function onInput(e) {
    var el = e.target, id = el.id, dk = id.slice(0, 2) === 'd-' ? id.slice(2) : null;
    if (id === 'd-rv' && e.type === 'change') setTimeout(function () { fromAdv(el.value); }, 0);
    if (SMAP[id]) doc.seller[SMAP[id]] = id === 's-pan' ? el.value.toUpperCase() : el.value;
    else if (BMAP[id]) doc.buyer[BMAP[id]] = el.value;
    else if (EMAP[id]) { doc.emp[EMAP[id]] = /pan|Ifsc/.test(id) ? el.value.toUpperCase() : el.value; }
    else if (dk && DKEYS.indexOf(dk) >= 0) doc[dk] = el.type === 'checkbox' ? el.checked : dk === 'copies' ? +el.value : el.value;
    else if (el.getAttribute('data-k')) { var row = el.closest('.ln-row'), list = row.parentNode.getAttribute('data-list'); doc[list][+row.getAttribute('data-i')][el.getAttribute('data-k')] = el.value; }
    else return;
    if (id === 's-gstin' || id === 'b-gstin') { el.value = el.value.toUpperCase(); (id[0] === 's' ? doc.seller : doc.buyer).gstin = el.value; checkGstin(id); }
    if (id === 'd-kind' || id === 'd-gstAdv') fillForm(true);
    if (id === 'd-kind' && type === 'receipt' && !editingId) suggestNumber(false);
    if (type === 'receipt') {
      if ((id === 'd-amount' || id === 'd-tds') && doc.alloc) { allocate(); var ab = $('#d-balance', root), ag = $('#d-against', root); if (ab) ab.value = doc.balance; if (ag) ag.value = doc.against; }
      if (id === 'd-against' && doc.alloc) { delete doc.alloc; billsSoon(); }   /* typed by hand: no longer linked to the ticked bills */
      if (id === 'b-name' || id === 's-name' || id === 'd-kind') { if (id !== 'd-kind' && doc.alloc) { delete doc.alloc; doc.against = ''; doc.balance = ''; var a2 = $('#d-against', root), b2 = $('#d-balance', root); if (a2) a2.value = ''; if (b2) b2.value = ''; } billsSoon(); }
    }
    if (id === 'b-pan') el.value = el.value.toUpperCase();
    if (type === 'voucher' && /^(d-tdsSec|d-tdsRate|b-pan)$/.test(id)) tdsHint(id);
    if ((id === 'd-date' || id === 'd-month') && e.type === 'change') suggestNumber(false);
    if (id === 'd-month' && e.type === 'change') attDays(true);
    draw(); saveDraft();
  }

  /* TDS on a voucher (F4-9): picking a section fills its usual rate; contractors pay 1% (individual or HUF, PAN 4th letter P or H) or 2% (others) */
  var tdsAuto = '';
  function tdsHint(id) {
    var sec = String(doc.tdsSec || ''), pan = String(doc.buyer.pan || '').toUpperCase(), c4 = /^[A-Z]{5}\d{4}[A-Z]$/.test(pan) ? pan[3] : '';
    var con = /194C|Sl\. 6\(i\)/.test(sec), want = con ? (c4 ? (/[PH]/.test(c4) ? 1 : 2) : null) : /194J/.test(sec) ? 10 : /194I/.test(sec) ? 10 : /194H/.test(sec) ? 2 : /194Q/.test(sec) ? 0.1 : null;
    var ri = $('#d-tdsRate', root);
    var free = !String(doc.tdsRate || '').trim() || String(doc.tdsRate) === tdsAuto;   /* empty, or still the rate this tool filled in: a new section or PAN may change it; a typed rate stays */
    if (id === 'd-tdsSec' && want != null && free) { doc.tdsRate = tdsAuto = String(want); if (ri) ri.value = doc.tdsRate; }
    if (id === 'b-pan' && con && want != null && free) { doc.tdsRate = tdsAuto = String(want); if (ri) ri.value = doc.tdsRate; }
    if (!ri) return; var f = ri.closest('.f') || ri.parentNode, w = $('[data-tdsw]', f);
    var bad = con && c4 && doc.tdsRate !== '' && +doc.tdsRate !== want;
    if (!bad) { if (w) w.remove(); return; }
    if (!w) { w = NS.el('p', { 'class': 'hint warn', 'data-tdsw': '' }); f.appendChild(w); }
    w.textContent = t('w5.tds194c', { c: c4, r: want });
  }

  /* ---------- numbering: PREFIX/26-27/001, one series per business (rent: per landlord) and financial year ---------- */
  /* the series of this slip through the one engine (core.js NS.nextNo, ERP A-6); a refund voucher counts in its own RFV series */
  function nxOpts() {
    var C = NS.cfgFor(CFG, doc.seller), isRef = type === 'receipt' && doc.kind === 'ref';
    var o = { type: type, sub: doc.vt || '', seller: doc.seller.name || '', date: doc.date, cfg: C, def: T.prefix, skip: editingId, match: type === 'receipt' ? function (d) { return (d.kind === 'ref') === isRef; } : null };
    o.series = isRef ? NS.seriesOf(C, 'refund', '', doc.vt, { def: 'RFV' }) : NS.seriesOf(C, type, '', doc.vt, o);
    return o;
  }
  function suggestNumber(force) {
    if (editingId && !force) return Promise.resolve();
    var isRef = type === 'receipt' && doc.kind === 'ref';
    return Promise.all([NSStore.list('doc'), NSStore.sfTag()]).then(function (r) {
      var o = nxOpts(); o.tag = r[1];   /* shared folder mode: this computer's letter */
      var x = NS.nextNo(r[0], o), k = key(doc.seller.name);
      NS.noBox($('#d-no', root), x.series);
      if (force || !doc.no || doc.no === lastAuto || /^[A-Z]+\/\d\d-\d\d\/[A-Z]{0,3}\d+$/.test(doc.no)) {
        if (x.manual) { doc.no = lastAuto = ''; var n0 = $('#d-no', root); if (n0) n0.value = ''; draw(); return; }
        return (x.suffix || x.series.restart !== 'year' ? Promise.resolve(null) : NSStore.sfClaim({ scope: type + '|' + k + '|' + (isRef ? 'ref' : '') + (doc.vt ? '|' + doc.vt : ''), prefix: x.head, digits: x.width, nos: x.nos })).then(function (c) {
          doc.no = lastAuto = c || x.no;
          var n = $('#d-no', root); if (n) n.value = doc.no;
          draw();
        });
      }
    });
  }

  /* ---------- preview (English, like the printout) ---------- */
  function head(d, title, sub) {
    var s = d.seller;
    return '<header class="sh-top"><div class="sh-from">' + (s.logo ? '<img class="logo" src="' + s.logo + '" alt="">' : '') +
      '<div><h2>' + (s.name ? esc(s.name) : '<span class="ph">' + (type === 'rent' ? 'Landlord’s name' : 'Your business name') + '</span>') + '</h2>' +
      (s.addr ? '<p>' + esc(s.addr).replace(/\n/g, '<br>') + '</p>' : '') +
      (s.gstin ? '<p>' + P.gstin + ': <b class="mono">' + esc(s.gstin) + '</b></p>' : '') + (s.pan ? '<p>' + P.pan + ': <b class="mono">' + esc(s.pan) + '</b></p>' : '') +
      (s.phone ? '<p>' + P.ph + ': ' + esc(s.phone) + '</p>' : '') +
      '</div></div><div class="sh-title"><p class="dt">' + title + '</p>' + (sub ? '<p class="copy">' + sub + '</p>' : '') + '</div></header>';
  }
  function meta(pairs) {
    pairs = pairs.filter(function (p) { return p[1]; });
    var h = '';
    for (var i = 0; i < pairs.length; i += 2) h += '<tr><th>' + pairs[i][0] + '</th><td' + (pairs[i + 1] ? '' : ' colspan="3"') + '>' + pairs[i][1] + '</td>' + (pairs[i + 1] ? '<th>' + pairs[i + 1][0] + '</th><td>' + pairs[i + 1][1] + '</td>' : '') + '</tr>';
    return h ? '<table class="meta">' + h + '</table>' : '';
  }
  function signbox(top, bottom, img) { return '<div class="signbox">' + (top ? '<p>' + top + '</p>' : '') + (img ? '<img src="' + img + '" alt="">' : '<div class="sp"></div>') + '<p>' + bottom + '</p></div>'; }
  function stampBox(on) { return on ? '<div class="rstamp">' + P.stamp + '</div>' : ''; }
  function made() { return NS.creditLine('made'); }
  function payLine(d) {
    var m = P[MODEP[d.mode]] || P.other;
    return P.by + ' ' + m + (d.ref ? ' ' + (d.mode === 'cheque' ? 'no. ' : 'ref. ') + '<span class="mono">' + esc(d.ref) + '</span>' : '') + (d.refDate ? ' ' + P.dated + ' ' + NS.fmtDate(d.refDate) : '') + (d.bank ? ' ' + P.drawn + ' ' + esc(d.bank) : '');
  }
  function sheetOpen(d, extra) { return '<div class="sh slip ' + type + ' d-' + esc(d.design || 'classic') + (d.paper === 'a5' ? ' a5' : '') + (extra || '') + '" style="--ac:' + esc(d.accent) + '" lang="en-IN" dir="ltr">' + (d.cancelled ? '<div class="stamp cx-stamp">CANCELLED</div>' : ''); }   /* A-3 */

  function receiptHtml(d, label) {
    var o = sums(d), s = d.seller, name = d.buyer.name ? '<b>' + esc(d.buyer.name) + '</b>' : '<span class="ph">customer name</span>';
    if (/^th/.test(d.paper)) return '<div class="sh th ' + esc(d.paper) + '" lang="en-IN" dir="ltr">' + (d.cancelled ? '<p class="cx-line">*** CANCELLED ***</p>' : '') + '<h2>' + esc(s.name || '') + '</h2>' + (s.addr ? '<p>' + esc(s.addr).replace(/\n/g, '<br>') + '</p>' : '') + (s.gstin ? '<p>' + P.gstin + ': <b class="mono">' + esc(s.gstin) + '</b></p>' : '') +
      '<p class="dt">' + T.title + '</p>' + (label ? '<p class="copy">' + P[label] + '</p>' : '') +
      '<table class="kv"><tr><th>' + P.rno + '</th><td class="mono">' + esc(d.no) + '</td></tr><tr><th>' + P.date + '</th><td>' + NS.fmtDate(d.date) + '</td></tr></table>' +
      '<p class="nt1">' + P.recfrom + ' ' + name + ' ' + payLine(d) + (d.against ? ', ' + P.against + ' ' + esc(d.against) : '') + (d.purpose ? ', ' + P.towards + ' ' + esc(d.purpose) : '') + '.</p>' +
      '<table class="kv tot"><tr class="grand"><th>' + P.amount + '</th><td>' + NS.money(o.total) + '</td></tr>' + (num(d.tds) ? '<tr><th>' + P.tds + '</th><td>' + NS.money(num(d.tds)) + '</td></tr>' : '') + (num(d.balance) ? '<tr><th>' + P.balance + '</th><td>' + NS.money(num(d.balance)) + '</td></tr>' : '') + '</table>' +
      '<p class="words">' + NS.inWords(o.total) + '</p>' + (d.kind === 'adv' ? '<p class="nt1">' + P.advnote + '</p>' : '') + (d.notes ? '<p class="nt1">' + esc(d.notes) + '</p>' : '') + made() + '</div>';
    var ttl = d.kind === 'ref' ? P.rft : d.kind === 'adv' && d.gstAdv ? P.rvt : T.title, gstAdv = d.gstAdv && d.kind !== 'pay';
    var taxTbl = gstAdv ? '<table class="sum"><thead><tr><th>' + P.sac + '</th><th class="n">' + P.taxable + '</th><th class="n">' + 'GST' + '</th>' + (o.intra ? '<th class="n">' + P.cgst + '</th><th class="n">' + P.sgst + '</th>' : '<th class="n">' + P.igst + '</th>') + '<th class="n">' + P.taxtot + '</th></tr></thead><tbody><tr><td class="mono">' + esc(d.sac) + '</td><td class="n">' + NS.money(o.taxable, false) + '</td><td class="n">' + num(d.rate) + '%</td>' +
      (o.intra ? '<td class="n">' + NS.money(o.cgst, false) + '</td><td class="n">' + NS.money(o.sgst, false) + '</td>' : '<td class="n">' + NS.money(o.igst, false) + '</td>') + '<td class="n">' + NS.money(o.total, false) + '</td></tr></tbody></table>' : '';
    var posCode = (d.pos || (/^\d{2}[A-Z]/.test(String(d.buyer && d.buyer.gstin || '').toUpperCase()) ? String(d.buyer.gstin).slice(0, 2) : '')) || s.state;
    return sheetOpen(d) + head(d, ttl, label ? P[label] : '') +
      meta([[d.kind === 'ref' ? P.vno : P.rno, '<span class="mono">' + esc(d.no) + '</span>'], [P.date, NS.fmtDate(d.date)], [P.pos, gstAdv && posCode ? esc(NS.stateName(posCode)) + ' (' + posCode + ')' : '']]) +
      '<p class="rtext">' + (d.kind === 'ref' ? P.rfto : P.recfrom) + ' ' + name + (d.buyer.addr ? ', ' + esc(d.buyer.addr).replace(/\n/g, ', ') : '') + (d.buyer.gstin ? ' (GSTIN <span class="mono">' + esc(d.buyer.gstin) + '</span>)' : '') +
        ' ' + P.sum + ' <b>' + NS.inWords(o.total) + '</b> ' + payLine(d) + (d.kind === 'ref' && d.rv ? ', ' + P.rvref + ' <b class="mono">' + esc(d.rv) + '</b>' + (d.rvDate ? ' ' + P.dated + ' ' + NS.fmtDate(d.rvDate) : '') : '') + (d.against ? ', ' + P.against + ' <b>' + esc(d.against) + '</b>' : '') + (d.purpose ? ', ' + P.towards + ' ' + esc(d.purpose) : '') + '.</p>' +
      taxTbl + '<div class="rrow"><div class="amtbox">' + NS.money(o.total) + '</div>' + (num(d.tds) ? '<p class="small">' + P.tds + ': <b>' + NS.money(num(d.tds)) + '</b><br>' + P.billamt + ': <b>' + NS.money(o.total + num(d.tds)) + '</b></p>' : '') + (num(d.balance) ? '<p class="small">' + P.balance + ': <b>' + NS.money(num(d.balance)) + '</b></p>' : '') + '</div>' +
      (d.kind === 'adv' ? '<p class="small">' + (gstAdv ? P.advgst : P.advnote) + '</p>' : d.kind === 'ref' ? '<p class="small">' + P.refnote + '</p>' : '') + (d.notes ? '<p class="small">' + esc(d.notes).replace(/\n/g, '<br>') + '</p>' : '') +
      /* a refund voucher: we pay, so the business signs as the payer and the customer signs for the money (round C) */
      '<div class="signs">' + (d.kind === 'ref' ? signbox('', "Receiver's signature", '') + signbox(P['for'] + ' <b>' + esc(s.name || '') + '</b>', 'Authorised signatory', s.sign)
        : stampBox(d.mode === 'cash' && o.total > 5000) + signbox(P['for'] + ' <b>' + esc(s.name || '') + '</b>', P.recby, s.sign)) + '</div>' + made() + '</div>';
  }
  function voucherHtml(d) {
    var o = sums(d), s = d.seller, rows = d.lines.filter(function (l) { return l.desc || num(l.amt); });
    return sheetOpen(d) + head(d, T.title) +
      meta([[P.vno, '<span class="mono">' + esc(d.no) + '</span>'], [P.date, NS.fmtDate(d.date)], [P.mode, (P[MODEP[d.mode]] || '').replace(/^./, function (c) { return c.toUpperCase(); })], [P.ref, esc(d.ref) + (d.refDate ? ' · ' + NS.fmtDate(d.refDate) : '')]]) +
      '<div class="parties"><div class="pt"><h4>' + P.paidto + '</h4>' + (d.buyer.name ? '<b>' + esc(d.buyer.name) + '</b>' : '<p class="ph">Name of the person or firm paid</p>') + (d.buyer.addr ? '<p>' + esc(d.buyer.addr).replace(/\n/g, '<br>') + '</p>' : '') + (d.buyer.phone ? '<p>' + P.ph + ': ' + esc(d.buyer.phone) + '</p>' : '') + (d.buyer.pan ? '<p>' + P.ppan + ': <b class="mono">' + esc(d.buyer.pan) + '</b></p>' : '') + '</div></div>' +
      '<table class="lines"><thead><tr><th>#</th><th class="l">' + P.part + '</th><th class="l">' + P.head + '</th><th class="n">' + P.amount + '</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (l, i) { return '<tr><td>' + (i + 1) + '</td><td class="l">' + esc(l.desc) + '</td><td class="l">' + esc(l.head) + '</td><td class="n">' + NS.money(num(l.amt), false) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="ph">What was paid for</td></tr>') +
      '</tbody><tfoot><tr><th colspan="3" class="l">' + P.total + '</th><th class="n">' + NS.money(o.total) + '</th></tr>' +
        (o.tds ? '<tr><th colspan="3" class="l">' + P.tdsl + (d.tdsSec ? ' u/s ' + esc(d.tdsSec) : '') + ' @ ' + num(d.tdsRate) + '% ' + P.on + ' ' + NS.money(o.total) + '</th><th class="n">− ' + NS.money(o.tds) + '</th></tr><tr><th colspan="3" class="l">' + P.netpaid + '</th><th class="n">' + NS.money(o.net) + '</th></tr>' : '') + '</tfoot></table>' +
      '<p class="words"><span>' + P.words + ':</span> <b>' + NS.inWords(o.net) + '</b></p>' +
      (o.rcm ? '<p class="small">' + P.rcmnote + ' <b>' + NS.money(o.rcm) + '</b> (' + num(d.rcmRate) + '% ' + P.on + ' ' + NS.money(o.total) + ').</p>' : '') + (d.notes ? '<p class="small">' + P.narr + ': ' + esc(d.notes).replace(/\n/g, '<br>') + '</p>' : '') +
      '<div class="signs three">' + signbox('', P.prep + (d.prep ? ': ' + esc(d.prep) : '')) + signbox('', P.appr + (d.appr ? ': ' + esc(d.appr) : ''), s.sign) +
        '<div class="signbox">' + stampBox(d.mode === 'cash' && o.total > 5000) + '<div class="sp"></div><p>' + P.rsign + '</p></div></div>' + made() + '</div>';
  }
  function rentHtml(d) {
    var o = sums(d), s = d.seller, list = o.months.length ? o.months : [ym(d.date)];
    var cards = list.map(function (m, i) {
      var day = d.day === 'first' ? m + '-01' : d.day === 'same' ? d.date : lastDay(m);
      var no = (d.no || '') + (list.length > 1 ? '-' + String(i + 1).padStart(2, '0') : '');
      return '<div class="rr"><div class="rr-h"><p class="dt">' + T.title + '</p><p><span>' + P.rno + ' <b class="mono">' + esc(no) + '</b></span><span>' + P.date + ': ' + NS.fmtDate(day) + '</span></p></div>' +
        '<p class="rtext">' + P.recfrom + ' ' + (d.buyer.name ? '<b>' + esc(d.buyer.name) + '</b>' : '<span class="ph">tenant’s name</span>') + ' ' + P.sum + ' <b>' + NS.money(num(d.rent)) + '</b> (' + NS.inWords(num(d.rent)) + ') ' +
          P.rentof + ' ' + (d.prop ? '<b>' + esc(d.prop).replace(/\n/g, ', ') + '</b>' : '<span class="ph">property address</span>') + ' ' + P.month + ' <b>' + month(m) + '</b>, ' + payLine(d) + '.</p>' +
        '<div class="rr-f"><div><p>' + P.landlord + ': <b>' + esc(s.name || '') + '</b></p>' + (s.pan ? '<p>' + P.pan + ': <b class="mono">' + esc(s.pan) + '</b></p>' : '') + (s.addr ? '<p>' + esc(s.addr).replace(/\n/g, ', ') + '</p>' : '') + '</div>' +
          stampBox(d.mode === 'cash' && num(d.rent) > 5000) + signbox('', P.landlord + '’s signature', s.sign) + '</div></div>';
    });
    var pages = [];
    for (var i = 0; i < cards.length; i += 3) pages.push(sheetOpen(d) + cards.slice(i, i + 3).join('') + made() + '</div>');
    return pages.join('');
  }
  function salaryHtml(d) {
    var o = sums(d), s = d.seller, e = d.emp || {}, days = num(d.days), paid = d.paid === '' ? days : num(d.paid);
    var E = d.earn.filter(function (l) { return l.desc || num(l.amt); }), D = d.ded.filter(function (l) { return l.desc || num(l.amt); }), n = Math.max(E.length, D.length, 1), rows = '';
    for (var i = 0; i < n; i++) rows += '<tr><td class="l">' + esc((E[i] || {}).desc || '') + '</td><td class="n">' + (E[i] && num(E[i].amt) ? NS.money(num(E[i].amt), false) : '') + '</td><td class="l">' + esc((D[i] || {}).desc || '') + '</td><td class="n">' + (D[i] && num(D[i].amt) ? NS.money(num(D[i].amt), false) : '') + '</td></tr>';
    return sheetOpen(d) + head(d, T.title, P.slipfor + ' ' + month(d.month)) +
      meta([[P.emp, d.buyer.name ? '<b>' + esc(d.buyer.name) + '</b>' : '<span class="ph">Employee name</span>'], [P.code, esc(e.code)], [P.desig, esc(e.desig)], [P.dept, esc(e.dept)], [P.doj, e.doj ? NS.fmtDate(e.doj) : ''],
        [P.pan, e.pan ? '<span class="mono">' + esc(e.pan) + '</span>' : ''], [P.uan, e.uan ? '<span class="mono">' + esc(e.uan) + '</span>' : ''], [P.esino, e.esi ? '<span class="mono">' + esc(e.esi) + '</span>' : ''],
        [P.bank, esc(e.bankName)], [P.acc, e.bankAcc ? '<span class="mono">' + esc(e.bankAcc) + '</span>' : ''], [P.ifsc, e.bankIfsc ? '<span class="mono">' + esc(e.bankIfsc) + '</span>' : ''], [P.no, '<span class="mono">' + esc(d.no) + '</span>']]) +
      (days ? meta([[P.days, String(days)], [P.paid, String(paid)], [P.lop, String(r2(Math.max(0, days - paid)))]]) : '') +
      '<table class="lines sal"><thead><tr><th class="l">' + P.earn + '</th><th class="n">' + P.amount + '</th><th class="l">' + P.ded + '</th><th class="n">' + P.amount + '</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><th class="l">' + P.gross + '</th><th class="n">' + NS.money(o.gross, false) + '</th><th class="l">' + P.tded + '</th><th class="n">' + NS.money(o.ded, false) + '</th></tr></tfoot></table>' +
      '<div class="netbox"><span>' + P.net + '</span><b>' + NS.money(o.total) + '</b></div><p class="words"><span>' + P.words + ':</span> <b>' + NS.inWords(Math.max(0, o.total)) + '</b></p>' +
      '<p class="small">' + P.slipnote + '</p>' +
      '<div class="signs">' + signbox('', P.empsign) + signbox(P['for'] + ' <b>' + esc(s.name || '') + '</b>', P.sign, s.sign) + '</div>' + made() + '</div>';
  }
  function pettyHtml(d) {
    var o = sums(d), s = d.seller;
    return sheetOpen(d) + head(d, T.title) +
      meta([[P.no, '<span class="mono">' + esc(d.no) + '</span>'], [P.period, NS.fmtDate(d.from) + ' – ' + NS.fmtDate(d.to)], [P.opening, NS.money(num(d.opening))], [P.closing, '<b>' + NS.money(o.closing) + '</b>']]) +
      '<table class="lines"><thead><tr><th>' + P.date + '</th><th>' + P.vn + '</th><th class="l">' + P.part + '</th><th class="l">' + P.head + '</th><th class="n">' + P.recd + '</th><th class="n">' + P.paid2 + '</th><th class="n">' + P.bal + '</th></tr></thead><tbody>' +
      '<tr><td>' + NS.fmtDate(d.from) + '</td><td></td><td class="l"><b>' + P.opening + '</b></td><td></td><td class="n"></td><td class="n"></td><td class="n">' + NS.money(num(d.opening), false) + '</td></tr>' +
      o.rows.map(function (r) { return '<tr><td>' + NS.fmtDate(r.l.date) + '</td><td class="mono">' + esc(r.l.vno) + '</td><td class="l">' + esc(r.l.desc) + '</td><td class="l">' + esc(r.l.head) + '</td><td class="n">' + (num(r.l.recd) ? NS.money(num(r.l.recd), false) : '') + '</td><td class="n">' + (num(r.l.paid) ? NS.money(num(r.l.paid), false) : '') + '</td><td class="n">' + NS.money(r.bal, false) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><th colspan="4" class="l">' + P.total + '</th><th class="n">' + NS.money(o.recd, false) + '</th><th class="n">' + NS.money(o.paid, false) + '</th><th class="n">' + NS.money(o.closing, false) + '</th></tr></tfoot></table>' +
      (Object.keys(o.heads).length ? '<table class="sum"><caption>' + P.heads + '</caption><tbody>' + Object.keys(o.heads).sort().map(function (h) { return '<tr><td>' + esc(h) + '</td><td class="n">' + NS.money(o.heads[h], false) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      '<div class="signs">' + signbox('', P.cashier + (d.cashier ? ': ' + esc(d.cashier) : '')) + signbox('', P.appr + (d.appr ? ': ' + esc(d.appr) : ''), s.sign) + '</div>' + made() + '</div>';
  }
  function sheetHtml(d, label) {
    return window.NSCF ? NSCF.slipPrint(d, sheetHtml0(d, label)) : sheetHtml0(d, label);   /* custom fields printed above the signatures (ERP Round 2) */
  }
  function sheetHtml0(d, label) {
    return type === 'receipt' ? receiptHtml(d, label) : type === 'voucher' ? voucherHtml(d) : type === 'rent' ? rentHtml(d) : type === 'salary' ? salaryHtml(d) : pettyHtml(d);
  }
  var paHold = false;   /* Print many vouchers: nothing redraws over the documents until printing is done */
  function draw(all) {
    if (paHold) return;
    if (!sheet) return;
    var d = doc, o = sums(d);
    var labels = T.copy && all === true && +d.copies > 1 ? ['orig', 'office'] : [T.copy && +d.copies > 1 ? 'orig' : ''];
    sheet.innerHTML = labels.map(function (l) { return sheetHtml(d, l); }).join('');
    var st = $('#ns-page') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'ns-page' }));
    st.textContent = '@media print{@page{' + ({ a5: 'size:A5;margin:0', th80: 'size:80mm 297mm;margin:0', th58: 'size:58mm 297mm;margin:0' }[d.paper] || 'size:A4;margin:0') + '}}';
    var es = $('#ed-sums', root);
    if (es) es.innerHTML = type === 'salary' ? '<span>' + esc(t('s.sum.gross', { v: NS.money(o.gross) })) + '</span><span>' + esc(t('s.sum.ded', { v: NS.money(o.ded) })) + '</span><b>' + esc(t('s.sum.net', { v: NS.money(o.total) })) + '</b>' +
        (o.gross && num((d.earn[0] || {}).amt) < o.gross / 2 ? '<span class="warn">' + esc(t('s.w.wages')) + '</span>' : '')
      : type === 'voucher' ? '<b>' + esc(t('sum.total', { v: NS.money(o.total) })) + '</b>' + (o.tds ? '<span>' + esc(t('s.sum.net2', { v: NS.money(o.net) })) + '</span>' : '') + (o.rcm ? '<span>' + esc(t('s.sum.rcm', { v: NS.money(o.rcm) })) + '</span>' : '')
      : type === 'petty' ? '<span>' + esc(t('s.sum.recd', { v: NS.money(o.recd) })) + '</span><span>' + esc(t('s.sum.paid', { v: NS.money(o.paid) })) + '</span><b>' + esc(t('s.sum.close', { v: NS.money(o.closing) })) + '</b>'
      : type === 'rent' ? '<span>' + esc(t('s.sum.months', { n: o.months.length })) + '</span><b>' + esc(t('sum.total', { v: NS.money(o.total) })) + '</b>' + (rentPanWarn() ? '<span class="warn">' + esc(t('s.w.pan')) + '</span>' : '')
      : '<b>' + esc(t('sum.total', { v: NS.money(o.total) })) + '</b>';
    fit();
  }
  /* HRA: the landlord's PAN is needed when the rent for the year is more than ₹1,00,000 */
  function rentPanWarn() { return type === 'rent' && num(doc.rent) * 12 > 100000 && !doc.seller.pan; }
  function fit() {
    var wrap = $('.pv', root), sc = $('.pv-scale', root);
    if (!wrap || !sc || !wrap.clientWidth) return;
    var first = sheet.firstElementChild, k = Math.min(1, wrap.clientWidth / (first && first.offsetWidth || 794));
    sc.style.transform = 'scale(' + k + ')';
    wrap.style.height = (sheet.offsetHeight * k) + 'px';
  }
  function shrink(file, max) {
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/png'));
      };
      img.onerror = function () { NS.toast(t('img.bad'), 'bad'); res(''); };
      img.src = url;
    });
  }

  /* ---------- draft, save ---------- */
  function saveDraft() { try { localStorage.setItem(dkey, JSON.stringify({ doc: doc, id: editingId })); } catch (e) {} }
  function loadDraft() { try { var j = JSON.parse(localStorage.getItem(dkey) || 'null'); return j && j.doc ? j : null; } catch (e) { return null; } }
  function key(s) { return String(s || '').trim().toLowerCase(); }
  function validate() {
    var o = sums(doc), p = [];
    if (!doc.seller.name.trim()) p.push(['s-name', t(type === 'rent' ? 's.v.lname' : 'v.bname')]);
    if ((type === 'rent' || type === 'salary') && !doc.buyer.name.trim()) p.push(['b-name', t(type === 'rent' ? 's.v.tname' : 's.v.ename')]);
    if (type === 'receipt' && !(o.total > 0)) p.push(['d-amount', t('s.v.amount')]);
    if (type === 'receipt' && doc.kind === 'ref' && !String(doc.rv || '').trim()) p.push(['d-rv', t('s.v.rv')]);
    if (type === 'rent' && !(num(doc.rent) > 0)) p.push(['d-rent', t('s.v.rent')]);
    if (type === 'voucher' && !(o.total > 0)) p.push(['lines-amt-0', t('s.v.amount')]);
    if (type === 'salary' && !(o.gross > 0)) p.push(['earn-amt-0', t('s.v.earn')]);
    if (type === 'petty' && !o.rows.length) p.push(['lines-desc-0', t('s.v.entry')]);
    if (!String(doc.no).trim()) p.push(['d-no', tw('v.no')]);
    if (/[^A-Za-z0-9\/\-]/.test(doc.no)) p.push(['d-no', t('v.chars')]);
    if (doc.seller.gstin && !NS.gstinCheck(doc.seller.gstin).ok) p.push(['s-gstin', t('v.sg')]);
    if (doc.buyer.gstin && !NS.gstinCheck(doc.buyer.gstin).ok) p.push(['b-gstin', t('v.bg')]);
    return p;
  }
  function keepFull(o) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (o[k] !== '' && o[k] != null) r[k] = o[k]; }); return r; }   /* F6-4: an empty box on a document never wipes a saved value */
  function upsert(store, match, obj) { return NSStore.list(store).then(function (all) { var hit = all.filter(match)[0]; return NSStore.put(store, Object.assign(hit || {}, hit ? keepFull(obj) : obj)); }); }
  /* one save at a time: a double click or Ctrl+S pressed twice saved the document twice with one number (F3-1) */
  var saving = null;
  function save() { if (saving) return saving; saving = Promise.resolve(save0()); var free = function () { saving = null; }; saving.then(free, free); return saving; }
  function save0() {
    /* F6-1: rent added to the accounts goes to the business named as landlord; a name that is not one of your businesses would put it nowhere */
    if (type === 'rent' && doc.acct) return NSStore.list('biz').then(function (L) {
      var nm = String(doc.seller && doc.seller.name || '').trim().toLowerCase();
      if ((L || []).some(function (b) { return String(b.name || '').trim().toLowerCase() === nm; })) return save1();
      var msg = NS.t('w5.rentbiz', { n: doc.seller && doc.seller.name || '' });
      NS.toast(msg, 'bad'); var f = $('#s-name', root); if (f) { showTab('edit'); f.focus(); }
      throw new Error(msg);
    });
    return save1();
  }
  function save1() {
    var probs = validate();
    if (probs.length) {
      var f = $('#' + probs[0][0], root); NS.toast(probs[0][1], 'bad');
      if (f) { var det = f.closest('details'); if (det) det.open = true; showTab('edit'); f.focus(); }
      return Promise.reject(new Error(probs[0][1]));
    }
    var shut = NS.closedMsg && NS.closedMsg(doc.seller.name, doc.date);   /* closed financial year (docmore.js) */
    if (shut) { NS.toast(shut, 'bad'); return Promise.reject(new Error(shut)); }
    var cfb = window.NSCF && NSCF.slipBlock(doc); if (cfb) { NS.toast(cfb, 'bad'); return Promise.reject(new Error(cfb)); }   /* required custom fields */
    var tot = sums(doc).total;
    function yes(m) { return NS.ask ? NS.ask(m) : Promise.resolve(window.confirm(m)); }   /* the site's own question box */
    var asks = [];
    if (doc.mode === 'cash' && type === 'receipt' && tot >= 200000) asks.push(t('c.cash2l'));
    if (doc.mode === 'cash' && type === 'voucher' && tot > 10000) asks.push(t('c.cash10k'));
    if (type === 'voucher' && num(doc.tdsRate) > 0 && !String(doc.buyer.pan || '').trim()) asks.push(t('c.nopan'));
    return asks.reduce(function (p, m) { return p.then(function () { return yes(m).then(function (ok) { if (!ok) throw new Error('cancel'); }); }); }, Promise.resolve()).then(function () { return NSStore.list('doc'); }).then(function (all) {
      var o = nxOpts(), pb = NS.noProblem(all, Object.assign({}, doc, { id: editingId || '_new' }), o);   /* one check for every type (A-6) */
      if (pb && pb.block) { NS.toast(pb.msg, 'bad'); var nf = $('#d-no', root); if (nf) { showTab('edit'); nf.focus(); } throw new Error('cancel'); }
      if (pb) return yes(tw('c.qdup', { no: doc.no })).then(function (ok) { if (!ok) throw new Error('cancel'); });
    }).then(function () {
      var jobs = [], s = doc.seller, b = doc.buyer;
      /* rent receipts belong to a landlord, often not a business, so they are not added to My businesses */
      if (type !== 'rent') jobs.push(upsert('biz', function (x) { return key(x.name) === key(s.name); }, { name: s.name.trim(), addr: s.addr, gstin: s.gstin, phone: s.phone }));
      if ((type === 'receipt' || type === 'voucher') && b.name.trim()) jobs.push(NSStore.list('party').then(function (all) {
        var hit = all.filter(function (x) { return key(x.name) === key(b.name); })[0], want = T.buying ? 'supplier' : 'customer';
        var role = !hit || !hit.role ? want : hit.role === want || hit.role === 'both' ? hit.role : 'both';
        return NSStore.put('party', Object.assign(hit || {}, { name: b.name.trim(), addr: b.addr || (hit && hit.addr) || '', phone: b.phone || (hit && hit.phone) || '', gstin: b.gstin || (hit && hit.gstin) || '', role: role }));
      }));
      if (type === 'salary' && b.name.trim() && window.NSStaff) jobs.push(NSStaff.keep(doc));   /* WP-5: the employee list fills itself */
      return Promise.all(jobs);
    }).then(function () {
      var rec = JSON.parse(JSON.stringify(doc)); rec.total = sums(doc).total; if (editingId) rec.id = editingId;
      return NSStore.put('doc', rec);
    }).then(function (rec) {
      editingId = rec.id; saveDraft(); NS.toast(tw('saved', { no: doc.no })); NS.folderWrite(false); NS.checkReminder(); setStatus(); return rec;
    }).catch(function (e) { if (e.message !== 'cancel') NS.toast(t('nosave', { e: e.message }), 'bad'); throw e; });
  }
  function setStatus() {
    NS.docNav && NS.docNav(root, { current: function () { return editingId; }, open: function (r) { openDoc(r); }, list: openHistory,
      mine: function (d) { var me = key(doc.seller && doc.seller.name); return d.type === type && (!me || !d.seller || key(d.seller.name) === me); } });
    var st = $('#tool-status', root); if (st) st.textContent = editingId ? tw('st.edit', { no: doc.no }) : tw('st.new');
    /* shared folder mode: another computer has this bill open right now */
    var eid = editingId; NSStore.sfEditing(editingId, doc.no).then(function (o) { if (o && st && eid === editingId) st.textContent = tw('st.edit', { no: doc.no }) + ' \u00b7 ' + NS.t('sfd.editing', { who: o.who || o.name }); });
  }
  function startNew() {
    var seller = doc.seller; doc = blank(); editingId = null; doc.seller = seller;
    fillForm(); draw(); saveDraft(); setStatus();
    /* the seller of the last document may have been deleted since: a new document takes a saved business */
    (type !== 'rent' ? NS.liveSeller(seller, CFG, true) : Promise.resolve(null)).then(function (b) { if (b || type === 'rent' || !seller || !seller.name) return b; return NSStore.list('biz').then(function (l) { return l.filter(function (x) { return key(x.name) === key(seller.name); })[0] || null; }); }).then(function (b) { if (b) {   /* F6-4 */ setSeller(b); fillForm(); draw(); } return suggestNumber(true); }).then(saveDraft, function () {});
  }
  function setSeller(b) { doc.seller = Object.assign(blank().seller, b); delete doc.seller.id; delete doc.seller.created; delete doc.seller.updated; if (!editingId) { vtSlip(doc, NS.cfgFor(CFG, doc.seller)); setTimeout(function () { fillForm(); draw(); }, 0); } }
  /* a new slip takes its voucher type's copies, paper, design and notes (C-11); the business is known only once the seller is set */
  function vtSlip(d, C) {
    var vc = NS.vtCfg(C, type, '', d.vt || '');
    NS.vtApply(d, vc, ['design'].concat(T.copy ? ['copies'] : [], (T.papers || []).indexOf(vc.paper) >= 0 ? ['paper'] : [], !d.notes ? ['notes'] : []));
    if (d.copies > 2) d.copies = 2;
  }
  function openDoc(rec, asCopy) {
    doc = Object.assign(blank(), JSON.parse(JSON.stringify(rec)));
    delete doc.id; delete doc.created; delete doc.updated; delete doc.total;
    editingId = asCopy ? null : rec.id;
    if (ACCT[type] && !asCopy && rec.acct == null) doc.acct = false;   /* a slip saved before WP-5 stays out of the accounts until ticked */
    if (asCopy) {
      doc.date = NS.today();
      /* a copy of last month's slip or book moves on by one period */
      if (type === 'salary') { doc.month = nextYm(doc.month || ym(NS.today())); doc.days = ''; doc.paid = ''; doc.payDate = ''; if (/-04$/.test(doc.month)) doc.tdsPrev = ''; }   /* a new tax year starts with nothing cut */
      if (type === 'rent') { var span = months(doc.from, doc.to).length || 1, f = nextYm(doc.to || doc.from); doc.from = f; doc.to = f; for (var i = 1; i < span; i++) doc.to = nextYm(doc.to); }
      if (type === 'petty') { var close = sums(doc).closing; doc.opening = String(close); doc.from = NS.today(); doc.to = NS.today(); doc.lines = [{ date: NS.today(), vno: '', desc: '', head: '', recd: '', paid: '' }]; }
    }
    buildEditor(); fillForm(); if (asCopy) suggestNumber(true); draw(); saveDraft(); setStatus(); showTab('edit');
    window.scrollTo({ top: root.offsetTop - 10, behavior: 'smooth' });
  }

  /* ---------- history ---------- */
  var histOpen = false, histRows = [];
  /* pdf-lib: "Download these as one PDF": the slips the list shows (after the search), oldest first, in one PDF file */
  function histPdfBtn(dlg, n) {
    if (!NS.manyPdf) return;
    var b = $('[data-hist-pdf]', dlg);
    if (!b) {
      b = NS.el('button', { type: 'button', 'class': 'btn sm', 'data-hist-pdf': '', 'data-ic': 'download' }, '');
      var l = $('[data-hist-list]', dlg); l.parentNode.insertBefore(b, l);
      b.addEventListener('click', function () {
        var rows = histRows.slice().sort(function (a, c) { return (a.date || '').localeCompare(c.date || '') || String(a.no || '').localeCompare(String(c.no || '')); });
        if (!rows.length) return;
        (rows.length > 60 && NS.ask ? NS.ask(t('pdf.many', { n: rows.length })) : Promise.resolve(true)).then(function (ok) {
          if (!ok) return; dlg.close(); paList(rows, true, NAMES[type] + ' (' + rows.length + ') ' + NS.today());
        });
      });
    }
    b.textContent = t('pdf.onepdf', { n: n }); b.disabled = !n;
  }
  function renderHistory() {
    var dlg = $('#ns-history'); if (!dlg) return;
    var list = $('[data-hist-list]', dlg), q = $('[data-hist-q]', dlg);
    NSStore.list('doc').then(function (all) {
      var v = key(q.value);
      var rows = all.filter(function (d) { return d.type === type; }).filter(function (d) { return !v || [d.no, d.buyer && d.buyer.name, d.seller && d.seller.name].join(' ').toLowerCase().indexOf(v) >= 0; })
        .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.updated || 0) - (a.updated || 0); });
      histRows = rows; histPdfBtn(dlg, rows.length);
      list.innerHTML = rows.length ? rows.map(function (d) {
        var when = type === 'salary' ? month(d.month) : type === 'rent' ? month(d.from) + (d.to && d.to !== d.from ? ' – ' + month(d.to) : '') : NS.fmtDate(d.date);
        return '<li><div><b class="mono">' + esc(d.no) + '</b> · ' + esc(when) + '<br><span>' + esc(d.buyer && d.buyer.name || d.seller && d.seller.name || '') + '</span> · <b>' + NS.money(d.total || 0) + '</b></div>' +
          '<div class="row"><button type="button" class="btn sm" data-h="open" data-id="' + d.id + '">' + esc(t('h.open')) + '</button><button type="button" class="btn sm" data-h="copy" data-id="' + d.id + '">' + esc(t(type === 'salary' || type === 'rent' || type === 'petty' ? 's.h.next' : 'h.copy')) + '</button>' +
          (NS.cancelDoc && d.no && (d.cancelled || window.NSBooks && NSBooks.role(d)) ? '<button type="button" class="btn sm" data-h="cx" data-id="' + d.id + '">' + esc(t(d.cancelled ? 'au.uncxb' : 'au.cxb')) + '</button>' : '') +   /* A-3 */
          '<button type="button" class="btn sm danger" data-h="del" data-id="' + d.id + '">' + esc(t('h.del')) + '</button></div></li>';
      }).join('') : '<li class="empty">' + esc(t(v ? 'h.nomatch' : 'h.none')) + '</li>';
    });
  }
  function openHistory() {
    var dlg = $('#ns-history'); if (!dlg) return;
    if (!dlg._wired) {
      dlg._wired = true;
      $('[data-hist-q]', dlg).addEventListener('input', renderHistory);
      dlg.addEventListener('close', function () { histOpen = false; });
      $('[data-hist-list]', dlg).addEventListener('click', function (e) {
        var b = e.target.closest('[data-h]'); if (!b) return;
        var id = b.getAttribute('data-id'), act = b.getAttribute('data-h');
        NSStore.get('doc', id).then(function (rec) {
          if (!rec) return;
          if (act === 'open' || act === 'copy') { dlg.close(); openDoc(rec, act === 'copy'); }
          else if (act === 'cx') return NS.cancelDoc(rec).then(function () { renderHistory(); });   /* A-3 */
          else if (act === 'del' && NS.closedMsg && NS.closedMsg(rec.seller && rec.seller.name, rec.date)) NS.toast(NS.closedMsg(rec.seller && rec.seller.name, rec.date), 'bad');   /* closed year (docmore.js) */
          else if (act === 'del') return (NS.ask ? NS.ask(t('b1.cdel', { x: rec.no })) : Promise.resolve(window.confirm(t('b1.cdel', { x: rec.no })))).then(function (ok) { if (ok) return NSStore.del('doc', id).then(function () { if (editingId === id) { editingId = null; setStatus(); } renderHistory(); NS.toast(t('b1.binned')); }, function (err) { NS.toast(err.message, 'bad'); }); });
        });
      });
    }
    histOpen = true; renderHistory();
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  }

  /* ---------- print, share ---------- */
  var NAMES = { receipt: 'Payment Receipt', voucher: 'Payment Voucher', rent: 'Rent Receipt', salary: 'Salary Slip', petty: 'Petty Cash Book' };
  function fileName() {
    return NAMES[type] + ' ' + (type === 'salary' ? month(doc.month) + ' ' : type === 'rent' ? month(doc.from) + (doc.to && doc.to !== doc.from ? ' to ' + month(doc.to) : '') + ' ' : '') + (doc.no || '') + (doc.buyer.name ? ' - ' + doc.buyer.name : '');
  }
  var ONENOS = new URLSearchParams(location.search).get('nos') || '';   /* bill numbers from Print many vouchers, read before the address is tidied */
  function printAll(r, asPdf) {
    return NSStore.list('doc').then(function (all) {
      var pick = NS.noPick && NS.noPick(ONENOS) || function () { return true; };   /* bill numbers chosen in Print many vouchers */
      var list = all.filter(function (x) { return x.type === type && pick(x.no) && (x.date || '') >= r[0] && (x.date || '') <= (r[1] || r[0]); }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || String(a.no || '').localeCompare(String(b.no || '')); });
      if (!list.length) { NS.toast(t('conv.none'), 'bad'); return; }
      return paList(list, asPdf, NAMES[type] + ' ' + r[0] + ' to ' + (r[1] || r[0]));
    });
  }
  /* the slips one after another, then the print window, or (asPdf) one PDF: each slip drawn like Share as PDF, joined with pdf-lib */
  function paList(list, asPdf, title) {
    if (typeof showTab === 'function') showTab('preview', true); paHold = true;
    sheet.innerHTML = list.map(function (d, i) { var labels = T.copy && +d.copies > 1 ? ['orig', 'office'] : [T.copy && +d.copies > 1 ? 'orig' : '']; return '<div class="pa-doc" data-pa="' + i + '">' + labels.map(function (l) { return sheetHtml(d, l); }).join('') + '</div>'; }).join('');
    if (asPdf && NS.manyPdf) return new Promise(function (res) { setTimeout(res, 400); }).then(function () {
      return NS.manyPdf(list.map(function (d, i) { return { nodes: $$('.sh', $('[data-pa="' + i + '"]', sheet)), paper: d.paper }; }), title);
    }).then(function () { paHold = false; draw(); });
    setTimeout(function () { window.print(); setTimeout(function () { paHold = false; draw(); }, 300); }, 500);
  }
  function printDoc() {
    var old = document.title; document.title = fileName(); showTab('preview', true); draw(true); fit();
    setTimeout(function () { window.print(); document.title = old; draw(); }, 60);
  }
  function shareDoc() {
    var o = sums(doc);
    var txt = NAMES[type] + ' ' + doc.no + ' from ' + (doc.seller.name || '') + '\nDate: ' + NS.fmtDate(doc.date) + (o.total ? '\nAmount: ' + NS.money(o.total) : '');
    showTab('preview', true); draw(true); fit();
    NS.sharePdf($$('.sh', sheet), fileName(), doc.paper, NAMES[type] + ' ' + doc.no, txt, { phone: doc.buyer && doc.buyer.phone }).then(function () { draw(); });
  }

  function showTab(which, quiet) {
    root.setAttribute('data-tab', which);
    $$('[data-tab-btn]', root).forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab-btn') === which)); });
    if (!quiet && which === 'preview') fit();
  }
  function labelButtons() {
    var L = { 'new': tw('b.new'), history: tw('b.hist'), save: t('b.save'), print: t('b.print'), share: t('b.share') };
    $$('[data-do]').forEach(function (b) { var k = b.getAttribute('data-do'); if (L[k]) b.textContent = L[k]; });
    $$('[data-tab-btn]', root).forEach(function (b) { b.textContent = t('tab.' + b.getAttribute('data-tab-btn')); });
    var dlg = $('#ns-history'); if (dlg) { $('h2', dlg).textContent = t('h.title'); $('label', dlg).textContent = t('h.search'); }
  }

  function init() {
    root = $('#tool'); if (!root) return;
    type = root.getAttribute('data-doc');
    T = TYPES[type]; if (!T) return;
    sheet = $('#sheet', root); dkey = 'ns-draft-' + type;
    var ed = $('#ed', root);
    ed.addEventListener('input', onInput); ed.addEventListener('change', onInput);
    ed.addEventListener('focusin', function (e) { if (e.target.id === 'd-rv') advList(); });
    doc = blank();
    var dr = loadDraft();
    if (dr && dr.id && /[?&]new=1/.test(location.search)) dr = null;   /* the App's "New ..." (?new=1) starts a fresh document, not the saved one last opened */
    if (dr) { doc = Object.assign(blank(), dr.doc); editingId = dr.id || null; }
    function render() { buildEditor(); fillForm(); draw(); setStatus(); labelButtons(); if (histOpen) renderHistory(); series(); }
    /* "Change number series" under the number box */
    function series() { NS.seriesLink($('#d-no', root), { type: type, biz: function () { return doc.seller; }, def: T.prefix, name: function () { return t('Doc.' + type); }, apply: function (c) { CFG = c || {}; if (!editingId) suggestNumber(true); } });
      NS.subPick($('#d-no', root), { type: type, cfg: function () { return NS.cfgFor(CFG, doc.seller); }, get: function () { return doc.vt || ''; }, saved: function () { return !!editingId; },   /* A-7 */
        set: function (id) { if (id) doc.vt = id; else delete doc.vt; if (!editingId) { vtSlip(doc, NS.cfgFor(CFG, doc.seller)); fillForm(); } suggestNumber(true).then(saveDraft); } }); }
    render();
    document.addEventListener('ns-lang', render);
    var typed = false;
    ed.addEventListener('input', function () { typed = true; });
    /* the form shows at once (it used to wait for the data home, up to 6 s on a first visit, while the preview already showed);
           saved defaults arrive later and never overwrite what the visitor has started typing */
    if (!/[?&](open|from)=/.test(location.search)) root.classList.add('live');
    NSStore.ready().then(function () { return NS.loadCfg().then(function (c) { CFG = c || {}; if (type === 'receipt') billsSoon(); series(); }, function () {}); }).then(function () {   /* the bill list follows the bill-wise switch (ERP C-9) */
      /* ?printall=from,to: NSBiz's Print many vouchers */
      var pall = new URLSearchParams(location.search).get('printall');
      if (pall && !NS.leaving) { var asPdf = new URLSearchParams(location.search).get('pdf') === '1'; history.replaceState(null, '', location.pathname + location.hash); return printAll(pall.split(','), asPdf); }   /* &pdf=1: one PDF (pdftools.js) */
      /* ?open=<id>: NSBiz opens a saved receipt or voucher here to print or share */
      var open = new URLSearchParams(location.search).get('open');
      if (open && !NS.leaving) {
        history.replaceState(null, '', location.pathname + location.hash);
        return NSStore.get('doc', open).then(function (rec) { if (rec && rec.type === type) { openDoc(rec, false); render(); } }).then(function () { if (NS.autoPrint && NS.autoPrint()) setTimeout(printDoc, 900); }).catch(function () {});
      }
      /* a draft of a saved record that no longer exists (deleted elsewhere) starts fresh; a new one takes a saved business */
      return NS.liveDraft(dr).then(function (live) {
        if (dr && !live && !typed) { dr = null; editingId = null; doc = blank(); render(); }
        var appNew = !typed && /[?&]new=1/.test(location.search) && NS.inApp;
        return (type !== 'rent' ? NS.liveSeller(doc.seller, CFG, !dr || appNew) : Promise.resolve(null)).then(function (b) {
          if (dr && appNew && b && doc.seller.name) { dr = null; doc = blank(); }
          /* an unfinished draft keeps everything, but still gets the next number when its number box is empty or still automatic */
          if (dr || typed) { if (b && !doc.seller.name) { setSeller(b); render(); } return suggestNumber(false); }
          var seller = doc.seller; doc = blank(); doc.seller = seller;
          if (b) setSeller(b);
          render(); return suggestNumber(true);
        });
      });
    }).then(function () { NS.checkReminder(); NSStore.persist().catch(function () {}); root.classList.add('live'); });
    $$('[data-tab-btn]', root).forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab-btn')); }); });
    $$('[data-do]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-do');
        if (a === 'save') save().then(function () { NS.vtAfterSave(NS.vtCfg(NS.cfgFor(CFG, doc.seller), type, '', doc.vt), printDoc, shareDoc); }).catch(function () {});
        else if (a === 'print') printDoc();
        else if (a === 'share') shareDoc();
        else if (a === 'new') { if (!editingId && sums(doc).total && !NS.okSync(tw('c.new'))) return; startNew(); }
        else if (a === 'history') openHistory();
      });
    });
    NS.onRestore = function () { if (!editingId) suggestNumber(true); };
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe($('.pv', root));
    window.addEventListener('beforeprint', fit);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save().then(function () { NS.vtAfterSave(NS.vtCfg(NS.cfgFor(CFG, doc.seller), type, '', doc.vt), printDoc, shareDoc); }).catch(function () {}); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); printDoc(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
