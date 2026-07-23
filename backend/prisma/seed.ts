import 'dotenv/config';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create or get demo organization
  const hashedPassword = await bcrypt.hash('123456', 12);

  const org = await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: { name: 'ZapFlow Demo', plan: 'PRO' },
    create: { id: 'org-demo', name: 'ZapFlow Demo', plan: 'PRO' },
  });

  // Create or update demo user (PRO plan — no trial expiration)
  const user = await prisma.user.upsert({
    where: { email: 'admin@zapflow.com' },
    update: {
      name: 'Admin',
      password: hashedPassword,
      role: 'OWNER',
      plan: 'PRO',
      organizationId: org.id,
      trialStartedAt: new Date(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: 'Admin',
      email: 'admin@zapflow.com',
      password: hashedPassword,
      role: 'OWNER',
      plan: 'PRO',
      organizationId: org.id,
      trialStartedAt: new Date(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Create or update second user (attendant — FREE plan with trial)
  await prisma.user.upsert({
    where: { email: 'atendente@zapflow.com' },
    update: {
      name: 'Atendente 1',
      password: hashedPassword,
      role: 'ATTENDANT',
      plan: 'FREE',
      organizationId: org.id,
      trialStartedAt: new Date(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: 'Atendente 1',
      email: 'atendente@zapflow.com',
      password: hashedPassword,
      role: 'ATTENDANT',
      plan: 'FREE',
      organizationId: org.id,
      trialStartedAt: new Date(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Create demo WhatsApp number
  const whatsappNumber = await prisma.whatsAppNumber.create({
    data: {
      number: '+5511999999999',
      name: 'Número Principal',
      status: 'CONNECTED',
      organizationId: org.id,
    },
  });

  // Create demo contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: { name: 'João Silva', phone: '+5511988888888', email: 'joao@email.com', company: 'Tech Corp', tags: JSON.stringify(['lead', 'vip']), userId: user.id },
    }),
    prisma.contact.create({
      data: { name: 'Maria Santos', phone: '+5511977777777', email: 'maria@email.com', tags: JSON.stringify(['lead']), userId: user.id },
    }),
    prisma.contact.create({
      data: { name: 'Pedro Costa', phone: '+5511966666666', email: 'pedro@email.com', company: 'StartupX', tags: JSON.stringify(['cliente']), userId: user.id },
    }),
    prisma.contact.create({
      data: { name: 'Ana Oliveira', phone: '+5511955555555', email: 'ana@email.com', tags: JSON.stringify(['lead', 'interessado']), userId: user.id },
    }),
    prisma.contact.create({
      data: { name: 'Lucas Ferreira', phone: '+5511944444444', email: 'lucas@email.com', company: 'Agência Digital', tags: JSON.stringify(['parceiro']), userId: user.id },
    }),
  ]);

  // Create demo conversations
  const conv1 = await prisma.conversation.create({
    data: {
      whatsappNumberId: whatsappNumber.id,
      contactId: contacts[0].id,
      userId: user.id,
      status: 'open',
    },
  });

  await prisma.message.createMany({
    data: [
      { content: 'Olá! Gostaria de saber sobre os planos', type: 'TEXT', from: contacts[0].phone, to: whatsappNumber.number, conversationId: conv1.id, isFromBot: false },
      { content: 'Olá João! Que bom ter você aqui! Temos planos a partir de R$ 97/mês. Quer que eu te conte mais?', type: 'TEXT', from: whatsappNumber.number, to: contacts[0].phone, conversationId: conv1.id, isFromBot: true },
      { content: 'Sim, por favor! Quero saber o que está incluso.', type: 'TEXT', from: contacts[0].phone, to: whatsappNumber.number, conversationId: conv1.id, isFromBot: false },
    ],
  });

  // Create CRM board
  const board = await prisma.crmBoard.create({
    data: {
      name: 'Pipeline de Vendas',
      organizationId: org.id,
    },
  });

  const stages = await Promise.all([
    prisma.crmStage.create({ data: { name: 'Lead', color: '#6366f1', position: 0, boardId: board.id } }),
    prisma.crmStage.create({ data: { name: 'Contato', color: '#f59e0b', position: 1, boardId: board.id } }),
    prisma.crmStage.create({ data: { name: 'Proposta', color: '#3b82f6', position: 2, boardId: board.id } }),
    prisma.crmStage.create({ data: { name: 'Fechado', color: '#10b981', position: 3, boardId: board.id } }),
  ]);

  await Promise.all([
    prisma.crmCard.create({ data: { title: 'João Silva - Tech Corp', value: 500, boardId: board.id, stageId: stages[0].id, contactId: contacts[0].id } }),
    prisma.crmCard.create({ data: { title: 'Maria Santos', value: 300, boardId: board.id, stageId: stages[1].id, contactId: contacts[1].id } }),
    prisma.crmCard.create({ data: { title: 'Pedro Costa - StartupX', value: 800, boardId: board.id, stageId: stages[2].id, contactId: contacts[2].id } }),
    prisma.crmCard.create({ data: { title: 'Ana Oliveira', value: 450, boardId: board.id, stageId: stages[0].id, contactId: contacts[3].id } }),
  ]);

  // Create demo flow
  await prisma.flow.create({
    data: {
      name: 'Boas-vindas Automático',
      description: 'Fluxo de boas-vindas para novos leads',
      isActive: true,
      triggerType: 'keyword',
      triggerValue: 'oi',
      userId: user.id,
      nodes: JSON.stringify([
        { id: 'start-1', type: 'startNode', position: { x: 50, y: 200 }, data: { label: 'Início', triggerType: 'keyword' } },
        { id: 'msg-1', type: 'messageNode', position: { x: 350, y: 200 }, data: { label: 'Boas-vindas', message: 'Olá! Bem-vindo ao ZapFlow! Como posso ajudar?' } },
        { id: 'delay-1', type: 'delayNode', position: { x: 650, y: 200 }, data: { label: 'Aguardar', delay: 3, unit: 'seconds' } },
        { id: 'cond-1', type: 'conditionNode', position: { x: 950, y: 200 }, data: { label: 'Resposta', field: 'lastMessage', operator: 'contains', value: 'plano' } },
        { id: 'msg-2', type: 'messageNode', position: { x: 1250, y: 100 }, data: { label: 'Planos', message: 'Temos planos a partir de R$97/mês!' } },
        { id: 'msg-3', type: 'messageNode', position: { x: 1250, y: 300 }, data: { label: 'Outro assunto', message: 'Entendido! Em que posso ajudar?' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'start-1', target: 'msg-1' },
        { id: 'e2', source: 'msg-1', target: 'delay-1' },
        { id: 'e3', source: 'delay-1', target: 'cond-1' },
        { id: 'e4', source: 'cond-1', sourceHandle: 'yes', target: 'msg-2', label: 'Sim' },
        { id: 'e5', source: 'cond-1', sourceHandle: 'no', target: 'msg-3', label: 'Não' },
      ]),
    },
  });

  // Create tags (SQLite doesn't support skipDuplicates, so we use individual create + catch)
  const tagData = [
    { name: 'Lead', color: '#6366f1' },
    { name: 'Cliente', color: '#10b981' },
    { name: 'VIP', color: '#f59e0b' },
    { name: 'Urgente', color: '#ef4444' },
    { name: 'Parceiro', color: '#8b5cf6' },
  ];
  for (const tag of tagData) {
    try {
      await prisma.tag.create({ data: tag });
    } catch {
      // Tag already exists, skip
    }
  }

  // Create demo campaign
  await prisma.campaign.create({
    data: {
      name: 'Promoção de Verão',
      message: '🌞 Promoção de Verão! 30% de desconto em todos os planos. Aproveite!',
      status: 'DRAFT',
      userId: user.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Login: admin@zapflow.com / 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
