import os from "node:os";

const port = process.env.PORT || "3000";

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  const virtualHint =
    /wsl|hyper-v|vethernet|virtualbox|vmware|docker|loopback|npcap|tailscale|zerotier/i;

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      if (net.address.startsWith("169.254.")) continue;
      const isVirtual = virtualHint.test(name);
      addresses.push({ name, address: net.address, isVirtual });
    }
  }

  addresses.sort((a, b) => Number(a.isVirtual) - Number(b.isVirtual));
  return addresses;
}

const addrs = getLanAddresses();

console.log("\nNSB Invest — acesso na rede local\n");

if (addrs.length === 0) {
  console.log("Nenhum IPv4 de rede encontrado. Verifique Wi‑Fi/Ethernet.\n");
  process.exit(1);
}

const primary = addrs.find((a) => !a.isVirtual) ?? addrs[0];
console.log(`  Use este (rede Wi‑Fi/Ethernet): http://${primary.address}:${port}\n`);

for (const { name, address, isVirtual } of addrs) {
  const tag = isVirtual ? " (virtual — ignore para colegas)" : "";
  console.log(`  ${name}: http://${address}:${port}${tag}`);
}

console.log("\nColegas na mesma rede devem abrir um dos endereços acima.");
console.log("No seu PC, mantenha: npm run dev (ou npm run dev:lan)");
console.log("Postgres: npm run db:up — só você precisa do banco rodando.\n");
console.log("Se não abrir, libere a porta no Firewall do Windows (entrada TCP", port + ").\n");
