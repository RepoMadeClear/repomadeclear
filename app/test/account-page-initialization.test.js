import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('free-access initialization tolerates absent optional marketing cards', () => {
  const source = readFileSync(new URL('../src/web/client.js', import.meta.url), 'utf8');
  const start = source.indexOf('function configureAccessMode()');
  const end = source.indexOf("$('auth-form').onsubmit", start);
  const element = () => ({
    hidden: false,
    textContent: '',
    querySelector: () => ({textContent: ''}),
    querySelectorAll: () => Array.from({length: 3}, () => ({textContent: ''})),
  });
  const elements = new Map();
  const context = {
    config: {freeAccess: true},
    $: id => {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    document: {
      querySelector: selector => selector === '#pricing'
        ? {querySelector: () => null, querySelectorAll: () => []}
        : null,
    },
  };
  assert.doesNotThrow(() => vm.runInNewContext(source.slice(start, end) + '\nconfigureAccessMode();', context));
  assert.equal(elements.get('checkout').hidden, true);
});
