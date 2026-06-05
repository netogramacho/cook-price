import { getUser, type UserPlan } from './auth'

export function getPlan(): UserPlan | null {
  return getUser()?.plan ?? null
}

export function planUpgradeName(requiredPlan: 'basic' | 'pro'): string {
  return requiredPlan === 'basic' ? 'Plano Básico (R$ 19/mês)' : 'Plano Pro (R$ 39/mês)'
}

export function planLimitMessage(entity: string, max: number, requiredPlan: 'basic' | 'pro'): string {
  return `Você atingiu o limite de ${max} ${entity} do seu plano. Faça upgrade para o ${planUpgradeName(requiredPlan)} para cadastrar mais.`
}

export function planFeatureMessage(requiredPlan: 'basic' | 'pro'): string {
  return `Disponível no ${planUpgradeName(requiredPlan)}. Faça upgrade para desbloquear esta funcionalidade.`
}
