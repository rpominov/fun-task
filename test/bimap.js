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
