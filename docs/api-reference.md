# Task API Reference

## `Task.create(computation)`

Creates a Task from a computation. Computation is a function that accepts two callbacks.
It should call one of them after completion with the final result (success or failure).
Also a computation may return a function with cancellation logic
or it can return `undefined` if there is no cancellation logic.

```js
const task = Task.create((onSuccess, onFailure) => {
  // ...
  return () => {
    // cancellation logic
  }
})

// The computation is executed every time we run the task
const cancel = task.run({
  success(result) {
    // success result goes here
  },
  failure(result) {
    // failure result goes here
  },
})

// If we cancel the task the cancellation logic from computation
// will be executed (if provided)
cancel()
```

Here is some runnable example:

```js
const wait5sec = Task.create(onSuccess => {
  const timeoutId = setTimeout(() => {
    onSuccess('5 seconds')
  }, 5000)
  return () => { clearTimeout(timeoutId) }
})

wait5sec.run({
  success(timeWaited) {
    console.log(`We've waited for ${timeWaited}`)
  },
})

// > We've waited for 5 seconds
```

After cancellation or completion the `onSuccess` and `onFailure` callbacks become noop.
Also if `cancel` called second time or after a completion the cancelation logic won't be executed.

## `Task.of(value)`

Creates a task that resolves with a given value.

```js
Task.of(2).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 2
```

## `Task.rejected(error)`

Creates a task that fails with a given error.

```js
Task.rejected(2).run({
  failure(error) {
    console.log(`error: ${error}`)
  },
})

// > error: 2
```

## `Task.empty()`

Creates a task that never completes.

```js
Task.empty().run({
  success(x) {
    // callback never called
  },
  failure(error) {
    // callback never called
  },
})
```

## `task.map(fn)`

> Static alias: `Task.map(fn, task)`

Transforms a task by applying `fn` to the successful value.

```js
Task.of(2).map(x => x * 3).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```

## `task.mapRejected(fn)`

> Static alias: `Task.mapRejected(fn, task)`

Transforms a task by applying `fn` to the failure value.

```js
Task.rejected(2).mapRejected(x => x * 3).run({
  failure(error) {
    console.log(`error: ${error}`)
  },
})

// > error: 6
```

## `task.bimap(fFn, sFn)`

> Static alias: `Task.bimap(fFn, sFn, task)`

Transforms a task by applying `fFn` to the failure value or `sFn` to the successful value.

```js
Task.of(2).bimap(x => x, x => x * 3).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```

```js
Task.rejected(2).bimap(x => x * 3, x => x).run({
  failure(error) {
    console.log(`error: ${error}`)
  },
})

// > error: 6
```

## `task.chain(fn)`

> Static alias: `Task.chain(fn, task)`

Transforms a task by applying `fn` to the successful value, where `fn` returns a Task.

```js
Task.of(2).chain(x => Task.of(x * 3)).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```

The function can return a task that fails of course.

```js
Task.of(2).chain(x => Task.rejected(x * 3)).run({
  failure(error) {
    console.log(`error: ${error}`)
  },
})

// > error: 6
```

## `task.orElse(fn)`

> Static alias: `Task.orElse(fn, task)`

Transforms a task by applying `fn` to the failure value, where `fn` returns a Task.
Similar to `chain` but for failure path.

```js
Task.rejected(2).orElse(x => Task.of(x * 3)).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```


## `task.recur(fn)`

> Static alias: `Task.recur(fn, task)`

`task.recur(fn)` is the same as `task.chain(function f(x) { return fn(x).chain(f) })`,
but former is safe from infinite call stack growth and memory leaks.

```js
Task.of(5).recur(x => {
  x // 5, 4, 3, 2, 1, 0
  return x === 0 ? Task.rejected('done') : Task.of(x - 1)
}).run({
  failure(x) {
    console.log(`result: ${x}`)
  },
})

// > result: done
```

## `Task.chainRec(fn, initial)`

Implementation of [Fantasy Land's `ChainRec`](https://github.com/fantasyland/fantasy-land#chainrec).
Covers similar use-case as `task.recur()` but in a spec compatible way.

```js
Task.chainRec((next, done, x) => {
  x // 5, 4, 3, 2, 1, 0
  return x === 0 ? Task.of(done('done')) : Task.of(next(x - 1))
}, 5).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: done
```

## `tFn.ap(tX)`

> Static alias: `Task.ap(tFn, tX)`

Applies the successful value of task `tFn` to to the successful value of task `tX`.
Uses `chain` under the hood, if you need parallel execution use `parallel`.

```js
Task.of(x => x * 3).ap(Task.of(2)).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```


## `task.concat(otherTask)`

> Static alias: `Task.concat(task, otherTask)`

Selects the earlier of the two tasks. Uses `race` under the hood.

```js
const task1 = Task.create(suc => {
  const id = setTimeout(() => suc(1), 1000)
  return () => { clearTimeout(id) }
})

const task2 = Task.create(suc => {
  const id = setTimeout(() => suc(2), 2000)
  return () => { clearTimeout(id) }
})

