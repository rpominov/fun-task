import test from 'lobot/test'
import Task from '../src'

function catchWarnings(cb) {
  /* eslint-disable */
  const warnings = []
  const originalTrace = console.trace
  console.trace = (warn) => {
    warnings.push(warn)
  }
  cb()
  console.trace = originalTrace
  return warnings
  /* eslint-enable */
}


{
  const task = Task.of(1)

  test('of/ calls r cb', 1, t => {
    Task.run(task, t.calledWith(1), () => {})
  })

  test('of/ doesn\'t call l cb', 0, t => {
    Task.run(task, () => {}, t.fail)
  })

  test('of/ run returns a function', 1, t => {
    const cancel = Task.run(task, () => {}, () => {})
    t.equal(typeof cancel, 'function')
  })

}


{
  test('create/ calls computation', 1, t => {
    Task.run(Task.create(t.calledOnce()), () => {}, () => {})
  })

  test('create/ calls r', 1, t => {
    const task = Task.create(r => {
      r(1)
      return () => {}
    })
    Task.run(task, t.calledWith(1), () => {})
  })

  test('create/ calls l', 1, t => {
    const task = Task.create((_, l) => {
      l(1)
      return () => {}
    })
    Task.run(task, () => {}, t.calledWith(1))
  })

  test('create/ cancel gets called', 1, t => {
    const task = Task.create(() => t.calledOnce())
    const cancel = Task.run(task, () => {}, () => {})
    cancel()
  })

  test('create/ cancel after completion is a noop', 0, t => {
    const task = Task.create(r => { r(1); return t.fail })
    const cancel = Task.run(task, () => {}, () => {})
    cancel()
  })

  test('create/ double cancel is ok', 1, t => {
    const task = Task.create(() => t.calledOnce())
    const cancel = Task.run(task, () => {}, () => {})
    cancel()
    cancel()
  })

  test('create/ double resolve is a noop with a warning', 2, t => {
    const task = Task.create(r => { r(1); r(2) })
    const warnings = catchWarnings(() => {
      Task.run(task, t.calledWith(1), () => {})
    })
    t.deepEqual(warnings, ['Warning: resolve() was called after a completion or a cancelation, this is a noop.'])
  })

  test('create/ double reject is a noop with a warning', 2, t => {
    const task = Task.create((_, r) => { r(1); r(2) })
    const warnings = catchWarnings(() => {
      Task.run(task, () => {}, t.calledWith(1))
    })
    t.deepEqual(warnings, ['Warning: reject() was called after a completion or a cancelation, this is a noop.'])
  })

  test('create/ resolve after cancelation is a noop with a warning', 1, t => {
    let r
    const task = Task.create(_r => { r = _r })
    const warnings = catchWarnings(() => {
      Task.run(task, t.fail, () => {})()
      r(1)
    })
    t.deepEqual(warnings, ['Warning: resolve() was called after a completion or a cancelation, this is a noop.'])
  })

  test('create/ reject after cancelation is a noop with a warning', 1, t => {
    let r
    const task = Task.create((_, _r) => { r = _r })
    const warnings = catchWarnings(() => {
      Task.run(task, t.fail, () => {})()
      r(1)
    })
    t.deepEqual(warnings, ['Warning: reject() was called after a completion or a cancelation, this is a noop.'])
  })
}


{
  const task = Task.map(x => x + 2, Task.of(1))

  test('map/ calls cb', 1, t => {
    Task.run(task, t.calledWith(3), () => {})
  })

  test('map/ run returns a function', 1, t => {
    const cancel = Task.run(task, () => {}, () => {})
    t.equal(typeof cancel, 'function')
  })

  test('map/ delegates cancelation', 1, t => {
    Task.run(Task.map(x => x, Task.create(() => t.calledOnce())), () => {}, () => {})()
  })
}
