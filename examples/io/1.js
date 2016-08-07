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

const subProgram: Task<string, void> =
  write('Give me a number')
  .chain(read)
  .chain(strToNumber)
  .chain(x =>
    write('Give me another number')
    .chain(read)
    .chain(strToNumber)
    .map(y => `${x} * ${y} = ${x * y}`)
  )
  .orElse(error => write(fixEmpty(error)).chain(Task.rejected))

const recur = () => subProgram.orElse(recur)
const program: Task<void, Empty> = recur().chain(write)


// impure

program.run({})
