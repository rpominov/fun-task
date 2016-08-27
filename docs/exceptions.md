# Try..catch in JavaScript async abstractions like Promise or Task

This article explains the reasoning behind how error catching works in Task.
It starts from the very fundamental concepts, but this is necessary to avoid any misunderstandings
later in the article when some terms from earlier parts are used.
The closer to the end the more practical matters are discussed.

## Expected and unexpected code paths

In any program (especially in JavaScript) there's always expected and unexpected code paths.
When a program goes through an unexpected path we call it "a bug". And when it only goes through the expected paths
it is just normal execution of the program. Consider this example:

```js
let x = Math.random() - 0.5
let y
let z

if (x > 0) {
  y = 10
} else {
  z = 10
}

if (x <= 0) {
  alert(z + 5)
} else {
  alert(y + 5)
}
```

Here are two expected paths of this program:

<img src="./assets/exceptions/flow3.png" height="147" width="480" />

And here is an unexpected path:

<img src="./assets/exceptions/flow4.png" height="56" width="480" />

We as programmers don't expect this to ever happen with this program.
But if, for example, we change first condition and forget to change second one the program may
run through the unexpected path. That would be a bug.


## Railway oriented programming / split expected path in two

We can introduce some abstractions and semantics that would split **expected path** into
**expected success** and **expected failure**. If you understand `Either` type you know what I'm talking about.
This is fairly common pattern in FP world, I'll try to explain it briefly, but here are some good
articles that do a much better job:

