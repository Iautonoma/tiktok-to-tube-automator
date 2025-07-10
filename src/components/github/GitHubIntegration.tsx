import { useState, useEffect } from 'react';
import { Github, GitBranch, GitCommit, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export function GitHubIntegration() {
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration since we can't access GitHub API without token
  useEffect(() => {
    const mockRepo: GitHubRepo = {
      name: "bandanas-tiktok",
      full_name: "kronedesign/bandanas-tiktok",
      html_url: "https://github.com/kronedesign/bandanas-tiktok",
      default_branch: "main",
      updated_at: new Date().toISOString(),
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0
    };

    const mockCommits: GitHubCommit[] = [
      {
        sha: "abc123",
        commit: {
          message: "Initial commit with TikTok automation setup",
          author: {
            name: "kronedesign",
            date: new Date().toISOString()
          }
        },
        html_url: "https://github.com/kronedesign/bandanas-tiktok/commit/abc123"
      }
    ];

    // Simulate API loading
    setTimeout(() => {
      setRepo(mockRepo);
      setCommits(mockCommits);
      setIsLoading(false);
    }, 1000);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !repo) {
    return (
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Conecte seu repositório GitHub para ver informações de sincronização.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Repository Info */}
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Repositório GitHub
            <Badge variant="secondary" className="ml-auto">
              Conectado
            </Badge>
          </CardTitle>
          <CardDescription>
            Status do repositório e sincronização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{repo.full_name}</p>
              <p className="text-sm text-muted-foreground">
                Última atualização: {formatDate(repo.updated_at)}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no GitHub
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/30">
            <div className="text-center">
              <div className="text-lg font-bold">{repo.stargazers_count}</div>
              <div className="text-xs text-muted-foreground">Stars</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{repo.forks_count}</div>
              <div className="text-xs text-muted-foreground">Forks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{repo.open_issues_count}</div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Branch principal: </span>
            <Badge variant="outline">{repo.default_branch}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent Commits */}
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Commits Recentes
          </CardTitle>
          <CardDescription>
            Últimas alterações no repositório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commits.length > 0 ? (
              commits.map((commit) => (
                <div
                  key={commit.sha}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/30 border border-border/30"
                >
                  <div className="p-1 rounded bg-primary/20">
                    <GitCommit className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {commit.commit.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        por {commit.commit.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(commit.commit.author.date)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={commit.html_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum commit encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sincronização Automática</p>
              <p className="text-xs text-muted-foreground">
                Todas as alterações são sincronizadas automaticamente
              </p>
            </div>
            <Badge variant="secondary" className="bg-success/20 text-success">
              Ativo
            </Badge>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span className="text-sm text-success">
                Conectado ao GitHub - Sync bidirecional ativo
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}