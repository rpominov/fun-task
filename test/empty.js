// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('empty')

test('doens\'t call cbs', 0, t => {
  Task.empty().run({success: t.fail, failure: t.fail})
})

test('instance method works', 0, t => {
  Task.of(1).empty().run({success: t.fail, failure: t.fail})
})
