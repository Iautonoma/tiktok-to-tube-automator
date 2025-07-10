import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Layout, 
  Link, 
  Shield, 
  Settings, 
  LogOut, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  FileText,
  Bug
} from 'lucide-react';

interface TestPhase {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  tests: {
    id: string;
    objective: string;
    steps: string[];
    expectedResults: string[];
  }[];
}

const testPhases: TestPhase[] = [
  {
    id: 'auth',
    title: 'Testes de Autenticação',
    icon: User,
    description: 'Validar o sistema de login e registro de usuários',
    tests: [
      {
        id: 'auth-1',
        objective: 'Testar registro de novo usuário',
        steps: [
          'Acesse a página inicial (será redirecionado para /auth)',
          'Clique em "Não tem uma conta? Registre-se"',
          'Preencha os campos: Email, Nome Completo, Senha',
          'Clique em "Registrar"'
        ],
        expectedResults: [
          'Redirecionamento para página principal após registro bem-sucedido',
          'Perfil do usuário criado com as informações fornecidas',
          'Usuário logado automaticamente'
        ]
      },
      {
        id: 'auth-2',
        objective: 'Testar login com credenciais válidas',
        steps: [
          'Na página de login, insira email e senha válidos',
          'Clique em "Entrar"'
        ],
        expectedResults: [
          'Login bem-sucedido',
          'Redirecionamento para dashboard principal',
          'Nome do usuário exibido no cabeçalho'
        ]
      },
      {
        id: 'auth-3',
        objective: 'Testar login com credenciais inválidas',
        steps: [
          'Insira email válido e senha incorreta',
          'Clique em "Entrar"'
        ],
        expectedResults: [
          'Mensagem de erro exibida',
          'Usuário permanece na página de login',
          'Campos limpos ou com indicação de erro'
        ]
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Testes do Dashboard',
    icon: Layout,
    description: 'Verificar a funcionalidade do painel principal',
    tests: [
      {
        id: 'dash-1',
        objective: 'Verificar carregamento do dashboard',
        steps: [
          'Após login bem-sucedido, observe o carregamento da página',
          'Verifique se todas as abas estão visíveis'
        ],
        expectedResults: [
          'Dashboard carrega sem erros',
          'Abas "Dashboard", "Contas" visíveis para usuários normais',
          'Aba "Admin" visível apenas para administradores'
        ]
      },
      {
        id: 'dash-2',
        objective: 'Testar navegação entre abas',
        steps: [
          'Clique na aba "Contas"',
          'Clique na aba "Dashboard"',
          'Se admin, clique na aba "Admin"'
        ],
        expectedResults: [
          'Transição suave entre abas',
          'Conteúdo da aba carrega corretamente',
          'Aba ativa destacada visualmente'
        ]
      }
    ]
  },
  {
    id: 'accounts',
    title: 'Testes de Gestão de Contas',
    icon: Link,
    description: 'Validar a funcionalidade de conectar contas de terceiros',
    tests: [
      {
        id: 'acc-1',
        objective: 'Visualizar contas conectadas',
        steps: [
          'Navegue para a aba "Contas"',
          'Observe a lista de contas conectadas'
        ],
        expectedResults: [
          'Lista de contas exibida (pode estar vazia inicialmente)',
          'Botões para adicionar novas contas visíveis',
          'Status das contas (ativas/inativas) claramente indicado'
        ]
      },
      {
        id: 'acc-2',
        objective: 'Adicionar conta TikTok',
        steps: [
          'Clique em "Conectar TikTok"',
          'Siga o processo de autenticação (simulado)'
        ],
        expectedResults: [
          'Processo de conexão iniciado',
          'Conta TikTok aparece na lista após conexão',
          'Status "ativa" para a conta conectada'
        ]
      },
      {
        id: 'acc-3',
        objective: 'Adicionar conta YouTube',
        steps: [
          'Clique em "Conectar YouTube"',
          'Complete o processo de autenticação'
        ],
        expectedResults: [
          'Autenticação YouTube funcional',
          'Conta listada com informações corretas',
          'Permissões adequadas configuradas'
        ]
      }
    ]
  },
  {
    id: 'admin',
    title: 'Testes do Painel Administrativo',
    icon: Shield,
    description: 'Verificar funcionalidades exclusivas do administrador',
    tests: [
      {
        id: 'admin-1',
        objective: 'Acessar painel administrativo',
        steps: [
          'Login como administrador',
          'Verificar se aba "Admin" está visível',
          'Clicar na aba "Admin"'
        ],
        expectedResults: [
          'Aba "Admin" visível apenas para admins',
          'Painel administrativo carrega corretamente',
          'Lista de usuários exibida'
        ]
      },
      {
        id: 'admin-2',
        objective: 'Gerenciar usuários',
        steps: [
          'Visualizar lista de usuários',
          'Testar habilitar/desabilitar usuário',
          'Verificar alteração de função (se disponível)'
        ],
        expectedResults: [
          'Lista completa de usuários exibida',
          'Ações de habilitação/desabilitação funcionais',
          'Mudanças refletidas imediatamente'
        ]
      },
      {
        id: 'admin-3',
        objective: 'Visualizar estatísticas do sistema',
        steps: [
          'Observar métricas e estatísticas no painel',
          'Verificar números de usuários, sessões, etc.'
        ],
        expectedResults: [
          'Estatísticas precisas exibidas',
          'Dados atualizados em tempo real',
          'Gráficos e métricas legíveis'
        ]
      }
    ]
  },
  {
    id: 'automation',
    title: 'Testes de Automação',
    icon: Settings,
    description: 'Validar o processo de automação TikTok para YouTube',
    tests: [
      {
        id: 'auto-1',
        objective: 'Configurar automação',
        steps: [
          'Acessar interface de automação',
          'Configurar parâmetros de coleta',
          'Definir critérios de processamento'
        ],
        expectedResults: [
          'Interface de configuração intuitiva',
          'Opções de personalização disponíveis',
          'Configurações salvas corretamente'
        ]
      },
      {
        id: 'auto-2',
        objective: 'Testar coleta de vídeos',
        steps: [
          'Iniciar processo de coleta',
          'Monitorar progresso',
          'Verificar vídeos coletados'
        ],
        expectedResults: [
          'Coleta inicia sem erros',
          'Progresso visível em tempo real',
          'Vídeos listados corretamente'
        ]
      },
      {
        id: 'auto-3',
        objective: 'Testar upload para YouTube',
        steps: [
          'Selecionar vídeos processados',
          'Configurar metadados',
          'Executar upload'
        ],
        expectedResults: [
          'Upload inicia corretamente',
          'Metadados aplicados',
          'Status de upload atualizado'
        ]
      }
    ]
  },
  {
    id: 'security',
    title: 'Testes de Logout e Segurança',
    icon: LogOut,
    description: 'Verificar funcionalidades de segurança e logout',
    tests: [
      {
        id: 'sec-1',
        objective: 'Testar logout',
        steps: [
          'Clique no botão "Sair" no cabeçalho',
          'Confirme o logout'
        ],
        expectedResults: [
          'Logout executado com sucesso',
          'Redirecionamento para página de login',
          'Sessão encerrada completamente'
        ]
      },
      {
        id: 'sec-2',
        objective: 'Testar usuário desabilitado',
        steps: [
          'Admin desabilita um usuário',
          'Usuário tenta acessar o sistema'
        ],
        expectedResults: [
          'Acesso negado para usuário desabilitado',
          'Mensagem informativa exibida',
          'Opção de logout disponível'
        ]
      }
    ]
  },
  {
    id: 'responsive',
    title: 'Testes de Responsividade',
    icon: Smartphone,
    description: 'Verificar a experiência em dispositivos móveis',
    tests: [
      {
        id: 'resp-1',
        objective: 'Testar em dispositivos móveis',
        steps: [
          'Abrir aplicação em dispositivo móvel ou simular no navegador',
          'Navegar pelas diferentes seções',
          'Testar todas as funcionalidades principais'
        ],
        expectedResults: [
          'Layout adaptado para telas pequenas',
          'Navegação intuitiva em mobile',
          'Todas as funcionalidades acessíveis'
        ]
      }
    ]
  }
];

export const TestingDocumentation = () => {
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [bugReport, setBugReport] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const toggleTestCompletion = (testId: string) => {
    const newCompleted = new Set(completedTests);
    if (newCompleted.has(testId)) {
      newCompleted.delete(testId);
    } else {
      newCompleted.add(testId);
    }
    setCompletedTests(newCompleted);
  };

  const getPhaseProgress = (phase: TestPhase) => {
    const totalTests = phase.tests.length;
    const completedInPhase = phase.tests.filter(test => completedTests.has(test.id)).length;
    return { completed: completedInPhase, total: totalTests };
  };

  const scrollToPhase = (phaseId: string) => {
    const element = document.getElementById(`phase-${phaseId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plano de Testes do Sistema TikTok to YouTube
          </CardTitle>
          <CardDescription>
            Documento completo para testar todas as funcionalidades do sistema de forma organizada e sistemática.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Navegação Rápida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {testPhases.map((phase) => {
              const progress = getPhaseProgress(phase);
              const Icon = phase.icon;
              return (
                <Button
                  key={phase.id}
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToPhase(phase.id)}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs text-center">{phase.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {progress.completed}/{progress.total}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Phases */}
      <div className="space-y-6">
        {testPhases.map((phase) => {
          const progress = getPhaseProgress(phase);
          const Icon = phase.icon;
          
          return (
            <Card key={phase.id} id={`phase-${phase.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {phase.title}
                  </div>
                  <Badge variant={progress.completed === progress.total ? "default" : "secondary"}>
                    {progress.completed}/{progress.total} concluídos
                  </Badge>
                </CardTitle>
                <CardDescription>{phase.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {phase.tests.map((test) => (
                    <AccordionItem key={test.id} value={test.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            checked={completedTests.has(test.id)}
                            onCheckedChange={() => toggleTestCompletion(test.id)}
                            className="mr-2"
                          />
                          <span className={completedTests.has(test.id) ? "line-through text-muted-foreground" : ""}>
                            {test.objective}
                          </span>
                          {completedTests.has(test.id) && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Passos para Execução:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            {test.steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Resultados Esperados:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {test.expectedResults.map((result, index) => (
                              <li key={index}>{result}</li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Resumo do Progresso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {completedTests.size}
              </div>
              <div className="text-sm text-muted-foreground">Testes Concluídos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {testPhases.reduce((acc, phase) => acc + phase.tests.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total de Testes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((completedTests.size / testPhases.reduce((acc, phase) => acc + phase.tests.length, 0)) * 100) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Progresso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bug Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Registro de Bugs Encontrados
          </CardTitle>
          <CardDescription>
            Use esta seção para documentar problemas encontrados durante os testes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Descreva detalhadamente os bugs encontrados, incluindo passos para reproduzir..."
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            rows={5}
          />
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(bugReport);
              // Could add toast notification here
            }}
            disabled={!bugReport.trim()}
          >
            Copiar Relatório de Bugs
          </Button>
        </CardContent>
      </Card>

      {/* Suggestions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Sugestões de Melhorias
          </CardTitle>
          <CardDescription>
            Registre sugestões para melhorar a experiência do usuário e funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Sugestões para melhorias no sistema, novas funcionalidades, otimizações de UX..."
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(suggestions);
              // Could add toast notification here
            }}
            disabled={!suggestions.trim()}
          >
            Copiar Sugestões
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};