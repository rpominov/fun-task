# Exceptions catching in async abstractions like Promise or Task

This article explains the reasoning behind how exception catching works in Task.

## Two kinds of failures

When we talk about an abstraction that has some notions of failures (e.g. we have a `success` and `failure` callbacks somewhere), first thing we should do is to distinguish two kinds of failures: bugs and expected failures.

Expected failures are outcomes of some operations that we know may happen, and that we can't prevent. For example suppose we have a string that contains a JSON provided by a user, and we want to parse it.

```js
const object = JSON.parse(str)
```

We know that this operation may throw an exception in case if user provided an incorrect JSON. And we must handle this:

```js
try {
  const object = JSON.parse(str)
} catch (error) {
  // handle incorrect JSON...
}
```

Bugs on the other hand are a programmer's mistakes. For example we have a function like this:

```js
function getAuthorAge(post) {
  return post.author.age
}
```

Then a programmer might misunderstand for some reason how to use this function and pass the `author` object instead of `post` for example:

```js
getAuthorAge({age: 28}) // throws an exception because of a bug
```

Or, which happens more often, after a refactoring we might for instance change the shape of  `post` object to look like this `{authors: [{age: 28}]}` and forget to update the `getAuthorAge` function.

Of course bugs not always express themselves in form of exceptions, we can get a `NaN` or just see incorrect data in UI. But for the purpose of this article we focus on bugs that lead to exceptions.

