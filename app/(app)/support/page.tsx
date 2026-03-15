'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Plus, ArrowLeft, MessageCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  messageCount: number;
}

interface Message {
  id: string;
  senderId: string;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  open: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
  replied: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: CheckCircle2 },
  closed: { bg: 'bg-muted', text: 'text-muted-foreground', icon: XCircle },
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticketDetail, setTicketDetail] = useState<Ticket | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [reply, setReply] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadTickets() {
    const res = await fetch('/api/support');
    const data = await res.json();
    setTickets(data.tickets || []);
  }

  async function openTicket(ticketId: string) {
    setActiveTicket(ticketId);
    setLoading(true);
    const res = await fetch(`/api/support/tickets?id=${ticketId}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setTicketDetail(data.ticket || null);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: newSubject, message: newMessage }),
    });
    const data = await res.json();
    if (data.ticketId) {
      toast.success('Ticket submitted! We\'ll get back to you soon.');
      setNewSubject('');
      setNewMessage('');
      setShowNew(false);
      await loadTickets();
      openTicket(data.ticketId);
    } else {
      toast.error(data.error || 'Failed to create ticket');
    }
    setCreating(false);
  }

  async function handleReply() {
    if (!reply.trim() || !activeTicket) return;
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: activeTicket, message: reply }),
    });
    if (res.ok) {
      setReply('');
      openTicket(activeTicket);
      loadTickets();
    } else {
      toast.error('Failed to send message');
    }
  }

  // Ticket conversation view
  if (activeTicket) {
    const statusStyle = STATUS_STYLES[ticketDetail?.status || 'open'] || STATUS_STYLES.open;
    const StatusIcon = statusStyle.icon;

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => { setActiveTicket(null); loadTickets(); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to tickets
          </button>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">{ticketDetail?.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Ticket {activeTicket}</p>
              </div>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <StatusIcon className="w-3 h-3" />
                {ticketDetail?.status}
              </span>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.isAdmin
                      ? 'bg-muted text-foreground rounded-bl-md'
                      : 'bg-primary text-primary-foreground rounded-br-md'
                  }`}>
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.isAdmin ? 'Support Team' : 'You'}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {ticketDetail?.status !== 'closed' && (
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                />
                <Button onClick={handleReply} size="icon" disabled={!reply.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New ticket form
  if (showNew) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setShowNew(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-1">New Support Ticket</h2>
            <p className="text-sm text-muted-foreground mb-6">Describe your problem or inquiry and we&apos;ll get back to you as soon as possible.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                <Input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. Can't upload PDF, Payment issue..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Describe your problem or inquiry</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Please describe what happened, what you expected, and any steps to reproduce the issue..."
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tickets list
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support</h1>
            <p className="text-sm text-muted-foreground">Get help with your account or report issues</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No tickets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Have a question or issue? Create a support ticket.</p>
            <Button onClick={() => setShowNew(true)} variant="outline" className="gap-1.5">
              <Plus className="w-4 h-4" /> Create Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => {
              const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
              const Icon = style.icon;
              return (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket.id)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">{ticket.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.lastMessage}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
                        <Icon className="w-3 h-3" />
                        {ticket.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{ticket.messageCount} msgs</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
