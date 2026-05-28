import { getSessionUser } from "@/lib/session";
import {
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_MAX_AGE_MINUTES,
} from "@/lib/session-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Gerencie sua conta</p>
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
          <CardTitle>Sessão</CardTitle>
          <CardDescription>Política de segurança da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Duração máxima:</span>{" "}
            {SESSION_MAX_AGE_MINUTES} minutos
          </p>
          <p>
            <span className="text-muted-foreground">Inatividade:</span> logout automático após{" "}
            {SESSION_IDLE_TIMEOUT_MINUTES} minutos sem uso
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
