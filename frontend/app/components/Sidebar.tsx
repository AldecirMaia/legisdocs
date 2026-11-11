"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, FileText, Archive, Users, 
  Settings, Gavel, CalendarDays, FileCheck, X 
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const storedUser = localStorage.getItem("legisdocs_user");
    if (storedUser) {
      setRole(JSON.parse(storedUser).role);
    }
  }, []);

  // Definição dos menus com base no cargo
  const menus = [
    {
      categoria: "Principal",
      itens: [
        { nome: "Início", link: "/painel", icone: <LayoutDashboard className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA", "VEREADOR", "ASSESSOR"] },
        { nome: "Fila de Análise", link: "/painel/analise", icone: <FileText className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
        { nome: "Arquivos", link: "/painel/arquivos", icone: <Archive className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA", "VEREADOR", "ASSESSOR"] },
      ]
    },
    {
      categoria: "Sessão Plenária",
      rolesPermitidos: ["SUPER_ADMIN", "SECRETARIA"], // Esconde a categoria inteira para vereadores
      itens: [
        { nome: "Pauta da Sessão", link: "/painel/pauta", icone: <CalendarDays className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
        { nome: "Plenário ao Vivo", link: "/painel/plenario", icone: <Gavel className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
        { nome: "Atas e Relatórios", link: "/painel/atas", icone: <FileCheck className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
      ]
    },
    {
      categoria: "Administração",
      rolesPermitidos: ["SUPER_ADMIN", "SECRETARIA"], // Esconde a categoria inteira para vereadores
      itens: [
        { nome: "Gabinetes", link: "/painel/gabinetes", icone: <Users className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
        { nome: "Gestão de Comissões", link: "/painel/secretaria/comissoes", icone: <Users className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
        { nome: "Configurações", link: "/painel/configuracoes", icone: <Settings className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA"] },
      ]
    },
    {
      categoria: "Comissões",
      rolesPermitidos: ["SUPER_ADMIN", "SECRETARIA", "VEREADOR", "ASSESSOR"], // Visível para todos
      itens: [
        { nome: "Minhas Comissões", link: "/painel/comissoes", icone: <Users className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SECRETARIA", "VEREADOR", "ASSESSOR"] },
      ]
    }
  ];

  return (
    <>
      {/* Fundo escuro para mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
          <span className="text-xl font-black text-white tracking-tight">Legis<span className="text-blue-500">Docs</span></span>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {menus.map((grupo, index) => {
            // Se o grupo tem restrição de acesso e o utilizador não tem permissão, não renderiza o grupo
            if (grupo.rolesPermitidos && !grupo.rolesPermitidos.includes(role)) return null;

            // Filtra os itens dentro do grupo com base no cargo
            const itensVisiveis = grupo.itens.filter(item => item.roles.includes(role));
            if (itensVisiveis.length === 0) return null;

            return (
              <div key={index} className="px-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 px-2">
                  {grupo.categoria}
                </p>
                <div className="space-y-1">
                  {itensVisiveis.map((item, idx) => {
                    const ativo = pathname === item.link;
                    return (
                      <Link key={idx} href={item.link} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${ativo ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}>
                        {item.icone}
                        {item.nome}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}