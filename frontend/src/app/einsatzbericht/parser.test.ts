// Schneller Test für parseBlaulichtAlarmtext ohne Angular-Setup

// Test-Daten
const example1 = '(16:59) T1 Objekt/Baum - Umgestürzt. Weinbergstrasse 21, 2432 Schwadorf: Bäume auf Strasse (48.075, 16.5827)';
const example2 = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';

// Mock parser methods for testing
function normalizeAlarmText(value: string): string {
  return String(value ?? '')
    .replace(/\\\\n/gi, '\n')
    .replace(/\\\\r\\\\n/gi, '\n')
    .replace(/\\\\r/gi, '\n')
    .trim();
}

function removeCoordinates(value: string): string {
  return String(value ?? '')
    .replace(/\b(?:koordinaten?|coords?)\b\s*[:=]?\s*\d{1,2}[.,]\d{3,}\s*[,/ ]\s*\d{1,3}[.,]\d{3,}\b/gi, ' ')
    .replace(/\b\d{1,2}[.,]\d{3,}\s*[,/ ]\s*\d{1,3}[.,]\d{3,}\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanupAlarmSegment(value: string): string {
  const withoutUrls = String(value ?? '').replace(/https?:\/\/\S+/gi, ' ');
  const withoutCoords = removeCoordinates(withoutUrls);
  return withoutCoords
    .replace(/\s+/g, ' ')
    .replace(/^[,;|:-]+/, '')
    .replace(/[,;|:-]+$/, '')
    .replace(/\(\s*\)/g, '') // leere Klammern entfernen
    .trim();
}

function extractAlarmToken(value: string): string {
  const match = String(value ?? '').match(/\b(BSW|[BTS])\s?(\d{1,2})([A-Z]?)\b/i);
  if (!match) {
    return '';
  }
  return `${(match[1] ?? '').toUpperCase()}${match[2] ?? ''}${(match[3] ?? '').toUpperCase()}`;
}

function removeLeadingTimeAndToken(value: string, alarmToken: string): string {
  let normalized = String(value ?? '').trim();
  normalized = normalized.replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*[-|,:]?\s*/i, '');
  normalized = normalized.replace(/^\(\d{1,2}:\d{2}(?::\d{2})?\)\s*[-|,:]?\s*/i, '');
  normalized = normalized.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*[-|,:]?\s*/i, '');
  if (alarmToken) {
    const escapedToken = String(alarmToken).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/([A-Za-z]+)(\d+)/, '$1\\s*$2');
    normalized = normalized.replace(new RegExp(`^${escapedToken}\\b\\s*[-|,:]?\\s*`, 'i'), '');
  }
  normalized = normalized.replace(/^(alarmierung|alarm|meldung)\s*[:-]\s*/i, '');
  return normalized.trim();
}

function _sanitizeAlarmstichwort(value: string): string {
  return String(value ?? '')
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, '')
    .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAlarmSegments(value: string): string[] {
  const segments: string[] = [];
  String(value ?? '')
    .split('\n')
    .map((line) => (line ?? '').trim())
    .filter((line) => line !== '')
    .forEach((line) => {
      line
        .split(/[,;|]|\.\s+/)
        .map((part) => (part ?? '').trim())
        .filter((part) => part !== '')
        .forEach((part) => segments.push(part));
    });
  return segments;
}

function isCoordinateOnlySegment(value: string): boolean {
  return /^\(\d{1,2}[.,]\d+\s*[,/]\s*\d{1,3}[.,]\d+\)$/.test(value);
}

