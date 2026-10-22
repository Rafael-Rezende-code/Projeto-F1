// Conteúdo editorial das páginas de piloto (fase 4 da rodada de conteúdo). Homenagem de fã, em português, no tom do
// site. Só fatos estáveis e verificados (fontes em docs/conteudo/fontes-pilotos.md); nada de estatística volátil
// (vitórias, pódios, pontos), nada de citação atribuída ao piloto e NUNCA sugerir que a loja é oficial, licenciada,
// parceira ou endossada pelo piloto ou pela equipe.
export type DriverFact = { value: string; label: string; detail?: string };

export type DriverContent = {
  /** Frase de abertura (WordsStagger). */
  opening: string;
  /** Trajetória: 3 a 4 parágrafos. */
  career: string[];
  /** Estilo de pilotagem: 1 a 2 parágrafos. */
  style: string[];
  /** 3 a 5 números/marcos estáveis. */
  facts: DriverFact[];
  /** 3 curiosidades. */
  trivia: string[];
};
