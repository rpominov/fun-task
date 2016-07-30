// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('all')

test('works with of', 1, t => {
  Task.all([Task.of(2), Task.of('42')]).run(t.calledWith([2, '42']))
})

test('works with rejected', 1, t => {
  Task.all([Task.of(2), Task.rejected('42')]).run({failure: t.calledWith('42')})
})

test('cancelation works', 2, t => {
  Task.all([
    Task.create(() => t.calledOnce()),
    Task.create(() => t.calledOnce()),
  ]).run({})()
})

test('after one task fails others are canceled (sync fail)', 1, t => {
  Task.all([
    Task.rejected(2),
    Task.create(() => t.calledOnce()),
  ]).run({failure(){}})
})

test('after one task fails others are canceled (async fail)', 1, t => {
  let f = (null: any)
  Task.all([
    Task.create((_, _f) => { f = _f }),
    Task.create(() => t.calledOnce()),
  ]).run({failure(){}})
  f()
})
