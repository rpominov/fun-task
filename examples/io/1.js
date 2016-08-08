// @flow

import readline from 'readline'
import Task from '../../src'

type Empty = void & null
const fixEmpty = <T>(x: Empty | T): T => (x: any)

// wrappers

// this is actually async, I didn't figured out how to read sync from stdin in Node
const read = (): Task<string, Empty> => Task.create(suc => {
  const rl = readline.createInterface({input: process.stdin})
  rl.on('line', line => { rl.close(); suc(line) })
  return () => { rl.close() }
})

const write = (text: string): Task<void, Empty> => Task.create(suc => {
  console.log(text) // eslint-disable-line
  suc()
})


// pure

const strToNumber = (str: string): Task<number, string> => /^\d+$/.test(str)
  ? Task.of(Number(str))
  : Task.rejected('That\'s not a number')

// This could be in the library
const retryUntilSuccess = <T>(task: Task<T, mixed>): Task<T, Empty> => {
  const recur = () => task.orElse(recur)
  return recur()
}

// This could be in the library (like all() but not parallel)
const successively = <S1,F1,S2,F2>(task1: Task<S1, F1>, task2: Task<S2, F2>): Task<[S1, S2], F1 | F2> =>
  task1.chain(x1 => task2.map(x2 => [x1, x2]))

const getNumber = (message: string): Task<number, Empty> =>
  retryUntilSuccess(
    write(message)
    .chain(read)
    .chain(strToNumber)
    .orElse(error => write(fixEmpty(error)).chain(Task.rejected))
  )

const program: Task<void, Empty> =
  successively(getNumber('Give me a number'), getNumber('Give me another number'))
  .map(([x, y]) => `${x} * ${y} = ${x * y}`)
  .chain(write)


// impure

program.run({})
