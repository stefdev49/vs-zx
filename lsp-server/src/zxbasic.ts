export enum TokenType {
  // Keywords and Commands
  KEYWORD = 'KEYWORD',
  // Line numbers
  LINE_NUMBER = 'LINE_NUMBER',
  // Identifiers (variables A-Z, A$)
  IDENTIFIER = 'IDENTIFIER',
  // String literals
  STRING = 'STRING',
  // Numeric literals
  NUMBER = 'NUMBER',
  // Operators
  OPERATOR = 'OPERATOR',
  // Punctuation (: , ; ( ) etc.)
  PUNCTUATION = 'PUNCTUATION',
  // REM statements
  COMMENT = 'COMMENT',
  // End of line/input
  EOF = 'EOF',
  // Invalid tokens
  INVALID = 'INVALID'
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line: number;
}

export interface ASTNode {
  type: 'binary_expr' | 'unary_expr' | 'identifier' | 'number' | 'string' | 'function_call' | 'array_access' | 'parenthesized_expr';
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  operand?: ASTNode;
  value?: string | number;
  name?: string;
  args?: ASTNode[];
  index?: ASTNode;
  expr?: ASTNode;
  start: number;
  end: number;
  line: number;
}

export class ZXBasicLexer {
  private input: string;
  private position: number;
  private line: number;
  private column: number;

  constructor() {
    this.input = '';
    this.position = 0;
    this.line = 0;
    this.column = 0;
  }

  tokenize(code: string): Token[] {
    this.input = code;
    this.position = 0;
    this.line = 0;
    this.column = 0;
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
        this.position++;
        continue;
      }

      if (this.isWhitespace(this.peek())) {
        this.advance();
        continue;
      }

      if (this.isCommentStart()) {
        tokens.push(this.tokenizeComment());
        continue;
      }

      // Check for keywords
      const keywordToken = this.tryTokenizeKeyword();
      if (keywordToken) {
        tokens.push(keywordToken);
        continue;
      }

      if (this.isStringStart()) {
        tokens.push(this.tokenizeString());
        continue;
      }

      if (this.isNumberStart()) {
        tokens.push(this.tokenizeNumber());
        continue;
      }

      if (this.isIdentifierStart()) {
        tokens.push(this.tokenizeIdentifier());
        continue;
      }

      if (this.isOperatorStart()) {
        tokens.push(this.tokenizeOperator());
        continue;
      }

      if (this.isPunctuation(this.peek())) {
        tokens.push(this.tokenizePunctuation());
        continue;
      }

