// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('chain')

test('works with of + of', 1, t => {
  Task.of(2).chain(x => Task.of(x + 10)).run(t.calledWith(12))
})

test('works with of + rejected', 1, t => {
  Task.of(2).chain(x => Task.rejected(x + 10)).run({failure: t.calledWith(12)})
})

test('works with rejected + of', 1, t => {
  Task.rejected(2).chain(x => Task.of(x + 10)).run({failure: t.calledWith(2)})
})

test('cancelation works (orig. task)', 1, t => {
  Task.create(() => t.calledOnce()).chain(() => Task.of()).run({})()
})

test('cancelation works (spawned task)', 1, t => {
  Task.of().chain(() => Task.create(() => t.calledOnce())).run({})()
})

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.of().chain(() => { throw new Error('err1') }).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.of().chain(() => { throw 2 }).run({catch: t.calledWith(2)})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from fn (no catch cb, chained)', 1, t => {
  t.throws(() => {
    thrower1.chain(() => Task.of()).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb, chained)', 1, t => {
  thrower2.chain(() => Task.of()).run({catch: t.calledWith(2)})
})

test('exception thrown from fn (no catch cb, inner)', 1, t => {
  t.throws(() => {
    Task.of().chain(() => thrower1).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb, inner)', 1, t => {
  Task.of().chain(() => thrower2).run({catch: t.calledWith(2)})
})

test('exception thrown from fn (with catch cb, inner, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw 2 })
  Task.of().chain(() => thrower).run({catch: t.calledWith(2)})
  s()
})

test('exception thrown from fn (no catch cb, inner, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw new Error('err1') })
  Task.of().chain(() => thrower).run({})
  t.throws(s, /err1/)
})
