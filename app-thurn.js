(function () {
  // ============================================================
  // CONFIGURACIÓN DE API — Milo inyecta la key acá antes de cada demo.
  // Nunca subir este archivo a un repo público con la key puesta.
  // ============================================================
  const ANTHROPIC_API_KEY = ''; // <-- pegar la key acá antes de probar

  async function askClaude(systemPrompt, userMessage) {
    if (!ANTHROPIC_API_KEY) {
      return { error: true, text: '[Falta configurar la API key en app-thurn.js — ver ANTHROPIC_API_KEY al inicio del archivo]' };
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await response.json();
      if (data.error) {
        return { error: true, text: `[Error de API: ${data.error.message || 'desconocido'}]` };
      }
      const textBlock = (data.content || []).find((b) => b.type === 'text');
      return { error: false, text: textBlock ? textBlock.text : '[Sin respuesta de texto]' };
    } catch (e) {
      return { error: true, text: `[Error de red: ${e.message}]` };
    }
  }

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

  // Puntos de fricción donde ofrecemos "Cuéntenos más" en vez de forzar un botón
  const AI_ESCAPE_HATCH_QUESTIONS = new Set(['q1_status', 'q4_income_sources']);

  const TELL_US_MORE_LABEL = {
    es: 'Mi situación es distinta — cuéntenos',
    en: 'My situation is different — tell us',
    fr: 'Ma situation est différente — expliquez',
  };

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

      if (AI_ESCAPE_HATCH_QUESTIONS.has(qid)) {
        const aiBtn = document.createElement('button');
        aiBtn.className = 'tell-us-more-btn';
        aiBtn.innerHTML = TELL_US_MORE_LABEL[state.lang] + '<span class="ai-badge">AI</span>';
        aiBtn.addEventListener('click', () => openFreeTextFor(qid));
        els.options.appendChild(aiBtn);
      }
      return;
    }

    Object.entries(qcopy.options).forEach(([key, labels]) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = labels[state.lang];
      btn.addEventListener('click', () => selectSingle(qid, key, labels[state.lang]));
      els.options.appendChild(btn);
    });

    if (AI_ESCAPE_HATCH_QUESTIONS.has(qid)) {
      const aiBtn = document.createElement('button');
      aiBtn.className = 'tell-us-more-btn';
      aiBtn.innerHTML = TELL_US_MORE_LABEL[state.lang] + '<span class="ai-badge">AI</span>';
      aiBtn.addEventListener('click', () => openFreeTextFor(qid));
      els.options.appendChild(aiBtn);
    }
  }

  function openFreeTextFor(qid) {
    els.options.innerHTML = '';
    els.multiConfirm.style.display = 'none';
    els.textRow.style.display = 'flex';
    els.textInput.placeholder = UI[state.lang].typeAnswer;
    els.textInput.focus();
    state.pendingAIQuestion = qid; // marca que el próximo texto libre va a interpretación con IA
  }

  const VALID_INCOME_SOURCES = [
    'us_employment', 'ca_employment', 'us_self_employment', 'ca_self_employment',
    'us_investment', 'ca_investment_rrsp_tfsa', 'us_rental', 'ca_rental', 'pension_cpp_oas_ss',
  ];

  async function handleAIFreeText(qid, userText) {
    addUserMessage(userText);
    els.textRow.style.display = 'none';

    showTyping(async () => {
      const contextSummary = Object.entries(state.answers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`)
        .join(', ') || '(sin respuestas previas)';

      const isScopeReview = qid === 'out_of_scope_review';
      const langName = state.lang === 'es' ? 'español' : state.lang === 'en' ? 'inglés' : 'francés';

      // Si el escape hatch fue en la pregunta de fuentes de ingreso, necesitamos
      // que el array real (q4_income_sources) quede poblado, o classify() clasifica
      // mal el caso — no basta con guardar el texto libre como adorno.
      if (qid === 'q4_income_sources') {
        const extractionPrompt = `El cliente de una firma de impuestos cross-border US/Canadá describió sus fuentes de ingreso así: "${userText}". De esta lista cerrada, decime cuáles aplican: ${VALID_INCOME_SOURCES.join(', ')}. Respondé SOLO con un array JSON de los códigos que apliquen, sin texto adicional, sin markdown. Ejemplo de formato de respuesta: ["us_employment","ca_rental"]. Si ninguna aplica claramente, respondé [].`;
        const extraction = await askClaude('Sos un extractor de datos. Respondés únicamente JSON válido, nada más.', extractionPrompt);

        let extracted = [];
        try {
          const cleaned = extraction.text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            extracted = parsed.filter((v) => VALID_INCOME_SOURCES.includes(v));
          }
        } catch (e) {
          extracted = []; // si la extracción falla, seguimos sin flags de complejidad en vez de romper la clasificación
        }
        state.answers.q4_income_sources = extracted;
      }

      if (qid === 'q1_status') {
        const validStatuses = ['us_citizen', 'canadian_citizen', 'dual', 'green_card', 'other'];
        const extractionPrompt = `El cliente describió su estatus migratorio así: "${userText}". De esta lista cerrada, decime cuál aplica mejor: ${validStatuses.join(', ')}. Respondé SOLO con el código exacto, sin texto adicional, sin comillas, sin markdown. Si no está claro, respondé "other".`;
        const extraction = await askClaude('Sos un extractor de datos. Respondés únicamente el código solicitado, nada más.', extractionPrompt);
        const cleaned = extraction.text.replace(/```|"/g, '').trim();
        state.answers.q1_status = validStatuses.includes(cleaned) ? cleaned : 'other';
      }

      const systemPrompt = isScopeReview
        ? `Eres un asistente de intake fiscal para Thurn und Taxis, firma de preparación de impuestos cross-border US/Canadá. El cuestionario preliminar de un cliente no encontró ninguna conexión fiscal con Estados Unidos. El cliente va a describir su situación con más detalle. Tu trabajo es leer esa descripción y decir, en 2-3 frases en ${langName}: (a) si detectas alguna conexión US real que el cuestionario no capturó (nacimiento en US, padres US citizens, Green Card, ingresos/activos de fuente US), y (b) una recomendación breve de siguiente paso. No des cifras de cotización. Sé conciso, profesional y honesto — si genuinamente no hay conexión US, dilo con claridad en vez de inventar una. Contexto ya recolectado: ${contextSummary}.`
        : `Eres un asistente de intake fiscal para una firma de preparación de impuestos cross-border US/Canadá llamada Thurn und Taxis. Tu trabajo es leer una descripción en lenguaje natural que da el cliente sobre su situación migratoria/laboral y devolver SOLO una clasificación breve (2-3 frases, en ${langName}) explicando qué tipo de caso parece ser (por ejemplo: commuter, residente dual, ingresos cross-border, negocio propio, caso atípico) y qué formularios probablemente le aplican (1040, 1040NR, T1, FBAR, 5471, 8858, W-7, etc). No des cifras de cotización. Sé conciso y profesional. Contexto ya recolectado del cuestionario: ${contextSummary}.`;

      const result = await askClaude(systemPrompt, userText);

      const row = document.createElement('div');
      row.className = 'msg-row from-agent';
      const badge = '<span class="ai-badge">AI</span>';
      row.innerHTML = `<div class="msg-label">${state.agent.name.toUpperCase()}</div><div class="msg-bubble ai-generated">${escapeHtml(result.text)}${badge}</div>`;
      els.messages.appendChild(row);
      els.messages.scrollTop = els.messages.scrollHeight;

      state.answers[qid + '_free_text'] = userText;
      state.pendingAIQuestion = null;

      if (qid === 'out_of_scope_review') {
        showTyping(() => renderContactForm());
        return;
      }

      showTyping(() => {
        addAgentMessage(UI[state.lang].validated, true);
        advanceStep();
      });
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
    els.textInput.value = '';

    if (state.pendingAIQuestion) {
      handleAIFreeText(state.pendingAIQuestion, val);
      return;
    }

    // Texto libre no asociado a ninguna pregunta de IA — ack genérico y seguimos
    addUserMessage(val);
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

        els.options.innerHTML = '';
        const aiBtn = document.createElement('button');
        aiBtn.className = 'tell-us-more-btn';
        aiBtn.innerHTML = TELL_US_MORE_LABEL[state.lang] + '<span class="ai-badge">AI</span>';
        aiBtn.addEventListener('click', () => openFreeTextFor('out_of_scope_review'));
        els.options.appendChild(aiBtn);

        const skipBtn = document.createElement('button');
        skipBtn.className = 'option-btn';
        skipBtn.textContent = UI[state.lang].submitContact;
        skipBtn.addEventListener('click', () => { els.options.innerHTML = ''; renderContactForm(); });
        els.options.appendChild(skipBtn);
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
