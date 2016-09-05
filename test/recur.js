// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('recur')

test('works...', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  Task.of(5).recur(x => {
    stub(x)
    return x === 0 ? Task.rejected(0) : Task.of(x - 1)
  }).run({failure: t.calledWith(0)})
})

test('works with a lot of sync iterations', 1, t => {
  Task.of(50000).recur(x => {
    return x === 0 ? Task.rejected(0) : Task.of(x - 1)
  }).run({failure: t.calledWith(0)})
})
