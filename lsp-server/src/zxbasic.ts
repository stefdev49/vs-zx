// ZX BASIC Language Support for LSP Server
// Based on ZX BASIC ROM disassembly and syntax

export enum TokenType {
  // Generic categories
  KEYWORD = 'KEYWORD',
  OPERATOR = 'OPERATOR',
  PUNCTUATION = 'PUNCTUATION',
  COMMENT = 'COMMENT',

  // Keywords (will be lexed as KEYWORD with specific value)
  LET = 'LET',
  IF = 'IF',
  THEN = 'THEN',
  FOR = 'FOR',
  TO = 'TO',
  STEP = 'STEP',
  NEXT = 'NEXT',
  READ = 'READ',
  DATA = 'DATA',
  RESTORE = 'RESTORE',
  DIM = 'DIM',
  DEF = 'DEF FN',
  FN = 'FN',
  GOTO = 'GO TO',
  GOSUB = 'GO SUB',
  RETURN = 'RETURN',
  STOP = 'STOP',
  RANDOMIZE = 'RANDOMIZE',
  CLEAR = 'CLEAR',
  CLS = 'CLS',
  INPUT = 'INPUT',
  LOAD = 'LOAD',
  SAVE = 'SAVE',
  VERIFY = 'VERIFY',
  MERGE = 'MERGE',
  BEEP = 'BEEP',
  INK = 'INK',
  PAPER = 'PAPER',
  FLASH = 'FLASH',
  BRIGHT = 'BRIGHT',
  INVERSE = 'INVERSE',
  OVER = 'OVER',
  BORDER = 'BORDER',
  PLOT = 'PLOT',
  DRAW = 'DRAW',
  CIRCLE = 'CIRCLE',
  LPRINT = 'LPRINT',
  LLIST = 'LLIST',
  COPY = 'COPY',
  SPECTRUM = 'SPECTRUM',
  PLAY = 'PLAY',
  ERASE = 'ERASE',
  CAT = 'CAT',
  FORMAT = 'FORMAT',
  MOVE = 'MOVE',

  // Operators and symbols
  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  POWER = '^',
  EQUALS = '=',
  NOT_EQUALS = '<>',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  LINE_NUMBER = 'LINE_NUMBER',

  // Punctuation
  LPAREN = '(',
  RPAREN = ')',
  COLON = ':',
  SEMICOLON = ';',
  COMMA = ',',
  STATEMENT_SEPARATOR = 'STATEMENT_SEPARATOR',

  // Special
  EOF = 'EOF',
  INVALID = 'INVALID'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  start: number;
  end: number;
}

export class ZXBasicLexer {
  private text: string;
  private position: number = 0;
  private line: number = 0;
  private column: number = 0;

  constructor() {
    this.text = '';
  }

  tokenize(text: string): Token[] {
    this.text = text;
    this.position = 0;
    this.line = 0;
    this.column = 0;
    const tokens: Token[] = [];
    let atLineStart = true; // Track if we're at the start of a line

    while (this.position < this.text.length) {
      const char = this.currentChar();
      if (char === '\n') {
        this.line++;
        this.column = 0;
        this.advance();
        atLineStart = true; // Next non-whitespace could be a line number
      } else if (char === '\t' || char === ' ') {
        this.advance();
      } else if (atLineStart && this.isDigit(char)) {
        // Line number at start of line
        tokens.push(this.lexLineNumber());
        atLineStart = false;
      } else if (this.isDigit(char) || (char === '.' && this.position + 1 < this.text.length && this.isDigit(this.text[this.position + 1]))) {
        tokens.push(this.lexNumber());
        atLineStart = false;
      } else if (this.isLetter(char)) {
        tokens.push(this.lexIdentifier());
        atLineStart = false;
      } else if (char === '"') {
        tokens.push(this.lexString());
        atLineStart = false;
      } else if (char === ':') {
        // Colon is a statement separator in ZX BASIC
        const startCol = this.column;
        const token: Token = {
          type: TokenType.STATEMENT_SEPARATOR,
          value: ':',
          line: this.line,
          start: startCol,
          end: startCol + 1
        };
        tokens.push(token);
        this.advance();
        atLineStart = false;
      } else if (this.isPunctuation(char)) {
        const startCol = this.column;
        const token: Token = {
          type: TokenType.PUNCTUATION,
          value: char,
          line: this.line,
          start: startCol,
          end: startCol + 1
        };
        tokens.push(token);
        this.advance();
        atLineStart = false;
      } else if (this.isOperator(char)) {
        tokens.push(this.lexOperator());
        atLineStart = false;
      } else {
        const startCol = this.column;
        tokens.push({
          type: TokenType.INVALID,
          value: char,
          line: this.line,
          start: startCol,
          end: startCol + 1
        });
        this.advance();
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      start: this.column,
      end: this.column
    });
    return tokens;
  }

