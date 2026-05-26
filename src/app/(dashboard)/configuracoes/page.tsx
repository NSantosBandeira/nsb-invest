import { getSessionUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Nome:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail:</span> {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>Funcionalidades planejadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Cotações automáticas de FIIs e ações</li>
            <li>Importação de extratos</li>
            <li>Planos e assinatura</li>
            <li>Relatórios para IR</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
