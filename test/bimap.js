// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('bimap')

test('works with of', 1, t => {
  Task.of(2).bimap(x => x, x => x + 10).run(t.calledWith(12))
})

test('works with .rejected', 1, t => {
  Task.rejected(2).bimap(x => x + 10, x => x).run({failure: t.calledWith(12)})
})

test('static alias works', 2, t => {
  Task.bimap(x => x, x => x + 10, Task.of(2)).run(t.calledWith(12))
  Task.bimap(x => x + 10, x => x, Task.rejected(2)).run({failure: t.calledWith(12)})
})
