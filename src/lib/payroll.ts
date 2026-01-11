import { supabase } from './supabaseClient'

export async function calculatePayroll(start: string, end: string, employeeId?: string) {
  // Calls the SQL function calculate_payroll
  const params: any = { p_start: start, p_end: end }
  if (employeeId) params.p_employee_id = employeeId
  const { data, error } = await supabase.rpc('calculate_payroll', params)
  if (error) throw error
  return data
}

export async function createPayrollRun(start: string, end: string, createdBy?: string, notes?: string, name?: string, employeeId?: string) {
  const params: any = { p_start: start, p_end: end, p_created_by: createdBy }
  if (notes) params.p_notes = notes
  if (name) params.p_name = name
  if (employeeId) params.p_employee_id = employeeId
  const { data, error } = await supabase.rpc('create_payroll_run', params)
  if (error) throw error
  return data
}

export async function createExpensesFromPayrollRun(runId: string) {
  const { data, error } = await supabase.rpc('create_expenses_from_payroll_run', { p_run_id: runId })
  if (error) throw error
  return data
}
