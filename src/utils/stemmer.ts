/**
 * Compact Porter stemmer (English). Adapted from the canonical algorithm
 * (https://tartarus.org/martin/PorterStemmer/) — 5 step suffix-stripping
 * pipeline, no external deps.
 *
 * For non-English text the stemmer is a no-op (returns the lowercase token).
 * That keeps the search useful for multilingual corpora at the cost of slightly
 * weaker Russian stemming (we trade off vs. shipping a 500KB Russian stemmer).
 */

function measure(s: string): number {
  let m = 0;
  let i = 0;
  let prevVowel = false;
  while (i < s.length) {
    const ch = s[i];
    if (/[aeiou]/.test(ch)) {
      if (!prevVowel) m++;
      prevVowel = true;
    } else {
      prevVowel = false;
    }
    i++;
  }
  return m;
}

function hasVowel(s: string): boolean { return /[aeiou]/.test(s); }
function endsDouble(s: string): boolean {
  const n = s.length;
  if (n < 2) return false;
  const c = s[n - 1];
  return c === s[n - 2] && /[bcdfghjklmnpqrstvwxyz]/.test(c);
}
function endsCVC(s: string): boolean {
  const n = s.length;
  if (n < 3) return false;
  const c1 = s[n - 3], v = s[n - 2], c2 = s[n - 1];
  return /[bcdfghjklmnpqrstvwxyz]/.test(c1) && /[aeiou]/.test(v) &&
    /[bcdfghjklmnpqrstvwxyz]/.test(c2) && !/[wxy]/.test(c2);
}

function step1(s: string): string {
  // Step 1a: plurals
  if (s.endsWith('sses')) return s.slice(0, -2);
  if (s.endsWith('ies'))  return s.slice(0, -2);
  if (!s.endsWith('ss') && s.endsWith('s')) return s.slice(0, -1);

  // Step 1b: -ed, -ing
  if (s.endsWith('eed') && measure(s.slice(0, -3)) > 0) return s.slice(0, -1);
  if (s.endsWith('ed') && hasVowel(s.slice(0, -2))) return s.slice(0, -2) + (s.endsWith('at') || s.endsWith('bl') || s.endsWith('iz') ? 'e' : (endsDouble(s.slice(0, -2)) ? s.slice(0, -3) : (measure(s.slice(0, -2)) === 1 && endsCVC(s.slice(0, -2)) ? s.slice(0, -2) + 'e' : s.slice(0, -2))));
  if (s.endsWith('ing') && hasVowel(s.slice(0, -3))) return s.slice(0, -3) + (s.endsWith('at') || s.endsWith('bl') || s.endsWith('iz') ? 'e' : (endsDouble(s.slice(0, -3)) ? s.slice(0, -4) : (measure(s.slice(0, -3)) === 1 && endsCVC(s.slice(0, -3)) ? s.slice(0, -3) + 'e' : s.slice(0, -3))));

  // Step 1c: y -> i
  if (s.endsWith('y') && hasVowel(s.slice(0, -1))) return s.slice(0, -1) + 'i';
  return s;
}

function step2(s: string): string {
  const subs: Record<string, string> = {
    ational:'ate', tional:'tion', enci:'ence', anci:'ance', izer:'ize',
    abli:'able', alli:'al', entli:'ent', eli:'e', ousli:'ous',
    ization:'ize', ation:'ate', ator:'ate', alism:'al', iveness:'ive',
    fulness:'ful', ousness:'ous', aliti:'al', iviti:'ive', biliti:'ble',
  };
  for (const [suf, rep] of Object.entries(subs)) {
    if (s.endsWith(suf) && measure(s.slice(0, -suf.length)) > 0) {
      return s.slice(0, -suf.length) + rep;
    }
  }
  return s;
}

function step3(s: string): string {
  const subs: Record<string, string> = {
    icate:'ic', ative:'', alize:'al', iciti:'ic', ical:'ic', ful:'', ness:'',
  };
  for (const [suf, rep] of Object.entries(subs)) {
    if (s.endsWith(suf) && measure(s.slice(0, -suf.length)) > 0) {
      return s.slice(0, -suf.length) + rep;
    }
  }
  return s;
}

function step4(s: string): string {
  const suffixes = [
    'al','ance','ence','er','ic','able','ible','ant','ement','ment','ent',
    'ion','ou','ism','ate','iti','ous','ive','ize',
  ];
  for (const suf of suffixes) {
    if (s.endsWith(suf) && measure(s.slice(0, -suf.length)) > 1) {
      return s.slice(0, -suf.length);
    }
  }
  return s;
}

function step5(s: string): string {
  if (s.endsWith('e') && measure(s.slice(0, -1)) > 1) return s.slice(0, -1);
  if (s.endsWith('e') && measure(s.slice(0, -1)) === 1 && !endsCVC(s.slice(0, -1))) return s.slice(0, -1);
  if (s.endsWith('ll') && measure(s.slice(0, -1)) > 1) return s.slice(0, -1);
  return s;
}

export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 3) return w;
  // Only stem if the word is mostly Latin characters
  if (!/^[a-z]+$/.test(w)) return w;
  let s = w;
  s = step1(s); s = step2(s); s = step3(s); s = step4(s); s = step5(s);
  return s;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-zа-яё0-9_-]+/giu) ?? []).map(stem);
}
