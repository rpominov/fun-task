# API comparison with Promises

| Task                                     | Promise &amp; comments                   |
| ---------------------------------------- | ---------------------------------------- |
| `Task.create(computation)`               | `new Promise(computation)`               |
| `Task.of(x)`                             | `Promise.resolve(x)`<br/><br/>With Promises behaviour is different if `x` is a Promise (this makes writing generic code more difficult with Promises) |
| `Task.rejected(x)`                       | `Promise.reject(x)`                      |
| `task.map(fn)`                           | `promise.then(fn)`<br/><br/>With Promises behaviour is different if `fn` retruns a Promise |
| `task.chain(fn)`                         | `promise.then(fn)`                       |
| `task.mapRejected(fn)`                   | `promise.then(undefined, fn)`<br/><br/>With Promises behaviour is different if `fn` retruns a Promise |
| `task.orElse(fn)`                        | `promise.then(undefined, fn)`            |
| `task.ap(otherTask)`                     | `Promise.all(promise, otherPromise).then(([fn, x]) => fn(x))`<br/><br/>This method exists mainly for compliance with [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land) |
| `Task.empty()`                           | `new Promise(() => {})`                  |
| `task.concat(otherTask)`                 | `Promise.race([promose, otherPromise])`<br/><br/>Aslo mainly for Fantasy Land, makes Task a [Monoid](https://github.com/fantasyland/fantasy-land#monoid) |
| `Task.all(tasks)`                        | `Promise.all(promises)`                  |
| `Task.race(tasks)`                       | `Promise.race(promises)`                 |
| `Task.run({success, failure})`         | `Promise.then(success, failure)`     |
| `Task.run({success, failure, catch})` | `Promise.then(success, failureAndCatch)`<br/><br/>By default tasks don't catch exceptions thrown from `map`, `chain` etc. But we can choose to catch them by providing `catch` callback. Also notice that exceptions go into their own callback. |
| `cancel = task.run(...); cancel()`       | Promises don't support cancelation or even unsubscribing |
