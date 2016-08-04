// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('common')

test('new Task() throws', 1, t => {
  t.throws(() => new Task(), /Task\.create/)
})

test('default onFail cb in run works', 1, t => {
  t.throws(() => Task.rejected('err1').run({}), /err1/)
})

test('default onFail cb throws the same Error if argument is an Error', 1, t => {
  const e = new Error('')
  try {
    Task.rejected(e).run({})
  } catch (_e) {
    t.ok(e === _e)
  }
})

test('runAndLog works (success)', 0, () => {
  // something goes sideways if we try to mock console,
  // so we just check that method exists and runs fine
  Task.of(2).runAndLog()
})

test('runAndLog works (failure)', 0, () => {
  // same deal...
  Task.rejected(2).runAndLog()
})
