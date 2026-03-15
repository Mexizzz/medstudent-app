'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, ThumbsUp, Plus, X, Tag, Clock, CheckCircle2, Wrench, XCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeatureRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  category: string;
  status: string;
  adminNote: string | null;
  upvoteCount: number;
  createdAt: string;
  hasVoted: boolean;
  isOwner: boolean;
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'bug', label: 'Bug Fix' },
];

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' },
];

const STATUS_ICON: Record<string, typeof Clock> = {
  open: Clock,
  planned: ArrowUpCircle,
  in_progress: Wrench,
  done: CheckCircle2,
  declined: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  open: 'text-blue-500 bg-blue-500/10',
  planned: 'text-purple-500 bg-purple-500/10',
  in_progress: 'text-amber-500 bg-amber-500/10',
  done: 'text-emerald-500 bg-emerald-500/10',
  declined: 'text-red-400 bg-red-400/10',
};

const CAT_COLOR: Record<string, string> = {
  feature: 'bg-indigo-500/10 text-indigo-500',
  improvement: 'bg-teal-500/10 text-teal-500',
  bug: 'bg-red-500/10 text-red-500',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  async function fetchRequests() {
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      });
      if (!res.ok) throw new Error();
      toast.success('Request submitted!');
      setTitle('');
      setDescription('');
      setCategory('feature');
      setShowForm(false);
      fetchRequests();
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(requestId: string) {
    setVotingId(requestId);
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error();
      const { voted } = await res.json();
      setRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, hasVoted: voted, upvoteCount: voted ? r.upvoteCount + 1 : r.upvoteCount - 1 }
          : r
      ));
    } catch {
      toast.error('Failed to vote');
    } finally {
      setVotingId(null);
    }
  }

  const filtered = requests.filter(r =>
    (catFilter === 'all' || r.category === catFilter) &&
    (statusFilter === 'all' || r.status === statusFilter)
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            Feature Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suggest ideas, report bugs, and vote on what to build next
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showForm ? 'Cancel' : 'New Request'}
        </Button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short summary of your idea..."
                  maxLength={100}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you'd like to see and why it would be useful..."
                  rows={4}
                  maxLength={1000}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <div className="flex gap-2 mt-1">
                  {['feature', 'improvement', 'bug'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {c === 'bug' ? 'Bug Fix' : c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCatFilter(c.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  catFilter === c.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  statusFilter === s.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No requests yet. Be the first to suggest something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const StatusIcon = STATUS_ICON[req.status] || Clock;
            return (
              <Card key={req.id} className="group">
                <CardContent className="p-4 flex gap-4">
                  {/* Vote button */}
                  <button
                    onClick={() => toggleVote(req.id)}
                    disabled={votingId === req.id}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-[52px] shrink-0',
                      req.hasVoted
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    )}
                  >
                    <ThumbsUp className={cn('w-4 h-4', req.hasVoted && 'fill-current')} />
                    <span className="text-sm font-bold">{req.upvoteCount}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm leading-snug">{req.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', CAT_COLOR[req.category] || CAT_COLOR.feature)}>
                          {req.category === 'bug' ? 'Bug' : req.category.charAt(0).toUpperCase() + req.category.slice(1)}
                        </span>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLOR[req.status] || STATUS_COLOR.open)}>
                          <StatusIcon className="w-3 h-3" />
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-muted-foreground">
                        by {req.isOwner ? 'you' : req.userName}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {req.adminNote && (
                      <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-[11px] font-medium text-primary">Admin Response</p>
                        <p className="text-xs text-foreground/80 mt-0.5">{req.adminNote}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
