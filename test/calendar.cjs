const test = require('node:test');
const assert = require('node:assert/strict');
require('../dist/suggestions.js');
require('../dist/logic.js');
const { parseDate, dateString, nextPeriod, phaseFor, calendar, validate } = globalThis.WarmDays;
const today = parseDate('2026-10-06');
const beforeNine = Date.parse('2026-10-06T00:00:00Z');
const settings = { last: '2026-09-15', cycle: 28, duration: 5, time: '09:00', fruits: '榴莲,梨' };

test('经前七天的开始日期与跨年计算', () => {
  assert.equal(nextPeriod(parseDate(settings.last), 28, today) - 7, today);
  assert.equal(dateString(nextPeriod(parseDate('2026-12-10'), 28, parseDate('2026-12-31'))), '2027-01-07');
  assert.ok(Number.isNaN(parseDate('2026-02-30')));
  assert.notEqual(validate({ ...settings, last: '2026-10-07' }, today), '');
});

test('北京时间、未来提醒和经期提醒数量', () => {
  const legacy = calendar(settings, today, beforeNine);
  assert.equal(legacy.count, 21);
  const full = calendar({ ...settings, includeDuring: true }, today, beforeNine);
  assert.equal(full.preCount, 21);
  assert.equal(full.duringCount, 15);
  assert.match(full.text, /DTSTART:20261006T010000Z/);
  assert.match(full.text, /TRIGGER:PT0M/);
  assert.equal(calendar(settings, today, Date.parse('2026-10-06T02:00:00Z')).count, 20);
  for (const line of full.text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});

test('已记录的经期与预测经期分开标注，并补充本次剩余天数', () => {
  const current = { ...settings, last: '2026-10-04', includeDuring: true };
  assert.equal(phaseFor(current, today).day, 3);
  assert.equal(phaseFor(current, today).estimated, false);
  assert.equal(calendar(current, today, beforeNine).duringCount, 18);
  assert.equal(phaseFor({ ...settings, last: '2026-09-06' }, today).estimated, true);
});

test('短周期与较长经期重叠时，不创建重复事件', () => {
  const result = calendar({ ...settings, last: '2026-10-04', cycle: 15, duration: 14, includeDuring: true }, today, beforeNine);
  const ids = result.text.split('\r\n').filter(line => line.startsWith('UID:'));
  assert.equal(new Set(ids).size, ids.length);
});

test('搭配尊重个人少吃水果清单', () => {
  for (let day = 0; day < 7; day++) {
    const selection = WarmSuggestions.pairing('pre', day, settings.fruits);
    assert.ok(selection.every(item => !item.includes('榴莲') && !item.includes('梨')));
  }
});
