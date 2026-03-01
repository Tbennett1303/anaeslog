'use strict';

// ── Data constants ────────────────────────────────────────────────────────────

const SPECIALTIES = [
  'Cardiac Surgery','ENT','General Surgery','Gynaecology','Interventional Radiology',
  'Maxillofacial','Neurosurgery','Obstetrics','Ophthalmology','Orthopaedics',
  'Pain Management','Paediatrics','Plastics & Burns','Thoracic Surgery','Urology','Vascular'
];

const PROCEDURES = {
  'General Surgery': [
    'Appendicectomy (laparoscopic)','Appendicectomy (open)','Cholecystectomy (laparoscopic)',
    'Cholecystectomy (open)','Hartmann\'s procedure','Anterior resection','Right hemicolectomy',
    'Left hemicolectomy','Sigmoid colectomy','Subtotal colectomy','Total colectomy',
    'Oesophagectomy','Total gastrectomy','Partial gastrectomy','Whipple\'s procedure',
    'Splenectomy','Liver resection','Hepatectomy','Hernia repair (inguinal)',
    'Hernia repair (umbilical)','Hernia repair (incisional)','Nissen fundoplication',
    'Colostomy formation','Ileostomy formation','Stoma reversal','Exploratory laparotomy',
    'Bowel resection','Small bowel obstruction (surgery)','Sleeve gastrectomy',
    'Roux-en-Y gastric bypass','Adhesiolysis','OGD','Colonoscopy','ERCP',
  ],
  'Orthopaedics': [
    'Total hip replacement','Total knee replacement','Hip hemiarthroplasty',
    'Revision hip replacement','Revision knee replacement','ORIF femur','ORIF tibia',
    'ORIF fibula','ORIF ankle','ORIF wrist/distal radius','ORIF humerus','ORIF radius/ulna',
    'Knee arthroscopy','Shoulder arthroscopy','ACL reconstruction','Shoulder replacement',
    'Elbow replacement','Ankle fusion','Spinal fusion','Laminectomy','Discectomy',
    'Microdiscectomy','Cervical spine surgery','Dynamic hip screw','Intramedullary nail',
    'External fixator application','Amputation (below knee)','Amputation (above knee)',
    'Hallux valgus correction','Tendon repair','Carpal tunnel decompression',
    'Ulnar nerve decompression','Rotator cuff repair',
  ],
  'Obstetrics': [
    'LSCS (elective)','LSCS (emergency category 1)','LSCS (emergency category 2)',
    'LSCS (emergency category 3)','Instrumental delivery (forceps)','Instrumental delivery (ventouse)',
    'Manual removal of placenta','Cervical cerclage','Uterine balloon tamponade',
    'B-Lynch suture','Peripartum hysterectomy','EUA (obstetric)',
  ],
  'Gynaecology': [
    'Hysterectomy (abdominal total)','Hysterectomy (laparoscopic total)','Hysterectomy (vaginal)',
    'Radical hysterectomy','Myomectomy (open)','Myomectomy (laparoscopic)','Oophorectomy',
    'Salpingectomy','Salpingo-oophorectomy','ERPC','Laparoscopy (diagnostic)',
    'Laparoscopy (operative)','Hysteroscopy','TVT / TOT','Anterior/posterior repair',
    'Cone biopsy','Ectopic pregnancy (laparoscopic)','Ovarian cystectomy',
  ],
  'Cardiac Surgery': [
    'CABG (on-pump)','CABG (off-pump)','Aortic valve replacement','Mitral valve replacement',
    'Mitral valve repair','Tricuspid valve surgery','Combined valve and CABG',
    'Aortic root replacement','Ascending aorta replacement','Type A dissection repair',
    'LVAD insertion','Heart transplant','Pericardiectomy','TAVI','MitraClip',
    'Pulmonary endarterectomy','VSD repair','ASD repair','Pacemaker insertion','ICD insertion',
  ],
  'Thoracic Surgery': [
    'Lobectomy (open)','Lobectomy (VATS)','Pneumonectomy','Segmentectomy (VATS)',
    'Wedge resection','Bullectomy','Pleurodesis','Pleural decortication',
    'Pleural empyema drainage','Mediastinoscopy','Bronchoscopy (rigid)',
    'VATS pleural biopsy','Thymectomy','Pericardial window','Lung biopsy','Mesothelioma surgery',
  ],
  'Neurosurgery': [
    'Craniotomy (tumour)','Craniectomy','Aneurysm clipping','AVM resection',
    'VP shunt insertion','EVD insertion','Lumbar drain insertion','Posterior fossa surgery',
    'Deep brain stimulation','Cervical discectomy & fusion','Lumbar decompression',
    'Spinal tumour resection','Burr hole','Chronic subdural evacuation','Skull base surgery',
    'Awake craniotomy','Stereotactic biopsy',
  ],
  'ENT': [
    'Tonsillectomy','Adenotonsillectomy','Myringotomy + grommet insertion','Myringoplasty',
    'Tympanoplasty','Mastoidectomy','FESS','Septoplasty','Turbinate reduction',
    'Direct laryngoscopy','Suspension microlaryngoscopy','Vocal cord surgery',
    'Neck dissection (selective)','Neck dissection (radical)','Parotidectomy',
    'Thyroidectomy (total)','Thyroidectomy (hemi)','Parathyroidectomy','Tracheostomy',
    'Cochlear implant','Pharyngoplasty','OSA surgery',
  ],
  'Ophthalmology': [
    'Cataract (phacoemulsification)','Cataract (ECCE)','Trabeculectomy',
    'Vitreoretinal surgery','Retinal detachment repair','Squint correction',
    'Corneal graft (PKP)','DSEK/DSAEK','Enucleation','Evisceration',
    'Oculoplastic surgery','DCR','Eyelid surgery','Orbital decompression',
  ],
  'Vascular': [
    'Carotid endarterectomy','AAA repair (open)','EVAR','Femoro-popliteal bypass',
    'Femoro-distal bypass','Aorto-bifemoral bypass','AV fistula creation',
    'AV fistula revision','Amputation (below knee)','Amputation (above knee)',
    'Femoral embolectomy','Mesenteric ischaemia surgery','TEVAR','Axillo-femoral bypass',
  ],
  'Urology': [
    'TURP','TURBT','Cystoscopy + biopsy','Nephrectomy (laparoscopic)','Nephrectomy (open)',
    'Radical nephrectomy','Partial nephrectomy','Nephroureterectomy',
    'Radical prostatectomy (robotic)','Radical prostatectomy (open)','Radical cystectomy',
    'Ileal conduit','Orchidopexy','Orchidectomy','Circumcision','Ureteroscopy + laser',
    'PCNL','JJ stent insertion','Pyeloplasty','Prostate biopsy',
  ],
  'Paediatrics': [
    'Neonatal laparotomy','Pyloric stenosis (Ramstedt)','Intussusception reduction',
    'Paediatric appendicectomy','Paediatric hernia repair','Paediatric orchidopexy',
    'Paediatric circumcision','Paediatric adenotonsillectomy','Paediatric grommets',
    'Cleft lip repair','Cleft palate repair','Gastroschisis repair','Exomphalos repair',
    'Hirschsprung\'s pull-through','Oesophageal atresia repair','Paediatric burns',
    'Paediatric spinal surgery','Paediatric cardiac surgery',
  ],
  'Plastics & Burns': [
    'Skin graft (split thickness)','Skin graft (full thickness)','Free flap reconstruction',
    'Pedicled flap reconstruction','Breast reconstruction','Wide local excision',
    'Sentinel lymph node biopsy','Axillary clearance','Burns debridement',
    'Burns skin grafting','Rhinoplasty','Abdominoplasty','Breast reduction',
    'Breast augmentation','Microsurgery','Tendon transfer','Hand surgery',
  ],
  'Maxillofacial': [
    'Wisdom tooth extraction (GA)','Multiple dental extractions (GA)',
    'Le Fort osteotomy','Mandibular osteotomy','Orthognathic surgery',
    'TMJ surgery','Oral cancer resection','Jaw reconstruction',
    'Zygoma repair','Orbital floor repair','Nasal fracture reduction',
  ],
  'Interventional Radiology': [
    'Embolisation','TIPSS','TACE','CT-guided biopsy','CT-guided drain insertion',
    'Nephrostomy','Biliary drainage','IVC filter insertion','Angiography',
    'Angioplasty + stenting','Vertebroplasty','Kyphoplasty','RFA tumour ablation',
  ],
  'Pain Management': [
    'Epidural steroid injection','Facet joint injection','Medial branch block',
    'Sacroiliac joint injection','Spinal cord stimulator insertion',
    'Intrathecal drug delivery','Coeliac plexus block','Trigger point injection',
  ],
};

