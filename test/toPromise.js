// @flow
/* global Promise */

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('toPromise')

test('returns a Promise', 1, t => {
  t.ok(Task.of(2).toPromise() instanceof Promise)
})

test.async('success works', 1, t => {
  Task.of(2).toPromise().then(x => {
    t.deepEqual(x, {success: 2})
    t.end()
  })
})

test.async('failure works', 1, t => {
  Task.rejected(2).toPromise().then(x => {
    t.deepEqual(x, {failure: 2})
    t.end()
  })
})

const thrower = Task.create(() => { throw 2 })

test.async('sync throw, {catch: true}', 1, t => {
  thrower.toPromise().then(
    t.fail,
    x => {
      t.equal(x, 2)
      t.end()
    }
  )
})

test.async('sync throw, {catch: false}', 1, t => {
  thrower.toPromise({catch: false}).then(
    t.fail,
    x => {
      t.equal(x, 2)
      t.end()
    }
  )
})

test.async('async throw, {catch: true}', 1, t => {
  let s: any = null
  const task = Task.create(_s => {s = _s})
  const thrower = task.map(() => { throw 2 })
  thrower.toPromise().then(
    t.fail,
    x => {
      t.equal(x, 2)
      t.end()
    }
  )
  setTimeout(s, 1)
})

test.async('async throw, {catch: false}', 1, t => {
  let s: any = null
  const task = Task.create(_s => {s = _s})
  const thrower = task.map(() => { throw 2 })
  thrower.toPromise({catch: false}).then(t.fail, t.fail)
  setTimeout(() => {
    t.throws(s)
    t.end()
  }, 1)
})



// Flow tests
// See https://github.com/facebook/flow/issues/2354

class Animal {}
class Dog extends Animal {}

const t1: Task<Dog, void> = Task.of(new Dog)
const t2: Task<Animal, void> = t1

t1.toPromise().then(x => {
  if (x.success) {
    (x.success: Dog)
  }
})

t2.toPromise().then(x => {
  if (x.success) {
    (x.success: Animal)
  }
})
