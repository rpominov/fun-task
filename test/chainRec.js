// @flow

import _test from 'lobot/test'
import Task from '../src'

function computeMaxCallStackSize() {
  try {
    return 1 + computeMaxCallStackSize()
  } catch (e) {
    return 1
  }
}
const MAX_STACK_SIZE = computeMaxCallStackSize()

const test = _test.wrap('chainRec')

const later = x => Task.create(s => { setTimeout(() => { s(x) }) })

test('0 iterations', 1, t => {
  const fn = (_, d, x) => Task.of(d(x))
  Task.chainRec(fn, 2).run({success: t.calledWith(2)})
})

test('1 iteration (sync)', 1, t => {
  const fn = (n, d, x) => x === 0 ? Task.of(d(x)) : Task.of(n(x - 1))
  Task.chainRec(fn, 1).run({success: t.calledWith(0)})
})

test.async('1 iteration (async)', 1, t => {
  const fn = (n, d, x) => x === 0 ? Task.of(d(x)) : later(n(x - 1))
  Task.chainRec(fn, 1).run({success: t.calledWith(0)})
})

test('cancelation - first spawned', 1, t => {
  const spawned = Task.create(() => t.calledOnce())
  Task.chainRec(() => spawned, 0).run({})()
})

test('cancelation - second spawned - first sync', 1, t => {
  const spawned = Task.create(() => t.calledOnce())
  Task.chainRec((n, d, x) => x === 1 ? Task.of(n(2)) : spawned, 1).run({})()
})

test('cancelation - second spawned - first async', 1, t => {
  let s: any = null
  const first = n => Task.create(_s => {s = x => _s(n(x))})
  const second = Task.create(() => t.calledOnce())
  const cancel = Task.chainRec((n, d, x) => x === 1 ? first(n) : second, 1).run({})
  s(2)
  cancel()
})

test('count down sync', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  const fn = (n, d, x) => {
    stub(x)
    return x === 0 ? Task.of(d(x)) : Task.of(n(x - 1))
  }
  Task.chainRec(fn, 5).run({success: t.calledWith(0)})
})

test.async('count down async', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  const fn = (n, d, x) => {
    stub(x)
    return x === 0 ? Task.of(d(x)) : later(n(x - 1))
  }
  Task.chainRec(fn, 5).run({success: t.calledWith(0)})
})

if (!process.env.IGNORE_SLOW_TESTS) {
  test('works with a lot of sync iterations', 1, t => {
    const fn = (n, d, x) => x === 0 ? Task.of(d(x)) : Task.of(n(x - 1))
    Task.chainRec(fn, MAX_STACK_SIZE + 1).run({success: t.calledWith(0)})
  })
}

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.chainRec(() => { throw new Error('err1') }, 1).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.chainRec(() => { throw 2 }, 1).run({catch: t.calledWith(2)})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from first spawned (no catch cb)', 1, t => {
  t.throws(() => {
    Task.chainRec(() => thrower1, 1).run({})
  }, /err1/)
})

test('exception thrown from second spawned (no catch cb)', 1, t => {
  t.throws(() => {
    Task.chainRec((n, d, x) => x === 1 ? Task.of(n(2)) : thrower1, 1).run({})
  }, /err1/)
})

test('exception thrown from first spawned (with catch cb)', 1, t => {
  Task.chainRec(() => thrower2, 1).run({catch: t.calledWith(2)})
})

test('exception thrown from second spawned (with catch cb)', 1, t => {
  Task.chainRec((n, d, x) => x === 1 ? Task.of(n(2)) : thrower2, 1).run({catch: t.calledWith(2)})
})

test('exception thrown from second spawned (with catch cb, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw 2 })
  Task.chainRec((n, d, x) => x === 1 ? Task.of(n(2)) : thrower, 1).run({catch: t.calledWith(2)})
  s()
})

test('exception thrown from second spawned (no catch cb, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw new Error('err1') })
  Task.chainRec((n, d, x) => x === 1 ? Task.of(n(2)) : thrower, 1).run({})
  t.throws(s, /err1/)
})

test('this==undefined in success cd', 1, t => {
  Task.chainRec((n, d, x) => Task.of(d(x)), 0).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.chainRec(() => Task.rejected(), 0).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.chainRec(function() {
    t.equal(this, undefined)
    return Task.rejected()
  }, 0).run({failure(){}})
})
