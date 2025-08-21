import assert from 'assert';
import { parseReasoningEntry } from '../src/utils/parseReasoning.mjs';

function test(name, fn) {
  try {
    fn();
    console.log(`\u2714\ufe0f ${name}`);
  } catch (err) {
    console.error(`\u274c ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('parses negative percentages', () => {
  const { rule, weight } = parseReasoningEntry('Loss of power -5.5%');
  assert.strictEqual(weight, -5.5);
  assert.strictEqual(rule, 'Loss of power');
});

test('parses trailing unsigned parenthetical', () => {
  const { rule, weight } = parseReasoningEntry('Good fortune (12.75)');
  assert.strictEqual(weight, 12.75);
  assert.strictEqual(rule, 'Good fortune');
});

test('uses last numeric token when multiple present', () => {
  const { rule, weight } = parseReasoningEntry('Mixed signals (+3.5) (-4.25)');
  assert.strictEqual(weight, -4.25);
  assert.strictEqual(rule, 'Mixed signals (+3.5)');
});

test('ignores numeric references embedded in text', () => {
  const { rule, weight } = parseReasoningEntry('Ruler of 7 houses');
  assert.strictEqual(weight, 0);
  assert.strictEqual(rule, 'Ruler of 7 houses');
});
