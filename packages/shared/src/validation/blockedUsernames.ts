/**
 * What may not appear in a username.
 *
 * One list for the whole app. The database has its own copy in
 * `…_username_filter.sql` – a filter that only runs in the app is a filter that
 * anyone with the API key can walk around – and the two have to be kept in step
 * when either is changed. The SQL file says so as well.
 *
 * Everything here is written in its **flattened** form: lower case, no accents,
 * letters only, and no repeated letters (see `flattenUsername`). "Sch3iße" and
 * "s_c_h_e_i_s_s_e" both arrive here as "scheise", so that is how the entry is
 * spelled.
 */

/**
 * Blocked wherever they appear, even inside a longer word.
 *
 * Only terms that are not part of any ordinary word: a substring rule is a
 * blunt instrument, and every entry here is one that cannot turn up by
 * accident. Think twice before adding a short one.
 */
export const BLOCKED_ANYWHERE: readonly string[] = [
  // --- German profanity and insults -----------------------------------------
  'arschloch',
  'wichser',
  'wixer',
  'fotze',
  'hurensohn',
  'hurentochter',
  'missgeburt',
  'schlampe',
  'nutte',
  'bastard',
  'spast',
  'spasti',
  'behindert',
  'krupel',
  'schwuchtel',
  'transe',
  'kanake',
  'zigeuner',
  'neger',
  'judensau',
  'untermensch',
  'scheis', // covers scheiss/scheiße/scheisse once flattened
  'kacke',
  'pisse',
  'penner',
  'hodensack',
  'schwanzlutscher',
  'muschi',
  'titten',
  'nutten',
  'vergewaltig',
  'kinderficker',
  'ficken',
  'ficker',
  'gefickt',

  // --- English profanity and insults ----------------------------------------
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'whore',
  'slut',
  'penis',
  'vagina',
  'pussy',
  'pusy',
  'boobs',
  'tits',
  'blowjob',
  'handjob',
  'jizz',
  'wank',
  'asshole',
  'arsehole',
  'motherfucker',
  'retard',
  'faggot',
  'nigger',
  'niga',
  'nigga',
  'chink',
  'tranny',
  'rapist',
  'pedo',
  'pedophile',
  'paedo',
  'childporn',
  'porn',
  'porno',
  'hentai',
  'incest',
  'bestiality',
  'suicide',
  'killyourself',

  // --- Extremism and hate ----------------------------------------------------
  'hitler',
  'adolfhitler',
  'nazi',
  'nazis',
  'heilhitler',
  'sieghail',
  'siegheil',
  'hakenkreuz',
  'swastika',
  'thirdreich',
  'drittesreich',
  'holocaust',
  'auschwitz',
  'gaskammer',
  'gaschamber',
  'genocide',
  'volkermord',
  'aljaida',
  'alqaida',
  'alqaeda',
  'taliban',
  'terrorist',
  'whitepower',
  'whitepride',
  'kkk',
  'kuklux',
  'blutundehre',
  'wehrmacht',
  'reichsburger',
  'judenhas',
];

/**
 * Blocked only when the whole name is (essentially) this and nothing else.
 *
 * Short or ambiguous words: "ass" sits inside "class", "sex" inside "sextett",
 * "anal" inside "analyse" – blocking those anywhere would cost more honest
 * names than it saves.
 */
export const BLOCKED_WHOLE: readonly string[] = [
  /*
    Whole-name only, because each of these sits inside a word somebody may
    honestly want: nigeria, mongolei, Dickmann, cocktail, document, grapefruit,
    narcissist, suspicion, Fagott, Fukushima, Bichler. The spellings that are
    only ever an insult stay in the list above.
  */
  'niger',
  'mongo',
  'mongoloid',
  'dick',
  'cock',
  'cum',
  'rape',
  'isis',
  'spic',
  'fagot',
  'fuk',
  'bich',
  'kys',
  'ass',
  'as',
  'arsch',
  'sex',
  'sexy',
  'anal',
  'anus',
  'poop',
  'kot',
  'piss',
  'fick',
  'fuk',
  'hure',
  'gay',
  'homo',
  'schwul',
  'lesbe',
  'idiot',
  'dumm',
  'dummkopf',
  'depp',
  'trotel',
  'noob',
  'hoe',
  'milf',
  'dildo',
  'vibrator',
  'drugs',
  'kokain',
  'cocaine',
  'heroin',
  'meth',
  'weed',
  'admin',
  'moderator',
  'quizbyte',
  'support',
  'root',
  'system',
];
