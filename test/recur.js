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

const test = _test.wrap('recur')

const later = x => Task.create(s => { setTimeout(() => { s(x) }) })

test('0 iterations', 1, t => {
  Task.of(2).recur(x => Task.rejected(x)).run({failure: t.calledWith(2)})
})

test('0 iterations (static alias)', 1, t => {
  Task.recur(x => Task.rejected(x), Task.of(2)).run({failure: t.calledWith(2)})
})

test('1 iteration (sync)', 1, t => {
  Task.of(1).recur(x => x === 0 ? Task.rejected(x) : Task.of(x - 1)).run({failure: t.calledWith(0)})
})

test.async('1 iteration (async)', 1, t => {
  Task.of(1).recur(x => x === 0 ? Task.rejected(x) : later(x - 1)).run({failure: t.calledWith(0)})
})

test('cancelation - initial', 1, t => {
  Task.create(() => t.calledOnce()).recur(() => Task.of(1)).run({})()
})

test('cancelation - first spawned - initial sync', 1, t => {
  Task.of(1).recur( () => Task.create(() => t.calledOnce()) ).run({})()
})

test('cancelation - first spawned - initial async', 1, t => {
  let s: any = null
  const orig = Task.create(_s => {s = _s})
  const spawned = Task.create(() => t.calledOnce())
  const cancel = orig.recur(() => spawned).run({})
  s()
  cancel()
})

test('count down sync', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  Task.of(5).recur(x => {
    stub(x)
    return x === 0 ? Task.rejected(0) : Task.of(x - 1)
  }).run({failure: t.calledWith(0)})
})

test.async('count down async', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  Task.of(5).recur(x => {
    stub(x)
    return x === 0 ? Task.rejected(0) : later(x - 1)
  }).run({failure: t.calledWith(0)})
})

if (!process.env.IGNORE_SLOW_TESTS) {
  test('works with a lot of sync iterations', 1, t => {
    Task.of(MAX_STACK_SIZE + 1).recur(x => {
      return x === 0 ? Task.rejected(0) : Task.of(x - 1)
    }).run({failure: t.calledWith(0)})
  })
}

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.of().recur(() => { throw new Error('err1') }).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.of().recur(() => { throw 2 }).run({catch: t.calledWith(2)})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from parent task (no catch cb)', 1, t => {
  t.throws(() => {
    thrower1.recur(() => Task.of()).run({})
  }, /err1/)
})

test('exception thrown from parent task (with catch cb)', 1, t => {
  thrower2.chain(() => Task.of()).run({catch: t.calledWith(2)})
})

test('exception thrown from child task (no catch cb)', 1, t => {
  t.throws(() => {
    Task.of().recur(() => thrower1).run({})
  }, /err1/)
})

test('exception thrown from child task (with catch cb)', 1, t => {
  Task.of().recur(() => thrower2).run({catch: t.calledWith(2)})
})

test('exception thrown from child task (with catch cb, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw 2 })
  Task.of().recur(() => thrower).run({catch: t.calledWith(2)})
  s()
})

test('exception thrown from child task (no catch cb, async)', 1, t => {
  let s = (null: any)
  let thrower = Task.create(_s => { s = _s }).chain(() => { throw new Error('err1') })
  Task.of().recur(() => thrower).run({})
  t.throws(s, /err1/)
})

test('this==undefined in failure cd (initial)', 1, t => {
  Task.rejected(2).recur(x => Task.of(x)).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd (spawned)', 1, t => {
  Task.of(2).recur(x => Task.rejected(x)).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.of(2).recur(function(x) { t.equal(this, undefined); return Task.rejected(x) }).run({failure(){}})
})
