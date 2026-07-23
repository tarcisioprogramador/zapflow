"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/remarketing - List sequences
router.get('/', async (req, res) => {
    try {
        const sequences = await database_1.default.remarketingSequence.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { executions: true } } },
        });
        res.json(sequences);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar sequências' });
    }
});
// POST /api/remarketing - Create sequence
router.post('/', async (req, res) => {
    try {
        const { name, description, steps } = req.body;
        const sequence = await database_1.default.remarketingSequence.create({
            data: {
                name,
                description,
                steps: steps || [],
            },
        });
        res.status(201).json(sequence);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar sequência' });
    }
});
// PUT /api/remarketing/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, description, steps, isActive } = req.body;
        const sequence = await database_1.default.remarketingSequence.update({
            where: { id: req.params.id },
            data: { name, description, steps, isActive },
        });
        res.json(sequence);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar sequência' });
    }
});
// DELETE /api/remarketing/:id
router.delete('/:id', async (req, res) => {
    try {
        await database_1.default.remarketingSequence.delete({ where: { id: req.params.id } });
        res.json({ message: 'Sequência removida' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover sequência' });
    }
});
exports.default = router;
//# sourceMappingURL=remarketing.js.map