task1.concat(task2).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 1
```



## `Task.parallel(tasks)`

Given array of tasks creates a task of array. When result task executed given tasks will be executed in parallel.

```js
Task.parallel([Task.of(2), Task.of(3)]).run(
  success(xs) {
    console.log(`result: ${xs.join(', ')}`)
  },
)

// > result: 2, 3
```

If any of given tasks fail, the result taks will also fail with the same error.
In this case tasks that are still running are canceled.

```js
Task.parallel([Task.of(2), Task.rejected(3)]).run(
  failure(error) {
    console.log(`error: ${error}`)
  },
)

// > error: 3
```

## `Task.race(tasks)`

Given array of tasks creates a task that completes with the earliest successful or failure value.
After the fastest task completes other tasks are canceled.

```js
const task1 = Task.create(suc => {
  const id = setTimeout(() => suc(1), 1000)
  return () => {
    console.log('canceled: 1')
    clearTimeout(id)
  }
})

const task2 = Task.create(suc => {
  const id = setTimeout(() => suc(2), 2000)
  return () => {
    console.log('canceled: 2')
    clearTimeout(id)
  }
})

Task.race([task1, task2]).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > canceled: 2
// > result: 1
```

## `Task.do(generator)`

This is something like [Haskell's do notation](https://en.wikibooks.org/wiki/Haskell/do_notation)
or JavaScritp's async/await based on [generators](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Iterators_and_Generators).

You pass a generator that `yiels` and `returns` tasks and get a task in return.
The whole proccess is pure, tasks are not being ran until the result task is ran.

Here is a not runnable but somewhat real-world example:

```js
// gets user from our API, returns a Task
const getUserFromAPI = ...

// gets zip code for given address using 3rd party API, returns a Task
const getZipCode = ...

function getUsersZip(userId) {
  return Task.do(function* () {
    const user = yield getUserFromAPI(userId)
    if (!user.address) {
      return Task.rejected({type: 'user_dont_have_address'})
    }
    return getZipCode(user.address)
  })
}

// Same function re-written using chain instead of do
function getUsersZip(userId) {
  return getUserFromAPI(userId).chain(user => {
    if (!user.address) {
      return Task.rejected({type: 'user_dont_have_address'})
    }
    return getZipCode(user.address)
  })
}

getUsersZip(42).run({
  success(zip) {
    // ...
  },
  failure(error) {
    // The error here is either {type: 'user_dont_have_address'}
    // or some of errors that getUserFromAPI or getZipCode can produce
    // ...
  },
})
```

And here's some runnable example:

```js
Task.do(function* () {
  const a = yield Task.of(2)
  const b = yield Task.of(3)
  return Task.of(a * b)
}).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// > result: 6
```


## `task.run(handlers)`

Runs the task. The `handlers` argument can contain 3 kinds of handlers `success`, `failure`, and `catch`.
All handlers are optional, if you want to run task without handlers do it like this `task.run({})`.
If a function passed as `handlers` it's automatically transformend to `{success: fn}`,
so if you need only success handler you can do `task.run(x => ...)`.

If `failure` handler isn't provided but task fails, an exception is thrown.
You should always provided `failure` handlers for tasks that may fail.
If you want to ignore failure pass a `noop` failure handler explicitly.

The `catch` handler is for errors thrown from functions passed to `map`, `chain` etc.
[More on how it works](./exceptions.md#how-exceptions-work-in-task).

```js
Task.of(2).run({
  success(x) {
    console.log(`result: ${x}`)
  },
  failure(error) {
    // handle failure ...
  },
  catch(error) {
    // handle error thrown from `map(fn)` etc ...
  },
})

// > result: 2
```

## `task.runAndLog()`

Runs the task and prints results using `console.log()`. Mainly for testing / debugging etc.

```js
Task.of(2).runAndLog()

// > Success: 2
```


## `task.toPromise([options])`

Runs the task and returns a Promise that represent the result.
The task's `success` and `failure` branches both correspond to the promise's `success` brach because
[the `error` branch in Promises is reserved for unexpected failures](./exceptions.md#promises-and-expected-failures).
The task's `catch` branch correspond to promise's `error`.

The promise's success value is either `{success: s}` or `{failure: f}` where `s` and `f` task's
success or failure values.

If `{catch: false}` is passed as `options` the task is run without `catch` callback.

```js
Task.of(2).toPromise().then(result => {
  if ('success' in result) {
    console.log(`success: ${result.success}`)
  } else {
    console.log(`failure: ${result.failure}`)
  }
})

// > success: 2
```


## `Task.fromPromise(promise)`

Creates a Task from a Promise.

```js
Task.fromPromise(Promise.resolve(2)).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// result: 2
```

The `promise` argument must be either a Promise or a function that wnen called with
no arguments returns a Promise. If a function is used as `promise` argument,
that function is executed on each task's run to retrieve a new promise.

```js
Task.fromPromise(() => Promise.resolve(2)).run({
  success(x) {
    console.log(`result: ${x}`)
  },
})

// result: 2
```

The promise's `success` corresponds to the task's `success`
and promise's `error` corresponds to the task's `catch`.

```js
Task.fromPromise(Promise.reject(2)).run({
  catch(x) {
    console.log(`error: ${x}`)
  },
})

// error: 2
```
