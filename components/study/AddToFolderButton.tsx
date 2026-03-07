'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderPlus, Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Folder {
  id: string;
  name: string;
  color: string;
}

export function AddToFolderButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [inFolders, setInFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/folders').then(r => r.json()),
      fetch(`/api/questions/${questionId}/folders`).then(r => r.json()),
    ]).then(([allFolders, qFolders]) => {
      setFolders(allFolders);
      setInFolders(new Set((qFolders as { folderId: string }[]).map(f => f.folderId)));
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [open, questionId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function toggleFolder(folderId: string) {
    const wasIn = inFolders.has(folderId);
    // Optimistic update
    setInFolders(prev => {
      const next = new Set(prev);
      wasIn ? next.delete(folderId) : next.add(folderId);
      return next;
    });

    try {
      if (wasIn) {
        await fetch(`/api/folders/${folderId}/questions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId }),
        });
      } else {
        const res = await fetch(`/api/folders/${folderId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId }),
        });
        if (res.status === 409) {
          // Already in folder
        } else if (!res.ok) {
          throw new Error();
        }
      }
    } catch {
      // Revert on error
      setInFolders(prev => {
        const next = new Set(prev);
        wasIn ? next.add(folderId) : next.delete(folderId);
        return next;
      });
      toast.error('Failed to update folder');
    }
  }

  async function createFolder() {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const folder = await res.json();
      setFolders(prev => [folder, ...prev]);
      setNewName('');
      setCreating(false);
      // Auto-add question to new folder
      await toggleFolder(folder.id);
    } catch {
      toast.error('Failed to create folder');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          inFolders.size > 0
            ? 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
        title="Add to folder"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Folder</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground px-1">Add to folder</p>
          </div>

          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="flex-1 truncate text-foreground">{folder.name}</span>
                  {inFolders.has(folder.id) && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  )}
                </button>
              ))}
              {folders.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet</p>
              )}
            </div>
          )}

          <div className="border-t border-border p-2">
            {creating ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createFolder()}
                  placeholder="Folder name..."
                  className="flex-1 text-sm px-2 py-1 rounded bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={createFolder}
                  className="p-1 rounded hover:bg-muted text-violet-600"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New folder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
