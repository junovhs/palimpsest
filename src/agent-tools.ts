type Context = {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute(input: unknown): unknown;
  }, options?: { signal: AbortSignal }): void | Promise<void>;
};

/** Progressive enhancement. Ordinary browsers need no polyfill or service. */
export function registerAgentTools(read: () => unknown, start: (deposit: number) => unknown) {
  const context = (document as Document & { modelContext?: Context }).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    {
      name: 'read_palimpsest_world',
      description: 'Read the currently visible world statistics, parameters, and boundary mode without changing it.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object');
        return read();
      },
    },
    {
      name: 'start_palimpsest_experiment',
      description: 'Reset to the six-cell spring using Cathedral rules, absorbing edges, and a selected memory deposit, then run the visible simulation.',
      inputSchema: { type: 'object', properties: { deposit: { type: 'integer', enum: [5, 6, 12, 24] } }, required: ['deposit'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a deposit');
        const value = input as Record<string, unknown>;
        if (Object.keys(value).length !== 1 || ![5, 6, 12, 24].includes(value.deposit as number)) throw new Error('Deposit must be 5, 6, 12, or 24');
        return start(value.deposit as number);
      },
    },
  ];
  for (const tool of tools) {
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); }
    catch { /* Optional API: never interrupt the ordinary playground. */ }
  }
}
