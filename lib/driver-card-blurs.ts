import { drivers } from "@/lib/drivers";
import { localImage } from "@/lib/local-images";
import { CAMPEAO_CARD } from "@/lib/campeao";

// Placeholders desfocados das fotos dos cards de piloto, montados no servidor e passados ao DriverCardList (client):
// assim o mapa inteiro de placeholders (lib/generated) não vai para o JS do cliente.
export const driverCardBlurs = () =>
  Object.fromEntries([
    ...drivers.map((driver) => [driver.slug, localImage(driver.image)?.blur ?? ""]),
    // Card dourado do campeão (home e /pilotos usam fotos próprias).
    ["campeao-home", localImage(CAMPEAO_CARD.home.image.src)?.blur ?? ""],
    ["campeao-pilotos", localImage(CAMPEAO_CARD.pilotos.image.src)?.blur ?? ""],
  ]) as Record<string, string>;
