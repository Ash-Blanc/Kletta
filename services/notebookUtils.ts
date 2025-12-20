import { Message } from '../types';

/**
 * Converts chat history containing code blocks into a standard .ipynb JSON structure.
 */
export const exportToIPYNB = (messages: Message[], competitionName: string) => {
  const cells = messages.map(msg => {
    // Check if the message contains code blocks
    const codeRegex = /```(?:python|py)\n([\s\S]*?)```/g;
    const matches = [...msg.content.matchAll(codeRegex)];

    if (matches.length > 0) {
      // Create code cells for each block found
      return matches.map(match => ({
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: match[1].split('\n').map(line => line + '\n')
      }));
    } else {
      // Create a markdown cell for regular text
      return [{
        cell_type: "markdown",
        metadata: {},
        source: msg.content.split('\n').map(line => line + '\n')
      }];
    }
  }).flat();

  const notebook = {
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          `# Kletta Research: ${competitionName}\n`,
          `*Generated on ${new Date().toLocaleDateString()}*\n`
        ]
      },
      ...cells
    ],
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      },
      language_info: {
        name: "python",
        version: "3.10.0"
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  };

  const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/x-ipynb+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kletta-research-${competitionName.toLowerCase().replace(/\s+/g, '-')}.ipynb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
