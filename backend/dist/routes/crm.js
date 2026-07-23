"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ─── CRM Boards ────────────────────────────────────────
// GET /api/crm/boards - List boards
router.get('/boards', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.json([]);
            return;
        }
        const boards = await database_1.default.crmBoard.findMany({
            where: { organizationId: user.organizationId },
            include: {
                stages: { orderBy: { position: 'asc' } },
                _count: { select: { cards: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(boards);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar boards' });
    }
});
// POST /api/crm/boards - Create board
router.post('/boards', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.status(400).json({ error: 'Sem organização' });
            return;
        }
        const { name } = req.body;
        const board = await database_1.default.crmBoard.create({
            data: {
                name,
                organizationId: user.organizationId,
                stages: {
                    create: [
                        { name: 'Lead', color: '#6366f1', position: 0 },
                        { name: 'Contato', color: '#f59e0b', position: 1 },
                        { name: 'Proposta', color: '#3b82f6', position: 2 },
                        { name: 'Negociação', color: '#8b5cf6', position: 3 },
                        { name: 'Fechado', color: '#10b981', position: 4 },
                        { name: 'Perdido', color: '#ef4444', position: 5 },
                    ],
                },
            },
            include: { stages: { orderBy: { position: 'asc' } } },
        });
        res.status(201).json(board);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar board' });
    }
});
// PUT /api/crm/boards/:id - Update board
router.put('/boards/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmBoard.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOrgAccess)(existing, req.user.userId, res, 'Board')))
            return;
        const { name } = req.body;
        const board = await database_1.default.crmBoard.update({
            where: { id: req.params.id },
            data: { name },
        });
        res.json(board);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar board' });
    }
});
// DELETE /api/crm/boards/:id
router.delete('/boards/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmBoard.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOrgAccess)(existing, req.user.userId, res, 'Board')))
            return;
        await database_1.default.crmBoard.delete({ where: { id: req.params.id } });
        res.json({ message: 'Board removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover board' });
    }
});
// ─── Stages ────────────────────────────────────────────
// POST /api/crm/stages - Create stage
router.post('/stages', async (req, res) => {
    try {
        const { boardId, name, color } = req.body;
        const maxPos = await database_1.default.crmStage.findMany({
            where: { boardId },
            orderBy: { position: 'desc' },
            take: 1,
        });
        const stage = await database_1.default.crmStage.create({
            data: {
                name,
                color: color || '#6366f1',
                position: (maxPos[0]?.position ?? -1) + 1,
                boardId,
            },
        });
        res.status(201).json(stage);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar etapa' });
    }
});
// PUT /api/crm/stages/:id - Update stage
router.put('/stages/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmStage.findUnique({
            where: { id: req.params.id },
            include: { board: { select: { organizationId: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Etapa não encontrada' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(existing.board, req.user.userId, res, 'Etapa')))
            return;
        const { name, color, position } = req.body;
        const stage = await database_1.default.crmStage.update({
            where: { id: req.params.id },
            data: { name, color, position },
        });
        res.json(stage);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar etapa' });
    }
});
// DELETE /api/crm/stages/:id
router.delete('/stages/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmStage.findUnique({
            where: { id: req.params.id },
            include: { board: { select: { organizationId: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Etapa não encontrada' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(existing.board, req.user.userId, res, 'Etapa')))
            return;
        await database_1.default.crmStage.delete({ where: { id: req.params.id } });
        res.json({ message: 'Etapa removida' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover etapa' });
    }
});
// ─── Cards ─────────────────────────────────────────────
// GET /api/crm/cards?boardId=xxx - List cards for a board
router.get('/cards', async (req, res) => {
    try {
        const { boardId } = req.query;
        const cards = await database_1.default.crmCard.findMany({
            where: { boardId: boardId },
            include: { contact: true, stage: true },
            orderBy: { position: 'asc' },
        });
        res.json(cards);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar cards' });
    }
});
// POST /api/crm/cards - Create card
router.post('/cards', async (req, res) => {
    try {
        const { title, description, value, boardId, stageId, contactId } = req.body;
        const maxPos = await database_1.default.crmCard.findMany({
            where: { boardId, stageId },
            orderBy: { position: 'desc' },
            take: 1,
        });
        const card = await database_1.default.crmCard.create({
            data: {
                title,
                description,
                value,
                position: (maxPos[0]?.position ?? -1) + 1,
                boardId,
                stageId,
                contactId,
            },
            include: { contact: true, stage: true },
        });
        res.status(201).json(card);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar card' });
    }
});
// PUT /api/crm/cards/:id - Update card (move, edit)
router.put('/cards/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmCard.findUnique({
            where: { id: req.params.id },
            include: { board: { select: { organizationId: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Card não encontrado' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(existing.board, req.user.userId, res, 'Card')))
            return;
        const { title, description, value, stageId, position } = req.body;
        const card = await database_1.default.crmCard.update({
            where: { id: req.params.id },
            data: { title, description, value, stageId, position },
            include: { contact: true, stage: true },
        });
        res.json(card);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar card' });
    }
});
// PUT /api/crm/cards/:id/move - Move card between stages
router.put('/cards/:id/move', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmCard.findUnique({
            where: { id: req.params.id },
            include: { board: { select: { organizationId: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Card não encontrado' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(existing.board, req.user.userId, res, 'Card')))
            return;
        const { stageId, position } = req.body;
        const card = await database_1.default.crmCard.update({
            where: { id: req.params.id },
            data: { stageId, position },
            include: { contact: true, stage: true },
        });
        res.json(card);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao mover card' });
    }
});
// DELETE /api/crm/cards/:id
router.delete('/cards/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.crmCard.findUnique({
            where: { id: req.params.id },
            include: { board: { select: { organizationId: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Card não encontrado' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(existing.board, req.user.userId, res, 'Card')))
            return;
        await database_1.default.crmCard.delete({ where: { id: req.params.id } });
        res.json({ message: 'Card removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover card' });
    }
});
// ─── Contacts ──────────────────────────────────────────
// GET /api/crm/contacts - List contacts
router.get('/contacts', async (req, res) => {
    try {
        const { search } = req.query;
        const where = { userId: req.user.userId };
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { phone: { contains: String(search) } },
                { email: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        const contacts = await database_1.default.contact.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(contacts);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar contatos' });
    }
});
// POST /api/crm/contacts - Create contact
router.post('/contacts', async (req, res) => {
    try {
        const { name, phone, email, company, tags, notes } = req.body;
        const contact = await database_1.default.contact.create({
            data: {
                name,
                phone,
                email,
                company,
                tags: JSON.stringify(tags || []),
                notes,
                userId: req.user.userId,
            },
        });
        res.status(201).json(contact);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar contato' });
    }
});
// PUT /api/crm/contacts/:id
router.put('/contacts/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.contact.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOwnership)(existing, req.user.userId, res, 'Contato')))
            return;
        const { name, phone, email, company, tags, notes } = req.body;
        const contact = await database_1.default.contact.update({
            where: { id: req.params.id },
            data: { name, phone, email, company, tags, notes },
        });
        res.json(contact);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
});
// DELETE /api/crm/contacts/:id
router.delete('/contacts/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.contact.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOwnership)(existing, req.user.userId, res, 'Contato')))
            return;
        await database_1.default.contact.delete({ where: { id: req.params.id } });
        res.json({ message: 'Contato removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover contato' });
    }
});
exports.default = router;
//# sourceMappingURL=crm.js.map