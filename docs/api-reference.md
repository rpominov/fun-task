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

TODO

## `Task.rejected(value)`

TODO

## `Task.empty()`

TODO

## `task.map(fn)`

TODO

## `task.mapRejected(fn)`

TODO

## `task.chain(fn)`

TODO

## `task.orElse(fn)`

TODO

## `Task.parallel(tasks)`

TODO

## `task.ap(otherTask)`

TODO

## `Task.race(tasks)`

TODO

## `task.concat(otherTask)`

TODO

## `task.run(handlers)`

TODO

## `task.runAndLog()`

TODO
