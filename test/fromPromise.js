// @flow
/* global Promise */

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('fromPromise')

test.async('fromPromise(resolve(..))', 1, t => {
  Task.fromPromise(Promise.resolve(2)).run({success: t.calledWith(2)})
})

test.async('fromPromise(() => resolve(..))', 1, t => {
  Task.fromPromise(() => Promise.resolve(2)).run({success: t.calledWith(2)})
})

test('fromPromise(reject(..)).run({})', 1, t => {
  const fakePromise: any = {then(s, e) {t.equal(e, undefined)}}
  Task.fromPromise(fakePromise).run({})
})

test.async('fromPromise(reject(..)).run({catch})', 1, t => {
  Task.fromPromise(Promise.reject(2)).run({catch: t.calledWith(2)})
})

test.async('cancelation works (success)', 0, t => {
  let s: any = null
  const promise = new Promise(_s => {s = _s})
  const cancel = Task.fromPromise(promise).run({success: t.fail})
  setTimeout(() => {
    cancel()
    s()
    t.end()
  }, 1)
})

test.async('cancelation works (catch)', 0, t => {
  let s: any = null
  const promise = new Promise((_, _s) => {s = _s})
  const cancel = Task.fromPromise(promise).run({catch: t.fail})
  setTimeout(() => {
    cancel()
    s()
    t.end()
  }, 1)
})
