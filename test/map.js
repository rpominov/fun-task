// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('map')

test('works with of', 1, t => {
  Task.of(2).map(x => x + 10).run(t.calledWith(12))
})

test('this==undefined in success cd', 1, t => {
  Task.of(2).map(x => x).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.rejected(2).map(x => x).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.of(2).map(function(x) { t.equal(this, undefined); return x }).run({})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from parent task (no catch cb)', 1, t => {
  t.throws(() => {
    thrower1.map(x => x).run({})
  }, /err1/)
})

test('exception thrown from parent task (with catch cb)', 1, t => {
  thrower2.map(x => x).run({catch: t.calledWith(2)})
})

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.of(1).map(() => { throw new Error('err1') }).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.of(1).map(() => { throw 2 }).run({catch: t.calledWith(2)})
})
