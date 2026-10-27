// Seed do catálogo no Supabase (fase 9): leva o catálogo atual (lib/catalog/seed/) para as tabelas.
//
//   pnpm supabase:seed            → gera supabase/seed.sql (cole no SQL Editor ou use `supabase db reset`)
//   pnpm supabase:seed --push     → grava direto no projeto (precisa de NEXT_PUBLIC_SUPABASE_URL e
//                                   SUPABASE_SERVICE_ROLE_KEY no ambiente, ex.: `node --env-file=.env.local`)
//
// Idempotente: atualiza o que já existe (categorias, equipes e pilotos pelo slug; produtos pelo código APX-xxx;
// variantes pelo SKU) e regrava as imagens de cada produto do seed. Não apaga produtos criados no painel admin.
// ATENÇÃO: o estoque das variantes volta ao valor do seed. Depois do lançamento, não rode de novo sem querer isso.
import { writeFileSync } from "node:fs";
import { LOCAL_KITS } from "../../lib/kits";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedData } from "@/lib/catalog/seed-repository";
import { categoryToRow, driverToRow, productToRows, teamToRow } from "@/lib/catalog/supabase-mapping";

const categories = seedData.categories.map(categoryToRow);
const teams = seedData.teams.map(teamToRow);
const drivers = seedData.drivers.map(driverToRow);
const products = seedData.products.map(productToRows);

const q = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return `array[${value.map(q).join(", ")}]::text[]`;
  if (typeof value === "object") return `${q(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

function upsert(table: string, rows: Record<string, unknown>[], conflict: string) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const values = rows.map((row) => `  (${columns.map((column) => q(row[column])).join(", ")})`).join(",\n");
  const updates = columns.filter((column) => column !== conflict).map((column) => `${column} = excluded.${column}`).join(", ");
  return `insert into public.${table} (${columns.join(", ")}) values\n${values}\non conflict (${conflict}) do update set ${updates};\n`;
}

// Curadoria (migração 20261030000000_curadoria.sql) num bloco à parte: só roda se as colunas existirem, para o mesmo
// seed.sql servir a bancos de antes da migração (o PL/pgSQL só compila o UPDATE quando o "if" é verdadeiro).
function curationSql() {
  const values = products.map(({ row, curation }) => `(${q(row.code)}, ${curation.bestseller_manual}, ${q(curation.bestseller_rank)}::integer, ${q(curation.new_until)}::date)`).join(",\n      ");
  return `do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'bestseller_manual') then
    update public.products p set bestseller_manual = v.manual, bestseller_rank = v.rank, new_until = v.until
    from (values
      ${values}
    ) as v(code, manual, rank, until)
    where p.code = v.code;
  end if;
end $$;
`;
}

// Personalização (migração 20261104000000_personalizacao.sql): só os produtos personalizáveis, num bloco que só roda se
// as colunas existirem.
function personalizationSql() {
  const list = products.filter(({ personalization }) => personalization.personalizable);
  if (!list.length) return "";
  const values = list
    .map(({ row, personalization: p }) => `(${q(row.code)}, ${p.personalization_fee_cents}, ${p.personalization_max_name}, ${p.personalization_number_min}, ${p.personalization_number_max})`)
    .join(",\n      ");
  return `do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'personalizable') then
    update public.products p set personalizable = true, personalization_fee_cents = v.fee, personalization_max_name = v.max_name,
      personalization_number_min = v.num_min, personalization_number_max = v.num_max
    from (values
      ${values}
    ) as v(code, fee, max_name, num_min, num_max)
    where p.code = v.code;
  end if;
end $$;
`;
}

// Kits (migração 20261103000000_kits.sql): os locais de lib/kits.ts, num bloco que só roda se a tabela existir.
function kitsSql() {
  const values = LOCAL_KITS.map((kit) => `(${q(kit.slug)}, ${q(kit.title)}, ${q(kit.teamSlug ?? null)}, ${q(kit.driverSlug ?? null)}, array[${kit.productSlugs.map(q).join(", ")}]::text[], ${kit.percent}, ${kit.active !== false})`).join(",\n      ");
  return `do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'kits') then
    insert into public.kits (slug, title, team_slug, driver_slug, product_slugs, discount_percent, active) values
      ${values}
    on conflict (slug) do update set title = excluded.title, team_slug = excluded.team_slug, driver_slug = excluded.driver_slug,
      product_slugs = excluded.product_slugs, discount_percent = excluded.discount_percent, active = excluded.active;
  end if;
end $$;
`;
}

function toSql() {
  const productId = (code: string) => `(select id from public.products where code = ${q(code)})`;
  const parts = [
    "-- Gerado por scripts/supabase/seed.ts a partir de lib/catalog/seed/. Não editar à mão.",
    "begin;",
    upsert("categories", categories, "slug"),
    upsert("teams", teams, "slug"),
    upsert("drivers", drivers, "slug"),
    upsert("products", products.map((p) => p.row), "code"),
    curationSql(),
    personalizationSql(),
    kitsSql(),
  ];
  for (const { row, variants, images } of products) {
    for (const variant of variants)
      parts.push(
        `insert into public.product_variants (sku, product_id, size, color, stock, position) values (${q(variant.sku)}, ${productId(row.code!)}, ${q(variant.size)}, ${q(variant.color)}, ${variant.stock}, ${variant.position}) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;`,
      );
    parts.push(`delete from public.product_images where product_id = ${productId(row.code!)} and storage_path is null;`);
    for (const image of images)
      parts.push(`insert into public.product_images (product_id, src, alt, illustrative, position) values (${productId(row.code!)}, ${q(image.src)}, ${q(image.alt)}, ${image.illustrative}, ${image.position});`);
  }
  parts.push("commit;", "");
  return parts.join("\n");
}

async function push() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: node --env-file=.env.local).");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const check = <T,>(result: { error: { message: string } | null; data?: T | null }, what: string) => {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    return result.data as T;
  };
  check(await db.from("categories").upsert(categories, { onConflict: "slug" }), "categorias");
  check(await db.from("teams").upsert(teams, { onConflict: "slug" }), "equipes");
  check(await db.from("drivers").upsert(drivers, { onConflict: "slug" }), "pilotos");
  const saved = check<{ id: string; code: string }[]>(await db.from("products").upsert(products.map((p) => ({ ...p.row, ...p.curation, ...p.personalization })), { onConflict: "code" }).select("id, code"), "produtos");
  const idOf = new Map(saved.map((row) => [row.code, row.id]));
  const variants = products.flatMap(({ row, variants }) => variants.map((variant) => ({ ...variant, product_id: idOf.get(row.code!)! })));
  check(await db.from("product_variants").upsert(variants, { onConflict: "sku" }), "variantes");
  const ids = [...idOf.values()];
  check(await db.from("product_images").delete().in("product_id", ids).is("storage_path", null), "imagens (limpeza)");
  const images = products.flatMap(({ row, images }) => images.map((image) => ({ ...image, product_id: idOf.get(row.code!)! })));
  check(await db.from("product_images").insert(images), "imagens");
  console.log(`Supabase: ${categories.length} categorias, ${teams.length} equipes, ${drivers.length} pilotos, ${products.length} produtos, ${variants.length} variantes, ${images.length} imagens.`);
}

if (process.argv.includes("--push")) {
  push().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
} else {
  const out = path.resolve(import.meta.dirname, "../../supabase/seed.sql");
  writeFileSync(out, toSql());
  console.log(`seed.sql: ${products.length} produtos → ${path.relative(process.cwd(), out)}`);
}
