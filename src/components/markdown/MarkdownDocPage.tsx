import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';

type CachedDoc = {
  mtimeMs: number;
  size: number;
  html: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __markdownDocCache: Map<string, CachedDoc> | undefined;
}

const docCache: Map<string, CachedDoc> =
  globalThis.__markdownDocCache || (globalThis.__markdownDocCache = new Map());

type NavItem = {
  href: string;
  label: string;
  variant?: 'outline' | 'default' | 'ghost';
};

export type MarkdownDocPageProps = {
  title: string;
  markdownRelativePath: string; // relative to repo root, e.g. "content/legal/privacy.md"
  lastUpdated?: string;
  backHref?: string;
  backLabel?: string;
  nav?: NavItem[];
};

export function MarkdownDocPage(props: MarkdownDocPageProps) {
  const markdownPath = path.resolve(process.cwd(), props.markdownRelativePath);

  let htmlContent = '';
  let errorMessage: string | null = null;

  try {
    const stat = fs.statSync(markdownPath);
    const cached = docCache.get(markdownPath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      htmlContent = cached.html;
    } else {
      const markdownContent = fs.readFileSync(markdownPath, 'utf8');
      htmlContent = marked(markdownContent);
      docCache.set(markdownPath, {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        html: htmlContent,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errorMessage = `Failed to load document: ${props.markdownRelativePath} (${msg})`;
    htmlContent = marked(
      `## Document unavailable\n\nWe could not load this page right now.\n\nIf you are the site owner, check that the file exists on the server: \`${props.markdownRelativePath}\`.`,
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={props.backHref || '/'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {props.backLabel || 'Back'}
              </Link>
            </Button>
            <h1 className="text-xl font-bold" data-testid="doc-title">
              {props.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{props.title}</CardTitle>
                  {props.lastUpdated && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Calendar className="h-4 w-4" />
                      Last updated: {props.lastUpdated}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              {errorMessage && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 not-prose">
                  {errorMessage}
                </div>
              )}
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </CardContent>
          </Card>

          {props.nav && props.nav.length > 0 && (
            <div className="flex flex-wrap justify-between gap-2">
              {props.nav.map((item) => (
                <Button
                  key={item.href}
                  variant={item.variant || 'outline'}
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