  private currentChar(): string {
    return this.text[this.position];
  }

  private peekNext(): string {
    return this.position + 1 < this.text.length ? this.text[this.position + 1] : '';
  }

  private advance(): void {
    this.position++;
    this.column++;
  }

  private isDigit(char: string): boolean {
    return /\d/.test(char);
  }

  private isLetter(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isOperator(char: string): boolean {
    return ['+', '-', '*', '/', '^', '=', '<', '>'].includes(char);
  }

  private isPunctuation(char: string): boolean {
    return ['(', ')', ';', ','].includes(char);
  }

  private createToken(type: TokenType, value: string, startOffset: number = 0): Token {
    return {
      type,
      value,
      line: this.line,
      start: this.column - startOffset,
      end: this.column
    };
  }

  private lexNumber(): Token {
    const start = this.position;
    const startCol = this.column;
    let hasDot = false;
    let hasExponent = false;

    // Read the main number part
    while (this.position < this.text.length) {
      const char = this.currentChar();
      if (this.isDigit(char)) {
        this.advance();
      } else if (char === '.' && !hasDot && !hasExponent) {
        hasDot = true;
        this.advance();
      } else {
        break;
      }
    }

    // Check for exponent (E or e followed by optional +/- and digits)
    if (this.position < this.text.length && (this.currentChar() === 'E' || this.currentChar() === 'e')) {
      const savedPos = this.position;
      const savedCol = this.column;
      this.advance(); // consume E/e
      
      // Allow optional + or -
      if (this.currentChar() === '+' || this.currentChar() === '-') {
        this.advance();
      }

      // Must have at least one digit after E
      if (this.position < this.text.length && this.isDigit(this.currentChar())) {
        hasExponent = true;
        while (this.position < this.text.length && this.isDigit(this.currentChar())) {
          this.advance();
        }
      } else {
        // Not a valid exponent, restore position
        this.position = savedPos;
        this.column = savedCol;
      }
    }

    const value = this.text.substring(start, this.position);
    return {
      type: TokenType.NUMBER,
      value,
      line: this.line,
      start: startCol,
      end: this.column
    };
  }

  private lexLineNumber(): Token {
    const start = this.position;
    const startCol = this.column;

    // Read digits only (line numbers are integers 1-9999)
    while (this.position < this.text.length && this.isDigit(this.currentChar())) {
      this.advance();
    }

    const value = this.text.substring(start, this.position);
    return {
      type: TokenType.LINE_NUMBER,
      value,
      line: this.line,
      start: startCol,
      end: this.column
    };
  }

  private lexIdentifier(): Token {
    const start = this.position;
    const startCol = this.column;

    // Include letters, digits, and ZX BASIC suffixes ($ for strings, % for integers)
    while (this.position < this.text.length &&
           (this.isLetter(this.currentChar()) ||
            this.isDigit(this.currentChar()))) {
      this.advance();
    }

    // Check for string ($) or integer (%) suffix
    if (this.position < this.text.length && 
        (this.currentChar() === '$' || this.currentChar() === '%')) {
      this.advance();
    }

    let value = this.text.substring(start, this.position).toUpperCase();
    
    // Special handling for REM comments - consume rest of line
    if (value === 'REM') {
      while (this.position < this.text.length && this.currentChar() !== '\n') {
        this.advance();
      }
      const commentValue = this.text.substring(start, this.position);
      return {
        type: TokenType.COMMENT,
        value: commentValue,
        line: this.line,
        start: startCol,
        end: this.column
      };
    }
    
    // Special handling for two-word keywords: "GO TO", "GO SUB", "DEF FN"
    if (value === 'GO' || value === 'DEF') {
      const savedPos = this.position;
      const savedCol = this.column;
      
      // Skip whitespace
      while (this.position < this.text.length && 
             (this.currentChar() === ' ' || this.currentChar() === '\t')) {
        this.advance();
      }
      
      // Check if next word forms a two-word keyword
      const nextWordStart = this.position;
      if (this.position < this.text.length && this.isLetter(this.currentChar())) {
        while (this.position < this.text.length &&
               (this.isLetter(this.currentChar()) || this.isDigit(this.currentChar()))) {
          this.advance();
        }
        const nextWord = this.text.substring(nextWordStart, this.position).toUpperCase();
        
        if (value === 'GO' && nextWord === 'TO') {
          value = 'GOTO';  // Normalize to single word
        } else if (value === 'GO' && nextWord === 'SUB') {
          value = 'GOSUB';  // Normalize to single word
        } else if (value === 'DEF' && nextWord === 'FN') {
          value = 'DEFFN';  // Normalize to single word
        } else {
          // Not a two-word keyword, restore position
          this.position = savedPos;
          this.column = savedCol;
        }
      } else {
        // No next word, restore position
        this.position = savedPos;
        this.column = savedCol;
      }
    }
    
    const tokenType = this.getKeywordType(value);

    return {
      type: tokenType,
      value,
      line: this.line,
      start: startCol,
      end: this.column
    };
  }

  private lexString(): Token {
    const start = this.position;
    const startCol = this.column;
    this.advance(); // Skip opening quote

    while (this.position < this.text.length && this.currentChar() !== '"') {
      this.advance();
    }

    if (this.currentChar() === '"') {
      this.advance(); // Include closing quote
    }

    const value = this.text.substring(start, this.position);
    return {
      type: TokenType.STRING,
      value,
      line: this.line,
      start: startCol,
      end: this.column
    };
  }

  private lexOperator(): Token {
    const startCol = this.column;
    const char = this.currentChar();
    this.advance();

    if (char === '<' && this.currentChar() === '>') {
      this.advance();
      return {
        type: TokenType.OPERATOR,
        value: '<>',
        line: this.line,
        start: startCol,
        end: this.column
      };
    } else if (char === '<' && this.currentChar() === '=') {
      this.advance();
      return {
        type: TokenType.OPERATOR,
        value: '<=',
        line: this.line,
        start: startCol,
        end: this.column
      };
    } else if (char === '>' && this.currentChar() === '=') {
      this.advance();
      return {
        type: TokenType.OPERATOR,
        value: '>=',
        line: this.line,
        start: startCol,
        end: this.column
      };
    } else {
      return {
        type: TokenType.OPERATOR,
        value: char,
        line: this.line,
        start: startCol,
        end: this.column
      };
    }
  }

  private getKeywordType(value: string): TokenType {
    // ZX BASIC keywords (based on ROM disassembly)
    const keywords = [
      'PRINT', 'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
      'WHILE', 'WEND', 'REPEAT', 'UNTIL', 'READ', 'DATA', 'RESTORE', 'DIM',
      'DEF', 'FN', 'DEFFN', 'GOTO', 'GOSUB', 'RETURN', 'STOP', 'RANDOMIZE', 'CONTINUE',
      'CLEAR', 'CLS', 'INPUT', 'LOAD', 'SAVE', 'VERIFY', 'MERGE', 'BEEP',
      'INK', 'PAPER', 'FLASH', 'BRIGHT', 'INVERSE', 'OVER', 'BORDER', 'PLOT',
      'DRAW', 'CIRCLE', 'LPRINT', 'LLIST', 'COPY', 'SPECTRUM', 'PLAY', 'ERASE',
      'CAT', 'FORMAT', 'MOVE', 'VAL', 'LEN', 'STR$', 'CHR$', 'CODE', 'SIN',
      'COS', 'TAN', 'ASN', 'ACS', 'ATN', 'LN', 'EXP', 'INT', 'SQR', 'SGN',
      'ABS', 'PEEK', 'USR', 'INKEY$', 'PI', 'TRUE', 'FALSE', 'RND', 'ATTR',
      'SCREEN$', 'POINT', 'TAB', 'AND', 'OR', 'NOT', 'VAL$', 'CHR$', 'SCREEN$',
      'ATTR', 'POINT', 'TAB', 'AT', 'STEP', 'OVER', 'INVERSE', 'BRIGHT', 'FLASH',
      'INK', 'PAPER', 'CIRCLE', 'DRAW', 'LPRINT', 'LLIST'
    ];

    if (keywords.includes(value)) {
      return TokenType.KEYWORD;
    }
    return TokenType.IDENTIFIER;
  }
}

// Simple AST node for expressions
export interface ASTNode {
  type: 'binary_expr' | 'unary_expr' | 'literal' | 'number' | 'string' | 'identifier' | 'function' |
    'let_statement' | 'print_statement' | 'input_statement' | 'if_statement' | 'for_statement' |
    'dim_statement' | 'goto_statement' | 'gosub_statement' | 'read_statement' | 'data_statement';
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  operand?: ASTNode;
  value?: any;
  name?: string;
  args?: ASTNode[];
  variable?: string;
  expression?: ASTNode;
  expressions?: ASTNode[];
  variables?: string[];
  condition?: ASTNode;
  thenStatement?: ASTNode | null;
  start?: ASTNode;
  end?: ASTNode;
  step?: ASTNode | null;
  arrays?: Array<{ name: string; dimensions: ASTNode[] }>;
  lineNumber?: string;
  values?: Array<string | number>;
}

export class ZXBasicParser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  setTokens(tokens: Token[]): void {
    this.tokens = tokens;
    this.current = 0;
  }

