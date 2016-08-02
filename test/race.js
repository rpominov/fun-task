// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('race')

test('works with of', 1, t => {
  Task.race([Task.of(2), Task.of(3), Task.rejected(4)]).run({success: t.calledWith(2), failure: t.fail})
})

test('works with rejected', 1, t => {
  Task.race([Task.rejected(2), Task.of(3), Task.rejected(4)]).run({success: t.fail, failure: t.calledWith(2)})
})

test('cancelation works', 2, t => {
  Task.race([
    Task.create(() => t.calledOnce()),
    Task.create(() => t.calledOnce()),
  ]).run({})()
})

test('after one task comletes others a canceled (sync complete)', 1, t => {
  Task.race([
    Task.of(2),
    Task.create(() => t.calledOnce()),
  ]).run({})
})

test('after one task comletes others a canceled (async complete)', 1, t => {
  let s = (null: any)
  Task.race([
    Task.create(_s => { s = _s }),
    Task.create(() => t.calledOnce()),
  ]).run({})
  s()
})

test('concat is an alias for race', 1, t => {
  Task.of(1).concat(Task.of(2)).run(t.calledWith(1))
})

test('this==undefined in success cd', 1, t => {
  Task.race([Task.of(2)]).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.race([Task.rejected(2)]).run({failure() { t.equal(this, undefined) }})
})
