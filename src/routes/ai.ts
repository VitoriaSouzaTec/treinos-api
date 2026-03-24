import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";
import { auth } from "../lib/auth.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetUserTrainData } from "../usecases/GetUserTrainData.js";
import { ListWorkoutPlans } from "../usecases/ListWorkoutPlans.js";
import { UpsertUserTrainData } from "../usecases/UpsertUserTrainData.js";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `Você é um personal trainer virtual especialista em montagem de planos de treino de musculação, focado em ajudar pessoas leigas. 

REGRAS OBRIGATÓRIAS:
1. Tom amigável, motivador, linguagem simples e sem jargões técnicos.
2. SEMPRE chame a tool getUserTrainData antes de conversar ou fazer perguntas.
3. Se o usuário NÃO tiver dados cadastrados (getUserTrainData retornar null): Pergunte, em UMA ÚNICA MENSAGEM simples e direta, o nome, peso (kg), altura (cm), idade e % de gordura corporal. Após o usuário responder, SALVE esses dados imediatamente usando a tool updateUserTrainData (converta o peso de kg para gramas -> ex: 70kg = 70000).
4. Se o usuário já tiver dados cadastrados: Cumprimente ele usando o nome dele.
5. Para criar um plano de treino: Pergunte DE UMA SÓ VEZ o objetivo, dias disponíveis por semana e restrições físicas/lesões (seja muito simples e direto).
6. O plano DEVE OBRIGATORIAMENTE ter exatamente 7 dias (MONDAY a SUNDAY).
   - Dias sem treino devem passar isRest: true, exercises: [] e estimatedDurationInSeconds: 0.
   - SEMPRE forneça um 'coverImageUrl' obrigatório para CADA DIA, usando as seguintes imagens exclusivas:
     - Dias de treino SUPERIOR (peito, costas, ombros, bíceps, tríceps, push, pull, upper, full body) E DIAS DE DESCANSO:
       "https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO3y8pQ6GBg8iqe9pP2JrHjwd1nfKtVSQskI0v"
       "https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOW3fJmqZe4yoUcwvRPQa8kmFprzNiC30hqftL"
     - Dias de treino INFERIOR (pernas, glúteos, quadríceps, posterior, panturrilha, legs, lower):
       "https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOgCHaUgNGronCvXmSzAMs1N3KgLdE5yHT6Ykj"
       "https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO85RVu3morROwZk5NPhs1jzH7X8TyEvLUCGxY"
     Alterne as imagens quando houver treinos consecutivos do mesmo tipo. ENVIE APENAS O LINK (URL) BRUTO NO CAMPO coverImageUrl, SEM PREFIXOS COMO 'Opção A:'.
7. Quando você tiver todas as informações para montar o treino, chame a tool createWorkoutPlan.
8. Mantenha suas respostas curtas, naturais e super objetivas.

REGRAS PARA DIVISÃO DO TREINO (SPLITS):
- 2-3 dias/semana: Full Body ou ABC (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas+Ombros)
- 4 dias/semana: Upper/Lower ou ABCD (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas, D: Ombros+Abdômen)
- 5 dias/semana: PPLUL - Push/Pull/Legs + Upper/Lower
- 6 dias/semana: PPL 2x - Push/Pull/Legs repetido duas vezes

DIRETRIZES TÉCNICAS DO TREINO:
- Músculos sinérgicos juntos (peito+tríceps, costas+bíceps)
- Exercícios compostos sempre no início, isoladores e máquinas depois
- OBRIGATORIAMENTE de 4 a 8 exercícios por sessão
- OBRIGATORIAMENTE de 3 a 4 séries por exercício
- 8-12 repetições para hipertrofia, 4-6 repetições para força
- Tempo de descanso: 60 a 90 segundos para hipertrofia, 120 a 180 (2 a 3 min) para compostos pesados
- Evite absolutamente treinar o mesmo grupo muscular em dias consecutivos
- Use nomes descritivos em português para cada dia de treino (Exemplo: "Superior A - Foco em Peito e Costas", "Descanso")`;

const aiRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["AI"],
      summary: "AI Virtual Trainer endpoint",
      body: z.object({
        messages: z.array(z.any()),
      }),
    },
    handler: async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        });
      }

      const userId = session.user.id;

      try {
        const result = streamText({
          model: openai("gpt-4o"),
          messages: await convertToModelMessages(request.body.messages),
          system: systemPrompt,
          stopWhen: stepCountIs(5),
          tools: {
            getUserTrainData: tool({
              description:
                "Retorna os dados cadastrados atuais do usuário (peso, altura, idade, etc) ou null se nunca tiver cadastrado.",
              inputSchema: z.object({}),
              execute: async () => {
                const getTrainData = new GetUserTrainData();
                return await getTrainData.execute({ userId });
              },
            }),
            updateUserTrainData: tool({
              description:
                "Atualiza ou cria os dados físicos do usuário no sistema. Atenção: weightInGrams exige conversão de kg para gramas.",
              inputSchema: z.object({
                weightInGrams: z
                  .number()
                  .int()
                  .optional()
                  .describe("Peso corporal em gramas (ex: 75000 para 75kg)"),
                heightInCentimeters: z
                  .number()
                  .int()
                  .optional()
                  .describe("Altura em centímetros (ex: 180)"),
                age: z.number().int().optional().describe("Idade em anos (ex: 28)"),
                bodyFatPercentage: z
                  .number()
                  .int()
                  .optional()
                  .describe("Percentual de gordura (ex: 15)"),
              }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              execute: async (params: any) => {
                const upsertTrainData = new UpsertUserTrainData();
                return await upsertTrainData.execute({ userId, ...params });
              },
            }),
            getWorkoutPlans: tool({
              description: "Lista os planos de treino ativos do usuário.",
              inputSchema: z.object({}),
              execute: async () => {
                const listWorkoutPlans = new ListWorkoutPlans();
                return await listWorkoutPlans.execute({ userId });
              },
            }),
            createWorkoutPlan: tool({
              description:
                "Cria efetivamente no sistema um plano de treino detalhado de 7 dias com base nas divisões e regras escolhidas.",
              inputSchema: z.object({
                name: z.string().describe("Título motivador do plano de treino"),
                workoutDays: z
                  .array(
                    z.object({
                      name: z
                        .string()
                        .describe("Foco do dia em português, ex: Superior A, Inferior, Descanso"),
                      weekDay: z.enum([
                        WeekDay.MONDAY,
                        WeekDay.TUESDAY,
                        WeekDay.WEDNESDAY,
                        WeekDay.THURSDAY,
                        WeekDay.FRIDAY,
                        WeekDay.SATURDAY,
                        WeekDay.SUNDAY,
                      ]),
                      isRest: z
                        .boolean()
                        .describe("true se for descanso, false caso possua treino"),
                      estimatedDurationInSeconds: z
                        .number()
                        .describe("Duração total em segundos estimada"),
                      coverImageUrl: z.string().describe("A URL de imagem estrita (links ufs.sh fornecidos)"),
                      exercises: z.array(
                        z.object({
                          order: z.number().int(),
                          name: z.string(),
                          sets: z.number().int(),
                          reps: z.number().int(),
                          restTimeInSeconds: z
                            .number()
                            .int()
                            .describe("120-180 para pesados, 60-90 hipertrofia"),
                        })
                      ),
                    })
                  )
                  .length(7, "Obrigatório mapear exatamente os 7 dias da semana."),
              }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              execute: async (params: any) => {
                const createPlan = new CreateWorkoutPlan();
                return await createPlan.execute({
                  userId,
                  ...params,
                });
              },
            }),
          },
        });

        const response = result.toTextStreamResponse();
        reply.status(response.status);
        response.headers.forEach((value: string, key: string) => {
          reply.header(key, value);
        });

        if (response.body) {
          return reply.send(response.body);
        }
        return reply.send();
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Internal Server Error in AI Stream",
          code: "AI_ERROR",
        });
      }
    },
  });
};

export default aiRoutes;
