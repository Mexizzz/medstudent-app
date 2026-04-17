import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';

const colors = {
  primary: '#4f46e5',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#94a3b8',
  border: '#e2e8f0',
  accent: '#6366f1',
  bgSoft: '#f8fafc',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 48,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: colors.text,
    lineHeight: 1.5,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandMark: {
    width: 22, height: 22, backgroundColor: colors.primary,
    color: '#ffffff', fontSize: 12, textAlign: 'center',
    paddingTop: 4, fontFamily: 'Helvetica-Bold',
    marginRight: 8,
  },
  brandText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.primary },
  headerMeta: { fontSize: 9, color: colors.muted },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 10, color: colors.muted, marginBottom: 16 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.text, marginTop: 18, marginBottom: 6 },
  h2: {
    fontSize: 14, fontFamily: 'Helvetica-Bold', color: colors.primary,
    marginTop: 14, marginBottom: 6, paddingBottom: 3,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.text, marginTop: 10, marginBottom: 4 },
  para: { marginBottom: 6 },
  bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 2 },
  bulletMark: { width: 10, color: colors.primary, fontFamily: 'Helvetica-Bold' },
  bulletText: { flex: 1 },
  strong: { fontFamily: 'Helvetica-Bold' },
  keyCard: {
    backgroundColor: colors.bgSoft, borderLeftWidth: 3,
    borderLeftColor: colors.primary, padding: 10, marginVertical: 8, borderRadius: 3,
  },
  footer: {
    position: 'absolute', bottom: 20, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: colors.subtle,
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  pageNum: { fontSize: 8, color: colors.subtle },
});

function renderInline(raw: string) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push(<Text key={i++}>{raw.slice(last, m.index)}</Text>);
    if (m[1] !== undefined) parts.push(<Text key={i++} style={styles.strong}>{m[1]}</Text>);
    else if (m[2] !== undefined) parts.push(<Text key={i++} style={{ fontFamily: 'Courier' }}>{m[2]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push(<Text key={i++}>{raw.slice(last)}</Text>);
  return parts;
}

function blocksFromMarkdown(md: string) {
  const lines = md.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    const items = bulletBuf;
    blocks.push(
      <View key={`ul-${key++}`} style={{ marginBottom: 6 }}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.bullet}>
            <Text style={styles.bulletMark}>•</Text>
            <Text style={styles.bulletText}>{renderInline(item)}</Text>
          </View>
        ))}
      </View>,
    );
    bulletBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBullets(); continue; }

    if (line.startsWith('### ')) {
      flushBullets();
      blocks.push(<Text key={key++} style={styles.h3}>{line.slice(4)}</Text>);
    } else if (line.startsWith('## ')) {
      flushBullets();
      blocks.push(<Text key={key++} style={styles.h2}>{line.slice(3)}</Text>);
    } else if (line.startsWith('# ')) {
      flushBullets();
      blocks.push(<Text key={key++} style={styles.h1}>{line.slice(2)}</Text>);
    } else if (/^[-*]\s+/.test(line)) {
      bulletBuf.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushBullets();
      blocks.push(
        <Text key={key++} style={styles.para}>
          {renderInline(line)}
        </Text>,
      );
    }
  }
  flushBullets();
  return blocks;
}

export interface SummaryPdfProps {
  title: string;
  subject?: string | null;
  topic?: string | null;
  markdown: string;
  generatedAt: Date;
  studentName?: string | null;
}

export function SummaryPdfDocument({ title, subject, topic, markdown, generatedAt, studentName }: SummaryPdfProps) {
  const dateStr = generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const blocks = blocksFromMarkdown(markdown);

  return (
    <Document title={title} author={studentName || 'MedStudy'}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} fixed>
          <View style={styles.brand}>
            <Text style={styles.brandMark}>M</Text>
            <Text style={styles.brandText}>MedStudy — AI Summary</Text>
          </View>
          <Text style={styles.headerMeta}>{dateStr}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {[subject, topic, studentName ? `Prepared for ${studentName}` : null].filter(Boolean).join(' · ')}
        </Text>

        {blocks}

        <View style={styles.footer} fixed>
          <Text>medstudy.space — AI-generated study summary</Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
