/**
 * NLP News Confidence Analyzer
 *
 * Uses a Naive Bayes classifier (pre-trained on maritime/fishing news examples)
 * combined with five linguistic feature extractors to compute a 0–100
 * confidence score for any piece of news or alert text.
 *
 * Confidence label mapping:
 *   80–100  → HIGH   (very likely credible, factual)
 *   50–79   → MEDIUM (plausible but unverified)
 *   0–49    → LOW    (likely sensational, rumour, or unverified)
 */

import natural from 'natural';

const { BayesClassifier, SentimentAnalyzer, PorterStemmer, WordTokenizer } = natural;

// ─── Training corpus ─────────────────────────────────────────────────────────

const CREDIBLE = [
  'The Indian Meteorological Department issued a bulletin on Monday warning of cyclone Vardah expected to make landfall near Chennai within 48 hours with wind speeds of 120 km/h.',
  'Indian Coast Guard vessel C-405 rescued 8 fishermen 30 nautical miles east of Rameswaram at 14:30 IST after their boat capsized in rough seas.',
  'Tamil Nadu Fisheries Department announced a 61-day fishing ban effective April 15 to protect marine biodiversity during the spawning season.',
  'Meteorological Centre Chennai reports wave heights of 3 to 4 metres expected along coastal Tamil Nadu on Tuesday due to low pressure system in Bay of Bengal.',
  'National Disaster Management Authority confirmed deployment of 12 rescue teams along coastal Andhra Pradesh following flooding in Ongole.',
  'Deep depression over southwest Bay of Bengal intensified into a cyclonic storm yesterday at 0530 IST and is moving north-northeast at 14 km/h.',
  'Coast Guard has set up emergency response centres at Tuticorin and Rameswaram to assist fishermen affected by the storm surge.',
  'Sri Lanka Navy intercepted and arrested 14 Indian fishermen from Tamil Nadu for allegedly crossing the International Maritime Boundary Line.',
  'The fisheries department has issued notice to 320 registered boats in Nagapattinam district to return to harbour ahead of the approaching depression.',
  'Water temperature along Palk Strait measured at 29.4 degrees Celsius this week, which is conducive to fish aggregation according to fisheries research centre.',
  'Government of Tamil Nadu allocated Rs 120 crore for fishermen welfare schemes including motorised boat upgrades and safety equipment.',
  'Fishing vessel MV Annamalai reported missing with 11 crew members; Coast Guard launched aerial and sea search operations at coordinates 10.5N 80.7E.',
  'IMD forecast: North Bay of Bengal will experience wind speed of 45 to 55 km/h gusting to 65 km/h, advisory issued for fishermen not to venture into deep sea.',
  'Authorities confirmed 3 fishing boats returned safely after taking shelter at Kalpakkam due to rough sea conditions reported since Thursday morning.',
  'Marine police recovered body of a fisherman 5 nautical miles offshore, investigation under way to determine cause of death.',
  'State government confirmed Rs 4 lakh ex-gratia to families of 6 fishermen drowned in Cuddalore district last Tuesday.',
  'The annual Potential Fishing Zone advisory indicates dense fish concentrations between 10N 80E and 11N 82E based on satellite chlorophyll data.',
  'According to the National Institute of Ocean Technology report dated yesterday sea level anomaly of plus 15 centimetres observed near Pamban.',
  'Officials stated that 2400 fishermen have been evacuated from low-lying coastal villages in Nagapattinam as a precautionary measure.',
  'Coastal security division confirmed all fishing harbours between Colachel and Chennai are operating normally with no disruption as of 0900 hours today.'
];

