// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('fantasy-land')

test('concat is an alias for race', 1, t => {
  Task.of(1).concat(Task.of(2)).run(t.calledWith(1))
})

test('ap works', 1, t => {
  Task.of(x => x + 1).ap(Task.of(2)).run(t.calledWith(3))
})

test('of indtance method works', 1, t => {
  Task.of(1).of(3).run(t.calledWith(3))
})

test('empty indtance method works', 0, t => {
  Task.of(1).empty().run(t.fail, t.fail)
})
