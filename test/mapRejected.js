// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('mapRejected')

test('works with .rejected', 1, t => {
  Task.rejected(2).mapRejected(x => x + 10).run({failure: t.calledWith(12)})
})
