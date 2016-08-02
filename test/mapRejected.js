// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('mapRejected')

test('works with .rejected', 1, t => {
  Task.rejected(2).mapRejected(x => x + 10).run({failure: t.calledWith(12)})
})

test('this==undefined in success cd', 1, t => {
  Task.of(2).mapRejected(x => x).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.rejected(2).mapRejected(x => x).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.rejected(2).mapRejected(function(x) { t.equal(this, undefined); return x }).run({failure(){}})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from parent task (no catch cb)', 1, t => {
  t.throws(() => {
    thrower1.mapRejected(x => x).run({})
  }, /err1/)
})

test('exception thrown from parent task (with catch cb)', 1, t => {
  thrower2.mapRejected(x => x).run({catch: t.calledWith(2)})
})

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.rejected(1).mapRejected(x => { throw new Error('err1') }).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.rejected(1).mapRejected(x => { throw 2 }).run({catch: t.calledWith(2)})
})