      // Invalid character
      const start = this.position;
      this.advance();
      tokens.push({
        type: TokenType.INVALID,
        value: this.input[start],
        start,
        end: this.position,
        line: this.line
      });
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      start: this.position,
      end: this.position,
      line: this.line
    });

    return tokens;
  }

  private peek(): string {
    return this.position < this.input.length ? this.input[this.position] : '';
  }

  private peekNext(): string {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : '';
  }

  private advance(): void {
    this.position++;
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t';
  }

  private isCommentStart(): boolean {
    const word = this.input.substr(this.position, 3);
    return word.toUpperCase() === 'REM';
  }

  private isStringStart(): boolean {
    return this.peek() === '"';
  }

  private isNumberStart(): boolean {
    const char = this.peek();
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(): boolean {
    const char = this.peek().toUpperCase();
    return char >= 'A' && char <= 'Z';
  }

  private isOperatorStart(): boolean {
    const char = this.peek();
    return ['+', '-', '*', '/', '^', '=', '<', '>', 'AND', 'OR', 'NOT'].some(op => {
      return op.length === 1 ? char === op : this.input.substr(this.position, op.length).toUpperCase() === op;
    });
  }

  private isPunctuation(char: string): boolean {
    return ['(', ')', ':', ',', ';'].includes(char);
  }

  private tryTokenizeKeyword(): Token | null {
    const keywordMap: { [key: string]: TokenType } = {
      'LET': TokenType.KEYWORD,
      'PRINT': TokenType.KEYWORD,
      'IF': TokenType.KEYWORD,
      'THEN': TokenType.KEYWORD,
      'ELSE': TokenType.KEYWORD,
      'FOR': TokenType.KEYWORD,
      'TO': TokenType.KEYWORD,
      'NEXT': TokenType.KEYWORD,
      'GOTO': TokenType.KEYWORD,
      'GOSUB': TokenType.KEYWORD,
      'RETURN': TokenType.KEYWORD,
      'READ': TokenType.KEYWORD,
      'DATA': TokenType.KEYWORD,
      'RESTORE': TokenType.KEYWORD,
      'DIM': TokenType.KEYWORD,
      'REM': TokenType.KEYWORD,
      'NEW': TokenType.KEYWORD,
      'RUN': TokenType.KEYWORD,
      'STOP': TokenType.KEYWORD,
      'CONTINUE': TokenType.KEYWORD,
      'LIST': TokenType.KEYWORD,
      'LLIST': TokenType.KEYWORD,
      'CLEAR': TokenType.KEYWORD,
      'CLS': TokenType.KEYWORD,
      'INPUT': TokenType.KEYWORD,
      'SAVE': TokenType.KEYWORD,
      'LOAD': TokenType.KEYWORD,
      'VERIFY': TokenType.KEYWORD,
      'MERGE': TokenType.KEYWORD,
      'BORDER': TokenType.KEYWORD,
      'INK': TokenType.KEYWORD,
      'PAPER': TokenType.KEYWORD,
      'FLASH': TokenType.KEYWORD,
      'BRIGHT': TokenType.KEYWORD,
      'INVERSE': TokenType.KEYWORD,
      'OVER': TokenType.KEYWORD,
      'OUT': TokenType.KEYWORD,
      'PLOT': TokenType.KEYWORD,
      'DRAW': TokenType.KEYWORD,
      'RANDOMIZE': TokenType.KEYWORD,
      'PAUSE': TokenType.KEYWORD,
      'POKE': TokenType.KEYWORD,
      'COPY': TokenType.KEYWORD,
      'SPECTRUM': TokenType.KEYWORD,
      'PLAY': TokenType.KEYWORD,
      'ERASE': TokenType.KEYWORD,
      'CAT': TokenType.KEYWORD,
      'FORMAT': TokenType.KEYWORD,
      'MOVE': TokenType.KEYWORD,
      'OPEN': TokenType.KEYWORD,
      'CLOSE': TokenType.KEYWORD,
      'VAL': TokenType.KEYWORD,
      'LEN': TokenType.KEYWORD,
      'STR$': TokenType.KEYWORD,
      'CHR$': TokenType.KEYWORD,
      'CODE': TokenType.KEYWORD,
      'SCREEN$': TokenType.KEYWORD,
      'ATTR': TokenType.KEYWORD,
      'POINT': TokenType.KEYWORD,
      'TAB': TokenType.KEYWORD,
      'AT': TokenType.KEYWORD,
      'NEWLINE': TokenType.KEYWORD,
      'PI': TokenType.KEYWORD,
      'SIN': TokenType.KEYWORD,
      'COS': TokenType.KEYWORD,
      'TAN': TokenType.KEYWORD,
      'ASN': TokenType.KEYWORD,
      'ACS': TokenType.KEYWORD,
      'ATN': TokenType.KEYWORD,
      'LN': TokenType.KEYWORD,
      'EXP': TokenType.KEYWORD,
      'INT': TokenType.KEYWORD,
      'SQR': TokenType.KEYWORD,
      'SGN': TokenType.KEYWORD,
      'ABS': TokenType.KEYWORD,
      'PEEK': TokenType.KEYWORD,
      'IN': TokenType.KEYWORD,
      'USR': TokenType.KEYWORD,
      'RND': TokenType.KEYWORD,
      'NOT': TokenType.KEYWORD,
      'AND': TokenType.KEYWORD,
      'OR': TokenType.KEYWORD,
      'STEP': TokenType.KEYWORD
    };

    for (const keyword of Object.keys(keywordMap)) {
      if (this.input.substr(this.position, keyword.length).toUpperCase() === keyword) {
        const start = this.position;
        this.position += keyword.length;
        return {
          type: keywordMap[keyword],
          value: keyword,
          start,
          end: this.position,
          line: this.line
        };
      }
    }
    return null;
  }

  private tokenizeComment(): Token {
    const start = this.position;
    this.position += 3; // Skip "REM"
    while (this.position < this.input.length && this.peek() !== '\n') {
      this.advance();
    }
    return {
      type: TokenType.COMMENT,
      value: this.input.substring(start, this.position),
      start,
      end: this.position,
      line: this.line
    };
  }

  private tokenizeString(): Token {
    const start = this.position;
    this.advance(); // Skip opening quote
    while (this.position < this.input.length && this.peek() !== '"') {
      this.advance();
    }
    if (this.peek() === '"') {
      this.advance(); // Skip closing quote
    }
    return {
      type: TokenType.STRING,
      value: this.input.substring(start, this.position),
      start,
      end: this.position,
      line: this.line
    };
  }

  private tokenizeNumber(): Token {
    const start = this.position;
    while (this.position < this.input.length &&
           ((this.peek() >= '0' && this.peek() <= '9') || this.peek() === '.')) {
      this.advance();
    }
    if (this.peek().toUpperCase() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance();
      }
      while (this.peek() >= '0' && this.peek() <= '9') {
        this.advance();
      }
    }
    return {
      type: TokenType.NUMBER,
      value: this.input.substring(start, this.position),
      start,
      end: this.position,
      line: this.line
    };
  }

  private tokenizeIdentifier(): Token {
    const start = this.position;
    this.advance(); // Variable name
    if (this.peek() === '$') {
      this.advance(); // String variable indicator
    } else if (this.peek() === '%') {
      this.advance(); // Integer variable indicator
    }
    return {
      type: TokenType.IDENTIFIER,
      value: this.input.substring(start, this.position),
      start,
      end: this.position,
      line: this.line
    };
  }

  private tokenizeOperator(): Token {
    const start = this.position;
    const char = this.peek();

    if (this.input.substr(this.position, 3).toUpperCase() === 'AND') {
      this.position += 3;
      return { type: TokenType.OPERATOR, value: 'AND', start, end: this.position, line: this.line };
    }
    if (this.input.substr(this.position, 2).toUpperCase() === 'OR') {
      this.position += 2;
      return { type: TokenType.OPERATOR, value: 'OR', start, end: this.position, line: this.line };
    }
    if (this.input.substr(this.position, 3).toUpperCase() === 'NOT') {
      this.position += 3;
      return { type: TokenType.OPERATOR, value: 'NOT', start, end: this.position, line: this.line };
    }

    if (char === '<') {
      if (this.peekNext() === '>') {
        this.position += 2;
        return { type: TokenType.OPERATOR, value: '<>', start, end: this.position, line: this.line };
      } else if (this.peekNext() === '=') {
        this.position += 2;
        return { type: TokenType.OPERATOR, value: '<=', start, end: this.position, line: this.line };
      }
    } else if (char === '>') {
      if (this.peekNext() === '=') {
        this.position += 2;
        return { type: TokenType.OPERATOR, value: '>=', start, end: this.position, line: this.line };
      }
    }

    this.advance();
    return {
      type: TokenType.OPERATOR,
      value: char,
      start,
      end: this.position,
      line: this.line
    };
  }

  private tokenizePunctuation(): Token {
    const start = this.position;
    const value = this.peek();
    this.advance();
    return {
      type: TokenType.PUNCTUATION,
      value,
      start,
      end: this.position,
      line: this.line
    };
  }
}

