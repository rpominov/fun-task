// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('chain')

test('works with of + of', 1, t => {
  Task.of(2).chain(x => Task.of(x + 10)).run(t.calledWith(12))
})

test('works with of + rejected', 1, t => {
  Task.of(2).chain(x => Task.rejected(x + 10)).run(t.fail, t.calledWith(12))
})

test('works with rejected + of', 1, t => {
  Task.rejected(2).chain(x => Task.of(x + 10)).run(t.fail, t.calledWith(2))
})

// TODO: more tests (cancelation etc.)