function looksLikeAddress(value: string): boolean {
  const normalized = cleanupAlarmSegment(value);
  if (!normalized || isCoordinateOnlySegment(normalized)) {
    return false;
  }

  if (/^(?:auf|an|in|zu|bei|von|durch|unter|ueber|aus|hat|ist|wird|befindet|liegt|gegen)\b/i.test(normalized)) {
    return false;
  }

  if (/\b\d{4}\b/.test(normalized)) {
    return true;
  }

  if (/\b(?:L\d+|km\s*\d)/i.test(normalized)) {
    return true;
  }

  if (/\b[A-Za-z][A-Za-z.'\- ]+\s+\d{1,4}[A-Za-z0-9/-]*\b/i.test(normalized)) {
    return true;
  }

  if (/\b(?:strasse|str\.|gasse|weg|platz|allee|ring|kai|hof|siedlung|zeile)\b/i.test(normalized)) {
    if (/\d{1,4}|km|L\d+/i.test(normalized)) {
      return true;
    }
  }

  return false;
}

function isAlarmMetaSegment(value: string): boolean {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return true;
  }
  if (/^\(\d{1,2}[.,]\d+\s*[,/]\s*\d{1,3}[.,]\d+\)$/.test(normalized)) {
    return true;
  }
  if (/^(?:leitstelle|lzeichen|alarm|meldung|timestamp|zeit)/i.test(normalized)) {
    return true;
  }
  if (/\(.*->\s.*\)/.test(normalized)) {
    return true;
  }
  return false;
}

function trySplitSegment(segment: string): { alarmstichwort: string; einsatzadresse: string } {
  const cleaned = cleanupAlarmSegment(segment);
  if (!cleaned) {
    return { alarmstichwort: '', einsatzadresse: '' };
  }

  const separators = [' - ', ':'];
  for (const separator of separators) {
    const splitIndex = cleaned.indexOf(separator);
    if (splitIndex <= 0 || splitIndex >= cleaned.length - separator.length) {
      continue;
    }

    const left = cleanupAlarmSegment(removeLeadingTimeAndToken(cleaned.slice(0, splitIndex), ''));
    const right = cleanupAlarmSegment(cleaned.slice(splitIndex + separator.length));
    
    const leftIsAddress = left && looksLikeAddress(left);
    const rightIsAddress = right && looksLikeAddress(right);
    
    if (leftIsAddress && rightIsAddress) {
      return { alarmstichwort: left, einsatzadresse: left };
    }
    
    if (rightIsAddress) {
      return { alarmstichwort: left || cleaned, einsatzadresse: right };
    }
    
    if (leftIsAddress) {
      return { alarmstichwort: '', einsatzadresse: left };
    }
  }

  return { alarmstichwort: cleanupAlarmSegment(removeLeadingTimeAndToken(cleaned, '')), einsatzadresse: '' };
}

function extractStichwortAndAdresse(segments: string[], fallbackText: string): { alarmstichwort: string; einsatzadresse: string } {
  let alarmstichwort = '';
  const adressSegmente: string[] = [];

  for (const rawSegment of segments) {
    const segment = cleanupAlarmSegment(rawSegment);
    if (!segment || isAlarmMetaSegment(segment)) {
      console.log(`    [skip] ${segment} (meta or empty)`);
      continue;
    }

    const splitResult = trySplitSegment(segment);
    if (!alarmstichwort && splitResult.alarmstichwort) {
      alarmstichwort = splitResult.alarmstichwort;
      console.log(`    [stichwort from trySplit] ${alarmstichwort}`);
    }
    if (splitResult.einsatzadresse) {
      adressSegmente.push(splitResult.einsatzadresse);
      console.log(`    [adresse from trySplit] ${splitResult.einsatzadresse}`);
      continue;
    }

    const cleaned = cleanupAlarmSegment(removeLeadingTimeAndToken(segment, ''));
    if (!cleaned) {
      continue;
    }

    // Zuerst: ist es eine gültige Adresse (auch wenn Meta-Segment mit Klammern)?
    if (looksLikeAddress(cleaned)) {
      adressSegmente.push(cleaned);
      console.log(`    [adresse] ${cleaned}`);
      continue;
    }

    // Jetzt Meta-Segment checken (nur NACH Adresse-Check)
    if (isAlarmMetaSegment(cleaned)) {
      console.log(`    [skip meta] ${cleaned}`);
      continue;
    }

    if (!alarmstichwort) {
      alarmstichwort = cleaned;
      console.log(`    [stichwort] ${cleaned}`);
      continue;
    }

    if (adressSegmente.length > 0) {
      adressSegmente.push(cleaned);
      console.log(`    [fallback adresse] ${cleaned}`);
    }
  }

  if (!alarmstichwort) {
    alarmstichwort = cleanupAlarmSegment(removeLeadingTimeAndToken(fallbackText, ''));
  }

  const einsatzadresse = adressSegmente.length > 0 ? adressSegmente.join(', ') : '';
  return { alarmstichwort, einsatzadresse };
}

