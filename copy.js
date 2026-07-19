const AGENTS = {
  es: [
    { name: 'Raquel', sub: 'Raquel · Asesora experta en impuestos' },
    { name: 'Benjamín', sub: 'Benjamín · Asesor experto en impuestos' },
  ],
  en: [
    { name: 'Rachel', sub: 'Rachel · Senior tax intake advisor' },
    { name: 'Ezra', sub: 'Ezra · Senior tax intake advisor' },
  ],
  fr: [
    { name: 'Simone', sub: 'Simone · Conseillère fiscale experte' },
    { name: 'Raphaël', sub: 'Raphaël · Conseiller fiscal expert' },
  ],
};

const UI = {
  es: {
    progressLabel: 'EXPEDIENTE EN PROCESO',
    connecting: 'CONECTANDO...',
    agentLabel: 'ASESOR',
    userLabel: 'USTED',
    welcome: (name) => `Buenas, soy ${name}, de untaxingtaxes. Le voy a hacer algunas preguntas breves para entender su situación fiscal entre Estados Unidos y Canadá, y así ofrecerle una estimación preliminar. ¿Comenzamos?`,
    startBtn: 'Comenzar diagnóstico',
    typeAnswer: 'Escriba su respuesta...',
    send: 'Enviar',
    confirmSelection: 'Confirmar selección',
    footerNote: 'ESTIMACIONES EN INTIS (I/.) — NO VINCULANTE',
    quoteIntro: 'Según la información proporcionada, su caso corresponde a:',
    quoteRange: (min, max) => `Estimación preliminar: I/. ${min.toLocaleString('es-CO')} — I/. ${max.toLocaleString('es-CO')}`,
    quoteDisclaimer: 'Esta es solo una estimación basada en la información que usted nos ha compartido. No implica una obligación legal de sostener este precio ni de contratar a untaxingtaxes. Un asesor humano revisará su caso y le proporcionará una cotización definitiva.',
    outOfScope: 'Según lo que me cuenta, su caso no parece tener una conexión directa con Estados Unidos. No es nuestra especialidad principal, pero con gusto lo podemos referir a un colega si lo necesita.',
    transitMessage: 'Su situación de mudanza entre países tiene reglas fiscales particulares (año fiscal partido, posibles impuestos de salida). La siguiente información es opcional, pero nos ayuda a preparar una cotización más precisa.',
    optional: '(Opcional)',
    contactFormIntro: 'Para finalizar, déjenos sus datos y uno de nuestros asesores se pondrá en contacto en las próximas 48-72 horas.',
    nameLabel: 'Nombre completo',
    emailLabel: 'Correo electrónico',
    submitContact: 'Enviar información',
    thankYou: 'Gracias. Hemos recibido su información. Un asesor se pondrá en contacto pronto.',
    validated: 'Registrado.',
    preferNotToSay: 'Prefiero no responder',
  },
  en: {
    progressLabel: 'CASE FILE IN PROGRESS',
    connecting: 'CONNECTING...',
    agentLabel: 'ADVISOR',
    userLabel: 'YOU',
    welcome: (name) => `Hi, I'm ${name}, from untaxingtaxes. I'll ask a few quick questions to understand your cross-border US/Canada tax situation, and give you a preliminary estimate. Shall we start?`,
    startBtn: 'Start diagnostic',
    typeAnswer: 'Type your answer...',
    send: 'Send',
    confirmSelection: 'Confirm selection',
    footerNote: 'ESTIMATES IN INTIS (I/.) — NOT BINDING',
    quoteIntro: 'Based on the information provided, your case falls under:',
    quoteRange: (min, max) => `Preliminary estimate: I/. ${min.toLocaleString('en-US')} — I/. ${max.toLocaleString('en-US')}`,
    quoteDisclaimer: 'This is only an estimate based on what you have shared with us. It does not imply a legal obligation to honor this price or to hire untaxingtaxes. A human advisor will review your case and provide a final quote.',
    outOfScope: 'Based on what you have told me, your case doesn\'t seem to have a direct US connection. That\'s not our main specialty, but we\'re happy to refer you to a colleague if needed.',
    transitMessage: 'Your cross-border move has particular tax implications (split tax year, possible departure tax). The following is optional, but helps us prepare a more accurate quote.',
    optional: '(Optional)',
    contactFormIntro: 'To finish, please leave your details and one of our advisors will reach out within 48-72 hours.',
    nameLabel: 'Full name',
    emailLabel: 'Email address',
    submitContact: 'Submit information',
    thankYou: 'Thank you. We have received your information. An advisor will reach out soon.',
    validated: 'Recorded.',
    preferNotToSay: 'Prefer not to say',
  },
  fr: {
    progressLabel: 'DOSSIER EN COURS',
    connecting: 'CONNEXION...',
    agentLabel: 'CONSEILLER',
    userLabel: 'VOUS',
    welcome: (name) => `Bonjour, je suis ${name}, de untaxingtaxes. Je vais vous poser quelques questions rapides pour comprendre votre situation fiscale transfrontalière US/Canada, et vous donner une estimation préliminaire. On commence ?`,
    startBtn: 'Commencer le diagnostic',
    typeAnswer: 'Tapez votre réponse...',
    send: 'Envoyer',
    confirmSelection: 'Confirmer la sélection',
    footerNote: 'ESTIMATIONS EN INTIS (I/.) — NON CONTRACTUEL',
    quoteIntro: 'Selon les informations fournies, votre cas relève de :',
    quoteRange: (min, max) => `Estimation préliminaire : I/. ${min.toLocaleString('fr-FR')} — I/. ${max.toLocaleString('fr-FR')}`,
    quoteDisclaimer: 'Ceci n\'est qu\'une estimation basée sur les informations partagées. Elle n\'implique aucune obligation légale de maintenir ce prix ni d\'engager untaxingtaxes. Un conseiller humain examinera votre dossier et vous fournira un devis définitif.',
    outOfScope: 'D\'après ce que vous me dites, votre cas ne semble pas avoir de lien direct avec les États-Unis. Ce n\'est pas notre spécialité principale, mais nous pouvons volontiers vous référer à un collègue si nécessaire.',
    transitMessage: 'Votre déménagement entre pays implique des règles fiscales particulières (année fiscale partagée, possible impôt de départ). Les questions suivantes sont facultatives, mais nous aident à préparer un devis plus précis.',
    optional: '(Facultatif)',
    contactFormIntro: 'Pour terminer, laissez-nous vos coordonnées et un conseiller vous contactera sous 48 à 72 heures.',
    nameLabel: 'Nom complet',
    emailLabel: 'Adresse e-mail',
    submitContact: 'Envoyer',
    thankYou: 'Merci. Nous avons bien reçu vos informations. Un conseiller vous contactera bientôt.',
    validated: 'Enregistré.',
    preferNotToSay: 'Je préfère ne pas répondre',
  },
};

