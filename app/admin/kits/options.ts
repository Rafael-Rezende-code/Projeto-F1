import { catalog } from "@/lib/catalog";

// Opções do formulário de kit: equipes, pilotos e produtos do catálogo (nome + slug).
export async function kitOptions() {
  const [teams, drivers, products] = await Promise.all([catalog.getTeams(), catalog.getDrivers(), catalog.getProducts()]);
  return {
    teams: teams.map((team) => ({ slug: team.slug, name: team.name })),
    drivers: drivers.map((driver) => ({ slug: driver.slug, name: driver.name })),
    products: products.map((product) => ({ slug: product.slug, name: product.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}