const ANAESTHESIA_TYPES = ['GA','RA','Combined GA+RA','Sedation / MAC','Local only'];
const MAINTENANCE_OPTIONS = ['Volatile (gas)','TIVA','Combined (gas + TIVA)','N/A (RA only)'];
const AIRWAY_OPTIONS = [
  'Face mask','LMA (classic)','i-gel / ProSeal / Supreme','ETT — direct laryngoscopy',
  'ETT — video laryngoscopy','ETT — awake fibreoptic','Surgical airway / tracheostomy',
  'ILMA / intubating LMA','Nasal ETT','Double-lumen ETT','None (RA / sedation)',
];
const REGIONAL_OPTIONS = [
  'Spinal','Epidural (surgical)','Labour epidural','CSE','PIEB',
  'TAP block','Rectus sheath block','Quadratus lumborum block',
  'Fascia iliaca block','Femoral nerve block','Adductor canal block',
  'Sciatic nerve block','Popliteal block','Brachial plexus (interscalene)',
  'Brachial plexus (supraclavicular)','Brachial plexus (axillary)',
  'Paravertebral block','Serratus anterior block','PECS block',
  'Erector spinae block','Transversus abdominis plane','Penile block',
  'Ophthalmic (peribulbar / sub-Tenon)','Ankle block',
];
const ADDITIONAL_PROCEDURES = [
  'Peripheral IV (large bore)','Arterial line','Central venous catheter (CVC)',
  'PICC line','Rapid sequence induction (RSI)','Modified RSI',
  'Difficult airway trolley used','Fibreoptic bronchoscope used',
  'Cell salvage','TOE intraoperatively','Awake craniotomy (lead)',
  'Thoracic epidural','Invasive monitoring (PA catheter)',
];
const SUPERVISION_OPTIONS = ['Immediate','Local','Distant','Independent','Teaching (supervised trainee)'];
const URGENCY_OPTIONS = ['Elective','Urgent (< 24h)','Emergency (< 1h)','Immediate (< min)'];
const TIME_OPTIONS = ['AM (06–13)','PM (13–18)','Evening (18–22)','Night (22–06)'];

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  token: null,
  user: null,
  entries: [],        // all entries (merged local + server)
  templates: [],
  customOptions: {},
  pendingSync: [],    // IDs of entries not yet synced
  view: 'log',
  wizard: {
    step: 0,
    entry: {},        // entry being built
    editingId: null,  // set when editing existing entry
  },
  historyFilter: { search: '', specialty: '', urgency: '', from: '', to: '' },
};

// ── Local storage helpers ─────────────────────────────────────────────────────

const LS = {
  get:    (k)      => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set:    (k, v)   => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k)      => localStorage.removeItem(k),
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── UUID ──────────────────────────────────────────────────────────────────────

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let _toastTimer;
function toast(msg, duration = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ── Auto time-of-day ──────────────────────────────────────────────────────────

function autoTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 6  && h < 13) return 'AM (06–13)';
  if (h >= 13 && h < 18) return 'PM (13–18)';
  if (h >= 18 && h < 22) return 'Evening (18–22)';
  return 'Night (22–06)';
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Show / hide views ─────────────────────────────────────────────────────────

