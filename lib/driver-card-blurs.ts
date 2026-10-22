import { drivers } from "@/lib/drivers";
import { localImage } from "@/lib/local-images";

// Placeholders desfocados das fotos dos cards de piloto, montados no servidor e passados ao DriverCardList (client):
// assim o mapa inteiro de placeholders (lib/generated) não vai para o JS do cliente.
export const driverCardBlurs = () =>
  Object.fromEntries(drivers.map((driver) => [driver.slug, localImage(driver.image)?.blur ?? ""])) as Record<string, string>;
