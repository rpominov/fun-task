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

const of1 = Task.of(1)
const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown in a child task (no catch cb)', 2, t => {
  t.throws(() => {
    Task.all([of1, thrower1]).run({})
  }, /err1/)
  t.throws(() => {
    Task.all([thrower1, of1]).run({})
  }, /err1/)
})

test('exception thrown in a child task (with catch cb, exception is the first completion)', 1, t => {
  Task.all([thrower2, of1]).run({catch: t.calledWith(2), success: t.fail})
})

test('exception thrown in a child task (with catch cb, exception is the second completion)', 1, t => {
  Task.all([of1, thrower2]).run({catch: t.calledWith(2), success: t.fail})
})