function showView(name) {
  state.view = name;
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${name}`);
    v.classList.toggle('hidden', v.id !== `view-${name}`);
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'history')   renderHistory();
  if (name === 'templates') renderTemplates();
  if (name === 'reports')   renderReports();
  if (name === 'log')       renderWizard();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ── Side menu ─────────────────────────────────────────────────────────────────

document.getElementById('header-menu-btn').addEventListener('click', openSideMenu);
document.getElementById('menu-overlay').addEventListener('click', closeSideMenu);

function openSideMenu() {
  document.getElementById('side-menu').classList.remove('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
  const u = state.user || {};
  document.getElementById('menu-user-name').textContent = u.name || 'Anonymous';
  document.getElementById('menu-user-gmc').textContent = u.gmc_number ? `GMC: ${u.gmc_number}` : (state.token ? '' : 'Offline mode');
}
function closeSideMenu() {
  document.getElementById('side-menu').classList.add('hidden');
  document.getElementById('menu-overlay').classList.add('hidden');
}

document.getElementById('menu-profile').addEventListener('click', () => {
  closeSideMenu();
  const u = state.user || {};
  document.getElementById('profile-name').value     = u.name || '';
  document.getElementById('profile-gmc').value      = u.gmc_number || '';
  document.getElementById('profile-hospital').value = u.hospital || '';
  openModal('modal-profile');
});
document.getElementById('menu-custom').addEventListener('click', () => {
  closeSideMenu(); renderCustomOptions(); openModal('modal-custom');
});
document.getElementById('menu-sync-now').addEventListener('click', () => {
  closeSideMenu(); syncToServer();
});
document.getElementById('menu-logout').addEventListener('click', () => {
  if (!confirm('Sign out?')) return;
  state.token = null; state.user = null;
  LS.remove('token'); LS.remove('user');
  closeSideMenu();
  showAuthScreen();
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const data = {
    name:       document.getElementById('profile-name').value.trim(),
    gmc_number: document.getElementById('profile-gmc').value.trim(),
    hospital:   document.getElementById('profile-hospital').value.trim(),
  };
  if (state.token) {
    try { await apiFetch('PUT', '/auth/profile', data); } catch {}
  }
  state.user = { ...state.user, ...data };
  LS.set('user', state.user);
  closeModal('modal-profile');
  toast('Profile saved');
});

// ── Auth ──────────────────────────────────────────────────────────────────────

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}
function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('login-form').classList.toggle('hidden', !isLogin);
    document.getElementById('register-form').classList.toggle('hidden', isLogin);
  });
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    const data = await apiFetch('POST', '/auth/login', { email, password });
    setAuth(data.token, data.user);
    loadData();
    showApp();
    showView('log');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    email:      document.getElementById('reg-email').value,
    password:   document.getElementById('reg-password').value,
    name:       document.getElementById('reg-name').value,
    gmc_number: document.getElementById('reg-gmc').value,
    hospital:   document.getElementById('reg-hospital').value,
  };
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');
  try {
    const data = await apiFetch('POST', '/auth/register', payload);
    setAuth(data.token, data.user);
    loadData();
    showApp();
    showView('log');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('offline-btn').addEventListener('click', () => {
  state.token = null;
  state.user  = { name: 'Offline User' };
  loadLocalData();
  showApp();
  showView('log');
  toast('Running in offline mode — data saved locally');
  setSyncStatus('offline');
});

function setAuth(token, user) {
  state.token = token;
  state.user  = user;
  LS.set('token', token);
  LS.set('user', user);
}

// ── Data loading ──────────────────────────────────────────────────────────────

function loadLocalData() {
  state.entries   = LS.get('entries')   || [];
  state.templates = LS.get('templates') || [];
  state.customOptions = LS.get('customOptions') || {};
  renderWizard();
  renderQuickbar();
}

async function loadData() {
  loadLocalData();
  if (!state.token) return;
  try {
    setSyncStatus('syncing');
    // Sync any pending local entries first
    const pending = state.entries.filter(e => e._pending);
    if (pending.length) {
      const res = await apiFetch('POST', '/sync', { entries: pending });
      state.entries = res.entries;
    } else {
      state.entries = await apiFetch('GET', '/entries');
    }
    state.templates   = await apiFetch('GET', '/templates');
    state.customOptions = await apiFetch('GET', '/custom-options');
    LS.set('entries', state.entries);
    LS.set('templates', state.templates);
    LS.set('customOptions', state.customOptions);
    setSyncStatus('synced');
    renderQuickbar();
  } catch {
    setSyncStatus('offline');
  }
}

async function syncToServer() {
  if (!state.token) { toast('Sign in to sync'); return; }
  setSyncStatus('syncing');
  try {
    const res = await apiFetch('POST', '/sync', { entries: state.entries });
    state.entries = res.entries;
    LS.set('entries', state.entries);
    setSyncStatus('synced');
    toast('Synced ✓');
  } catch {
    setSyncStatus('offline');
    toast('Sync failed — check connection');
  }
}

function setSyncStatus(s) {
  const dot = document.getElementById('sync-indicator');
  dot.className = 'sync-dot ' + s;
  dot.title = { synced:'Synced', syncing:'Syncing…', offline:'Offline' }[s] || '';
}

// ── Wizard ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id:'context',    label:'Date & Session' },
  { id:'patient',    label:'Patient' },
  { id:'procedure',  label:'Procedure' },
  { id:'anaesthesia',label:'Anaesthesia' },
  { id:'airway',     label:'Airway' },
  { id:'procedures', label:'Procedures Performed' },
  { id:'supervision',label:'Supervision' },
  { id:'notes',      label:'Notes (optional)' },
  { id:'review',     label:'Review & Submit' },
];

function resetWizardEntry() {
  state.wizard.entry = {
    id:                   uuid(),
    date:                 todayISO(),
    time_of_day:          autoTimeOfDay(),
    hospital:             state.user?.hospital || '',
    patient_age:          null,
    age_unit:             'years',
    asa:                  '',
    specialty:            '',
    procedure:            '',
    urgency:              '',
    anaesthesia_types:    [],
    maintenance:          '',
    airway:               [],
    regional_techniques:  [],
    additional_procedures:[],
    supervision:          '',
    notes:                '',
  };
  state.wizard.step = 0;
  state.wizard.editingId = null;
}

function renderWizard() {
  if (!state.wizard.entry.id) resetWizardEntry();
  renderWizardStep();
  renderQuickbar();
}

function renderWizardStep() {
  const { step, entry } = state.wizard;
  const stepInfo = STEPS[step];

  // Progress bar
  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  document.getElementById('wizard-progress').innerHTML =
    `<div class="wizard-progress-bar" style="width:${pct}%"></div>`;
  document.getElementById('wizard-step-label').textContent =
    `Step ${step + 1} of ${STEPS.length} — ${stepInfo.label}`;

  // Back / next
  const backBtn = document.getElementById('wizard-back');
  const nextBtn = document.getElementById('wizard-next');
  backBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
  nextBtn.textContent = step === STEPS.length - 1 ? 'Submit ✓' : 'Next →';

  const body = document.getElementById('wizard-body');
  body.innerHTML = '';

  switch (stepInfo.id) {
    case 'context':    renderStepContext(body, entry);    break;
    case 'patient':    renderStepPatient(body, entry);    break;
    case 'procedure':  renderStepProcedure(body, entry);  break;
    case 'anaesthesia':renderStepAnaesthesia(body,entry); break;
    case 'airway':     renderStepAirway(body, entry);     break;
    case 'procedures': renderStepProcedures(body, entry); break;
    case 'supervision':renderStepSupervision(body,entry); break;
    case 'notes':      renderStepNotes(body, entry);      break;
    case 'review':     renderStepReview(body, entry);     break;
  }
}

// Back / Next handlers
document.getElementById('wizard-back').addEventListener('click', () => {
  if (state.wizard.step > 0) { state.wizard.step--; renderWizardStep(); }
});
document.getElementById('wizard-next').addEventListener('click', wizardNext);

function wizardNext() {
  const { step } = state.wizard;
  if (step === STEPS.length - 1) { submitEntry(); return; }
  state.wizard.step++;
  renderWizardStep();
  document.getElementById('wizard-body').scrollTop = 0;
}

function chipAdvance() {
  // called by single-select chips — auto advance after 150ms for tactile feel
  setTimeout(wizardNext, 180);
}

// ── Step renderers ────────────────────────────────────────────────────────────

function renderStepContext(container, entry) {
  container.innerHTML = `
    <p class="step-title">When is this case?</p>
    <div class="field-group">
      <label>Date</label>
      <input type="date" id="w-date" class="field-input" value="${entry.date}">
    </div>
    <p class="section-label">Session</p>
    <div class="chip-grid grid-2" id="tod-chips"></div>
    <div class="field-group" style="margin-top:.75rem">
      <label>Hospital / Site</label>
      <input type="text" id="w-hospital" class="field-input" value="${entry.hospital || ''}"
             placeholder="Royal Infirmary">
    </div>
  `;

  document.getElementById('w-date').addEventListener('change', e => {
    state.wizard.entry.date = e.target.value;
  });
  document.getElementById('w-hospital').addEventListener('input', e => {
    state.wizard.entry.hospital = e.target.value;
  });

  const todGrid = document.getElementById('tod-chips');
  const todClass = ['tod-am','tod-pm','tod-eve','tod-night'];
  TIME_OPTIONS.forEach((opt, i) => {
    const chip = makeChip(opt, opt === entry.time_of_day, `chip ${todClass[i]}`);
    chip.addEventListener('click', () => {
      state.wizard.entry.time_of_day = opt;
      chipAdvance();
    });
    todGrid.appendChild(chip);
  });
}

function renderStepPatient(container, entry) {
  const display = entry.patient_age !== null ? String(entry.patient_age) : '—';
  container.innerHTML = `
    <p class="step-title">Patient details</p>
    <div class="numpad-display">
      <span id="age-display">${display}</span>
      <span class="age-unit" id="age-unit-display">${entry.age_unit}</span>
    </div>
    <div class="chip-grid grid-3" style="max-width:280px;margin:0 auto .75rem">
      <div class="chip ${entry.age_unit==='years'?'selected':''}" data-unit="years">Yrs</div>
      <div class="chip ${entry.age_unit==='months'?'selected':''}" data-unit="months">Mths</div>
      <div class="chip ${entry.age_unit==='days'?'selected':''}" data-unit="days">Days</div>
    </div>
    <div class="numpad-grid">
      ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k =>
        `<button class="numpad-btn${k===''?' clear':k==='⌫'?' del':''}" data-key="${k}">${k}</button>`
      ).join('')}
    </div>
    <hr class="divider">
    <p class="section-label">ASA grade</p>
    <div class="chip-grid grid-3" id="asa-chips"></div>
  `;

  // Unit chips
  container.querySelectorAll('[data-unit]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.wizard.entry.age_unit = chip.dataset.unit;
      container.querySelectorAll('[data-unit]').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('age-unit-display').textContent = chip.dataset.unit;
    });
  });

  // Numpad
  container.querySelectorAll('.numpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (k === '⌫') {
        const cur = String(state.wizard.entry.patient_age ?? '');
        const next = cur.slice(0, -1);
        state.wizard.entry.patient_age = next === '' ? null : Number(next);
      } else if (k === '') {
        return;
      } else {
        const cur = state.wizard.entry.patient_age === null ? '' : String(state.wizard.entry.patient_age);
        if (cur.length >= 3) return;
        state.wizard.entry.patient_age = Number(cur + k);
      }
      document.getElementById('age-display').textContent =
        state.wizard.entry.patient_age !== null ? state.wizard.entry.patient_age : '—';
    });
  });

  // ASA chips
  const asaGrid = document.getElementById('asa-chips');
  ['1','2','3','4','5','1E','2E','3E','4E','5E'].forEach(a => {
    const base = a.replace('E','');
    const chip = document.createElement('div');
    chip.className = `chip asa-${base} asa-e${a.includes('E') ? '' : ''}${entry.asa === a ? ' selected' : ''}`;
    chip.textContent = `ASA ${a}`;
    chip.addEventListener('click', () => {
      state.wizard.entry.asa = a;
      asaGrid.querySelectorAll('.chip').forEach(c => {
        const cb = c.textContent.replace('ASA ','').replace('E','');
        c.className = `chip asa-${cb}${c.textContent.includes('E') ? ' asa-e' : ''}`;
      });
      chip.classList.add('selected');
      chipAdvance();
    });
    asaGrid.appendChild(chip);
  });
}

function renderStepProcedure(container, entry) {
  const allCustom = (state.customOptions['procedure'] || []).map(o => o.value);
  container.innerHTML = `
    <p class="step-title">What's the case?</p>
    <p class="section-label">Specialty</p>
    <div class="chip-grid grid-2" id="specialty-chips"></div>
    <p class="section-label">Procedure</p>
    <div class="autocomplete-wrapper">
      <input type="text" id="proc-input" class="field-input" placeholder="Type to search…"
             value="${entry.procedure || ''}" autocomplete="off">
      <div id="proc-dropdown" class="autocomplete-dropdown hidden"></div>
    </div>
    <p class="section-label">Urgency</p>
    <div class="chip-grid grid-1" id="urg-chips"></div>
  `;

  // Specialty chips
  const specGrid = document.getElementById('specialty-chips');
  const allSpecs = [...SPECIALTIES, ...(state.customOptions['specialty'] || []).map(o => o.value)];
  allSpecs.forEach(sp => {
    const chip = makeChip(sp, entry.specialty === sp);
    chip.addEventListener('click', () => {
      state.wizard.entry.specialty = sp;
      specGrid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      updateProcAutocomplete('');
      document.getElementById('proc-input').value = '';
    });
    specGrid.appendChild(chip);
  });

  // Procedure autocomplete
  const procInput = document.getElementById('proc-input');
  const procDD    = document.getElementById('proc-dropdown');

  function updateProcAutocomplete(q) {
    const spec    = state.wizard.entry.specialty;
    const specProcs = spec ? (PROCEDURES[spec] || []) : [];
    const custom  = allCustom;
    let matches;
    if (!q) {
      matches = specProcs.length ? specProcs.slice(0, 20) : [];
    } else {
      const lq = q.toLowerCase();
      const specMatches  = specProcs.filter(p => p.toLowerCase().includes(lq));
      const otherMatches = Object.entries(PROCEDURES)
        .filter(([s]) => s !== spec)
        .flatMap(([s, ps]) => ps.filter(p => p.toLowerCase().includes(lq)).map(p => ({ p, s })));
      const customMatches = custom.filter(p => p.toLowerCase().includes(lq)).map(p => ({ p, s: 'Custom' }));
      matches = [
        ...specMatches.map(p => ({ p, s: spec })),
        ...otherMatches,
        ...customMatches,
      ].slice(0, 20);
    }
    if (!matches.length) { procDD.classList.add('hidden'); return; }
    procDD.innerHTML = '';
    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      const label  = typeof m === 'string' ? m : m.p;
      const source = typeof m === 'string' ? spec : m.s;
      item.innerHTML = `<div>${label}</div>${source && source !== spec ? `<div class="item-specialty">${source}</div>` : ''}`;
      item.addEventListener('mousedown', () => {
        state.wizard.entry.procedure = label;
        procInput.value = label;
        procDD.classList.add('hidden');
      });
      procDD.appendChild(item);
    });
    procDD.classList.remove('hidden');
  }

  procInput.addEventListener('input', e => {
    state.wizard.entry.procedure = e.target.value;
    updateProcAutocomplete(e.target.value);
  });
  procInput.addEventListener('focus', () => updateProcAutocomplete(procInput.value));
  procInput.addEventListener('blur', () => setTimeout(() => procDD.classList.add('hidden'), 150));

  // Urgency chips
  const urgGrid = document.getElementById('urg-chips');
  const urgClass = ['urg-elective','urg-urgent','urg-emergency','urg-immediate'];
  URGENCY_OPTIONS.forEach((opt, i) => {
    const chip = makeChip(opt, entry.urgency === opt, `chip ${urgClass[i]}`);
    chip.addEventListener('click', () => {
      state.wizard.entry.urgency = opt;
      chipAdvance();
    });
    urgGrid.appendChild(chip);
  });
}

function renderStepAnaesthesia(container, entry) {
  container.innerHTML = `
    <p class="step-title">Anaesthesia type</p>
    <p class="step-subtitle">Select all that apply</p>
    <div class="chip-grid grid-2" id="anaes-chips"></div>
    <p class="section-label">Maintenance</p>
    <div class="chip-grid grid-2" id="maint-chips"></div>
  `;

  const anaesGrid = document.getElementById('anaes-chips');
  ANAESTHESIA_TYPES.forEach(opt => {
    const sel = entry.anaesthesia_types.includes(opt);
    const chip = makeChip(opt, sel, sel ? 'chip selected-multi' : 'chip');
    chip.addEventListener('click', () => {
      const arr = state.wizard.entry.anaesthesia_types;
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(opt);
      chip.className = arr.includes(opt) ? 'chip selected-multi' : 'chip';
    });
    anaesGrid.appendChild(chip);
  });

  const maintGrid = document.getElementById('maint-chips');
  MAINTENANCE_OPTIONS.forEach(opt => {
    const chip = makeChip(opt, entry.maintenance === opt);
    chip.addEventListener('click', () => {
      state.wizard.entry.maintenance = opt;
      maintGrid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      chipAdvance();
    });
    maintGrid.appendChild(chip);
  });
}

function renderStepAirway(container, entry) {
  const customAirways = (state.customOptions['airway'] || []).map(o => o.value);
  const allAirways = [...AIRWAY_OPTIONS, ...customAirways];
  container.innerHTML = `
    <p class="step-title">Airway management</p>
    <p class="step-subtitle">Select all that apply</p>
    <div class="chip-grid grid-1" id="airway-chips"></div>
  `;
  const grid = document.getElementById('airway-chips');
  allAirways.forEach(opt => {
    const sel = entry.airway.includes(opt);
    const chip = makeChip(opt, sel, sel ? 'chip selected-multi' : 'chip');
    chip.addEventListener('click', () => {
      const arr = state.wizard.entry.airway;
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(opt);
      chip.className = arr.includes(opt) ? 'chip selected-multi' : 'chip';
    });
    grid.appendChild(chip);
  });
}

function renderStepProcedures(container, entry) {
  const customReg  = (state.customOptions['regional'] || []).map(o => o.value);
  const customProc = (state.customOptions['procedure_performed'] || []).map(o => o.value);
  container.innerHTML = `
    <p class="step-title">Procedures performed</p>
    <p class="section-label">Regional / Neuraxial techniques</p>
    <div class="chip-grid grid-2" id="regional-chips"></div>
    <p class="section-label">Additional procedures</p>
    <div class="chip-grid grid-2" id="addproc-chips"></div>
  `;
  const regGrid = document.getElementById('regional-chips');
  [...REGIONAL_OPTIONS, ...customReg].forEach(opt => {
    const sel = entry.regional_techniques.includes(opt);
    const chip = makeChip(opt, sel, sel ? 'chip selected-multi' : 'chip');
    chip.addEventListener('click', () => {
      const arr = state.wizard.entry.regional_techniques;
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(opt);
      chip.className = arr.includes(opt) ? 'chip selected-multi' : 'chip';
    });
    regGrid.appendChild(chip);
  });

  const addGrid = document.getElementById('addproc-chips');
  [...ADDITIONAL_PROCEDURES, ...customProc].forEach(opt => {
    const sel = entry.additional_procedures.includes(opt);
    const chip = makeChip(opt, sel, sel ? 'chip selected-multi' : 'chip');
    chip.addEventListener('click', () => {
      const arr = state.wizard.entry.additional_procedures;
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(opt);
      chip.className = arr.includes(opt) ? 'chip selected-multi' : 'chip';
    });
    addGrid.appendChild(chip);
  });
}

function renderStepSupervision(container, entry) {
  const supClass = ['sup-immediate','sup-local','sup-distant','sup-independent','sup-teaching'];
  container.innerHTML = `
    <p class="step-title">Supervision level</p>
    <div class="chip-grid grid-1" id="sup-chips"></div>
  `;
  const grid = document.getElementById('sup-chips');
  SUPERVISION_OPTIONS.forEach((opt, i) => {
    const chip = makeChip(opt, entry.supervision === opt, `chip ${supClass[i]}`);
    chip.addEventListener('click', () => {
      state.wizard.entry.supervision = opt;
      chipAdvance();
    });
    grid.appendChild(chip);
  });
}

function renderStepNotes(container, entry) {
  container.innerHTML = `
    <p class="step-title">Additional notes</p>
    <p class="step-subtitle">Optional — special circumstances, teaching points, etc.</p>
    <textarea id="w-notes" class="field-input" rows="6"
      style="resize:vertical;font-size:1rem"
      placeholder="e.g. Difficult intubation — grade 3 view, Gum-elastic bougie used…"
    >${entry.notes || ''}</textarea>
    <div style="margin-top:.75rem;text-align:center">
      <button id="save-template-quick" class="btn-secondary btn-sm">
        &#9881; Save as Template
      </button>
    </div>
  `;
  document.getElementById('w-notes').addEventListener('input', e => {
    state.wizard.entry.notes = e.target.value;
  });
  document.getElementById('save-template-quick').addEventListener('click', openTemplateSaveModal);
}

function renderStepReview(container, entry) {
  const rows = [
    ['Date',         formatDate(entry.date)],
    ['Session',      entry.time_of_day],
    ['Hospital',     entry.hospital || '—'],
    ['Age',          entry.patient_age !== null ? `${entry.patient_age} ${entry.age_unit}` : '—'],
    ['ASA',          entry.asa ? `ASA ${entry.asa}` : '—'],
    ['Specialty',    entry.specialty || '—'],
    ['Procedure',    entry.procedure || '—'],
    ['Urgency',      entry.urgency || '—'],
    ['Anaesthesia',  entry.anaesthesia_types.join(', ') || '—'],
    ['Maintenance',  entry.maintenance || '—'],
    ['Airway',       entry.airway.join(', ') || '—'],
    ['Regional',     entry.regional_techniques.join(', ') || '—'],
    ['Procedures',   entry.additional_procedures.join(', ') || '—'],
    ['Supervision',  entry.supervision || '—'],
    ['Notes',        entry.notes || '—'],
  ];
  container.innerHTML = `
    <p class="step-title">${state.wizard.editingId ? 'Review edits' : 'Review & submit'}</p>
    <div class="review-card">
      ${rows.map(([k, v]) => `
        <div class="review-row">
          <span class="review-key">${k}</span>
          <span class="review-val">${v}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function submitEntry() {
  const entry = { ...state.wizard.entry, updated_at: new Date().toISOString() };
  const isEdit = !!state.wizard.editingId;

  if (isEdit) {
    const idx = state.entries.findIndex(e => e.id === state.wizard.editingId);
    if (idx >= 0) state.entries[idx] = entry;
    else state.entries.unshift(entry);
  } else {
    entry.created_at = new Date().toISOString();
    state.entries.unshift(entry);
  }

  LS.set('entries', state.entries);

  if (state.token) {
    try {
      if (isEdit) await apiFetch('PUT', `/entries/${entry.id}`, entry);
      else         await apiFetch('POST', '/entries', entry);
      setSyncStatus('synced');
    } catch {
      entry._pending = true;
      setSyncStatus('offline');
    }
  }

  toast(isEdit ? 'Entry updated ✓' : 'Case logged ✓');
  resetWizardEntry();
  renderWizardStep();
  renderQuickbar();
}

// ── Helper: make chip element ─────────────────────────────────────────────────

function makeChip(label, selected, className) {
  const el = document.createElement('div');
  el.className = className || ('chip' + (selected ? ' selected' : ''));
  el.textContent = label;
  if (selected && !className) el.classList.add('selected');
  return el;
}

// ── Template quickbar ─────────────────────────────────────────────────────────

function renderQuickbar() {
  const bar   = document.getElementById('template-quickbar');
  const chips = document.getElementById('quickbar-chips');
  if (!state.templates.length) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  chips.innerHTML = '';
  state.templates.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className   = 'quickbar-chip';
    btn.textContent = tpl.name;
    btn.addEventListener('click', () => loadTemplate(tpl));
    chips.appendChild(btn);
  });
}

function loadTemplate(tpl) {
  const d = tpl.data;
  state.wizard.entry = {
    id:                   uuid(),
    date:                 todayISO(),
    time_of_day:          autoTimeOfDay(),
    hospital:             d.hospital || state.user?.hospital || '',
    patient_age:          null,
    age_unit:             'years',
    asa:                  '',
    specialty:            d.specialty || '',
    procedure:            d.procedure || '',
    urgency:              d.urgency || '',
    anaesthesia_types:    d.anaesthesia_types || [],
    maintenance:          d.maintenance || '',
    airway:               d.airway || [],
    regional_techniques:  d.regional_techniques || [],
    additional_procedures:d.additional_procedures || [],
    supervision:          d.supervision || '',
    notes:                '',
  };
  state.wizard.step = 1; // skip to patient (date auto-filled)
  state.wizard.editingId = null;
  renderWizardStep();
  showView('log');
  toast(`Template "${tpl.name}" loaded — add patient details`);
}

// ── History view ──────────────────────────────────────────────────────────────

function getFilteredEntries() {
  const f = state.historyFilter;
  return state.entries.filter(e => {
    if (f.specialty && e.specialty !== f.specialty) return false;
    if (f.urgency   && e.urgency   !== f.urgency)   return false;
    if (f.from      && e.date < f.from)              return false;
    if (f.to        && e.date > f.to)                return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${e.procedure} ${e.specialty} ${e.hospital} ${e.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderHistory() {
  // Populate filter dropdowns
  const specSel = document.getElementById('filter-specialty');
  const urgSel  = document.getElementById('filter-urgency');
  if (specSel.children.length === 1) {
    SPECIALTIES.forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; specSel.appendChild(o);
    });
    URGENCY_OPTIONS.forEach(u => {
      const o = document.createElement('option'); o.value = u; o.textContent = u; urgSel.appendChild(o);
    });
  }

  const entries = getFilteredEntries();
  const list = document.getElementById('history-list');

  if (!entries.length) {
    list.innerHTML = `
      <div class="history-empty">
        <div class="empty-icon">📋</div>
        <p>${state.entries.length ? 'No entries match your filter' : 'No cases logged yet — tap + Log to start'}</p>
      </div>`;
    return;
  }

  // Group by date
  const byDate = {};
  entries.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  list.innerHTML = '';
  Object.entries(byDate).sort(([a],[b]) => b.localeCompare(a)).forEach(([date, es]) => {
    const header = document.createElement('div');
    header.style.cssText = 'padding:.4rem .5rem .2rem;font-size:.78rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px';
    header.textContent = formatDate(date);
    list.appendChild(header);
    es.forEach(e => list.appendChild(makeEntryCard(e)));
  });
}

function makeEntryCard(e) {
  const card = document.createElement('div');
  const urgKey = (e.urgency || '').split(' ')[0].toLowerCase();
  card.className = `entry-card urg-${urgKey}`;
  const badgeASA = e.asa ? `<span class="entry-badge badge-asa-${e.asa.replace('E','')?.charAt(0)}">ASA ${e.asa}</span>` : '';
  const supKey = e.supervision ? e.supervision.split(' ')[0].toLowerCase() : '';
  const badgeSup = e.supervision ? `<span class="entry-badge badge-sup-${supKey}">${e.supervision.split(' ')[0]}</span>` : '';
  const badgeSpec = e.specialty ? `<span class="entry-badge">${e.specialty}</span>` : '';
  const badgeTOD  = e.time_of_day ? `<span class="entry-badge">${e.time_of_day.split(' ')[0]}</span>` : '';
  card.innerHTML = `
    <div class="entry-card-top">
      <span class="entry-procedure">${e.procedure || 'Unlabelled'}</span>
      <span class="entry-date">${e.time_of_day?.split(' ')[0] || ''}</span>
    </div>
    <div class="entry-meta">
      ${badgeSpec}${badgeASA}${e.urgency ? `<span class="entry-badge">${e.urgency.split(' ')[0]}</span>` : ''}${badgeSup}
      ${(e.airway||[]).map(a => `<span class="entry-badge">${abbreviateAirway(a)}</span>`).join('')}
    </div>`;
  card.addEventListener('click', () => openEntryModal(e));
  return card;
}

function abbreviateAirway(a) {
  if (a.includes('direct')) return 'Direct ETT';
  if (a.includes('video'))  return 'Video ETT';
  if (a.includes('awake'))  return 'Awake FOI';
  if (a.includes('LMA') || a.includes('i-gel') || a.includes('ProSeal') || a.includes('Supreme')) return 'SGA';
  if (a.includes('mask'))   return 'Face mask';
  if (a.includes('None'))   return '';
  return a.split(' ')[0];
}

// History search / filter
document.getElementById('history-search').addEventListener('input', e => {
  state.historyFilter.search = e.target.value;
  renderHistory();
});
document.getElementById('filter-specialty').addEventListener('change', e => {
  state.historyFilter.specialty = e.target.value; renderHistory();
});
document.getElementById('filter-urgency').addEventListener('change', e => {
  state.historyFilter.urgency = e.target.value; renderHistory();
});
document.getElementById('filter-from').addEventListener('change', e => {
  state.historyFilter.from = e.target.value; renderHistory();
});
document.getElementById('filter-to').addEventListener('change', e => {
  state.historyFilter.to = e.target.value; renderHistory();
});
document.getElementById('history-filter-btn').addEventListener('click', () => {
  document.getElementById('history-filter-panel').classList.toggle('hidden');
});

// ── Entry detail modal ────────────────────────────────────────────────────────

let _modalEntryId = null;

function openEntryModal(entry) {
  _modalEntryId = entry.id;
  document.getElementById('modal-entry-title').textContent = entry.procedure || 'Case Details';

  const details = [
    ['Date',        formatDate(entry.date)],
    ['Session',     entry.time_of_day],
    ['Hospital',    entry.hospital],
    ['Age',         entry.patient_age !== null ? `${entry.patient_age} ${entry.age_unit}` : '—'],
    ['ASA',         entry.asa ? `ASA ${entry.asa}` : '—'],
    ['Specialty',   entry.specialty],
    ['Urgency',     entry.urgency],
    ['Anaesthesia', (entry.anaesthesia_types||[]).join(', ')],
    ['Maintenance', entry.maintenance],
    ['Airway',      (entry.airway||[]).join(', ')],
    ['Regional',    (entry.regional_techniques||[]).join(', ')],
    ['Procedures',  (entry.additional_procedures||[]).join(', ')],
    ['Supervision', entry.supervision],
    ['Notes',       entry.notes],
  ].filter(([, v]) => v);

  document.getElementById('modal-entry-body').innerHTML = `
    <div class="entry-detail-header">
      <div class="entry-detail-procedure">${entry.procedure || 'Case'}</div>
      <div class="entry-detail-date">${formatDate(entry.date)} &bull; ${entry.hospital || ''}</div>
    </div>
    <div class="entry-detail-grid">
      ${details.map(([k, v]) => `
        <div class="detail-item${['Regional','Procedures','Airway','Anaesthesia','Notes'].includes(k) ? ' detail-full' : ''}">
          <div class="detail-item-key">${k}</div>
          <div class="detail-item-val">${v}</div>
        </div>`).join('')}
    </div>`;

  openModal('modal-entry');
}

document.getElementById('modal-entry-edit').addEventListener('click', () => {
  const entry = state.entries.find(e => e.id === _modalEntryId);
  if (!entry) return;
  state.wizard.entry = JSON.parse(JSON.stringify(entry));
  state.wizard.editingId = entry.id;
  state.wizard.step = 0;
  closeModal('modal-entry');
  showView('log');
  renderWizardStep();
});

document.getElementById('modal-entry-delete').addEventListener('click', async () => {
  if (!confirm('Delete this entry?')) return;
  state.entries = state.entries.filter(e => e.id !== _modalEntryId);
  LS.set('entries', state.entries);
  if (state.token) apiFetch('DELETE', `/entries/${_modalEntryId}`).catch(() => {});
  closeModal('modal-entry');
  renderHistory();
  toast('Entry deleted');
});

// ── Templates view ────────────────────────────────────────────────────────────

document.getElementById('new-template-btn').addEventListener('click', openTemplateSaveModal);

function openTemplateSaveModal(existingTpl) {
  const isEdit = existingTpl && existingTpl.id;
  document.getElementById('template-modal-title').textContent = isEdit ? 'Edit Template' : 'Save Template';
  const entry = isEdit ? existingTpl.data : state.wizard.entry;
  const tplId = isEdit ? existingTpl.id : null;

  document.getElementById('template-modal-body').innerHTML = `
    <div class="field-group">
      <label>Template Name</label>
      <input type="text" id="tpl-name" class="field-input" placeholder="e.g. Lap Appendix, LSCS, THR…"
             value="${isEdit ? existingTpl.name : ''}">
    </div>
    <p class="step-subtitle">Fields below will be pre-filled when you load this template.
    Age, ASA, supervision and notes are always left blank for you to fill in.</p>
    <div class="field-group">
      <label>Hospital</label>
      <input type="text" id="tpl-hospital" class="field-input" value="${entry.hospital || ''}">
    </div>
    <div class="field-row">
      <div class="field-group">
        <label>Specialty</label>
        <input type="text" id="tpl-specialty" class="field-input" value="${entry.specialty || ''}">
      </div>
      <div class="field-group">
        <label>Procedure</label>
        <input type="text" id="tpl-procedure" class="field-input" value="${entry.procedure || ''}">
      </div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label>Urgency</label>
        <select id="tpl-urgency" class="field-input">
          <option value="">—</option>
          ${URGENCY_OPTIONS.map(u => `<option ${entry.urgency===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <label>Maintenance</label>
        <select id="tpl-maintenance" class="field-input">
          <option value="">—</option>
          ${MAINTENANCE_OPTIONS.map(m => `<option ${entry.maintenance===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  document.getElementById('save-template-btn').onclick = async () => {
    const name = document.getElementById('tpl-name').value.trim();
    if (!name) { alert('Please enter a template name'); return; }
    const data = {
      hospital:             document.getElementById('tpl-hospital').value.trim(),
      specialty:            document.getElementById('tpl-specialty').value.trim(),
      procedure:            document.getElementById('tpl-procedure').value.trim(),
      urgency:              document.getElementById('tpl-urgency').value,
      maintenance:          document.getElementById('tpl-maintenance').value,
      anaesthesia_types:    entry.anaesthesia_types || [],
      airway:               entry.airway || [],
      regional_techniques:  entry.regional_techniques || [],
      additional_procedures:entry.additional_procedures || [],
    };
    if (isEdit && tplId) {
      const idx = state.templates.findIndex(t => t.id === tplId);
      state.templates[idx] = { ...state.templates[idx], name, data };
      if (state.token) apiFetch('PUT', `/templates/${tplId}`, { name, data }).catch(() => {});
    } else {
      const tpl = { id: uuid(), name, data };
      state.templates.push(tpl);
      if (state.token) apiFetch('POST', '/templates', { name, data }).catch(() => {});
    }
    LS.set('templates', state.templates);
    closeModal('modal-template');
    renderTemplates();
    renderQuickbar();
    toast(`Template "${name}" saved ✓`);
  };

  openModal('modal-template');
}

function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  if (!state.templates.length) {
    grid.innerHTML = `
      <div class="templates-empty" style="grid-column:1/-1">
        <div class="empty-icon">⚙️</div>
        <p>No templates yet.<br>Log a case, then save it as a template for one-tap reuse.</p>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  state.templates.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'template-card';
    const d = tpl.data;
    card.innerHTML = `
      <div class="template-name">${tpl.name}</div>
      <div class="template-desc">${[d.specialty, d.procedure].filter(Boolean).join(' — ') || 'Custom template'}</div>
      <div class="template-desc" style="margin-top:.2rem">${d.urgency||''} ${d.maintenance||''}</div>
      <div class="template-actions">
        <button class="template-action-btn load-tpl" data-id="${tpl.id}">Load</button>
        <button class="template-action-btn edit-tpl" data-id="${tpl.id}">Edit</button>
        <button class="template-action-btn danger del-tpl" data-id="${tpl.id}">Del</button>
      </div>`;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.load-tpl').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tpl = state.templates.find(t => t.id === btn.dataset.id);
      if (tpl) loadTemplate(tpl);
    });
  });
  grid.querySelectorAll('.edit-tpl').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tpl = state.templates.find(t => t.id === btn.dataset.id);
      if (tpl) openTemplateSaveModal(tpl);
    });
  });
  grid.querySelectorAll('.del-tpl').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete template?')) return;
      const id = btn.dataset.id;
      state.templates = state.templates.filter(t => t.id !== id);
      LS.set('templates', state.templates);
      if (state.token) apiFetch('DELETE', `/templates/${id}`).catch(() => {});
      renderTemplates();
      renderQuickbar();
      toast('Template deleted');
    });
  });
}

// ── Custom options ────────────────────────────────────────────────────────────

function renderCustomOptions() {
  const cat   = document.getElementById('custom-category').value;
  const list  = document.getElementById('custom-options-list');
  const items = state.customOptions[cat] || [];
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<p class="text-muted" style="font-size:.875rem;padding:.5rem 0">No custom options yet for this category.</p>';
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'custom-option-row';
    row.innerHTML = `
      <span class="custom-option-val">${item.value}</span>
      <button class="custom-option-del" data-id="${item.id}" data-cat="${cat}">&#10005;</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll('.custom-option-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id  = btn.dataset.id;
      const cat = btn.dataset.cat;
      state.customOptions[cat] = (state.customOptions[cat] || []).filter(o => o.id !== id);
      LS.set('customOptions', state.customOptions);
      if (state.token) apiFetch('DELETE', `/custom-options/${id}`).catch(() => {});
      renderCustomOptions();
    });
  });
}

