// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('all')

test('works with of', 1, t => {
  Task.all([Task.of(2), Task.of('42')]).run(t.calledWith([2, '42']))
})

test('works with rejected', 1, t => {
  Task.all([Task.of(2), Task.rejected('42')]).run(t.fail, t.calledWith('42'))
})

test('cancelation works', 2, t => {
  Task.all([
    Task.create(() => t.calledOnce()),
    Task.create(() => t.calledOnce()),
  ]).run(() => {})()
})