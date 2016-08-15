// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('concat')

test('works', 1, t => {
  Task.of(1).concat(Task.of(2)).run(t.calledWith(1))
})

test('static alias works', 1, t => {
  Task.concat(Task.of(1), Task.of(2)).run(t.calledWith(1))
})
