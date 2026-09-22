/* Small pure helpers, kept apart so they can be tested without Firebase. */
'use strict';
const Gen = require('./gen.js');

const GRACE_MS = 15 * 60 * 1000;          // a run that started before midnight still counts for its day
const DAY_MS = 24 * 3600 * 1000;

/* Names: short, plain, and not rude. Anything else is shown as anonymous. */
const BLOCK = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'dick', 'cock', 'pussy', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'porn', 'sex'];
function cleanName(v) {
  if (typeof v !== 'string') return '';
  const n = v.replace(/[^A-Za-z0-9 _.\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const flat = n.toLowerCase().replace(/0/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z]/g, '');
  if (BLOCK.some((w) => flat.includes(w))) return '';
  return n;
}

/* Which days a submission may be for: today, or yesterday for the first
   quarter of an hour after midnight UTC. */
function dayWindow(now) {
  const today = Gen.utcDay(now);
  const midnight = Date.parse(today + 'T00:00:00Z');
  const yesterday = Gen.utcDay(midnight - DAY_MS / 2);
  return { today, yesterday, graceOpen: now - midnight < GRACE_MS };
}

module.exports = { cleanName, dayWindow, GRACE_MS };
