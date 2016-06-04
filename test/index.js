import test from 'lobot/test'
import Task from '../src'

{
  const task = Task.of(1)

  test('of/ calls cb', 1, t => {
    Task.run(task, t.calledWith(1))
  })

  test('of/ run returns a function', 1, t => {
    const cancel = Task.run(task, () => {})
    t.equal(typeof cancel, 'function')
  })
}


{
  test('fromRunner/ calls runner', 1, t => {
    Task.run(Task.fromRunner(t.calledOnce()), () => {})
  })

  test('fromRunner/ calls cb', 1, t => {
    const task = Task.fromRunner(cb => {
      cb(1)
      return () => {}
    })
    Task.run(task, t.calledWith(1))
  })

  test('fromRunner/ cancel gets called', 1, t => {
    const task = Task.fromRunner(() => t.calledOnce())
    const cancel = Task.run(task, () => {})
    cancel()
  })

  // TODO:
  //   cancel after completion
  //   double completion
}


{
  const task = Task.map(x => x + 2, Task.of(1))

  test('map/ calls cb', 1, t => {
    Task.run(task, t.calledWith(3))
  })

  test('map/ run returns a function', 1, t => {
    const cancel = Task.run(task, () => {})
    t.equal(typeof cancel, 'function')
  })
}
