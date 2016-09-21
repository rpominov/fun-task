import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('run-time types')

test('create', 1, t => {
  t.throws(() => {
    Task.create(1)
  }, /Task.create\(f\): f is not a function\. Actual value: 1/)
})

test('parallel', 2, t => {
  t.throws(() => {
    Task.parallel(1)
  }, /Task.parallel\(a\): a is not an array of tasks\. Actual value: 1/)
  t.throws(() => {
    Task.parallel([1, 2])
  }, /Task.parallel\(a\): a is not an array of tasks\. Actual value: 1,2$/)
})

test('race', 2, t => {
  t.throws(() => {
    Task.race(1)
  }, /Task.race\(a\): a is not an array of tasks\. Actual value: 1/)
  t.throws(() => {
    Task.race([1, 2])
  }, /Task.race\(a\): a is not an array of tasks\. Actual value: 1,2$/)
})

test('map', 3, t => {
  t.throws(() => {
    Task.map(1, 2)
  }, /Task.map\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.map(() => {}, 2)
  }, /Task.map\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).map(1)
  }, /task.map\(f\): f is not a function\. Actual value: 1/)
})

test('mapRejected', 3, t => {
  t.throws(() => {
    Task.mapRejected(1, 2)
  }, /Task.mapRejected\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.mapRejected(() => {}, 2)
  }, /Task.mapRejected\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).mapRejected(1)
  }, /task.mapRejected\(f\): f is not a function\. Actual value: 1/)
})

test('bimap', 5, t => {
  t.throws(() => {
    Task.bimap(1, 2, 3)
  }, /Task.bimap\(f, _, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.bimap(() => {}, 2, 3)
  }, /Task.bimap\(_, f, _\): f is not a function\. Actual value: 2/)
  t.throws(() => {
    Task.bimap(() => {}, () => {}, 3)
  }, /Task.bimap\(_, _, t\): t is not a task\. Actual value: 3/)
  t.throws(() => {
    Task.of(1).bimap(1, 2)
  }, /task.bimap\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.of(1).bimap(() => {}, 2)
  }, /task.bimap\(_, f\): f is not a function\. Actual value: 2/)
})

test('chain', 3, t => {
  t.throws(() => {
    Task.chain(1, 2)
  }, /Task.chain\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.chain(() => {}, 2)
  }, /Task.chain\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).chain(1)
  }, /task.chain\(f\): f is not a function\. Actual value: 1/)
})

test('orElse', 3, t => {
  t.throws(() => {
    Task.orElse(1, 2)
  }, /Task.orElse\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.orElse(() => {}, 2)
  }, /Task.orElse\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).orElse(1)
  }, /task.orElse\(f\): f is not a function\. Actual value: 1/)
})

test('recur', 3, t => {
  t.throws(() => {
    Task.recur(1, 2)
  }, /Task.recur\(f, _\): f is not a function\. Actual value: 1/)
  t.throws(() => {
    Task.recur(() => {}, 2)
  }, /Task.recur\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).recur(1)
  }, /task.recur\(f\): f is not a function\. Actual value: 1/)
})

test('chainRec', 1, t => {
  t.throws(() => {
    Task.chainRec(1, 2)
  }, /Task.chainRec\(f, _\): f is not a function\. Actual value: 1/)
})

test('ap', 3, t => {
  t.throws(() => {
    Task.ap(1, 2)
  }, /Task.ap\(t, _\): t is not a task\. Actual value: 1/)
  t.throws(() => {
    Task.ap(Task.of(1), 2)
  }, /Task.ap\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).ap(1)
  }, /task.ap\(t\): t is not a task\. Actual value: 1/)
})

test('concat', 3, t => {
  t.throws(() => {
    Task.concat(1, 2)
  }, /Task.concat\(t, _\): t is not a task\. Actual value: 1/)
  t.throws(() => {
    Task.concat(Task.of(1), 2)
  }, /Task.concat\(_, t\): t is not a task\. Actual value: 2/)
  t.throws(() => {
    Task.of(1).concat(1)
  }, /task.concat\(t\): t is not a task\. Actual value: 1/)
})

test('do', 1, t => {
  t.throws(() => {
    Task.do(1)
  }, /Task.do\(f\): f is not a function\. Actual value: 1/)
})

test('fromPromise', 1, t => {
  t.throws(() => {
    Task.fromPromise(1)
  }, /Task.fromPromise\(p\): p is not a promise\. Actual value: 1/)
})