const NON_CREDIBLE = [
  'HUGE TSUNAMI COMING RIGHT NOW!!! Everyone must run!!! Share this immediately!!!! They say it will drown everything!!!',
  'Somebody told me the sea looks very dangerous today, I heard something terrible might happen, everyone should be careful and share this message.',
  'BREAKING: Secret government cover-up hiding massive storm that will kill millions!!! They don\'t want you to know!!!',
  'My uncle who is a fisherman says something big is going to happen and everyone should pray and not go to sea ever again.',
  'ALERT ALERT ALERT giant wave seen no one knows when it is coming all fishermen will die if they go to sea today or maybe tomorrow.',
  'This is going viral: scientists discovered that all fish have disappeared from Bay of Bengal and nobody is reporting this because media is corrupt.',
  'WARNING: If you go fishing today you will definitely get into trouble because stars say sea is very dangerous for all fishermen this week!!!',
  'Shared by 10000 people: strange lights seen in sea at night, they say aliens or government is doing something secret near the coast.',
  'DANGEROUS STORM COMING NO ONE IS SAFE everyone must leave coast immediately spread this message to all your fishermen friends ASAP.',
  'I heard from someone that a very big accident happened in sea but government hiding it, all fishermen missing, please share before they delete this.',
  'Scientists say sea temperature will rise and all fish will die within a week no one is doing anything WAKE UP everybody.',
  'Forward this to 10 people: a fisherman vision says disaster coming to Tamil Nadu coast this month, this is 100% true.',
  'OMG huge whirlpool swallowing boats everyone stay away from sea forever this is too dangerous they are not telling us the truth.',
  'PLEASE SHARE: 200 fishermen died at sea yesterday but government covering up and no news channel is reporting this trust me.',
  'Something very bad happened in Palk Strait no one knows what but people are saying boats disappeared mysteriously last night.',
  'Rumour going around that all boats will be banned from next week because of secret agreement with Sri Lanka nobody knows the details yet.',
  'I just heard that a massive earthquake will hit the coast soon and cause big waves, please pray and do not go fishing at all.',
  'They say water in sea is turning black because of pollution nobody is doing anything and fishermen will all die soon share this.',
  'URGENT: Navy is capturing all fishing boats in international waters for no reason run away immediately if you see any ship.',
  'Friends told me sea gods are angry and that is why weather is bad, all fishermen should do puja and not go to sea this week.'
];

// ─── Build and train the Naive Bayes classifier ──────────────────────────────

const classifier = new BayesClassifier();

CREDIBLE.forEach(text => classifier.addDocument(text.toLowerCase(), 'credible'));
NON_CREDIBLE.forEach(text => classifier.addDocument(text.toLowerCase(), 'non_credible'));

classifier.train();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tokenizer = new WordTokenizer();
const sentimentAnalyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');

// Regex patterns for feature extraction
const PATTERNS = {
  numbers: /\b\d+(\.\d+)?\s*(km|knot|metre|meter|km\/h|kmh|nautical|crore|lakh|degree|celsius|°|%|IST|UTC|km²|sqkm)?\b/gi,
  dates: /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(st|nd|rd|th)?[\s,]+\d{4}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|today|tomorrow|this\s+week)\b/gi,
  times: /\b\d{1,2}:\d{2}\s*(IST|UTC|GMT|AM|PM)?\b/gi,
  geolocation: /\b(\d{1,2}\.\d+[NS][\s,]+\d{2,3}\.\d+[EW]|\b(bay of bengal|palk strait|arabian sea|lakshadweep|andaman|nicobar|chennai|rameswaram|nagapattinam|tuticorin|cuddalore|pondicherry|kalpakkam|pamban|colachel|ongole|visakhapatnam|cochin|mumbai))\b/gi,
  attribution: /\b(according to|reported by|stated by|announced by|confirmed by|issued by|said|stated|confirmed|declared|official|authority|department|ministry|government|meteorologi|coast guard|navy|police|ndma|imd|fisheries)\b/gi,
  official: /\b(coast guard|meteorological|fisheries department|ndma|imd|national disaster|naval|police|ministry|tamil nadu|andhra pradesh|government|official|authority|bulletin|advisory|forecast)\b/gi,
  alarmism: /(!{2,}|[A-Z]{4,}|\bOMG\b|\bWOW\b|\bURGENT\b|\bBREAKING\b|\bVIRAL\b|\bSHARE\b|\bFORWARD\b|\bSPREAD\b|\bWAKE UP\b)/g,
  hedging: /\b(rumour|rumor|I heard|they say|someone said|apparently|allegedly|supposedly|might be|could be|maybe|perhaps|possibly|I think|people are saying|going around|spreading|forward this|share this|unconfirmed)\b/gi,
  sensational: /\b(cover.?up|secret|hiding|no one knows|100% true|trust me|wake up|conspiracy|delete this|before they delete|media is corrupt|government hiding|nobody is reporting)\b/gi,
  measurements: /\b\d+(\.\d+)?\s*(km\/h|kmh|knots|metres|meters|feet|cm|mm|degrees|celsius|fahrenheit|hectopascal|hpa|mbar)\b/gi,
};

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

// ─── Feature extractors (each returns 0–1) ───────────────────────────────────

function specificityScore(text) {
  const numNums = countMatches(text, PATTERNS.numbers);
  const numDates = countMatches(text, PATTERNS.dates);
  const numTimes = countMatches(text, PATTERNS.times);
  const numGeo = countMatches(text, PATTERNS.geolocation);
  const numMeasure = countMatches(text, PATTERNS.measurements);
  const total = numNums + numDates * 2 + numTimes + numGeo * 2 + numMeasure * 2;
  return Math.min(total / 12, 1);
}

function attributionScore(text) {
  const attrMatches = countMatches(text, PATTERNS.attribution);
  const officialMatches = countMatches(text, PATTERNS.official);
  return Math.min((attrMatches + officialMatches * 1.5) / 8, 1);
}

