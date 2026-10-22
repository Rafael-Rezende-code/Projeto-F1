// Gera supabase/setup-completo.sql: TODAS as migrations (em ordem de nome) + o seed, num arquivo só, para colar de uma
// vez no SQL Editor do Supabase (docs/backend/supabase.md). As migrations originais não mudam; aqui o texto delas é
// transformado para poder rodar MAIS DE UMA VEZ sem erro:
//   create table / create index        → "if not exists"
//   create trigger / create policy     → precedidos de "drop ... if exists"
//   alter table ... add column         → "add column if not exists"
//   alter table ... add constraint     → bloco que ignora "já existe"
// Funções já são "create or replace"; grants/revokes podem repetir; o seed usa "on conflict".
//
//   pnpm supabase:setup   (roda o seed antes, para o seed.sql estar em dia)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dir = path.join(root, "supabase/migrations");
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
// No Windows o git converte as quebras de linha da cópia local (CRLF): normaliza para LF, senão as regras de idempotência
// (que casam "\n") não pegam e o arquivo gerado quebra na segunda execução.
const lf = (text) => text.replace(/\r\n/g, "\n");

export function idempotent(sql) {
  let out = sql
    .replace(/\bcreate table (?!if not exists)/gi, "create table if not exists ")
    .replace(/\bcreate (unique )?index (?!if not exists)/gi, (_, unique = "") => `create ${unique}index if not exists `)
    .replace(/\badd column (?!if not exists)/gi, "add column if not exists ")
    .replace(/^create trigger (\w+) ([\s\S]*?) on ([\w.]+)/gim, (match, name, _middle, table) => `drop trigger if exists ${name} on ${table};\n${match}`)
    .replace(/^create policy ("[^"]+") on ([\w.]+)/gim, (match, name, table) => `drop policy if exists ${name} on ${table};\n${match}`);
  // "add constraint" dentro de um alter table com várias cláusulas: tira a cláusula e recria num bloco à parte.
  out = out.replace(/^alter table ([\w.]+)\n([\s\S]*?);\n/gim, (statement, table, body) => {
    const clauses = body.split(/,\n(?=\s*add )/);
    const constraints = clauses.filter((clause) => /^\s*add constraint/i.test(clause));
    if (!constraints.length) return statement;
    const rest = clauses.filter((clause) => !/^\s*add constraint/i.test(clause));
    const blocks = constraints.map(
      (clause) => `do $$ begin\n  alter table ${table} ${clause.trim()};\nexception when duplicate_object or duplicate_table then null;\nend $$;\n`,
    );
    return (rest.length ? `alter table ${table}\n${rest.join(",\n")};\n` : "") + blocks.join("");
  });
  return out;
}

const header = `-- Apex: SETUP COMPLETO do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Cole tudo no SQL Editor do projeto e clique em Run. Passo a passo em docs/backend/supabase.md.
--
-- Contém, nesta ordem: ${files.join(", ")} e o seed do catálogo (supabase/seed.sql).
-- Pode rodar de novo: tabelas, índices, colunas, políticas e gatilhos são recriados só se faltarem, e o seed atualiza
-- o que já existe. ATENÇÃO: rodar de novo devolve o ESTOQUE dos produtos do seed aos valores de exemplo; depois que a
-- loja estiver vendendo, rode só as migrations novas.
--
-- No fim, troque o e-mail de exemplo pelo seu (é quem pode entrar no /admin; também vai em ADMIN_EMAILS na Vercel).
`;

const parts = [header];
for (const file of files) parts.push(`\n-- =====================================================================================================\n-- ${file}\n-- =====================================================================================================\n`, idempotent(lf(readFileSync(path.join(dir, file), "utf8"))));
parts.push(`\n-- =====================================================================================================\n-- seed.sql (catálogo de demonstração)\n-- =====================================================================================================\n`, lf(readFileSync(path.join(root, "supabase/seed.sql"), "utf8")));
parts.push(`
-- =====================================================================================================
-- Administradores do painel: troque pelo(s) seu(s) e-mail(s) (em minúsculas) e rode esta linha.
-- =====================================================================================================
-- insert into public.admin_emails (email) values ('seu-email@exemplo.com') on conflict do nothing;
`);

if (process.argv[1] === import.meta.filename) {
  const out = path.join(root, "supabase/setup-completo.sql");
  writeFileSync(out, parts.join(""));
  console.log(`setup-completo.sql: ${files.length} migrations + seed → ${path.relative(process.cwd(), out)}`);
}
