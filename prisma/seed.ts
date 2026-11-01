import "dotenv/config";
import { PrismaClient, Luminosidade } from "@prisma/client";

const prisma = new PrismaClient();

const plantas = [
  { nome: "Costela-de-adão", especie: "Monstera deliciosa", preco: 8990, estoque: 12, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: false, regaACadaDias: 7 },
  { nome: "Samambaia", especie: "Nephrolepis exaltata", preco: 4590, estoque: 0, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: true, regaACadaDias: 3 },
  { nome: "Espada-de-são-jorge", especie: "Dracaena trifasciata", preco: 5990, estoque: 8, luminosidade: Luminosidade.SOMBRA, petFriendly: false, regaACadaDias: 15 },
  { nome: "Calathea", especie: "Goeppertia orbifolia", preco: 7490, estoque: 5, luminosidade: Luminosidade.SOMBRA, petFriendly: true, regaACadaDias: 4 },
  { nome: "Cacto-mandacaru", especie: "Cereus jamacaru", preco: 3990, estoque: 20, luminosidade: Luminosidade.SOL_PLENO, petFriendly: true, regaACadaDias: 20 },
];

const main = async () => {
  await prisma.planta.createMany({ data: plantas });
  console.log(`🌱 ${plantas.length} plantas de exemplo cadastradas`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
