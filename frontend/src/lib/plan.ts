import { getUser, type UserPlan } from './auth'

export function getPlan(): UserPlan | null {
  return getUser()?.plan ?? null
}

export function planUpgradeName(plan: UserPlan): string {
  return `${plan.label} (R$ ${Number(plan.price).toFixed(0)}/mês)`
}

export function planLimitMessage(entity: string, max: number, plan: UserPlan): string {
  return `Você atingiu o limite de ${max} ${entity} do seu plano. Faça upgrade para o ${planUpgradeName(plan)} para cadastrar mais.`
}

export function planFeatureMessage(plan: UserPlan): string {
  return `Disponível no ${planUpgradeName(plan)}. Faça upgrade para desbloquear esta funcionalidade.`
}