function alarmismPenalty(text) {
  return Math.min(countMatches(text, PATTERNS.alarmism) / 5, 1);
}

function hedgingPenalty(text) {
  const hedgeCount = countMatches(text, PATTERNS.hedging);
  const sensationalCount = countMatches(text, PATTERNS.sensational);
  return Math.min((hedgeCount + sensationalCount * 2) / 6, 1);
}

function structureScore(text) {
  const wordCount = tokenizer.tokenize(text).length;
  const hasSentenceEnding = /[.!?]/.test(text);
  const avgWordLen = text.replace(/\s+/g, '').length / Math.max(wordCount, 1);
  const lengthScore = Math.min(wordCount / 50, 1);  // reward longer, well-formed text
  const grammarScore = hasSentenceEnding ? 1 : 0.3;
  const wordLenScore = avgWordLen > 4 ? 1 : 0.5;   // longer average word = more formal
  return (lengthScore * 0.5 + grammarScore * 0.3 + wordLenScore * 0.2);
}

function sentimentNeutralityScore(tokens) {
  // AFINN score: close to 0 = neutral = more credible
  const rawScore = sentimentAnalyzer.getSentiment(tokens);
  return Math.max(0, 1 - Math.abs(rawScore) / 2);
}

// ─── Main analysis function ───────────────────────────────────────────────────

/**
 * analyzeCredibility(text)
 * Returns a full confidence report for the given text.
 */
export function analyzeCredibility(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string.');
  }

  const cleaned = text.trim();
  const lower = cleaned.toLowerCase();
  const tokens = tokenizer.tokenize(lower);

  // 1. Naive Bayes classification
  const bayesClass = classifier.classify(lower);
  // getClassifications returns [{label, value}, ...] sorted descending
  const allClassifications = classifier.getClassifications(lower);
  const credibleProb = allClassifications.find(c => c.label === 'credible')?.value ?? 0;
  const nonCredProb  = allClassifications.find(c => c.label === 'non_credible')?.value ?? 0;
  // Normalise to 0–1 (log probabilities, convert to relative probability)
  const bayesScore = Math.exp(credibleProb) / (Math.exp(credibleProb) + Math.exp(nonCredProb));

  // 2. Linguistic features
  const spec   = specificityScore(cleaned);
  const attr   = attributionScore(cleaned);
  const alarm  = alarmismPenalty(cleaned);
  const hedge  = hedgingPenalty(cleaned);
  const struct = structureScore(cleaned);
  const sent   = sentimentNeutralityScore(tokens);

  // 3. Weighted final score (0–100)
  const raw =
    bayesScore * 35 +
    spec        * 25 +
    attr        * 20 +
    struct      * 10 +
    sent        * 10 -
    alarm       * 25 -
    hedge       * 20;

  const confidence = Math.round(Math.max(0, Math.min(100, raw)));

  const label =
    confidence >= 80 ? 'HIGH' :
    confidence >= 50 ? 'MEDIUM' : 'LOW';

  const description =
    label === 'HIGH'   ? 'This text appears credible and factual. It contains specific information, official attribution, and uses factual language.' :
    label === 'MEDIUM' ? 'This text is plausible but lacks strong verification signals. Treat with caution until confirmed by an official source.' :
                         'This text shows signs of misinformation: sensational language, lack of specifics, or unverified claims.';

  return {
    confidence,
    label,
    description,
    factors: {
      bayesClassifier:    { score: Math.round(bayesScore * 100), label: bayesClass === 'credible' ? 'Credible' : 'Non-credible' },
      specificity:        { score: Math.round(spec  * 100), label: 'Numbers, dates & locations found' },
      attribution:        { score: Math.round(attr  * 100), label: 'Official sources & attribution' },
      structure:          { score: Math.round(struct * 100), label: 'Text structure & formality' },
      sentimentNeutrality:{ score: Math.round(sent  * 100), label: 'Emotional neutrality' },
      alarmismPenalty:    { score: -Math.round(alarm * 25),  label: 'Sensational/alarmist language penalty' },
      hedgingPenalty:     { score: -Math.round(hedge * 20),  label: 'Hedging/rumour language penalty' },
    },
    wordCount: tokens.length,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * batchAnalyze(items)
 * items: [{ id, text, title? }]
 * Returns array of results preserving the input id/title.
 */
export function batchAnalyze(items) {
  return items.map(item => {
    try {
      const fullText = item.title ? `${item.title}. ${item.text}` : item.text;
      return { id: item.id, title: item.title ?? null, ...analyzeCredibility(fullText) };
    } catch (err) {
      return { id: item.id, title: item.title ?? null, error: err.message };
    }
  });
}
