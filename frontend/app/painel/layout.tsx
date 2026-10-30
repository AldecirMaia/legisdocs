"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const verificarAcesso = () => {
      const token = localStorage.getItem("legisdocs_token");
      const user = localStorage.getItem("legisdocs_user");
      
      if (!token || !user) {
        localStorage.removeItem("legisdocs_token");
        localStorage.removeItem("legisdocs_user");
        router.push("/");
      } else {
        setAutorizado(true);
      }
    };

    verificarAcesso();
  }, [router]);

  return (
    <>
      {/* Ecrã de carregamento fixo por cima de tudo enquanto verifica */}
      {!autorizado && (
        <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          A verificar credenciais...
        </div>
      )}
      
      {/* O Next.js exige que 'children' seja sempre renderizado. Usamos CSS para esconder até autorizar. */}
      <div className={autorizado ? "block" : "hidden"}>
        {children}
      </div>
    </>
  );
}