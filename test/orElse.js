// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('orElse')

test('works with of + of', 1, t => {
  Task.of(2).orElse(x => Task.of(x + 10)).run(t.calledWith(2))
})

test('works with of + rejected', 1, t => {
  Task.of(2).orElse(x => Task.rejected(x + 10)).run(t.calledWith(2))
})

test('works with rejected + of', 1, t => {
  Task.rejected(2).orElse(x => Task.of(x + 10)).run(t.calledWith(12))
})

test('works with rejected + rejected', 1, t => {
  Task.rejected(2).orElse(x => Task.rejected(x + 10)).run({failure: t.calledWith(12)})
})

test('cancelation works (orig. task)', 1, t => {
  Task.create(() => t.calledOnce()).orElse(() => Task.of()).run({})()
})

test('cancelation works (spawned task)', 1, t => {
  Task.rejected().orElse(() => Task.create(() => t.calledOnce())).run({})()
})

test('this==undefined in success cd', 1, t => {
  Task.of(2).orElse(x => Task.rejected(x)).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.rejected(2).orElse(x => Task.rejected(x)).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.rejected(2).orElse(function(x) { t.equal(this, undefined); return Task.of(x) }).run({})
})
