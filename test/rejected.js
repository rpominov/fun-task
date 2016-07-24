// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('rejected')

test('passes value to cb', 1, t => {
  Task.rejected(2).run(t.fail, t.calledWith(2))
})

test('default onFail works', 1, t => {
  t.throws(() => { Task.rejected('err1').run(t.fail) }, /err1/)
})
