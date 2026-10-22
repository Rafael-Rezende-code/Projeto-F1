// Conteúdo editorial das páginas de equipe (fase 5 da rodada de conteúdo): abertura, história em 2 parágrafos, 3 marcos
// e a sede. Homenagem de fã, só fatos estáveis e verificados (fontes em docs/conteudo/fontes-equipes.md). NUNCA
// sugerir que a loja é oficial, licenciada, parceira ou endossada pela equipe. Sem citações atribuídas.
export type TeamMilestone = { year: string; text: string };
export type TeamContent = { opening: string; history: [string, string]; milestones: TeamMilestone[]; hq: string };
