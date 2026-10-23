import { beforeEach, describe, expect, it, vi } from "vitest";

// Autorização do painel (operação, fase 5): TODA server action, rota e página de app/admin precisa recusar quem não é
// administrador (sem sessão e com sessão de um e-mail comum) ANTES de tocar no banco. Os módulos são descobertos pelo
// import.meta.glob: arquivo novo entra no teste sozinho. As exceções públicas estão listadas em PUBLIC (login, saída e o
// modelo vazio da planilha). O banco aqui é falso: registra qualquer chamada (.from, .rpc, .storage) para provar que
// nada foi lido nem gravado. A segunda trava (RLS + is_admin() no banco) é testada no PGlite (supabase/tests).
const h = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-falsa-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-falsa-servico";
  process.env.ADMIN_EMAILS = "admin@apex.test";
  class Redirect extends Error {
    constructor(public readonly url: string) {
      super(`REDIRECT ${url}`);
    }
  }
  const state = { user: null as null | { email: string }, dbCalls: [] as string[] };
  // Cliente falso: qualquer encadeamento funciona e termina em { data: [], error: null }; cada acesso ao banco é anotado.
  const chain = (path: string): unknown =>
    new Proxy(function () {}, {
      get(_, key) {
        if (key === "then") return (resolve: (value: unknown) => void) => resolve({ data: [], error: null, count: 0 });
        return chain(`${path}.${String(key)}`);
      },
      apply() {
        return chain(path);
      },
    });
  const client = (kind: string) =>
    new Proxy(
      {},
      {
        get(_, key) {
          if (key === "then") return undefined; // não é uma promessa (senão o await esperaria para sempre)
          if (key === "auth") return { getUser: async () => ({ data: { user: state.user } }), signOut: async () => ({}) };
          state.dbCalls.push(`${kind}.${String(key)}`);
          return chain(`${kind}.${String(key)}`);
        },
      },
    );
  return { Redirect, state, client };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new h.Redirect(url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({}),
  usePathname: () => "/admin",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }), headers: async () => new Headers() }));
vi.mock("@/lib/supabase/session", () => ({ createSessionClient: async () => h.client("sessao") }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => h.client("servico"), createPublicClient: () => h.client("publico") }));

type Module = Record<string, unknown>;
const actions = import.meta.glob("./**/actions.ts");
const routes = import.meta.glob("./**/route.ts");
const pages = import.meta.glob("./**/page.tsx");

// Públicos de propósito: entrar (link mágico só para ADMIN_EMAILS, resposta igual para todos), voltar do link, sair e o
// modelo VAZIO da planilha de importação.
const PUBLIC = new Set(["./entrar/actions.ts#sendMagicLink", "./entrar/callback/route.ts#GET", "./sair/route.ts#POST", "./produtos/importar/modelo/route.ts#GET", "./entrar/page.tsx#default"]);

const form = () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id: "APX-1", itemId: "00000000-0000-0000-0000-000000000000", status: "active", active: "true", reason: "teste", note: "teste", tracking: "BR123456789BR", isTest: "true", code: "TESTE", kind: "percentual", value: "10", csv: "slug;nome\n" }))
    data.set(key, value);
  return data;
};

async function callAll() {
  const calls: { name: string; run: () => Promise<unknown> }[] = [];
  for (const [file, load] of Object.entries(actions)) {
    const mod = (await load()) as Module;
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== "function" || PUBLIC.has(`${file}#${name}`)) continue;
      calls.push({ name: `${file}#${name}`, run: async () => (fn as (...args: unknown[]) => unknown)({}, form()) });
    }
  }
  for (const [file, load] of Object.entries(routes)) {
    const mod = (await load()) as Module;
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const fn = mod[method];
      if (typeof fn !== "function" || PUBLIC.has(`${file}#${method}`)) continue;
      calls.push({ name: `${file}#${method}`, run: async () => (fn as (request: Request) => unknown)(new Request(`http://localhost/admin/${file}`, { method })) });
    }
  }
  for (const [file, load] of Object.entries(pages)) {
    if (PUBLIC.has(`${file}#default`)) continue;
    const mod = (await load()) as Module;
    calls.push({ name: `${file}#default`, run: async () => (mod.default as (props: unknown) => unknown)({ params: Promise.resolve({ id: "APX-1" }), searchParams: Promise.resolve({}) }) });
  }
  return calls;
}

describe("painel admin: autorização", () => {
  beforeEach(() => {
    h.state.dbCalls = [];
  });

  for (const scenario of [
    { label: "sem sessão", user: null },
    { label: "com sessão de quem não é admin", user: { email: "cliente@exemplo.com" } },
  ]) {
    it(`${scenario.label}: toda ação, rota e página manda para /admin/entrar sem tocar no banco`, async () => {
      h.state.user = scenario.user;
      const calls = await callAll();
      expect(calls.length).toBeGreaterThan(20);
      const failures: string[] = [];
      for (const call of calls) {
        h.state.dbCalls = [];
        const outcome = await call.run().then(
          () => "concluiu",
          (error: unknown) => (error instanceof h.Redirect ? error.url : String(error)),
        );
        if (outcome !== "/admin/entrar") failures.push(`${call.name}: ${outcome}`);
        if (h.state.dbCalls.length) failures.push(`${call.name}: tocou no banco (${h.state.dbCalls.join(", ")})`);
      }
      expect(failures).toEqual([]);
    }, 60_000);
  }

  it("controle: com sessão de admin, as ações chegam ao banco (o teste acima não passa por acaso)", async () => {
    h.state.user = { email: "admin@apex.test" };
    const { setCouponActive } = await import("./cupons/actions");
    h.state.dbCalls = [];
    await setCouponActive("00000000-0000-0000-0000-000000000000", false).catch(() => {});
    expect(h.state.dbCalls.length).toBeGreaterThan(0);
  });

  it("lista das ações e rotas protegidas (para o relatório)", async () => {
    h.state.user = null;
    const names = (await callAll()).map((call) => call.name).filter((name) => !name.endsWith("#default"));
    console.info(`[autorização] ${names.length} ações/rotas protegidas:\n${names.join("\n")}`);
    expect(names).toEqual(expect.arrayContaining(["./pedidos/actions.ts#cancelOrder", "./cupons/actions.ts#saveCoupon", "./pedidos/exportar/route.ts#GET"]));
  });
});
