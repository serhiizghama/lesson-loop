import { describe, expect, it } from 'vitest'
import { parseRoute, lessonPath, studentPath, teacherPath } from './router'

describe('parseRoute', () => {
  it('reads the home screen', () => {
    expect(parseRoute('/', '')).toEqual({ name: 'home' })
    expect(parseRoute('', '')).toEqual({ name: 'home' })
  })

  it('reads a solo lesson', () => {
    expect(parseRoute('/l/animals', '')).toEqual({ name: 'lesson', lessonId: 'animals' })
  })

  it('reads the size a lesson was opened at (design D5)', () => {
    expect(parseRoute('/l/animals/wild', '')).toEqual({
      name: 'lesson', lessonId: 'animals', choice: 'wild',
    })
    expect(parseRoute('/l/animals/all', '')).toEqual({
      name: 'lesson', lessonId: 'animals', choice: 'all',
    })
  })

  it('reads a size the topic has not got, leaving the app to say so', () => {
    expect(parseRoute('/l/animals/nope', '')).toEqual({
      name: 'lesson', lessonId: 'animals', choice: 'nope',
    })
  })

  it("reads the student's link, which carries nothing but the code", () => {
    expect(parseRoute('/r/ab12', '')).toEqual({ name: 'student', code: 'AB12' })
  })

  it("reads the teacher's link and takes the key from the fragment (design D12)", () => {
    expect(parseRoute('/t/AB12', '#deadbeef')).toEqual({
      name: 'teacher', code: 'AB12', key: 'deadbeef',
    })
  })

  it('gives the teacher no key when the fragment is missing, so the room makes them a student', () => {
    expect(parseRoute('/t/AB12', '')).toEqual({ name: 'teacher', code: 'AB12', key: '' })
  })

  it('does not recognise a path it does not serve', () => {
    expect(parseRoute('/t/AB12/extra', '')).toEqual({ name: 'unknown' })
    expect(parseRoute('/r/AB12/extra', '')).toEqual({ name: 'unknown' })
    expect(parseRoute('/l/animals/wild/more', '')).toEqual({ name: 'unknown' })
    expect(parseRoute('/nonsense', '')).toEqual({ name: 'unknown' })
  })

  it('builds the links it parses', () => {
    expect(parseRoute(lessonPath('animals'), '')).toEqual({ name: 'lesson', lessonId: 'animals' })
    expect(parseRoute(lessonPath('animals', 'wild'), '')).toEqual({
      name: 'lesson', lessonId: 'animals', choice: 'wild',
    })
    expect(parseRoute(studentPath('AB12'), '')).toEqual({ name: 'student', code: 'AB12' })

    const teacher = teacherPath('AB12', 'key')
    const [path, hash] = teacher.split('#')
    expect(parseRoute(path!, `#${hash}`)).toEqual({ name: 'teacher', code: 'AB12', key: 'key' })
  })
})
