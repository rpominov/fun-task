// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('map')

test('works with of', 1, t => {
  Task.of(2).map(x => x + 10).run(t.calledWith(12))
})