const CATEGORY_LABELS = {
  commuter_1040nr: {
    es: 'Commuter — 1040NR (ciudadano canadiense, trabaja en EE.UU.)',
    en: 'Commuter — 1040NR (Canadian citizen, works in the US)',
    fr: 'Frontalier — 1040NR (citoyen canadien, travaille aux É.-U.)',
  },
  commuter_1040: {
    es: 'Commuter — 1040 (US/Dual/Green Card, trabaja en EE.UU.)',
    en: 'Commuter — 1040 (US/Dual/Green Card, works in the US)',
    fr: 'Frontalier — 1040 (US/Double/Carte verte, travaille aux É.-U.)',
  },
  us_person_in_can: {
    es: 'US Person residente en Canadá',
    en: 'US Person residing in Canada',
    fr: 'Personne US résidant au Canada',
  },
  us_resident_can_income: {
    es: 'Residente en EE.UU. con ingresos en Canadá',
    en: 'US resident with Canadian income',
    fr: 'Résident aux É.-U. avec revenus canadiens',
  },
  migrant_transit: {
    es: 'Migrante en tránsito (año fiscal partido)',
    en: 'In-transit migrant (split tax year)',
    fr: 'Migrant en transit (année fiscale partagée)',
  },
  domestic_can: {
    es: 'Doméstico — solo Canadá',
    en: 'Domestic — Canada only',
    fr: 'National — Canada seulement',
  },
  domestic_can_us_investment: {
    es: 'Doméstico en Canadá con inversión en EE.UU.',
    en: 'Domestic Canada with US investment income',
    fr: 'National Canada avec revenus de placement US',
  },
  domestic_us: {
    es: 'Doméstico — solo EE.UU.',
    en: 'Domestic — US only',
    fr: 'National — É.-U. seulement',
  },
  out_of_scope: {
    es: 'Fuera de alcance',
    en: 'Out of scope',
    fr: 'Hors périmètre',
  },
};

