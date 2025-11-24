describe('Command Signature Help Tests', () => {
  const commandSignatures = [
    {
      command: 'PRINT',
      label: 'PRINT [AT line,col;] expression [; expression]...',
      params: ['expression']
    },
    {
      command: 'INPUT',
      label: 'INPUT ["prompt";] variable [, variable]...',
      params: ['variable']
    },
    {
      command: 'FOR',
      label: 'FOR variable = start TO end [STEP step]',
      params: ['variable', 'start', 'end']
    },
    {
      command: 'DIM',
      label: 'DIM array(size [, size [, size]])',
      params: ['array', 'size']
    },
    {
      command: 'IF',
      label: 'IF condition THEN statement',
      params: ['condition', 'statement']
    },
    {
      command: 'PLOT',
      label: 'PLOT x, y',
      params: ['x', 'y']
    },
    {
      command: 'BEEP',
      label: 'BEEP duration, pitch',
      params: ['duration', 'pitch']
    },
    {
      command: 'GOSUB',
      label: 'GOSUB line_number',
      params: ['line_number']
    },
    {
      command: 'GOTO',
      label: 'GOTO line_number',
      params: ['line_number']
    },
    {
      command: 'POKE',
      label: 'POKE address, value',
      params: ['address', 'value']
    },
  ];

  test('should contain the expected number of command signatures', () => {
    expect(commandSignatures).toHaveLength(10);
  });

  test.each(commandSignatures)('command $command should have valid signature structure', ({ command, label, params }) => {
    expect(command).toBeDefined();
    expect(typeof command).toBe('string');
    expect(label).toBeDefined();
    expect(typeof label).toBe('string');
    expect(params).toBeDefined();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(0);
  });

  test('should have unique command names', () => {
    const commands = commandSignatures.map(sig => sig.command);
    const uniqueCommands = [...new Set(commands)];
    expect(commands).toHaveLength(uniqueCommands.length);
  });

  test('should have labels containing the command name', () => {
    commandSignatures.forEach(sig => {
      expect(sig.label.toUpperCase()).toContain(sig.command);
    });
  });
});