document.getElementById('custom-category').addEventListener('change', renderCustomOptions);

document.getElementById('custom-add-btn').addEventListener('click', async () => {
  const cat   = document.getElementById('custom-category').value;
  const value = document.getElementById('custom-value').value.trim();
  if (!value) return;
  const id = uuid();
  if (!state.customOptions[cat]) state.customOptions[cat] = [];
  state.customOptions[cat].push({ id, value });
  LS.set('customOptions', state.customOptions);
  if (state.token) apiFetch('POST', '/custom-options', { category: cat, value }).catch(() => {});
  document.getElementById('custom-value').value = '';
  renderCustomOptions();
  toast('Option added');
});

// ── Reports / ARCP ────────────────────────────────────────────────────────────

// Set default date range to current training year (Aug–Aug)
function initReportDates() {
  const now   = new Date();
  const year  = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  document.getElementById('report-from').value = `${year}-08-01`;
  document.getElementById('report-to').value   = `${year + 1}-07-31`;
}

document.getElementById('report-generate-btn').addEventListener('click', renderReports);
document.getElementById('export-btn').addEventListener('click', () => {
  const text = generateARCPText();
  document.getElementById('export-text').textContent = text;
  openModal('modal-export');
});
document.getElementById('copy-export-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('export-text').textContent)
    .then(() => toast('Copied to clipboard ✓'))
    .catch(() => toast('Could not copy — please select and copy manually'));
});
document.getElementById('print-export-btn').addEventListener('click', () => window.print());

