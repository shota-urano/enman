import { describe, it, expect } from 'vitest'
import * as errors from '@/server/utils/errors'

describe('alias resolution basic', () => {
  it('loads errors module', () => {
    expect(typeof errors.systemError).toBe('function')
  })
})