To better understand concept of "expected failures" you may read ["Railway oriented programming"](https://fsharpforfunandprofit.com/posts/recipe-part2/). This article does not touch the bugs vs expected failures subject, but explains very well how expected failures (or just failures) can be handled with a right abstraction.

## We can't *handle* bugs

When a bug happens the program ends up in an inconsistent state. In other words in a state it should not normally be — in a state that we didn't expect. And all the code that we've written don't expect program to be in such state. From that point we can't make any assuptions about further behavior of the program. We basically have no idea about what is going on (from the point of view of the running program).

What we would want to do when we *handle* a bug is to transition the program back into one of consistent states. But AFAIK there is only one way to transition a program from an arbitrary inconsistent state to a consistent one — restart it.

An attempt to *handle* may lead to even worse situation — the inconsistent state of an individual instance of a program may leak into the database. In this scenario even a restart may not help. Also if many users are connected to a single database they all may start to experience the bug. So *handling* bugs isn't a particularly good idea.

## What to do with bugs then

Restarting the program seems like a good option. Let's consider it in the contexts of two environments that are most interesting for the purpose of this article: a browser and a Node.js server.

In case of a browser reloading the page usually considered as an awful behavior from the UX point of view, so it might be not an option. We may choose not to do something like reloading the page in a hope of providing a better UX at a risk of leaking inconsistent state to the database. Some bugs are indeed not fatal for a web page, and it often may continue to work mostly fine. So this is a trade–off and to not restart is a legitimate option here.

Also in case of a browser we might want UI to react to the bug somehow. But in case of arbitrary bug there is not much we can do again. In case of an *expected* failure like the incorrect JSON we can handle it very well from UI/UX poit of view — we should show an error message near the exact field in the form, also we may dissable the submit button etc. In case of a bug we don't really know what is going on, so we can only do something like showing a popup with a very vague message. But I think this won't be very helpfull, it may actually be worse than not showing a popup. Maybe user not even going to interact with the part of the program that has broken, and a popup out of nowhere may only damage UX. And if user do interact with the broken part they will notice that it's broken anyway — no need to tell what they already know.

So IMO in case of a browser the best option might be is to do nothing at all about the bug (except one thing, more about which in a bit).

What about Node? First of all, have to say that I'm not really an expert in Node or other server side technologies. But I have some expirience. With that said let's continue. We could restart the server on each unhandled exception, but this is problematic because server usually handles several requests concurently at the same time. So if we restart the server not only request that faced a bug will fail, but all other requests that happen to be handled at the same time will fail as well. Perhaps a better approach, and what is usually done, is to wrap all the code that responsible for handling each request to some sort of `try...catch` block and when a error happens fail only one request. Although we can't use `try...catch` of course because the code is asynchronous. So we should use some async abstraction that can provide this functionality (e.g. Promises).

Another option for Node is to let server crash. Yes, this will result in forcefully ending the execution of all other connections, resulting in more than a single user getting an error. But we will benefit from the crash by taking core dumps (`node --abort_on_uncaught_exception`) etc.

Also in Node we can use the `uncaughtException` event combined with a tool like [naught](https://github.com/andrewrk/naught). Here is a qoute from naught docs:

> Using naught a worker can use the 'offline' message to announce that it is dying. At this point, naught prevents it from accepting new connections and spawns a replacement worker, allowing the dying worker to finish up with its current connections and do any cleanup necessary before finally perishing.

This is how a bug can be handled in a program. But more importantly we should _fix_ bugs! In order to do so we need to find out about them, therefore a really good idea will be to setup some kind of automated reporting system (e.g. Sentry). This can and should be done in both cases in browser and on the server (this is the _one thing_ I mentioned earlier). Also if we want to debug bugs it's important that code that handles bugs don't stay in our way (more on it later).

## What is problematic about Promises

**Disclaimer:** It's better to think that Promises simply don't support expected failures, and that the failure callback is designed exclusively for uncaught exceptions / bugs. So we should put all expected results (including failures) into success path of Promises. But in this section of the article I'll try to look at Promises as if they were designed to support expected failures.

Let's first consider the browser environment. As we concluded earlier, the only thing that we want to do with bugs in a browser, is to report about them to a monitoring system. We don't need Promises for this. I don't know exactly how, but **raven-js** can report about all unhadeled exceptions automatically. I think it replaces `console.error()`  or maybe listents to `error` event on `window`, whatever it does it works well. So in the browser **we at least don't need Promises to catch exceptions** that are bugs. The not-bugs exceptions can be handled manually:

```js
// Instead of this
promise.then(jsonString => JSON.parse(jsonString))

// We should do this
promise.then(jsonString => {
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    return Promise.reject({type: 'incorrect_json'})
  }
})
```

Although we don't need Promises to catch exceptions they do it anyway, and this causes some really annoying issues.

**It hurts debugging experience.** In the early days when Promises was second class citizens in browsers it was a nightmare when a bug get caught by a promise. For example I had a really terrible experiences of crawling through some kind of `setImmediate` ponyfill tryning to find the line where exception was thrown originally. But have to admit that nowadays it works quite well. I just tried throwing an exception from `then` in Chrome and debugger paused program on the exact line of the `throw`, just like without Promises. This is very nice! Not sure though how well other browsers/environments handle this. But anyway this is a special treatment that available only to Promises as first class citizens, if we going to add automatic catching to a library we might not be able to provide such a great debugging experience. Also, if we do add `failure` callback to a promise, exception will go into that callback, and this is a whole different story.

**Bugs go into the same callback with expected failures.** As mentioned above we don't want bugs to go into any callback at all. Unfortunately in promises we have only one callback for all kinds of failures. If we expect some failures from a promise (like network errors for example), we have to use `failure` callback to handle them. But if we use a `failure` callback everything mentioned about awesome debugging experience is no longer the case. So in the callback we have to separate bugs from the expected failures and handle them differentelly. This is not always easy and needs to be done in every failure callback. Also this [makes it imposible](https://github.com/facebook/flow/issues/1232) to type Promises with type systems like [Flow](https://flowtype.org/) — we have to use type `any` for argument of failure callback. Which BTW makes task of reliably separating expected failures from bugs even harder.

What about Node environment? As concluded earlier in Node we may want to catch all exceptions related to handling of a particular request, although there other options. So how Promises work may come in handy here. But again it would be better to have a separate callback for bugs because of problems with Flow etc.

Also automatic catching is needed for `async/await`, the idea is that we want to be able to write a code like this:

```js
async function() {
  let foo

  try {
    foo = await getFoo()
  } catch (e) {
    return 'not done, but we don\'t care'
  }

  if (!isCorrectFoo(foo)) {
    throw new Error('not done, error')
  }

  return 'done'
}
```

Here we do all sorts of failures handling using what looks like a synchronous code. This looks cool but anyway comes at a price of issues mentioned above. And could be done without using `throw` and `try...catch` actually, just one of possible solutions could look like this:

```js
async function() {

  // await in this case would "subscribe" to success and failure,
  // and return either {success} or {failure}
  const {success: foo, failure} = await getFoo()

  if (failure !== undefined) {
    return 'not done, but we don\'t care'
  }

  if (!isCorrectFoo(foo)) {
    return Promise.reject('not done, error')
  }

  return 'done'
}
```

Let's recap:

- In browser we don't want automatic catching at all
- In Node we might need it, but would be better if we had a separate callback for exceptions
- We need it for `async/await`, although spec could be written in a way so we wouldn't need catching

Here is some more criticism on how Promises handle exceptions:

1. http://jlongster.com/Stop-Trying-to-Catch-Me
2. https://gist.github.com/thejameskyle/1222be21ef1023119222f10666b143aa


## How exceptions work in Task

In Task we have best of both worlds. We can choose whether exceptions will be catched or not when we `run()` a task.

```js
// exceptions are not catched
task.run({
  success(x) {
    // handle success
  },
  failure(x) {
    // handle expected failure
  },
})

// if we provide catch callback exceptions are catched
task.run({
  success(x) {
    // handle success
  },
  failure(x) {
    // handle expected failure
  },
  catch(e) {
    // handle a bug
  },
})
```

So if `catch` callback isn't provided, we can enjoy great debugging expirience in a browser (even if we have `failure` callback). And in Node we can still catch exceptions in async code if we want to. Also notice that we use a separate callback for exceptions, so no problems with Flow etc.

The default behaviour is to not catch exceptions. This is what we want in browser, and what also may be a legitimate option for Node.

In Task the `catch` callback is reserved only for bug-exceptions. Expected exception must be wrappend in a `try...catch` block manually (see example with `JSON.parse()` above). All the API and semantics in Task are designed with this assumption in mind.

Exceptions thrown from `success` and `failure` callbacks are never catched, even if `catch` callbacks is provided.

```js
task.run({
  success() {
    // this error won't be catched
    throw new Error('')
  },
  catch(error) {
    // the error above will not go here
  }
})
```

This is done because otherwise we might end up with half of the code for `success` being executed plus the code for `catch`, which in most cases isn't what we want. For example in a web server case, we could start sending response for `success` case, but then continue by sending the response for `catch`. Instead we should catch manually:

```js
task.run({
  success() {
    try {
      // ...
      res.send(/* some part of success response */)
      // ...
      // supposedly some code here have thrown
      // ...
    } catch (e) {
      // do something about the exception
      // but keep in mind that "some part of success response" was already sent
    }
  },
  catch(error) {
    // handle error thrown from .map(fn) etc.
  }
})
```
