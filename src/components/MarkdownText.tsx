import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// A minimal Markdown renderer for the AI advice (Claude returns headings, bold,
// and lists). Not a full parser — just the subset the API actually uses — so we
// avoid pulling in a markdown dependency.
type MarkdownTextProps = {
  text: string;
  color: string;
};

// Render inline **bold** spans within a line.
function renderInline(text: string) {
  return text.split('**').map((part, i) => (
    <Fragment key={i}>
      {i % 2 === 1 ? <Text style={styles.bold}>{part}</Text> : part}
    </Fragment>
  ));
}

export default function MarkdownText({ text, color }: MarkdownTextProps) {
  const lines = text.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((raw, i) => {
        const line = raw.trim();
        const key = `line-${i}`;

        if (line === '') return <View key={key} style={styles.spacer} />;
        if (line.startsWith('### ')) {
          return <Text key={key} style={[styles.h3, { color }]}>{renderInline(line.slice(4))}</Text>;
        }
        if (line.startsWith('## ')) {
          return <Text key={key} style={[styles.h2, { color }]}>{renderInline(line.slice(3))}</Text>;
        }
        if (line.startsWith('# ')) {
          return <Text key={key} style={[styles.h1, { color }]}>{renderInline(line.slice(2))}</Text>;
        }

        const numbered = line.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <View key={key} style={styles.listItem}>
              <Text style={[styles.marker, { color }]}>{numbered[1]}.</Text>
              <Text style={[styles.body, { color }]}>{renderInline(numbered[2])}</Text>
            </View>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <View key={key} style={styles.listItem}>
              <Text style={[styles.marker, { color }]}>•</Text>
              <Text style={[styles.body, { color }]}>{renderInline(line.slice(2))}</Text>
            </View>
          );
        }
        return <Text key={key} style={[styles.body, { color }]}>{renderInline(line)}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
  },
  marker: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  spacer: {
    height: 6,
  },
});
