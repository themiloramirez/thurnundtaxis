(function () {
  const state = {
    lang: 'es',
    agent: null,
    answers: {},
    flow: [],
    stepIndex: -1,
    started: false,
    multiSelected: new Set(),
  };

  // Orden principal del árbol (rama estable, sin tránsito)
  const MAIN_FLOW = [
    'q0_transit',
    'q1_status',
    'q2_country',
    'q3_country',
    'q3b_commute',
    'q4_income_sources',
    'q5_marital',
    'q5b_spouse_status',
  ];
  // Sub-rama de tránsito (opcional)
  const TRANSIT_FLOW = ['q0_transit', 't1_direction', 't2_timing', 't3_ties'];
  // Sub-rama de verificación "accidental american" (se inyecta condicionalmente)
  const ACCIDENTAL_CHECK = 'q1c_accidental';

  const els = {};
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    els.launcher = document.getElementById('chat-launcher');
    els.window = document.getElementById('chat-window');
    els.close = document.getElementById('chat-close');
    els.messages = document.getElementById('chat-messages');
    els.options = document.getElementById('chat-options');
    els.multiConfirm = document.getElementById('chat-multi-confirm');
    els.multiConfirmBtn = document.getElementById('chat-multi-confirm-btn');
    els.textRow = document.getElementById('chat-textinput-row');
    els.textInput = document.getElementById('chat-textinput');
    els.textSend = document.getElementById('chat-textinput-send');
    els.progressTrack = document.getElementById('progress-track');
    els.progressCount = document.getElementById('progress-count');
    els.progressLabelText = document.getElementById('progress-label-text');
    els.agentName = document.getElementById('agent-name-display');
    els.agentSub = document.getElementById('agent-sub-display');
    els.footerNote = document.getElementById('chat-footer-note');

    // Asignar asesor al azar por sesión
    const pair = AGENTS[state.lang];
    state.agent = pair[Math.floor(Math.random() * pair.length)];

    els.launcher.addEventListener('click', openChat);
    els.close.addEventListener('click', () => els.window.classList.remove('open'));
    els.textSend.addEventListener('click', submitTextAnswer);
    els.textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTextAnswer(); });
    els.multiConfirmBtn.addEventListener('click', confirmMultiSelect);

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchLang(btn.dataset.lang));
    });

    renderProgress();
    updateAgentHeader();
  }

  function updateAgentHeader() {
    els.agentName.textContent = state.agent.name.toUpperCase();
    els.agentSub.textContent = state.agent.sub;
    els.footerNote.textContent = UI[state.lang].footerNote;
  }

  function switchLang(lang) {
    if (lang === state.lang) return;
    // Re-mapear el agente al equivalente del nuevo idioma (mismo índice = mismo "actor")
    const oldPair = AGENTS[state.lang];
    const idx = oldPair.findIndex((a) => a.name === state.agent.name);
    state.lang = lang;
    state.agent = AGENTS[lang][idx === -1 ? 0 : idx];

    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    updateAgentHeader();

    const qid = currentQuestionId();
    if (!qid) return; // cuestionario ya terminado (pantalla de cotización o formulario) — nada que re-renderizar

    // Si ya está en curso, no re-traducimos el historial (sería ruidoso) —
    // solo avisamos en el idioma nuevo y seguimos desde la pregunta actual.
    addAgentMessage(
      state.lang === 'es' ? 'Continuamos en español.' :
      state.lang === 'en' ? 'Continuing in English.' :
      'On continue en français.'
    );
    // Re-renderizamos la pregunta actual (no avanzamos el índice) para
    // que las opciones aparezcan traducidas al nuevo idioma.
    renderOptionsFor(qid, QUESTION_COPY[qid]);
  }

  function openChat() {
    els.window.classList.add('open');
    if (!state.welcomed) {
      state.welcomed = true;
      showWelcome();
    }
  }

  function showWelcome() {
    addAgentMessage(UI[state.lang].welcome(state.agent.name));
    els.options.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = UI[state.lang].startBtn;
    btn.addEventListener('click', () => {
      els.options.innerHTML = '';
      beginFlow();
    });
    els.options.appendChild(btn);
  }

  function beginFlow() {
    state.started = true;
    state.flow = MAIN_FLOW.slice();
    state.stepIndex = 0;
    renderCurrentStep();
  }

  function totalStepsEstimate() {
    // Estimación de pasos totales para la barra de progreso (varía según rama)
    if (state.answers.q0_transit === 'yes') return TRANSIT_FLOW.length;
    let n = MAIN_FLOW.length;
    if (state.answers.q5_marital && state.answers.q5_marital !== 'married') n -= 1; // se salta q5b
    if (state.answers.q2_country && state.answers.q3_country && state.answers.q2_country === state.answers.q3_country) n -= 1; // se salta q3b
    return n;
  }

  function renderProgress() {
    const total = state.started ? totalStepsEstimate() : 8;
    const done = Math.min(state.stepIndex, total);
    els.progressLabelText.textContent = UI[state.lang].progressLabel;
    els.progressCount.textContent = `${Math.max(done, 0)} / ${total}`;
    els.progressTrack.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'progress-cell' + (i < done ? ' filled' : '');
      els.progressTrack.appendChild(cell);
    }
  }

  function currentQuestionId() {
    if (state.stepIndex < 0 || state.stepIndex >= state.flow.length) return null;
    return state.flow[state.stepIndex];
  }

  function renderCurrentStep() {
    const qid = currentQuestionId();
    if (!qid) { finishFlow(); return; }

    // Saltos condicionales
    if (qid === 'q3b_commute' && state.answers.q2_country && state.answers.q3_country && state.answers.q2_country === state.answers.q3_country) {
      advanceStep();
      return;
    }
    if (qid === 'q5b_spouse_status' && state.answers.q5_marital !== 'married') {
      advanceStep();
      return;
    }

    const qcopy = QUESTION_COPY[qid];
    renderProgress();
    showTyping(() => {
      addAgentMessage(qcopy.text[state.lang]);
      renderOptionsFor(qid, qcopy);
    });
  }

  function advanceStep() {
    state.stepIndex += 1;
    renderCurrentStep();
  }

  function renderOptionsFor(qid, qcopy) {
    els.options.innerHTML = '';
    els.multiConfirm.style.display = 'none';
    els.textRow.style.display = 'none';
    state.multiSelected = new Set();

    if (qcopy.multi) {
      Object.entries(qcopy.options).forEach(([key, labels]) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = labels[state.lang];
        btn.addEventListener('click', () => {
          if (state.multiSelected.has(key)) {
            state.multiSelected.delete(key);
            btn.classList.remove('multi-selected');
          } else {
            state.multiSelected.add(key);
            btn.classList.add('multi-selected');
          }
        });
        els.options.appendChild(btn);
      });
      els.multiConfirm.style.display = 'block';
      return;
    }

    Object.entries(qcopy.options).forEach(([key, labels]) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = labels[state.lang];
      btn.addEventListener('click', () => selectSingle(qid, key, labels[state.lang]));
      els.options.appendChild(btn);
    });
  }

  function confirmMultiSelect() {
    const qid = currentQuestionId();
    const values = Array.from(state.multiSelected);
    const qcopy = QUESTION_COPY[qid];
    const labelText = values.length
      ? values.map((v) => qcopy.options[v][state.lang]).join(', ')
      : (state.lang === 'es' ? 'Ninguna aplica' : state.lang === 'en' ? 'None apply' : 'Aucune ne s\'applique');

    addUserMessage(labelText);
    state.answers.q4_income_sources = values;
    els.options.innerHTML = '';
    els.multiConfirm.style.display = 'none';

    afterAnswerHook(qid);
    advanceStep();
  }

  function selectSingle(qid, key, label) {
    addUserMessage(label);
    recordAnswer(qid, key);
    els.options.innerHTML = '';

    afterAnswerHook(qid);
    advanceStep();
  }

  function recordAnswer(qid, value) {
    const map = {
      q0_transit: 'q0_transit',
      q1_status: 'q1_status',
      q1c_accidental: 'q1c_accidental',
      q2_country: 'q2_country',
      q3_country: 'q3_country',
      q3b_commute: 'q3b_commute',
      q5_marital: 'q5_marital',
      q5b_spouse_status: 'q5b_spouse_status',
      t1_direction: 't1_direction',
      t2_timing: 't2_timing',
      t3_ties: 't3_ties',
    };
    state.answers[map[qid] || qid] = value;
  }

  function afterAnswerHook(qid) {
    // Bifurcación: si contesta "sí" a tránsito, reemplazamos el flujo entero
    if (qid === 'q0_transit' && state.answers.q0_transit === 'yes') {
      addAgentMessage(UI[state.lang].transitMessage);
      state.flow = TRANSIT_FLOW.slice();
      state.stepIndex = 0; // advanceStep() suma +1 después de este hook, dejando el índice en 1 (t1_direction)
      return;
    }

    // Inyectar chequeo de accidental american si detectamos que va camino a "fuera de scope"
    if (qid === 'q3_country') {
      const willBeDomesticCanCandidate =
        state.answers.q1_status === 'canadian_citizen' &&
        state.answers.q2_country === 'CA' &&
        state.answers.q3_country === 'CA';
      if (willBeDomesticCanCandidate && !state.flow.includes(ACCIDENTAL_CHECK)) {
        // Insertamos la pregunta justo después de la posición actual
        state.flow.splice(state.stepIndex + 1, 0, ACCIDENTAL_CHECK);
      }
    }

    // Pequeño ack de validación tipo "Registrado" antes de la siguiente pregunta
    addAgentMessage(UI[state.lang].validated, true);
  }

  function submitTextAnswer() {
    const val = els.textInput.value.trim();
    if (!val) return;
    addUserMessage(val);
    els.textInput.value = '';
    // Texto libre no mapeado al árbol — lo confirmamos y seguimos
    addAgentMessage(UI[state.lang].validated, true);
  }

  function showTyping(callback) {
    const row = document.createElement('div');
    row.className = 'msg-row from-agent';
    row.innerHTML = '<div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    els.messages.appendChild(row);
    els.messages.scrollTop = els.messages.scrollHeight;
    setTimeout(() => {
      row.remove();
      callback();
    }, 450);
  }

  function addAgentMessage(text, validated) {
    const row = document.createElement('div');
    row.className = 'msg-row from-agent';
    const cls = validated ? 'msg-bubble validated' : 'msg-bubble';
    const checkPrefix = validated ? '<span class="check-mark">&#10003;</span> ' : '';
    row.innerHTML = `<div class="msg-label">${state.agent.name.toUpperCase()}</div><div class="${cls}">${checkPrefix}${escapeHtml(text)}</div>`;
    els.messages.appendChild(row);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function addUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'msg-row from-user';
    row.innerHTML = `<div class="msg-label">${UI[state.lang].userLabel}</div><div class="msg-bubble">${escapeHtml(text)}</div>`;
    els.messages.appendChild(row);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function finishFlow() {
    renderProgress();
    const classification = classify(state.answers);
    const catLabel = CATEGORY_LABELS[classification.category.id][state.lang];

    showTyping(() => {
      if (classification.category.id === 'out_of_scope') {
        addAgentMessage(UI[state.lang].outOfScope, false);
        document.querySelector('#chat-messages .from-agent:last-child .msg-bubble')?.classList.add('scope-warning');
        renderContactForm();
        return;
      }

      addAgentMessage(`${UI[state.lang].quoteIntro} ${catLabel}`);

      const quote = computeQuote(classification);
      if (quote) {
        showTyping(() => {
          addAgentMessage(UI[state.lang].quoteRange(quote.min, quote.max), true);
          showTyping(() => {
            addAgentMessage(UI[state.lang].quoteDisclaimer);
            renderContactForm();
          });
        });
      } else {
        renderContactForm();
      }
    });
  }

  function renderContactForm() {
    els.options.innerHTML = '';
    els.multiConfirm.style.display = 'none';
    els.textRow.style.display = 'none';

    showTyping(() => {
      addAgentMessage(UI[state.lang].contactFormIntro);

      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:10px 12px; display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border);';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = UI[state.lang].nameLabel;
      nameInput.style.cssText = 'background:var(--bg-msg); border:1px solid var(--border-strong); color:var(--bone); font-family:"Courier New",monospace; font-size:12px; padding:8px 10px; border-radius:2px;';

      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = UI[state.lang].emailLabel;
      emailInput.style.cssText = nameInput.style.cssText;

      const submitBtn = document.createElement('button');
      submitBtn.textContent = UI[state.lang].submitContact;
      submitBtn.style.cssText = 'background:var(--gold); color:#1a1608; border:none; font-family:"Courier New",monospace; font-size:12px; padding:9px; border-radius:2px; cursor:pointer;';
      submitBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        if (!name || !email) return;
        addUserMessage(`${name} — ${email}`);
        wrap.remove();
        showTyping(() => addAgentMessage(UI[state.lang].thankYou, true));
      });

      wrap.appendChild(nameInput);
      wrap.appendChild(emailInput);
      wrap.appendChild(submitBtn);

      const optionsParent = els.options.parentElement;
      optionsParent.insertBefore(wrap, els.options);
    });
  }
})();