function renderReports() {
  const from = document.getElementById('report-from').value;
  const to   = document.getElementById('report-to').value;
  const entries = state.entries.filter(e => (!from || e.date >= from) && (!to || e.date <= to));
  const out = document.getElementById('report-output');

  if (!entries.length) {
    out.innerHTML = '<div class="history-empty"><div class="empty-icon">📊</div><p>No entries in selected date range</p></div>';
    return;
  }

  const n = entries.length;

  out.innerHTML = `
    ${reportSection('Total Cases', `<div class="report-total">${n}</div><div class="report-total-label">cases logged</div>`)}
    ${barSection('By Specialty', count(entries, 'specialty'), n)}
    ${barSection('By Urgency', count(entries, 'urgency'), n)}
    ${barSection('ASA Grade', count(entries, 'asa', v => `ASA ${v}`), n)}
    ${barSection('Session', count(entries, 'time_of_day'), n)}
    ${barSection('Supervision', count(entries, 'supervision'), n)}
    ${barSection('Maintenance', count(entries, 'maintenance'), n)}
    ${multiBarSection('Airway Management', countMulti(entries, 'airway'), n)}
    ${multiBarSection('Regional / Neuraxial', countMulti(entries, 'regional_techniques'), n)}
    ${multiBarSection('Additional Procedures', countMulti(entries, 'additional_procedures'), n)}
  `;
}

