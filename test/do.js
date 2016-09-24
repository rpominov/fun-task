// @flow
/* eslint-disable require-yield */

import _test from 'lobot/test'
import Task from '../src'

import 'babel-polyfill'

function computeMaxCallStackSize() {
  try {
    return 1 + computeMaxCallStackSize()
  } catch (e) {
    return 1
  }
}
const MAX_STACK_SIZE = computeMaxCallStackSize()

const test = _test.wrap('do')

const later = x => Task.create(s => { setTimeout(() => { s(x) }) })

test('0 iterations', 1, t => {
  Task.do(function* () {return Task.of(2)}).run(t.calledWith(2))
})

test('0 iterations (2 runs)', 2, t => {
  const task = Task.do(function* () {return Task.of(2)})
  task.run(t.calledWith(2))
  task.run(t.calledWith(2))
})

test('1 sync iteration', 1, t => {
  Task.do(function* () {
    const x = yield Task.of(1)
    return Task.of(x + 1)
  }).run(t.calledWith(2))
})

test.async('1 async iteration', 1, t => {
  Task.do(function* () {
    const x = yield later(1)
    return Task.of(x + 1)
  }).run(t.calledWith(2))
})

test('1 sync iteration (2 runs)', 2, t => {
  const task = Task.do(function* () {
    const x = yield Task.of(1)
    return Task.of(x + 1)
  })
  task.run(t.calledWith(2))
  task.run(t.calledWith(2))
})

test('2 sync iterations', 1, t => {
  Task.do(function* () {
    const x: any = yield Task.of(2)
    const y: any = yield Task.of(3)
    return Task.of(x * y)
  }).run(t.calledWith(6))
})

test.async('2 async iterations', 1, t => {
  Task.do(function* () {
    const x: any = yield later(2)
    const y: any = yield later(3)
    return Task.of(x * y)
  }).run(t.calledWith(6))
})

test('2 sync iterations (2 runs)', 2, t => {
  const task = Task.do(function* () {
    const x: any = yield Task.of(2)
    const y: any = yield Task.of(3)
    return Task.of(x * y)
  })
  task.run(t.calledWith(6))
  task.run(t.calledWith(6))
})

test('cancelation (0 returned)', 1, t => {
  const spawned = Task.create(() => t.calledOnce())
  Task.do(function* () {return spawned}).run({})()
})

test('cancelation (0 yielded)', 1, t => {
  const spawned = Task.create(() => t.calledOnce())
  Task.do(function* () {
    yield spawned
    t.fail()
    return Task.of(1)
  }).run({})()
})

test('cancelation (1 returned)', 1, t => {
  const spawned = Task.create(() => t.calledOnce())
  Task.do(function* () {
    yield Task.of(1)
    return spawned
  }).run({})()
})

test('cancelation (1 returned, async yield)', 1, t => {
  let s: any = null
  const zero = Task.create(_s => {s = _s})
  const first = Task.create(() => t.calledOnce())
  const cancel = Task.do(function* () {
    yield zero
    return first
  }).run({})
  s(2)
  cancel()
})

test('count down sync', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  Task.do(function* () {
    let n: any = 5
    while (n > 0) {
      stub(n)
      n = yield Task.of(n - 1)
    }
    stub(n)
    return Task.of(n)
  }).run({success: t.calledWith(0)})
})

test.async('count down async', 7, t => {
  const stub = t.calledWith(5, 4, 3, 2, 1, 0)
  Task.do(function* () {
    let n: any = 5
    while (n > 0) {
      stub(n)
      n = yield later(n - 1)
    }
    stub(n)
    return later(n)
  }).run({success: t.calledWith(0)})
})

test('0 iterations (rejected)', 1, t => {
  Task.do(function* () {return Task.rejected(2)}).run({failure: t.calledWith(2)})
})

test('part of generator after `yield rejected` is not executed', 1, t => {
  Task.do(function* () {
    yield Task.rejected(2)
    t.fail()
    return Task.of(1)
  }).run({failure: t.calledWith(2)})
})

if (!process.env.IGNORE_SLOW_TESTS) {
  test('works with big loops', 1, t => {
    Task.do(function* () {
      let i:any = MAX_STACK_SIZE + 2
      while (i !== 0) {
        i = yield Task.of(i - 1)
      }
      return Task.of(i)
    }).run(t.calledWith(0))
  })
}

test('this==undefined in success cd', 1, t => {
  Task.do(function*() {return Task.of()}).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.do(function*() {return Task.rejected()}).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.do(function*() {
    t.equal(this, undefined)
    return Task.rejected()
  }).run({failure(){}})
})

test('exception thrown from fn (no catch cb)', 1, t => {
  t.throws(() => {
    Task.do(function*() { throw new Error('err1') }, 1).run({})
  }, /err1/)
})

test('exception thrown from fn (with catch cb)', 1, t => {
  Task.do(function*() { throw 2 }, 1).run({catch: t.calledWith(2)})
})

const thrower1 = Task.create(() => { throw new Error('err1') })
const thrower2 = Task.create(() => { throw 2 })

test('exception thrown from spawned (no catch cb)', 1, t => {
  t.throws(() => {
    Task.do(function*() { return thrower1 }).run({})
  }, /err1/)
})

test('exception thrown from spawned (with catch cb)', 1, t => {
  Task.do(function*() { return thrower2 }).run({catch: t.calledWith(2)})
})