console.log('=== EXAMPLE 1 ===');

console.log('Input:', example1);
console.log('');

let normalized = normalizeAlarmText(example1);
console.log('1. normalizeAlarmText:', normalized);

const alarmToken = extractAlarmToken(normalized);
console.log('2. extractAlarmToken:', alarmToken);

let afterRemoveTime = removeLeadingTimeAndToken(normalized, alarmToken);
console.log('3. removeLeadingTimeAndToken:', afterRemoveTime);

const afterRemoveCoords = removeCoordinates(afterRemoveTime);
console.log('3b. removeCoordinates:', afterRemoveCoords);

const segments = toAlarmSegments(afterRemoveCoords);
console.log('4. toAlarmSegments:', segments);

console.log('\n--- Segment processing ---');
segments.forEach((seg, i) => {
  const cleaned = cleanupAlarmSegment(seg);
  const isMeta = isAlarmMetaSegment(cleaned);
  const isAddr = looksLikeAddress(cleaned);
  console.log(`Segment ${i}: "${seg}"`);
  console.log(`  Cleaned: "${cleaned}"`);
  console.log(`  IsMeta: ${isMeta}`);
  console.log(`  IsAddress: ${isAddr}`);
});

console.log('\n--- Full extractStichwortAndAdresse processing ---');
const result1 = extractStichwortAndAdresse(segments, afterRemoveCoords);
console.log('Result:');
console.log(`  alarmstichwort: "${result1.alarmstichwort}"`);
console.log(`  einsatzadresse: "${result1.einsatzadresse}"`);
console.log('Expected:');
console.log(`  alarmstichwort: "Objekt/Baum - Umgestürzt"`);
console.log(`  einsatzadresse: "Weinbergstrasse 21, 2432 Schwadorf"`);
console.log('');

console.log('\n\n=== EXAMPLE 2 ===');
console.log('Input:', example2);
console.log('');

normalized = normalizeAlarmText(example2);
console.log('1. normalizeAlarmText:', normalized);

const alarmToken2 = extractAlarmToken(normalized);
console.log('2. extractAlarmToken:', alarmToken2);

afterRemoveTime = removeLeadingTimeAndToken(normalized, alarmToken2);
console.log('3. removeLeadingTimeAndToken:', afterRemoveTime);

const afterRemoveCoords2 = removeCoordinates(afterRemoveTime);
console.log('3b. removeCoordinates:', afterRemoveCoords2);

const segments2 = toAlarmSegments(afterRemoveCoords2);
console.log('4. toAlarmSegments:', segments2);

console.log('\n--- Segment processing ---');
segments2.forEach((seg, i) => {
  const cleaned = cleanupAlarmSegment(seg);
  const isMeta = isAlarmMetaSegment(cleaned);
  const isAddr = looksLikeAddress(cleaned);
  console.log(`Segment ${i}: "${seg}"`);
  console.log(`  Cleaned: "${cleaned}"`);
  console.log(`  IsMeta: ${isMeta}`);
  console.log(`  IsAddress: ${isAddr}`);
});

console.log('\n--- Full extractStichwortAndAdresse processing ---');
const result2 = extractStichwortAndAdresse(segments2, afterRemoveCoords2);
console.log('Result:');
console.log(`  alarmstichwort: "${result2.alarmstichwort}"`);
console.log(`  einsatzadresse: "${result2.einsatzadresse}"`);
console.log('Expected:');
console.log(`  alarmstichwort: "Bergung - PKW"`);
console.log(`  einsatzadresse: "L2004 km 1.4"`);