  parseExpression(): ASTNode | null {
    try {
      return this.expression();
    } catch (e) {
      return null;
    }
  }

  // Parse a full statement
  parseStatement(): ASTNode | null {
    try {
      const keyword = this.peek();
      
      if (keyword.type !== TokenType.KEYWORD) {
        return null;
      }

      switch (keyword.value) {
        case 'LET':
          return this.parseLet();
        case 'PRINT':
          return this.parsePrint();
        case 'INPUT':
          return this.parseInput();
        case 'IF':
          return this.parseIf();
        case 'FOR':
          return this.parseFor();
        case 'DIM':
          return this.parseDim();
        case 'GOTO':
          return this.parseGoto();
        case 'GOSUB':
          return this.parseGosub();
        case 'READ':
          return this.parseRead();
        case 'DATA':
          return this.parseData();
        default:
          return null;
      }
    } catch (e) {
      return null;
    }
  }

  private parseLet(): ASTNode {
    this.consume(TokenType.KEYWORD); // LET
    const variable = this.consume(TokenType.IDENTIFIER);
    this.consumeOperator('=');
    const expression = this.expression();

    return {
      type: 'let_statement',
      variable: variable.value,
      expression
    };
  }

  private parsePrint(): ASTNode {
    this.consume(TokenType.KEYWORD); // PRINT
    const expressions: ASTNode[] = [];
    
    while (!this.isAtEnd() && this.peek().type !== TokenType.STATEMENT_SEPARATOR) {
      expressions.push(this.expression());
      
      if (this.peek().value === ';' || this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    }
    
    return {
      type: 'print_statement',
      expressions
    };
  }

  private parseInput(): ASTNode {
    this.consume(TokenType.KEYWORD); // INPUT
    const variables: string[] = [];
    
    while (!this.isAtEnd() && this.peek().type !== TokenType.STATEMENT_SEPARATOR) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        variables.push(this.advance().value);
      }
      
      if (this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    }
    
    return {
      type: 'input_statement',
      variables
    };
  }