export class ZXBasicParser {
  private tokens: Token[];
  private currentIndex: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.currentIndex = 0;
  }

  parseExpression(): ASTNode | null {
    try {
      return this.expression();
    } catch {
      return null;
    }
  }

  private current(): Token {
    return this.currentIndex < this.tokens.length ? this.tokens[this.currentIndex] : this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    if (this.currentIndex < this.tokens.length) {
      return this.tokens[this.currentIndex++];
    }
    return this.tokens[this.tokens.length - 1];
  }

  private peek(offset: number = 1): Token {
    const index = this.currentIndex + offset;
    return index < this.tokens.length ? this.tokens[index] : this.tokens[this.tokens.length - 1];
  }

  private expression(): ASTNode | null {
    return this.logicalOrExpression();
  }

  private logicalOrExpression(): ASTNode | null {
    let node = this.logicalAndExpression();
    while (this.current().type === TokenType.OPERATOR && this.current().value === 'OR') {
      const operator = this.advance().value;
      const right = this.logicalAndExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private logicalAndExpression(): ASTNode | null {
    let node = this.comparisonExpression();
    while (this.current().type === TokenType.OPERATOR && this.current().value === 'AND') {
      const operator = this.advance().value;
      const right = this.comparisonExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private comparisonExpression(): ASTNode | null {
    let node = this.additiveExpression();
    while (this.isComparisonOperator(this.current())) {
      const operator = this.advance().value;
      const right = this.additiveExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private additiveExpression(): ASTNode | null {
    let node = this.multiplicativeExpression();
    while (this.current().type === TokenType.OPERATOR && (this.current().value === '+' || this.current().value === '-')) {
      const operator = this.advance().value;
      const right = this.multiplicativeExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private multiplicativeExpression(): ASTNode | null {
    let node = this.powerExpression();
    while (this.current().type === TokenType.OPERATOR && (this.current().value === '*' || this.current().value === '/')) {
      const operator = this.advance().value;
      const right = this.powerExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private powerExpression(): ASTNode | null {
    let node = this.unaryExpression();
    if (this.current().type === TokenType.OPERATOR && this.current().value === '^') {
      const operator = this.advance().value;
      const right = this.powerExpression();
      if (!right) return null;
      node = {
        type: 'binary_expr',
        operator,
        left: node!,
        right,
        start: node!.start,
        end: right.end,
        line: node!.line
      };
    }
    return node;
  }

  private unaryExpression(): ASTNode | null {
    if (this.current().type === TokenType.OPERATOR && this.current().value === '-') {
      const start = this.current().start;
      const line = this.current().line;
      this.advance();
      const operand = this.primaryExpression();
      if (!operand) return null;
      return {
        type: 'unary_expr',
        operator: '-',
        operand,
        start,
        end: operand.end,
        line
      };
    } else if (this.current().type === TokenType.KEYWORD && this.current().value === 'NOT') {
      const start = this.current().start;
      const line = this.current().line;
      this.advance();
      const operand = this.primaryExpression();
      if (!operand) return null;
      return {
        type: 'unary_expr',
        operator: 'NOT',
        operand,
        start,
        end: operand.end,
        line
      };
    }
    return this.primaryExpression();
  }

  private primaryExpression(): ASTNode | null {
    const token = this.current();

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: 'number',
        value: parseFloat(token.value),
        start: token.start,
        end: token.end,
        line: token.line
      };
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return {
        type: 'string',
        value: token.value.slice(1, -1), // Remove quotes
        start: token.start,
        end: token.end,
        line: token.line
      };
    }

    if (token.type === TokenType.IDENTIFIER) {
      const start = token.start;
      const line = token.line;
      const name = token.value;
      this.advance();

      // Check for function call or array access - in ZX Basic they use the same syntax
      if (this.current().type === TokenType.PUNCTUATION && this.current().value === '(') {
        // For simplicity, treat all (expr) after identifiers as array access
        // In ZX Basic, the difference is semantic based on variable definition
        return this.parseArrayAccess(name, start, line);
      }

      return {
        type: 'identifier',
        name,
        start,
        end: token.end,
        line
      };
    }

    if (token.type === TokenType.KEYWORD) {
      // Keywords like SIN, COS etc. can be followed by parentheses for function calls
      const start = token.start;
      const line = token.line;
      const name = token.value;
      this.advance();

      if (this.current().type === TokenType.PUNCTUATION && this.current().value === '(') {
        return this.parseFunctionCall(name, start, line);
      }

      // Keywords not followed by ( are just identifiers
      return {
        type: 'identifier',
        name,
        start,
        end: token.end,
        line
      };
    }

    if (token.type === TokenType.PUNCTUATION && token.value === '(') {
      return this.parseParenthesizedExpression();
    }

    return null;
  }

  private parseFunctionCall(name: string, start: number, line: number): ASTNode | null {
    this.advance(); // Skip '('
    const args: ASTNode[] = [];

    if (this.current().type !== TokenType.PUNCTUATION || this.current().value !== ')') {
      while (true) {
        const arg = this.expression();
        if (!arg) return null;
        args.push(arg);

        if (this.current().type !== TokenType.PUNCTUATION || this.current().value !== ',') {
          break;
        }
        this.advance(); // Skip ','
      }
    }

    if (this.current().type !== TokenType.PUNCTUATION || this.current().value !== ')') {
      return null;
    }
    const end = this.advance().end;

    return {
      type: 'function_call',
      name,
      args,
      start,
      end,
      line
    };
  }

  private parseArrayAccess(name: string, start: number, line: number): ASTNode | null {
    this.advance(); // Skip '('
    const index = this.expression();
    if (!index) return null;

    if (this.current().type !== TokenType.PUNCTUATION || this.current().value !== ')') {
      return null;
    }
    const end = this.advance().end;

    return {
      type: 'array_access',
      name,
      index,
      start,
      end,
      line
    };
  }

  private parseParenthesizedExpression(): ASTNode | null {
    this.advance(); // Skip '('
    const expr = this.expression();
    if (!expr) return null;

    if (this.current().type !== TokenType.PUNCTUATION || this.current().value !== ')') {
      return null;
    }
    this.advance(); // Skip ')'

    return expr;
  }

  private isComparisonOperator(token: Token): boolean {
    return token.type === TokenType.OPERATOR &&
           ['=', '<>', '<', '<=', '>', '>='].includes(token.value);
  }
}
