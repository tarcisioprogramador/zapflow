import { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { DashboardMetrics, Message } from '../types';
import {
  MessageSquare, Users, GitBranch, Send, TrendingUp, ArrowUpRight,
  ArrowDownRight, Zap, BarChart3, Activity, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-dark-400">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} mensagens</p>
    </div>
  );
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data } = await dashboardApi.metrics();
      setMetrics(data);
    } catch {
      // Use demo data
      setMetrics({
        totalMessages: 2847,
        activeConversations: 42,
        totalContacts: 1253,
        activeFlows: 8,
        totalCampaigns: 15,
        conversionRate: 23.5,
        messagesPerDay: [
          { date: 'Seg', count: 320 }, { date: 'Ter', count: 445 },
          { date: 'Qua', count: 380 }, { date: 'Qui', count: 510 },
          { date: 'Sex', count: 490 }, { date: 'Sáb', count: 280 },
          { date: 'Dom', count: 190 },
        ],
        pipelineData: [
          { stage: 'Lead', count: 145, value: 72500 },
          { stage: 'Contato', count: 89, value: 44500 },
          { stage: 'Proposta', count: 34, value: 27200 },
          { stage: 'Fechado', count: 18, value: 21600 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = metrics
    ? [
        { label: 'Mensagens', value: metrics.totalMessages.toLocaleString(), icon: MessageSquare, change: '+12%', up: true, color: 'text-zap-400', bg: 'bg-zap-500/10' },
        { label: 'Conversas Ativas', value: metrics.activeConversations, icon: Activity, change: '+5%', up: true, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Contatos', value: metrics.totalContacts.toLocaleString(), icon: Users, change: '+18%', up: true, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Conversão', value: `${metrics.conversionRate}%`, icon: TrendingUp, change: '+3.2%', up: true, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-zap-500/30 border-t-zap-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  stat.up ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-white">{stat.value}</p>
            <p className="text-sm text-dark-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-white">Mensagens</h3>
              <p className="text-sm text-dark-400">Últimos 7 dias</p>
            </div>
            <BarChart3 className="w-5 h-5 text-dark-500" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={metrics?.messagesPerDay || []}>
              <defs>
                <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#25D366" strokeWidth={2} fill="url(#colorMsg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-white">Pipeline de Vendas</h3>
              <p className="text-sm text-dark-400">Cards por etapa</p>
            </div>
            <TrendingUp className="w-5 h-5 text-dark-500" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics?.pipelineData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="stage" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" fill="#4c6ef5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-heading font-bold text-white mb-4">Resumo</h3>
          <div className="space-y-4">
            {[
              { label: 'Flows Ativos', value: metrics?.activeFlows || 0, icon: GitBranch, color: 'text-purple-400' },
              { label: 'Campanhas', value: metrics?.totalCampaigns || 0, icon: Send, color: 'text-orange-400' },
              { label: 'Números Conectados', value: 2, icon: MessageSquare, color: 'text-zap-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50">
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-dark-300">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Performance */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-heading font-bold text-white mb-4">Performance IA</h3>
          <div className="space-y-4">
            <div className="text-center p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-zap-500/10 border border-brand-500/20">
              <Zap className="w-8 h-8 text-zap-400 mx-auto mb-2" />
              <p className="text-3xl font-heading font-bold text-white">94%</p>
              <p className="text-sm text-dark-400">Taxa de acerto</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-dark-800/50">
                <p className="text-xl font-bold text-white">1.2s</p>
                <p className="text-xs text-dark-400">Tempo resposta</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-dark-800/50">
                <p className="text-xl font-bold text-white">847</p>
                <p className="text-xs text-dark-400">Atendimentos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-bold text-white">Atividade Recente</h3>
            <Clock className="w-4 h-4 text-dark-500" />
          </div>
          <div className="space-y-3">
            {[
              { text: 'Nova conversa com João Silva', time: 'Há 2min', type: 'message' },
              { text: 'Campanha "Promo Verão" enviada', time: 'Há 15min', type: 'campaign' },
              { text: 'Lead movido para "Proposta"', time: 'Há 1h', type: 'crm' },
              { text: 'Flow "Boas-vindas" ativado', time: 'Há 2h', type: 'flow' },
              { text: 'Novo contato: Maria Santos', time: 'Há 3h', type: 'contact' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-800/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-zap-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{item.text}</p>
                  <p className="text-xs text-dark-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
