"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/users - List organization users
router.get('/', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.json([]);
            return;
        }
        const users = await database_1.default.user.findMany({
            where: { organizationId: user.organizationId },
            select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});
// POST /api/users - Invite user to organization
router.post('/', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const currentUser = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!currentUser?.organizationId) {
            res.status(400).json({ error: 'Usuário não pertence a uma organização' });
            return;
        }
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
            return;
        }
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await database_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'ATTENDANT',
                organizationId: currentUser.organizationId,
            },
        });
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});
// PUT /api/users/:id - Update user role
router.put('/:id', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const { role } = req.body;
        const user = await database_1.default.user.update({
            where: { id: req.params.id },
            data: { role },
            select: { id: true, name: true, email: true, role: true },
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});
// DELETE /api/users/:id - Remove user from organization
router.delete('/:id', (0, auth_1.authorize)('OWNER'), async (req, res) => {
    try {
        await database_1.default.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'Usuário removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover usuário' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map