const QUESTION_COPY = {
  q0_transit: {
    text: { es: '¿Se está mudando actualmente entre Estados Unidos y Canadá, o lo hizo/planea hacerlo en los próximos 6 meses?', en: 'Are you currently moving between the US and Canada, or have you done so / plan to do so in the next 6 months?', fr: 'Déménagez-vous actuellement entre les États-Unis et le Canada, ou l\'avez-vous fait / prévoyez-vous de le faire dans les 6 prochains mois ?' },
    options: {
      yes: { es: 'Sí, estoy en tránsito', en: 'Yes, I\'m in transit', fr: 'Oui, je suis en transit' },
      no: { es: 'No', en: 'No', fr: 'Non' },
    },
  },
  q1_status: {
    text: { es: '¿Cuál es su estatus migratorio o ciudadanía?', en: 'What is your citizenship or immigration status?', fr: 'Quel est votre statut de citoyenneté ou d\'immigration ?' },
    options: {
      us_citizen: { es: 'Ciudadano/a estadounidense', en: 'US citizen', fr: 'Citoyen(ne) américain(e)' },
      canadian_citizen: { es: 'Ciudadano/a canadiense', en: 'Canadian citizen', fr: 'Citoyen(ne) canadien(ne)' },
      dual: { es: 'Doble ciudadanía US/CAN', en: 'Dual US/Canadian citizen', fr: 'Double citoyenneté US/CAN' },
      green_card: { es: 'Green Card (residente permanente US)', en: 'Green Card holder (US permanent resident)', fr: 'Titulaire d\'une Green Card (résident permanent US)' },
      other: { es: 'Otro estatus', en: 'Other status', fr: 'Autre statut' },
    },
  },
  q1c_accidental: {
    text: { es: '¿Nació en Estados Unidos, o alguno de sus padres es o fue ciudadano estadounidense?', en: 'Were you born in the US, or is/was either of your parents a US citizen?', fr: 'Êtes-vous né(e) aux États-Unis, ou l\'un de vos parents est-il/était-il citoyen américain ?' },
    options: {
      yes: { es: 'Sí', en: 'Yes', fr: 'Oui' },
      no: { es: 'No', en: 'No', fr: 'Non' },
    },
  },
  q2_country: {
    text: { es: '¿En qué país vive actualmente la mayor parte del año?', en: 'Which country do you currently live in most of the year?', fr: 'Dans quel pays vivez-vous actuellement la majeure partie de l\'année ?' },
    options: {
      US: { es: 'Estados Unidos', en: 'United States', fr: 'États-Unis' },
      CA: { es: 'Canadá', en: 'Canada', fr: 'Canada' },
    },
  },
  q3_country: {
    text: { es: '¿En qué país trabaja actualmente?', en: 'Which country do you currently work in?', fr: 'Dans quel pays travaillez-vous actuellement ?' },
    options: {
      US: { es: 'Estados Unidos', en: 'United States', fr: 'États-Unis' },
      CA: { es: 'Canadá', en: 'Canada', fr: 'Canada' },
    },
  },
  q3b_commute: {
    text: { es: '¿Cruza la frontera de manera diaria o regular para trabajar, o es remoto/ocasional?', en: 'Do you cross the border daily or regularly for work, or is it remote/occasional?', fr: 'Traversez-vous la frontière quotidiennement ou régulièrement pour le travail, ou est-ce à distance/occasionnel ?' },
    options: {
      regular_commute: { es: 'Cruzo regularmente', en: 'I commute regularly', fr: 'Je traverse régulièrement' },
      remote_or_occasional: { es: 'Remoto u ocasional', en: 'Remote or occasional', fr: 'À distance ou occasionnel' },
    },
  },
  q4_income_sources: {
    text: { es: 'Seleccione todas las fuentes de ingreso que apliquen:', en: 'Select all income sources that apply:', fr: 'Sélectionnez toutes les sources de revenus applicables :' },
    multi: true,
    options: {
      us_employment: { es: 'Empleo en EE.UU.', en: 'US employment', fr: 'Emploi aux É.-U.' },
      ca_employment: { es: 'Empleo en Canadá', en: 'Canadian employment', fr: 'Emploi au Canada' },
      us_self_employment: { es: 'Negocio propio en EE.UU.', en: 'US self-employment / business', fr: 'Entreprise aux É.-U.' },
      ca_self_employment: { es: 'Negocio propio en Canadá', en: 'Canadian self-employment / business', fr: 'Entreprise au Canada' },
      us_investment: { es: 'Inversiones en EE.UU.', en: 'US investment income', fr: 'Revenus de placement US' },
      ca_investment_rrsp_tfsa: { es: 'Inversiones en Canadá (RRSP/TFSA)', en: 'Canadian investments (RRSP/TFSA)', fr: 'Placements canadiens (REER/CELI)' },
      us_rental: { es: 'Propiedad en renta en EE.UU.', en: 'US rental property', fr: 'Propriété locative US' },
      ca_rental: { es: 'Propiedad en renta en Canadá', en: 'Canadian rental property', fr: 'Propriété locative canadienne' },
      pension_cpp_oas_ss: { es: 'Pensión (CPP/OAS o Social Security)', en: 'Pension (CPP/OAS or Social Security)', fr: 'Pension (RPC/SV ou Sécurité sociale)' },
    },
  },
  q5_marital: {
    text: { es: '¿Cuál es su estado civil?', en: 'What is your marital status?', fr: 'Quel est votre état civil ?' },
    options: {
      single: { es: 'Soltero/a', en: 'Single', fr: 'Célibataire' },
      married: { es: 'Casado/a', en: 'Married', fr: 'Marié(e)' },
      divorced: { es: 'Divorciado/a', en: 'Divorced', fr: 'Divorcé(e)' },
      widowed: { es: 'Viudo/a', en: 'Widowed', fr: 'Veuf/veuve' },
      other: { es: 'Otro', en: 'Other', fr: 'Autre' },
    },
  },
  q5b_spouse_status: {
    text: { es: '¿Su cónyuge es ciudadano/a estadounidense, Green Card holder, o ninguno de los dos?', en: 'Is your spouse a US citizen, Green Card holder, or neither?', fr: 'Votre conjoint(e) est-il/elle citoyen(ne) américain(e), titulaire d\'une Green Card, ou aucun des deux ?' },
    options: {
      us_citizen_or_gc: { es: 'Sí, uno de los dos', en: 'Yes, one of the two', fr: 'Oui, l\'un des deux' },
      neither: { es: 'Ninguno', en: 'Neither', fr: 'Aucun des deux' },
    },
  },
  t1_direction: {
    text: { es: '¿En qué dirección es la mudanza?', en: 'Which direction is the move?', fr: 'Dans quel sens est le déménagement ?' },
    options: {
      us_to_can: { es: 'De EE.UU. a Canadá', en: 'From the US to Canada', fr: 'Des É.-U. vers le Canada' },
      can_to_us: { es: 'De Canadá a EE.UU.', en: 'From Canada to the US', fr: 'Du Canada vers les É.-U.' },
    },
  },
  t2_timing: {
    text: { es: '¿Cuándo ocurre o ocurrió la mudanza?', en: 'When does/did the move happen?', fr: 'Quand le déménagement a-t-il lieu ou a-t-il eu lieu ?' },
    options: {
      already_happened: { es: 'Ya ocurrió', en: 'Already happened', fr: 'Déjà passé' },
      next_3_months: { es: 'Próximos 3 meses', en: 'Next 3 months', fr: 'Dans les 3 prochains mois' },
      next_6_12_months: { es: 'Próximos 6-12 meses', en: 'Next 6-12 months', fr: 'Dans les 6-12 prochains mois' },
    },
  },
  t3_ties: {
    text: { es: '¿Ya rompió o estableció vínculos de residencia (vivienda, cuentas bancarias, licencia)?', en: 'Have you already broken or established residential ties (home, bank accounts, license)?', fr: 'Avez-vous déjà rompu ou établi des liens de résidence (logement, comptes bancaires, permis) ?' },
    options: {
      yes: { es: 'Sí', en: 'Yes', fr: 'Oui' },
      no: { es: 'No', en: 'No', fr: 'Non' },
      not_sure: { es: 'No estoy seguro/a', en: 'Not sure', fr: 'Pas sûr(e)' },
    },
  },
};
