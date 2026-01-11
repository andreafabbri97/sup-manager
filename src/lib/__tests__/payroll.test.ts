import { vi, describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabaseClient'
import * as payroll from '../payroll'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

describe('createPayrollRun wrapper', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('forwards p_employee_id when provided', async () => {
    // arrange
    const spy = vi.spyOn((await import('../../lib/supabaseClient')).supabase, 'rpc').mockResolvedValue({ data: { payroll_run_id: 'r1' }, error: null } as any)

    // act
    await payroll.createPayrollRun('2026-01-01', '2026-01-07', undefined, undefined, 'RunName', 'emp-1')

    // assert
    expect(spy).toHaveBeenCalled()
    const calledWith = spy.mock.calls[0]
    expect(calledWith[0]).toBe('create_payroll_run')
    expect(calledWith[1]).toMatchObject({ p_start: '2026-01-01', p_end: '2026-01-07', p_name: 'RunName', p_employee_id: 'emp-1' })
  })

  it('does not include p_employee_id when not provided', async () => {
    const spy = vi.spyOn((await import('../../lib/supabaseClient')).supabase, 'rpc').mockResolvedValue({ data: { payroll_run_id: 'r1' }, error: null } as any)

    await payroll.createPayrollRun('2026-01-01', '2026-01-07', undefined, undefined, 'RunName')

    expect(spy).toHaveBeenCalled()
    const calledWith = spy.mock.calls[0]
    expect(calledWith[1]).toMatchObject({ p_start: '2026-01-01', p_end: '2026-01-07', p_name: 'RunName' })
    expect(calledWith[1]).not.toHaveProperty('p_employee_id')
  })
})