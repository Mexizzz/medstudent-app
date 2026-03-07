'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Trash2, Pencil, Loader2, ChevronRight, X } from 'lucide-react';
import { cn, subjectColor } from '@/lib/utils';
import { toast } from 'sonner';

interface Folder {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: string;
}

interface FolderQuestion {
  id: string;
  type: string;
  question: string | null;
  front: string | null;
  blankText: string | null;
  caseQuestion: string | null;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

function questionLabel(q: FolderQuestion): string {
  return q.question ?? q.front ?? q.blankText ?? q.caseQuestion ?? '—';
}

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderQuestions, setFolderQuestions] = useState<FolderQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Create folder state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  // Edit folder state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data);
    } catch {} finally { setLoading(false); }
  }

  async function openFolder(folder: Folder) {
    setSelectedFolder(folder);
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/folders/${folder.id}/questions`);
      const data = await res.json();
      setFolderQuestions(data);
      // Sync the count in the folder list with actual question count
      const actualCount = Array.isArray(data) ? data.length : 0;
      if (folder.count !== actualCount) {
        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, count: actualCount } : f));
        setSelectedFolder(prev => prev ? { ...prev, count: actualCount } : null);
      }
    } catch { toast.error('Failed to load questions'); }
    finally { setQuestionsLoading(false); }
  }

  async function createFolder() {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const folder = await res.json();
      setFolders(prev => [{ ...folder, count: 0 }, ...prev]);
      setNewName('');
      setNewColor('#6366f1');
      setShowCreate(false);
      toast.success('Folder created');
    } catch { toast.error('Failed to create folder'); }
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder? Questions inside will not be deleted.')) return;
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolder?.id === id) {
        setSelectedFolder(null);
        setFolderQuestions([]);
      }
      toast.success('Folder deleted');
    } catch { toast.error('Failed to delete folder'); }
  }

  async function renameFolder(id: string) {
    if (!editName.trim()) return;
    try {
      await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: editName.trim(), color: editColor } : f));
      if (selectedFolder?.id === id) {
        setSelectedFolder(prev => prev ? { ...prev, name: editName.trim(), color: editColor } : null);
      }
      setEditingId(null);
      toast.success('Folder updated');
    } catch { toast.error('Failed to update folder'); }
  }

  async function removeQuestion(questionId: string) {
    if (!selectedFolder) return;
    try {
      await fetch(`/api/folders/${selectedFolder.id}/questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      setFolderQuestions(prev => prev.filter(q => q.id !== questionId));
      setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, count: f.count - 1 } : f));
      toast.success('Removed from folder');
    } catch { toast.error('Failed to remove question'); }
  }

  async function startStudy() {
    if (!selectedFolder || folderQuestions.length === 0) return;
    try {
      const qIds = folderQuestions.map(q => q.id);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: qIds }),
      });
      const { sessionId } = await res.json();
      router.push(`/study/session/${sessionId}`);
    } catch { toast.error('Failed to start session'); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Folders</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize and study saved questions</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Folder
        </Button>
      </div>

      {/* Create folder form */}
      {showCreate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Folder name..."
                className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Button onClick={createFolder} size="sm">Create</Button>
              <Button onClick={() => setShowCreate(false)} size="sm" variant="ghost">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all',
                    newColor === c ? 'ring-2 ring-offset-2 ring-violet-500' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Folders list */}
        <div className="lg:col-span-1 space-y-2">
          {folders.length === 0 && !showCreate && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No folders yet</p>
              <p className="text-muted-foreground text-xs mt-1">Create a folder or save questions during study</p>
            </div>
          )}
          {folders.map(folder => (
            <div key={folder.id}>
              {editingId === folder.id ? (
                <Card className="border-violet-300">
                  <CardContent className="p-3 space-y-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && renameFolder(folder.id)}
                      className="w-full text-sm px-2 py-1.5 rounded bg-muted border border-border text-foreground outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <div className="flex items-center gap-1.5">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={cn(
                            'w-5 h-5 rounded-full transition-all',
                            editColor === c ? 'ring-2 ring-offset-1 ring-violet-500' : 'hover:scale-110'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => renameFolder(folder.id)} className="flex-1">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <button
                  onClick={() => openFolder(folder)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group',
                    selectedFolder?.id === folder.id
                      ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500/30'
                      : 'border-border bg-card hover:border-violet-200 hover:bg-muted'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folder.count} question{folder.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name); setEditColor(folder.color); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Folder contents */}
        <div className="lg:col-span-2">
          {selectedFolder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedFolder.color }} />
                  <h2 className="text-lg font-semibold text-foreground">{selectedFolder.name}</h2>
                  <Badge variant="secondary" className="text-xs">{folderQuestions.length}</Badge>
                </div>
                {folderQuestions.length > 0 && (
                  <Button onClick={startStudy} size="sm" className="gap-2">
                    Study All
                  </Button>
                )}
              </div>

              {questionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : folderQuestions.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
                  <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No questions in this folder</p>
                  <p className="text-xs text-muted-foreground mt-1">Add questions during study sessions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {folderQuestions.map(q => (
                    <Card key={q.id} className="group">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{q.type}</Badge>
                            {q.subject && (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', subjectColor(q.subject))}>
                                {q.subject}
                              </span>
                            )}
                            {q.difficulty && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full',
                                q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                                q.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                                'bg-muted text-muted-foreground'
                              )}>
                                {q.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{questionLabel(q)}</p>
                          {q.topic && <p className="text-xs text-muted-foreground mt-0.5">{q.topic}</p>}
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Remove from folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Select a folder to view its questions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
