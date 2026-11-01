/* الأستاذ أحمد سمير — السلوك المشترك + صفحة الحجز */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- مشترك ---------- */
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  const toggle = $('#navToggle'), links = $('#navLinks');
  if (toggle && links) {
    const close = () => { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', String(links.classList.toggle('open'))));
    $$('a', links).forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  const nav = $('.nav');
  if (nav && !nav.classList.contains('solid')) {
    const f = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    f(); window.addEventListener('scroll', f, { passive: true });
  }
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  /* ---------- صفحة الحجز فقط ---------- */
  const form = $('#bookingForm');
  if (!form) return;

  // Firebase (نفس المشروع القديم) — تهيئة مرة واحدة فقط
  const firebaseConfig = {
    apiKey: "AIzaSyDItPfiy7VZNHgjTSdvggw9iZgDKxNPQOo",
    authDomain: "logg-d33e6.firebaseapp.com",
    databaseURL: "https://logg-d33e6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "logg-d33e6",
    storageBucket: "logg-d33e6.firebasestorage.app",
    messagingSenderId: "815537285421",
    appId: "1:815537285421:web:196f7fa2061dfcaacbcba4"
  };
  let database = null;
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    database = firebase.database();
  } catch (e) { console.error('Firebase init failed', e); }

  const TZ = 'Africa/Cairo';
  const SLOTS = [[9, '9:00 ص - 10:00 ص'], [10, '10:00 ص - 11:00 ص'], [11, '11:00 ص - 12:00 م'], [12, '12:00 م - 1:00 م'],
    [13, '1:00 م - 2:00 م'], [14, '2:00 م - 3:00 م'], [15, '3:00 م - 4:00 م'], [16, '4:00 م - 5:00 م'],
    [17, '5:00 م - 6:00 م'], [18, '6:00 م - 7:00 م']];
  const label = h => (SLOTS.find(s => s[0] === +h) || [])[1] || '';

  function cairoNow() {
    const o = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(p => o[p.type] = p.value);
    return { date: `${o.year}-${o.month}-${o.day}`, hour: +o.hour };
  }
  const digits = s => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const fmtDate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };

  const el = id => document.getElementById(id);
  const dateIn = el('bookingDate'), timeIn = el('bookingTime'), slotsBox = el('slots'), slotMsg = el('slotMsg');
  dateIn.min = cairoNow().date;

  /* الصفوف حسب المرحلة */
  el('educationLevel').addEventListener('change', function () {
    const g = el('grade'); const n = this.value === 'primary' ? 6 : this.value === 'preparatory' ? 3 : 0;
    const word = this.value === 'primary' ? 'الابتدائي' : 'الإعدادي';
    g.innerHTML = `<option value="">${n ? 'اختر الصف الدراسي' : 'اختر المرحلة أولًا'}</option>`;
    for (let i = 1; i <= n; i++) g.add(new Option(`الصف ${i} ${word}`, `${this.value}_${i}`));
    liveUpdate();
  });

  /* ---------- التحقق ---------- */
  const rules = {
    studentName: v => v.trim().length >= 3 ? '' : 'اكتب اسم الطالب (3 أحرف على الأقل)',
    parentName: v => v.trim().length >= 3 ? '' : 'اكتب اسم ولي الأمر',
    parentPhone: v => /^01[0-25]\d{8}$/.test(digits(v).replace(/[\s-]/g, '')) ? '' : 'رقم غير صحيح، مثال: 01012345678',
    studentEmail: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'بريد إلكتروني غير صحيح',
    educationLevel: v => v ? '' : 'اختر المرحلة الدراسية',
    grade: v => v ? '' : 'اختر الصف الدراسي',
    bookingDate: v => !v ? 'اختر التاريخ' : v < cairoNow().date ? 'لا يمكن الحجز في تاريخ سابق' : '',
    bookingTime: v => !v ? 'اختر موعدًا من المواعيد المتاحة' : '',
    agreeTerms: () => form.agreeTerms.checked ? '' : 'يلزم الموافقة على الشروط'
  };
  const stepFields = [['studentName', 'parentName', 'parentPhone', 'studentEmail', 'educationLevel', 'grade'], ['bookingDate', 'bookingTime'], ['agreeTerms']];

  function check(name) {
    const input = form.elements[name]; const box = input.closest('.f');
    const msg = rules[name](input.value || '');
    if (box) { box.classList.toggle('bad', !!msg); const s = $('.err', box); if (s) s.textContent = msg; }
    return !msg;
  }
  const validateStep = i => stepFields[i].map(check).every(Boolean);
  stepFields.flat().forEach(n => {
    const i = form.elements[n];
    i.addEventListener('blur', () => { if (i.value || i.type === 'checkbox') check(n); });
    i.addEventListener('input', () => { if (i.closest('.f.bad')) check(n); liveUpdate(); });
    i.addEventListener('change', () => { if (i.closest('.f.bad')) check(n); liveUpdate(); });
  });

  /* ---------- الخطوات ---------- */
  const steps = $$('.step', form), dots = $$('#prog span'), prog = el('prog');
  let cur = 0;
  function go(i) {
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('active', k === i));
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
    prog.style.setProperty('--p', i / (steps.length - 1));
    if (i === 2) fillSummary();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const f = $('input,select', steps[i]); if (f && i !== 1) setTimeout(() => f.focus({ preventScroll: true }), 350);
  }
  $$('.next-btn').forEach(b => b.addEventListener('click', () => { if (validateStep(cur)) go(cur + 1); }));
  $$('.prev-btn').forEach(b => b.addEventListener('click', () => go(cur - 1)));

  function gradeText() { const g = form.grade; return g.selectedIndex > 0 ? g.options[g.selectedIndex].text : ''; }
  function liveUpdate() {
    el('live-student').textContent = form.studentName.value.trim() || '—';
    el('live-grade').textContent = gradeText() || '—';
    el('live-when').textContent = dateIn.value && timeIn.value ? `${fmtDate(dateIn.value)} • ${label(timeIn.value)}` : '—';
  }
  function fillSummary() {
    el('summary-studentName').textContent = form.studentName.value.trim();
    el('summary-parentName').textContent = form.parentName.value.trim();
    el('summary-parentPhone').textContent = digits(form.parentPhone.value).trim();
    el('summary-grade').textContent = gradeText();
    el('summary-bookingDate').textContent = fmtDate(dateIn.value);
    el('summary-bookingTime').textContent = label(timeIn.value);
  }

  /* ---------- المواعيد (من قاعدة البيانات فقط) ---------- */
  let loadSeq = 0;
  function paintSlots(taken, loading) {
    const { date: today, hour } = cairoNow(); const isToday = dateIn.value === today;
    slotsBox.innerHTML = '';
    SLOTS.forEach(([h, text]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slot'; b.textContent = text;
      const past = isToday && h <= hour, busy = taken && taken[`h${h}`];
      b.disabled = loading || !taken || past || busy; b.setAttribute('aria-pressed', String(timeIn.value === String(h)));
      if (busy) { b.classList.add('taken'); b.title = 'محجوز'; }
      b.addEventListener('click', () => { timeIn.value = String(h); $$('.slot', slotsBox).forEach(x => x.setAttribute('aria-pressed', String(x === b))); check('bookingTime'); liveUpdate(); });
      slotsBox.appendChild(b);
    });
  }
  function loadSlots() {
    timeIn.value = ''; liveUpdate();
    if (!dateIn.value || !check('bookingDate')) { slotsBox.innerHTML = ''; slotMsg.textContent = 'اختر التاريخ لعرض المواعيد المتاحة.'; return; }
    const seq = ++loadSeq; paintSlots(null, true); slotMsg.textContent = 'جارٍ التحقق من المواعيد المتاحة…';
    if (!database) return failSlots();
    const t = setTimeout(() => { if (seq === loadSeq) failSlots(); }, 12000);
    database.ref('slots/' + dateIn.value).once('value').then(s => {
      clearTimeout(t); if (seq !== loadSeq) return;
      const taken = s.val() || {}; paintSlots(taken, false);
      const free = SLOTS.filter(([h]) => !taken[`h${h}`] && !(dateIn.value === cairoNow().date && h <= cairoNow().hour)).length;
      slotMsg.textContent = free ? 'المواعيد المشطوبة غير متاحة.' : 'لا توجد مواعيد متاحة في هذا اليوم، جرّب يومًا آخر.';
    }).catch(() => { clearTimeout(t); if (seq === loadSeq) failSlots(); });
  }
  function failSlots() {
    paintSlots(null, true);
    slotMsg.innerHTML = 'تعذّر التحقق من المواعيد الآن، فلا يمكن اختيار موعد. <button type="button" id="retrySlots">إعادة المحاولة</button>';
    el('retrySlots').addEventListener('click', loadSlots);
  }
  dateIn.addEventListener('change', loadSlots);

  /* ---------- الإرسال ---------- */
  const banner = el('banner'), submitBtn = el('submitBtn'); let busy = false;
  const say = m => { banner.textContent = m; banner.classList.toggle('show', !!m); };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return; say('');
    for (let i = 0; i < 3; i++) if (!validateStep(i)) { go(i); return; }
    if (!database) { say('تعذّر الاتصال بقاعدة البيانات. تحقق من الإنترنت وأعد المحاولة.'); return; }
    busy = true; submitBtn.disabled = true; submitBtn.textContent = 'جارٍ الحجز…';
    const key = 'h' + timeIn.value, date = dateIn.value;
    const slotRef = database.ref(`slots/${date}/${key}`); let claimed = false;
    try {
      const tx = await withTimeout(slotRef.transaction(c => c ? undefined : true), 15000);
      if (!tx.committed) { say('عذرًا، هذا الموعد حُجز للتو. اختر موعدًا آخر.'); go(1); loadSlots(); return; }
      claimed = true;
      const data = { // نفس الحقول القديمة + status لتوافق لوحة التحكم
        studentName: form.studentName.value.trim(), parentName: form.parentName.value.trim(),
        parentPhone: digits(form.parentPhone.value).replace(/[\s-]/g, ''),
        studentEmail: form.studentEmail.value.trim() || 'غير مدخل',
        educationLevel: form.educationLevel.value, grade: gradeText(),
        bookingDate: date, bookingTime: label(timeIn.value), slotKey: key,
        notes: form.notes.value.trim() || 'لا يوجد', status: 'pending', timestamp: new Date().toISOString()
      };
      await withTimeout(database.ref('bookings').push().set(data), 15000);
      form.hidden = true; $('.prog').hidden = true;
      el('successMsg').textContent = `${fmtDate(date)} • ${label(timeIn.value)} — سيتصل بك الأستاذ أحمد على ${data.parentPhone} لتأكيد الموعد.`;
      const s = el('success'); s.classList.add('show'); s.focus(); window.scrollTo({ top: 0 });
    } catch (err) {
      console.error('Booking failed', err);
      if (claimed) slotRef.remove().catch(() => {});
      say(err && err.message === 'timeout' ? 'استغرق الاتصال وقتًا طويلًا. تحقق من الإنترنت وأعد المحاولة.'
        : err && /permission/i.test(err.message) ? 'تعذّر حفظ الحجز بسبب إعدادات الصلاحيات. تواصل مع الأستاذ عبر واتساب.'
        : 'حدث خطأ أثناء الحجز، لم يتم حفظ شيء. أعد المحاولة.');
    } finally { busy = false; submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الحجز'; }
  });
  go(0);
})();
