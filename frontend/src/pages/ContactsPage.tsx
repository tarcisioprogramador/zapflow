import { useEffect, useState } from 'react';
import { crmApi } from '../api';
import { Contact } from '../types';
import {
  Plus, Search, Users, Phone, Mail, Building, Tag, Trash2, Edit3, Download, Upload,
} from 'lucide-react';
import { parseTags } from '../utils';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', tags: [] as string[], notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const { data } = await crmApi.listContacts();
      setContacts(data);
    } catch {
      setContacts([
        { id: '1', name: 'João Silva', phone: '+5511988888888', email: 'joao@email.com', company: 'Tech Corp', tags: '["lead","vip"]', createdAt: '2024-03-10' },
        { id: '2', name: 'Maria Santos', phone: '+5511977777777', email: 'maria@email.com', tags: '["lead"]', createdAt: '2024-03-11' },
        { id: '3', name: 'Pedro Costa', phone: '+5511966666666', email: 'pedro@email.com', company: 'StartupX', tags: '["cliente"]', createdAt: '2024-03-12' },
        { id: '4', name: 'Ana Oliveira', phone: '+5511955555555', email: 'ana@email.com', tags: '["lead","interessado"]', createdAt: '2024-03-13' },
        { id: '5', name: 'Lucas Ferreira', phone: '+5511944444444', email: 'lucas@email.com', company: 'Agência Digital', tags: '["parceiro"]', createdAt: '2024-03-14' },
        { id: '6', name: 'Fernanda Lima', phone: '+5511933333333', email: 'fernanda@email.com', tags: '["lead"]', createdAt: '2024-03-14' },
        { id: '7', name: 'Ricardo Alves', phone: '+5511922222222', email: 'ricardo@email.com', company: 'Construtora RA', tags: '["cliente","vip"]', createdAt: '2024-03-15' },
        { id: '8', name: 'Camila Souza', phone: '+5511911111111', email: 'camila@email.com', tags: '["lead"]', createdAt: '2024-03-15' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Nome e telefone são obrigatórios'); return; }
    try {
      if (editing) {
        await crmApi.updateContact(editing.id, { ...form, tags: JSON.stringify(form.tags) });
        setContacts(contacts.map((c) => (c.id === editing.id ? { ...c, ...form, tags: JSON.stringify(form.tags) } : c)));
        toast.success('Contato atualizado!');
      } else {
        const { data } = await crmApi.createContact({ ...form, tags: JSON.stringify(form.tags) });
        setContacts([data, ...contacts]);
        toast.success('Contato criado!');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', phone: '', email: '', company: '', tags: [], notes: '' });
    } catch { toast.error('Erro ao salvar contato'); }
  };

  const handleEdit = (contact: Contact) => {
    setEditing(contact);
    setForm({ name: contact.name, phone: contact.phone, email: contact.email || '', company: contact.company || '', tags: parseTags(contact.tags), notes: contact.notes || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contato?')) return;
    try {
      await crmApi.deleteContact(id);
      setContacts(contacts.filter((c) => c.id !== id));
      toast.success('Contato excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contatos</h1>
          <p className="page-subtitle">{contacts.length} contatos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button className="btn-secondary text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', company: '', tags: [], notes: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou email..."
          className="input-field pl-10 w-full"
        />
      </div>

      {/* Contacts Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Nome</th>
              <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Telefone</th>
              <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Empresa</th>
              <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Tags</th>
              <th className="text-right text-xs font-semibold text-dark-400 uppercase tracking-wider px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr key={contact.id} className="border-b border-dark-700/20 hover:bg-dark-800/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-xs font-bold text-zap-400">
                      {contact.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-white">{contact.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-dark-300 font-mono">{contact.phone}</td>
                <td className="px-5 py-3 text-sm text-dark-400">{contact.email || '—'}</td>
                <td className="px-5 py-3 text-sm text-dark-400">{contact.company || '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {parseTags(contact.tags).map((tag) => (
                      <span key={tag} className="badge badge-purple text-[9px]">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleEdit(contact)} className="btn-ghost p-1.5"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(contact.id)} className="btn-ghost p-1.5 text-dark-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">Nenhum contato encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-heading font-bold text-white mb-4">
              {editing ? 'Editar Contato' : 'Novo Contato'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-dark-300 mb-2">Nome *</label>
                <input id="contact-name" name="contact-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-dark-300 mb-2">Telefone *</label>
                <input id="contact-phone" name="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+5511999999999" className="input-field w-full font-mono" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                <input id="contact-email" name="contact-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="contact-company" className="block text-sm font-medium text-dark-300 mb-2">Empresa</label>
                <input id="contact-company" name="contact-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="contact-notes" className="block text-sm font-medium text-dark-300 mb-2">Notas</label>
                <textarea id="contact-notes" name="contact-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field w-full h-20 resize-none" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSave} className="btn-primary flex-1">{editing ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
