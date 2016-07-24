// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('empty')

test('doens\'t call cbs', 0, t => {
  Task.empty().run(t.fail, t.fail)
})
