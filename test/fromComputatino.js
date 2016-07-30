// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('fromComputation')

test('default onFail cb in run works', 1, t => {
  t.throws(() => Task.create((s, f) => f('err1')).run({}), /err1/)
})

test('succ value from computation is passed to run() cb', 1, t => {
  Task.create((s, f) => s(2)).run(t.calledWith(2))
})

test('cancelation cb returned by computation is called', 1, t => {
  Task.create(() => t.calledOnce()).run({})()
})

test('cancelation cb returned by computation is called only once', 1, t => {
  const cancel = Task.create(() => t.calledOnce()).run({})
  cancel()
  cancel()
})

test('after a cuss, cancelation cb returned by computation isn\'t called ', 0, t => {
  Task.create((s) => { s(1); return t.fail }).run({})()
})

test('after a cuss, all calls of computation cbs are ignored', 1, t => {
  let s = (null: any)
  let f = (null: any)
  const task = Task.create((_s, _f) => {s = _s; f = _f})
  task.run({success: t.calledOnce(), failure: t.fail})
  s()
  s()
  f()
})

test('after a fail, all calls of computation cbs are ignored', 1, t => {
  let s = (null: any)
  let f = (null: any)
  const task = Task.create((_s, _f) => {s = _s; f = _f})
  task.run({success: t.fail, failure: t.calledOnce()})
  f()
  f()
  s()
})

test('after cancelation, all calls of computation cbs are ignored', 0, t => {
  let s = (null: any)
  let f = (null: any)
  const task = Task.create((_s, _f) => {s = _s; f = _f})
  task.run({success: t.fail, failure: t.fail})()
  s()
  f()
})

test('exception thrown from computation (no catch cb)', 1, t => {
  t.throws(() => Task.create(() => { throw new Error('err1') }).run({}), /err1/)
})

test('exception thrown from computation (with catch cb)', 1, t => {
  Task.create(() => { throw 2 }).run({catch: t.calledWith(2)})
})

test('new Task() throws', 1, t => {
  t.throws(() => new Task(), /Task\.create/)
})
