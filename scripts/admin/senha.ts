// Define (ou cria) a senha do administrador do painel: `pnpm admin:senha`. INTERATIVO: rode no seu terminal.
//
// - Lê o .env.local (URL, service role e ADMIN_EMAILS); nada disso é impresso.
// - Pede a senha duas vezes, com a digitação OCULTA (sem eco). A senha NUNCA vem por argumento, variável de ambiente,
//   arquivo ou prompt, e não é gravada nem registrada em lugar nenhum: vai direto para o Supabase pela service role.
// - Usuário existe: troca a senha (auth.admin.updateUserById). Não existe: cria, com o e-mail já confirmado.
// - Garante a linha do e-mail em admin_emails.
// Recuperar o acesso = rodar de novo (sem e-mail de recuperação).
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile, maskEmail } from "../supabase/ativar-lib";
import { passwordProblem, passwordWarning, scrub } from "./senha-lib";

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Rode este comando num terminal interativo (a senha é digitada sem eco)."));
      return;
    }
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          finish();
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) {
    console.error(".env.local não encontrado. Rode na pasta do projeto.");
    process.exit(2);
  }
  const env = loadEnvFile(file);
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS"];
  const missing = names.filter((name) => !env[name]);
  if (missing.length) {
    console.error(`Faltam no .env.local: ${missing.join(", ")} (ausente).`);
    process.exit(2);
  }
  const emails = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const wanted = process.argv.find((arg) => arg.startsWith("--email="))?.slice(8).toLowerCase();
  let email = wanted ?? emails[0];
  if (!wanted && emails.length > 1) {
    emails.forEach((e, i) => console.log(`  ${i + 1}) ${e}`));
    const pick = Number(await ask("Para qual administrador? (número) "));
    email = emails[pick - 1];
  }
  if (!email || !emails.includes(email)) {
    console.error("Esse e-mail não está em ADMIN_EMAILS.");
    process.exit(2);
  }

  console.log(`Definir a senha de ${email}. A digitação fica oculta.`);
  const password = await readHidden("Nova senha: ");
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const confirmation = await readHidden("Repita a senha: ");
  if (confirmation !== password) {
    console.error("As senhas não conferem. Nada foi alterado.");
    process.exit(1);
  }
  const warning = passwordWarning(password);
  if (warning) {
    const answer = (await ask(`${warning} Continuar mesmo assim? (s/N) `)).toLowerCase();
    if (answer !== "s" && answer !== "sim") {
      console.log("Cancelado. Nada foi alterado.");
      process.exit(1);
    }
  }

  const secrets = [password, env.SUPABASE_SERVICE_ROLE_KEY];
  const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
      if (data.users.length < 200) break;
    }
    if (userId) {
      const { error } = await service.auth.admin.updateUserById(userId, { password, email_confirm: true });
      if (error) throw error;
      console.log(`✔ Senha de ${maskEmail(email)} atualizada.`);
    } else {
      const { error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      console.log(`✔ Usuário ${maskEmail(email)} criado, com o e-mail já confirmado.`);
    }
    const { error: upsertError } = await service.from("admin_emails").upsert({ email }, { onConflict: "email" });
    if (upsertError) throw upsertError;
    console.log("✔ E-mail garantido em admin_emails.");
    console.log("Pronto. Entre em /admin/entrar com o e-mail e a senha.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✖ Não foi possível concluir: ${scrub(message, ...secrets)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Erro inesperado.");
  process.exit(1);
});
