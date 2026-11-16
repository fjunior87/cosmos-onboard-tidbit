import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('./main.js', import.meta.url), 'utf8')

test('notify submissions stay on the page and show new and duplicate confirmations', () => {
  const emailField = { value: '' }
  const statusLine = { textContent: '', hidden: true }
  const form = new EventTarget()
  form.reset = () => { emailField.value = '' }
  const elements = {
    '#notify-form': form,
    '#notify-email': emailField,
    '#notify-status': statusLine,
  }
  const storage = new Map()

  runInNewContext(source, {
    document: { querySelector: (selector) => elements[selector] },
    window: {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    },
  })

  const address = 'visitor@example.com'
  for (const message of [
    `Thank you. We will write to ${address} on the morning we open.`,
    `${address} is already on the list. We will write on the morning we open.`,
  ]) {
    emailField.value = address
    const event = new Event('submit', { cancelable: true })
    form.dispatchEvent(event)

    assert.equal(event.defaultPrevented, true, 'native submission must be canceled')
    assert.equal(statusLine.hidden, false)
    assert.equal(statusLine.textContent, message)
    assert.equal(emailField.value, '')
    assert.deepEqual(JSON.parse(storage.get('cpc.notify-list')), [address])
  }
})
