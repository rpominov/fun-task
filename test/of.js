// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('of')

test('passes value to cb', 1, t => {
  Task.of(2).run(t.calledWith(2))
})

test('this==undefined in cd', 1, t => {
  Task.of(2).run(function() { t.equal(this, undefined) })
})

test('instance method works', 1, t => {
  Task.of(1).of(3).run(t.calledWith(3))
})
