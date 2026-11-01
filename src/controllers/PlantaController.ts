import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

const CAMPOS = [
  "nome",
  "especie",
  "preco",
  "estoque",
  "luminosidade",
  "petFriendly",
  "regaACadaDias",
] as const;

type DadosPlanta = {
  nome?: string;
  especie?: string;
  preco?: number;
  estoque?: number;
  luminosidade?: Luminosidade;
  petFriendly?: boolean;
  regaACadaDias?: number;
};

const LUMINOSIDADES = Object.values(Luminosidade);

const ehTextoPreenchido = (valor: unknown) =>
  typeof valor === "string" && valor.trim() !== "";

const ehLuminosidade = (valor: unknown): valor is Luminosidade =>
  LUMINOSIDADES.includes(valor as Luminosidade);

// Valida só os campos que vieram (diferentes de undefined).
// Serve para o cadastro (depois de checar que todos vieram) e para a edição.
// Devolve a mensagem de erro, ou null se estiver tudo certo.
const validarCampos = (dados: DadosPlanta): string | null => {
  const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = dados;

  if (nome !== undefined && !ehTextoPreenchido(nome)) {
    return "nome deve ser um texto não vazio.";
  }
  if (especie !== undefined && !ehTextoPreenchido(especie)) {
    return "especie deve ser um texto não vazio.";
  }
  if (preco !== undefined && !(Number.isInteger(preco) && preco > 0)) {
    return "preco deve ser um número inteiro maior que zero (em centavos, ex.: 8990).";
  }
  if (estoque !== undefined && !(Number.isInteger(estoque) && estoque >= 0)) {
    return "estoque deve ser um número inteiro maior ou igual a zero.";
  }
  if (luminosidade !== undefined && !ehLuminosidade(luminosidade)) {
    return `luminosidade deve ser um destes valores: ${LUMINOSIDADES.join(", ")}.`;
  }
  if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
    return "petFriendly deve ser true ou false.";
  }
  if (regaACadaDias !== undefined && !(Number.isInteger(regaACadaDias) && regaACadaDias >= 1)) {
    return "regaACadaDias deve ser um número inteiro maior ou igual a 1.";
  }

  return null;
};

const lerDados = (body: Record<string, unknown> | undefined): DadosPlanta => {
  const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } =
    (body ?? {}) as DadosPlanta;
  return { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };
};

const lerId = (valor: string) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const createPlanta = async (req: Request, res: Response) => {
  try {
    const dados = lerDados(req.body);

    const faltando = CAMPOS.filter((campo) => dados[campo] === undefined);
    if (faltando.length > 0) {
      return res.status(400).json({
        message: `Campos obrigatórios faltando: ${faltando.join(", ")}.`,
      });
    }

    const erro = validarCampos(dados);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.createPlanta({
      nome: dados.nome!.trim(),
      especie: dados.especie!.trim(),
      preco: dados.preco!,
      estoque: dados.estoque!,
      luminosidade: dados.luminosidade!,
      petFriendly: dados.petFriendly!,
      regaACadaDias: dados.regaACadaDias!,
    });

    return res.status(201).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao cadastrar planta." });
  }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    const { luminosidade, petFriendly, nome, ordem } = req.query;

    if (luminosidade !== undefined && !ehLuminosidade(luminosidade)) {
      return res.status(400).json({
        message: `Filtro luminosidade inválido. Use: ${LUMINOSIDADES.join(", ")}.`,
      });
    }
    if (petFriendly !== undefined && petFriendly !== "true" && petFriendly !== "false") {
      return res.status(400).json({ message: "Filtro petFriendly deve ser true ou false." });
    }
    if (nome !== undefined && typeof nome !== "string") {
      return res.status(400).json({ message: "Filtro nome inválido." });
    }
    if (ordem !== undefined && ordem !== "preco" && ordem !== "nome") {
      return res.status(400).json({ message: "Ordem deve ser preco ou nome." });
    }

    const plantas = await PlantaRepository.findAllPlantas({
      luminosidade: luminosidade,
      petFriendly: petFriendly === undefined ? undefined : petFriendly === "true",
      nome: nome,
      ordem: ordem,
    });

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const readPlantasEsgotadas = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPlantasEsgotadas();
    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas esgotadas." });
  }
};

export const readValorTotalDoEstoque = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPrecoEEstoqueDasPlantas();

    let valorTotalEmCentavos = 0;
    let totalDeVasos = 0;
    for (const planta of plantas) {
      valorTotalEmCentavos += planta.preco * planta.estoque;
      totalDeVasos += planta.estoque;
    }

    return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao calcular o valor do estoque." });
  }
};

export const readPlantaById = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    return res.status(200).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar planta." });
  }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const dados = lerDados(req.body);
    const erro = validarCampos(dados);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const plantaAtualizada = await PlantaRepository.updatePlanta(id, {
      nome: dados.nome?.trim(),
      especie: dados.especie?.trim(),
      preco: dados.preco,
      estoque: dados.estoque,
      luminosidade: dados.luminosidade,
      petFriendly: dados.petFriendly,
      regaACadaDias: dados.regaACadaDias,
    });

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const venderPlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const quantidade = req.body?.quantidade;
    if (!(Number.isInteger(quantidade) && quantidade > 0)) {
      return res.status(400).json({ message: "quantidade deve ser um número inteiro maior que zero." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    if (planta.estoque < quantidade) {
      return res.status(400).json({
        message: `Estoque insuficiente: temos só ${planta.estoque} vaso(s) de ${planta.nome}.`,
      });
    }

    const vendeu = await PlantaRepository.venderPlanta(id, quantidade);
    if (!vendeu) {
      // Outra venda levou o estoque entre a checagem acima e a baixa
      return res.status(400).json({ message: "Estoque insuficiente para essa venda." });
    }

    const plantaAtualizada = await PlantaRepository.findPlantaById(id);
    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao registrar venda." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    await PlantaRepository.deletePlanta(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao remover planta." });
  }
};