- ["Railway oriented programming"](https://fsharpforfunandprofit.com/posts/recipe-part2/)
- ["A Monad in Practicality: First-Class Failures"](http://robotlolita.me/2013/12/08/a-monad-in-practicality-first-class-failures.html)
- ["Practical Intro to Monads in JavaScript: Either"](https://tech.evojam.com/2016/03/21/practical-intro-to-monads-in-javascript-either/)

Say we build a simple CLI program that takes a number `n` from user and prints `1/n`.

```js
function print(str) {
  console.log(str)
}

function main(userInput) {
  const number = parseInt(userInput, 10)

  if (Number.isNaN(number)) {
    print(`Not a number: ${userInput}`)
  } else {
    if (number === 0) {
      print(`Cannot divide by zero`)
    } else {
      print(1 / number)
    }
  }

}

// Read a line from stdin somehow and apply main() to it.
// Details of how it's done are not important for this example.
main(inputFromStdin)
```

In this example execution flow of the program looks like this:

<img src="./assets/exceptions/flow1.png" height="60" width="459" />

As you can see the program splits in two places. This happens very often in programs.
In some cases all branches look neutral, in other cases (like this) we can consider one path as
a success and another one as a failure. We can make the distinction more formal by
introducing an abstraction:

```js
const Either = {
  chain(fn, either) {
    return ('success' in either) ? fn(either.success) : either
  },
  fork(onSuccess, onFailure, either) {
    return ('success' in either) ? onSuccess(either.success) : onFailure(either.failure)
  },
}
```

Now we can rewrite our example using `Either`:

```js
function print(str) {
  console.log(str)
}

function parse(str) {
  const number = parseInt(str, 10)
  return Number.isNaN(number) ? {failure: `Not a number: ${str}`} : {success: number}
}

function calc(number) {
  return number === 0 ? {failure: `Cannot divide by zero`} : {success: 1 / number}
}

function main(userInput) {
  const parsed = parse(userInput)
  const calculated = Either.chain(calc, parsed)
  Either.fork(print, print, calculated)
}
```

In this version the flow looks more like the following. It's appears to be simpler, as if we can write code
that cannot fail and the `Either` takes care of managing the failure branch.

<img src="./assets/exceptions/flow2.png" height="60" width="230" />

Maybe this doesn't make much sense to you now (if you're not familiar with Either).
And this is by no means a complete explanation of Either pattern (check out resources
I've mentioned above for better explanations). But for the purpose of this article the only
thing we need to take out of this section is that some paths in program can be
treated formally or informally as **expected failures**.

Let's recap. We've split all possible paths in programs to three groups:

- **Expected success** is the main happy path of the program,
  it represents how the program behaves when everything goes right.
- **Expected failure** is secondary path that represent
  all expected deviations from the happy path e.g., when a user gives an incorrect input.
- **Unexpected failure** is some *unexpected* deviations from main or secondary paths,
  something that we call "bugs".


## try..catch

How does `try..catch` fits into our three code paths groups view? It's great for unexpected failures!
Or we should say: `throw` is great for unexpected failures if we never actually `try..catch`.
It's very good for debugging. The debugger will pause on the exact line that throws.
Also if we don't use a debugger we can still get a nice stack trace in the console, etc. It's sad that in many
cases when a program goes through an unexpected path instead of exception we end up with `NaN`
being propagated through the program or something like that. In these cases it's much harder to track
down where things went wrong, it's much nicer when it just throws.

On the other hand `try..catch` is bad for expected failures. There're many reasons why, but let's
focus on just one: *it's bad for expected failures because it's already used for unexpected ones.*
We must handle expected failures, so we would need to `try..catch` function that uses
`throw` for expected failure. But if we do that we'll catch not only errors that represent
expected failures, but also random errors that represent bugs. This is bad for two reasons:

1. we ruin nice debugging experience (the debugger will no longer pause etc);
2. in our code that is supposed to handle expected failures we would need to also
   handle unexpected failures (which is generally imposible as shown in the next section).

If a `throw` is used for expected failures in some APIs, we should wrap `try..catch` into as little code as
possible, so we won't also catch bugs by accident.


## How program should behave in case of unexpected failures

`Try..catch` provide us with a mechanism for writing code that will be executed in case of *some*
unexpected failures. We can just wrap arbitrary code into `try..catch`, and we catch bugs
that express themselves as exceptions in that code. Should we use this mechanism and what
should the code in `catch(e) {..}` handler do?

Let's look at this from theoretical point of view first and then dive into practical
details in next sections.

First of all let's focus on the fact that this mechanism catches only **some** failures.
In many cases a program may not throw but just behave incorrectly in some way.
In my experience with JavaScript I'd estimate that it throws only in about 30% of cases.
So should we even care to use this mechanism if it works only in 30% cases?

If we still want to use it, what should the handling code do? I can think of two options:

1. Try to completely recover somehow and keep the program running.
2. Crash / restart the program and log / report about the bug.

The `#1` option is simply impossible. We can't transition program from arbitrary
unexpected (inconsistent) state to an expected (consistent) state. For the simple reason that
starting state is **unexpected** — we don't know anything about it, because we didn't expect it.
How could we transition from a state of which we don't know anything to any other state?
There is one way to do it though — restart the program, which is our `#2` option.

Also any code that is executed in response to a bug might have a potential to make things worse.
It transitions a program to even more complicated inconsistent state. Plus if a program continues to run,
the inconsistent state may leak into a database. In this scenario even a restart may not help.
And if many users are connected to a single database they all may start to experience the bug.

The `#2` is often happens automatically (at least crash part), so maybe we don't
even need to `catch`. But it's ok to catch for `#2` purposes.


## Unexpected failures in Node

We could restart the server on each unhandled exception, but this is problematic because the server
usually handles several requests concurrently. So if we restart the server
not only requests that have faced a bug will fail, but all other requests that happen to be
handled at the same time will fail as well. Some people think that a better approach is to wrap all of
the code that is	responsible for handling each request with some sort of `try..catch` block and when
a error happens only one request will fail. Although we can't use `try..catch` of course because the
code is asynchronous. So we should use some sort of async abstraction that can provide this functionality (e.g. Promises).

Another option for Node is to let server crash. Yes, this will result in forcefully ending the execution of all other connections, resulting in more than a single user getting an error. But we will benefit from the crash by taking core dumps, (`node --abort_on_uncaught_exception`) etc.

Also in Node we can use the `uncaughtException` event combined with a tool like [naught](https://github.com/andrewrk/naught). Here is a qoute from naught docs:

> Using naught a worker can use the 'offline' message to announce that it is dying. At this point, naught prevents it from accepting new connections and spawns a replacement worker, allowing the dying worker to finish up with its current connections and do any cleanup necessary before finally perishing.

Conclusion: we might want to catch unexpected errors in Node, but there are plenty other options.


## Unexpected failures in browser

Just as in Node we could "restart" the browser or reload the page. However, that option is usually considered as an awful behavior from
the UX point of view. So instead we may choose not to restart in a hope of
providing a better UX at a risk of leaking inconsistent state to the database, etc. Some bugs are
indeed not fatal for a web page, and it often may continue to work mostly fine. So this is a
trade–off and to not restart is a legitimate option here.

Sometimes with browser failures we might want the UI to react to the bug in a particular way. But if it's an arbitrary
bug there isn't much we can do.

In case of an *expected* failure (like the incorrect user input)
we can handle it very well from UI/UX point of view — we could show an error message near the exact
field in the form, or we may disable the submit button, etc.

If it's bug where we really don't know
what is going on, we can try to show a popup with a very vague message.
But I think this won't be very helpful, it may actually be worse than not showing a popup.

Maybe the user was not even going to interact with the part of the program that is broken, and a showing popup out
of nowhere may only damage UX. And if user does interact with the broken part they will notice that
it's broken anyway — no need to tell them what they already know.

Furthermore, if we show a popup to the user, they might
assume that something has failed, but now it's all under control and it's safe to continue to use the
program. But this would be a lie, as nothing is under control in case of a bug.

Conclusion: we have no reason to catch unexpected errors in browser.


## Promises and expected failures

Promises support two code paths. There're two callbacks in `then`.
Also Promises automatically catch all exceptions thrown from then's callbacks and put them into
the next failure callback down the chain.

So the second path is already used for unexpected failures.
That makes it unusable for expected failures (see ["try..catch" section](#trycatch)).
In other words Promises don't support Railways / Either pattern. If you want to use that pattern with Promises
you should wrap Either into Promise. To use Promise's second path for this is a terrible idea.


## Should async abstractions support exceptions catching?

From previous sections we've learned that we definitely may not want to catch exceptions at all.
In this case we get the best debugging experience. Even if an abstraction will catch exceptions and then
re-throw them, it won't be the same as not catching at all, for instance the debugger won't pause on
the original line of the `throw`.

But we also may want to catch "async exceptions", for instance in Node web server case.
A perfect solution would be optional catching.

However, not all abstractions can support optional catching. If we must choose between non-optional
catching and not supporting catching at all we should choose the latter.
Non-optional catching hurts more than helps.

This part seems to be ok in Promises. If we don't provide a failure callback in `then` and don't use
`catch` method it seems that debugger behaves the same way as if error wasn't caught
(at least in current Chrome). Although it wasn't always this way, previously they would simply
swallow the exceptions if there wasn't a `catch` callback.


## How exceptions work in Task

In Task we want to support both **optional** errors catching and Railways / Either pattern.
When we `run()` a task we can choose whether errors will be caught or not,
and if they are caught they go into a separate callback.

```js
// exceptions are not caught
task.run({
  success(x) {
    // handle success
  },
  failure(x) {
    // handle expected failure
  },
})

// if we provide catch callback exceptions are caught
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

So if a `catch` callback isn't provided, we can enjoy a great debugging experience in the browser (even if we have `failure` callback). And in Node we can still catch exceptions in async code if we wanted to. Also notice that we use a separate callback for exceptions, so we won't have to write code that has to handle both expected and unexpected failures.

The default behavior is to not catch. This is what we want in browser, and what also may be a legitimate option for Node.

In Task the `catch` callback is reserved only for bug-exceptions. Expected exceptions must be wrapped in a `try..catch` block manually. All the API and semantics in Task are designed with this assumption in mind.

Exceptions thrown from `success` and `failure` callbacks are never caught, even if a `catch` callback is provided.

```js
task.run({
  success() {
    // this error won't be caught
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
    // handle error thrown from .map(fn) , etc.
  }
})
```