function reportSection(title, body) {
  return `<div class="report-section"><h3>${title}</h3>${body}</div>`;
}

function barSection(title, counts, total) {
  const rows = Object.entries(counts)
    .sort(([,a],[,b]) => b - a)
    .map(([k, v]) => statRow(k, v, total))
    .join('');
  return reportSection(title, rows || '<p class="text-muted">No data</p>');
}

function multiBarSection(title, counts, total) {
  const rows = Object.entries(counts)
    .sort(([,a],[,b]) => b - a)
    .map(([k, v]) => statRow(k, v, total, false))
    .join('');
  return reportSection(title, rows || '<p class="text-muted">None recorded</p>');
}

function statRow(label, val, total, showPct = true) {
  const pct = total ? Math.round((val / total) * 100) : 0;
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%"></div></div>
      <span class="stat-val">${val}</span>
      ${showPct ? `<span class="stat-pct">${pct}%</span>` : ''}
    </div>`;
}

function count(entries, field, labelFn) {
  const map = {};
  entries.forEach(e => {
    const v = e[field];
    if (!v) return;
    const k = labelFn ? labelFn(v) : v;
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function countMulti(entries, field) {
  const map = {};
  entries.forEach(e => {
    (e[field] || []).forEach(v => {
      if (v) map[v] = (map[v] || 0) + 1;
    });
  });
  return map;
}

// ── ARCP text export ──────────────────────────────────────────────────────────

function generateARCPText() {
  const from = document.getElementById('report-from').value;
  const to   = document.getElementById('report-to').value;
  const entries = state.entries.filter(e => (!from || e.date >= from) && (!to || e.date <= to));
  const u = state.user || {};
  const n = entries.length;

  function pct(v) { return n ? ` (${Math.round((v/n)*100)}%)` : ''; }
  function tally(map) {
    return Object.entries(map).sort(([,a],[,b])=>b-a)
      .map(([k,v]) => `    ${k}: ${v}${pct(v)}`).join('\n');
  }
  function tallyMulti(map) {
    return Object.entries(map).sort(([,a],[,b])=>b-a)
      .map(([k,v]) => `    ${k}: ${v}`).join('\n') || '    None recorded';
  }

  const specMap  = count(entries, 'specialty');
  const urgMap   = count(entries, 'urgency');
  const asaMap   = count(entries, 'asa', v => `ASA ${v}`);
  const supMap   = count(entries, 'supervision');
  const maintMap = count(entries, 'maintenance');
  const airMap   = countMulti(entries, 'airway');
  const regMap   = countMulti(entries, 'regional_techniques');
  const addMap   = countMulti(entries, 'additional_procedures');

  const lines = [
    '═'.repeat(60),
    '  ANAESTHETIC LOGBOOK — ARCP SUMMARY',
    '═'.repeat(60),
    `  Name:        ${u.name || '—'}`,
    `  GMC Number:  ${u.gmc_number || '—'}`,
    `  Period:      ${formatDate(from)} – ${formatDate(to)}`,
    `  Generated:   ${new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}`,
    '─'.repeat(60),
    '',
    `TOTAL CASES LOGGED: ${n}`,
    '',
    '─'.repeat(60),
    'SPECIALTY BREAKDOWN',
    '─'.repeat(60),
    tally(specMap) || '  None',
    '',
    '─'.repeat(60),
    'URGENCY',
    '─'.repeat(60),
    tally(urgMap) || '  None',
    '',
    '─'.repeat(60),
    'ASA GRADE DISTRIBUTION',
    '─'.repeat(60),
    tally(asaMap) || '  None',
    '',
    '─'.repeat(60),
    'SESSION',
    '─'.repeat(60),
    tally(count(entries,'time_of_day')) || '  None',
    '',
    '─'.repeat(60),
    'AIRWAY MANAGEMENT',
    '─'.repeat(60),
    tallyMulti(airMap),
    '',
    '─'.repeat(60),
    'REGIONAL & NEURAXIAL TECHNIQUES',
    '─'.repeat(60),
    tallyMulti(regMap),
    '',
    '─'.repeat(60),
    'ADDITIONAL PROCEDURES',
    '─'.repeat(60),
    tallyMulti(addMap),
    '',
    '─'.repeat(60),
    'MAINTENANCE',
    '─'.repeat(60),
    tally(maintMap) || '  None',
    '',
    '─'.repeat(60),
    'SUPERVISION LEVELS',
    '─'.repeat(60),
    tally(supMap) || '  None',
    '',
    '═'.repeat(60),
    '  Generated by AnaesLog — anaesthetic-logbook',
    '═'.repeat(60),
  ];
  return lines.join('\n');
}

// ── Nav ───────────────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const token = LS.get('token');
  const user  = LS.get('user');
  initReportDates();

  if (token) {
    state.token = token;
    state.user  = user;
    showApp();
    showView('log');
    loadData();
  } else {
    showAuthScreen();
  }
}

init();