  private parseIf(): ASTNode {
    this.consume(TokenType.KEYWORD); // IF
    const condition = this.expression();
    
    if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'THEN') {
      this.consume(TokenType.KEYWORD); // THEN
      const statement = this.parseStatement();
      
      return {
        type: 'if_statement',
        condition,
        thenStatement: statement
      };
    }
    
    throw new Error('IF without THEN');
  }

  private parseFor(): ASTNode {
    this.consume(TokenType.KEYWORD); // FOR
    const variable = this.consume(TokenType.IDENTIFIER).value;
    this.consumeOperator('=');
    const start = this.expression();
    this.consume(TokenType.KEYWORD); // TO
    const end = this.expression();

    let step = null;
    if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'STEP') {
      this.consume(TokenType.KEYWORD); // STEP
      step = this.expression();
    }

    return {
      type: 'for_statement',
      variable,
      start,
      end,
      step
    };
  }

  private parseDim(): ASTNode {
    this.consume(TokenType.KEYWORD); // DIM
    const arrays: Array<{ name: string; dimensions: ASTNode[] }> = [];

    while (!this.isAtEnd() && this.peek().type !== TokenType.STATEMENT_SEPARATOR) {
      const name = this.consume(TokenType.IDENTIFIER).value;
      const dimensions: ASTNode[] = [];

      if (this.peek().value === '(') {
        this.consumePunctuation('(');

        while (this.peek().value !== ')') {
          dimensions.push(this.expression());

          if (this.peek().value === ',') {
            this.advance();
          } else {
            break;
          }
        }

        this.consumePunctuation(')');
      }

      arrays.push({ name, dimensions });

      if (this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    }

    return {
      type: 'dim_statement',
      arrays
    };
  }

  private parseGoto(): ASTNode {
    this.consume(TokenType.KEYWORD); // GOTO
    const lineNumber = this.consume(TokenType.NUMBER).value;

    return {
      type: 'goto_statement',
      lineNumber
    };
  }

  private parseGosub(): ASTNode {
    this.consume(TokenType.KEYWORD); // GOSUB
    const lineNumber = this.consume(TokenType.NUMBER).value;

    return {
      type: 'gosub_statement',
      lineNumber
    };
  }

  private parseRead(): ASTNode {
    this.consume(TokenType.KEYWORD); // READ
    const variables: string[] = [];
    
    while (!this.isAtEnd() && this.peek().type !== TokenType.STATEMENT_SEPARATOR) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        variables.push(this.advance().value);
      }
      
      if (this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    }
    
    return {
      type: 'read_statement',
      variables
    };
  }

  private parseData(): ASTNode {
    this.consume(TokenType.KEYWORD); // DATA
    const values: Array<string | number> = [];
    
    while (!this.isAtEnd() && this.peek().type !== TokenType.STATEMENT_SEPARATOR) {
      if (this.peek().type === TokenType.NUMBER) {
        values.push(parseFloat(this.advance().value));
      } else if (this.peek().type === TokenType.STRING) {
        values.push(this.advance().value);
      }
      
      if (this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    }
    
    return {
      type: 'data_statement',
      values
    };
  }

  private expression(): ASTNode {
    return this.logicalOr();
  }

  private logicalOr(): ASTNode {
    let expr = this.logicalAnd();

    while (this.peek().type === TokenType.KEYWORD && this.peek().value === 'OR') {
      this.advance();
      const right = this.logicalAnd();
      expr = {
        type: 'binary_expr',
        operator: 'OR',
        left: expr,
        right
      };
    }

    return expr;
  }

  private logicalAnd(): ASTNode {
    let expr = this.equality();

    while (this.peek().type === TokenType.KEYWORD && this.peek().value === 'AND') {
      this.advance();
      const right = this.equality();
      expr = {
        type: 'binary_expr',
        operator: 'AND',
        left: expr,
        right
      };
    }

    return expr;
  }

  private equality(): ASTNode {
    let expr = this.comparison();

    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '=' || this.peek().value === '<>')) {
      this.advance();
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: 'binary_expr',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private comparison(): ASTNode {
    let expr = this.term();

    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '<' || this.peek().value === '>' || this.peek().value === '<=' || this.peek().value === '>=')) {
      this.advance();
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        type: 'binary_expr',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private term(): ASTNode {
    let expr = this.factor();

    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      this.advance();
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        type: 'binary_expr',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private factor(): ASTNode {
    let expr = this.unary();

    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '^')) {
      this.advance();
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: 'binary_expr',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.peek().type === TokenType.OPERATOR && this.peek().value === '-') {
      this.advance();
      const operator = this.previous().value;
      const operand = this.unary();
      return {
        type: 'unary_expr',
        operator,
        operand
      };
    }

    // Check for NOT keyword
    if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'NOT') {
      this.advance();
      const operand = this.unary();
      return {
        type: 'unary_expr',
        operator: 'NOT',
        operand
      };
    }

    return this.primary();
  }

  private primary(): ASTNode {
    if (this.match(TokenType.NUMBER, TokenType.LINE_NUMBER)) {
      return {
        type: 'number',
        value: this.previous().value
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: 'string',
        value: this.previous().value
      };
    }

    if (this.match(TokenType.IDENTIFIER, TokenType.KEYWORD)) {
      const name = this.previous().value;
      if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === '(') {
        // Function call
        this.advance();
        const args: ASTNode[] = [];
        if (!(this.peek().type === TokenType.PUNCTUATION && this.peek().value === ')')) {
          do {
            args.push(this.expression());
          } while (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ',' && this.advance());
        }
        if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ')') {
          this.advance();
        } else {
          throw new Error('Expected )');
        }
        return {
          type: 'function',
          name,
          args
        };
      } else {
        return {
          type: 'identifier',
          name
        };
      }
    }

    if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === '(') {
      this.advance();
      const expr = this.expression();
      if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ')') {
        this.advance();
      } else {
        throw new Error('Expected )');
      }
      return expr;
    }

    throw new Error('Invalid expression');
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, value?: string): Token {
    if (value !== undefined) {
      if (this.peek().type === type && this.peek().value === value) {
        return this.advance();
      }
      throw new Error(`Expected ${type} with value ${value}`);
    } else {
      if (this.check(type)) {
        return this.advance();
      }
      throw new Error(`Expected ${type}`);
    }
  }

  private consumeOperator(value: string): Token {
    return this.consume(TokenType.OPERATOR, value);
  }

  private consumePunctuation(value: string): Token {
    return this.consume(TokenType.PUNCTUATION, value);
  }
}
