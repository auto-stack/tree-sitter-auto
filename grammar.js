/**
 * @file the Auto programming language
 * @author Zhao Puming <visus@qq.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
const PREC = {
  CODE: 0,

  OBJ: 1,
  BODY: 2,

  GROUP: 5,
  ASN: 11,
  TRANS: 12,
  PAIR: 13,
  COMP: 14,
  ADD: 15,
  MUL: 16,
  UNA: 17,
  CALL: 18,
  NODE: 19,
};

module.exports = grammar({
  name: "auto",
  extras: ($) => [$.comments, /\s/],
  // inline: $ => [$.key],
  supertypes: ($) => [$.stmt, $.expr, $.num],
  word: ($) => $.identifier,
  conflicts: ($) => [[$.body, $.obj]],
  rules: {
    code: ($) => prec(PREC.CODE, semi_sep($.stmt)),
    stmt: ($) =>
      choice(
        $.mod,
        $.use,
        $.import,
        $.var,
        $.let,
        $.fn,
        $.node,
        $.asn,
        $.if,
        $.for,
        $.when,
        $.expr,
        $.ui,
        $.style,
        $.type,
        $.enum,
        $.break,
      ),
    mod: ($) => seq("mod", $._name, $.body),
    ui: ($) => seq("ui", $.body),
    style: ($) => seq("style", "{", semi_sep($.stmt), "}"),
    use: ($) => seq("use", $._name, optional($.subs)),
    import: ($) => seq("import", $._name, optional($.args)),
    subs: ($) => prec.left(seq(": ", $._name, optional(seq(",", $._name)))),
    var: ($) => seq("var", field("name", $._name), "=", field("value", $._asn_expr)),
    let: ($) => seq("let", $._name, "=", $._asn_expr),
    _asn_expr: ($) => choice($.expr, $.if, $.when),
    fn: ($) =>
      seq(
        "fn",
        field("name", $._name),
        $.params,
        choice($.body, seq("=", alias($.expr, $.body))),
      ),
    params: ($) => seq("(", comma_sep($._name), ")"),
    body: ($) => prec(PREC.BODY, seq("{", semi_sep($.stmt), "}")),
    asn: ($) =>
      prec.left(
        PREC.ASN,
        seq(field("name", $._name), "=", field("value", $._asn_expr)),
      ),
    expr: ($) =>
      choice($.group, $._name, $.una, $.bina, $.comp, $.call, $._value),
    identifier_name: ($) => $._name,
    if: ($) =>
      seq(
        "if",
        // "(",
        field("cond", $._cond),
        // ")",
        field("then", alias($.body, $.then)),
        // multiple else-if branch
        repeat(
          seq(
            "else if",
            field("cond", $._cond),
            field("then", alias($.body, $.then)),
          ),
        ),
        // optional else branch
        optional(
          seq("else", choice($.if, field("else", alias($.body, $.else)))),
        ),
      ),
    _cond: ($) =>
      choice($.group, $.una, $.bina, $.comp, $.call, $.true, $.false, $._name),
    for: ($) =>
      choice(
        seq(
          "for",
          // "(",
          repeat(seq(field("init", $.var), ";")),
          optional(field("cond", $._cond)),
          // ")",
          field("loop", $.body),
        ),
        seq(
          "for",
          $.in,
          field("body", $.body),
        )
    ),
    in: ($) => seq(
          optional(seq($.identifier, ",")),
          $.identifier,
          "in",
          $._asn_expr,
    ),
    when: ($) =>
      seq(
        "when",
        repeat(seq(field("init", $.var), ";")),
        field("check", $.expr),
        alias($._when_body, $.body),
      ),
    _when_body: ($) =>
      seq(
        "{",
        rep_seq(sepn(";"), $.case),
        optional(seq(sepn(";"), alias($.when_else, $.else))),
        optional(sepn(";")),
        "}",
      ),
    case: ($) => seq("is", $.expr, choice($.body, seq("->", $.stmt))),
    when_else: ($) => seq("else", choice($.body, seq("->", $.stmt))),
    group: ($) => prec.left(PREC.GROUP, seq("(", $.expr, ")")),
    una: ($) => prec.left(PREC.UNA, seq(choice("!", "-", "+"), $.expr)),
    bina: ($) =>
      choice(
        prec.left(PREC.ADD, seq($.expr, choice("+", "-"), $.expr)),
        prec.left(PREC.MUL, seq($.expr, choice("*", "/"), $.expr)),
      ),
    comp: ($) =>
      prec.left(
        PREC.COMP,
        seq($.expr, choice("==", "!=", "<", "<=", ">", ">="), $.expr),
      ),
    call: ($) => prec.right(PREC.CALL, seq(field("function", $.expr), $.args, optional($.body))),
    args: ($) => seq("(", comma_sep($.expr), ")"),
    _value: ($) => choice($._structured_value, $._single_value),
    _structured_value: ($) => choice($.pair, $.obj, $.array, $.trans),
    _single_value: ($) => choice($.num, $.fstr, $.str, $.mstr, $.null, $.true, $.false, $.nil),
    obj: ($) => prec(PREC.OBJ, seq("{", comma_sep($.stmt), "}")),
    pair: ($) => seq(field("key", choice(alias($.str, $.key), alias($.identifier, $.key), $.fstr)), ":", field("value", $._asn_expr)),
    trans: ($) =>
      prec.left(
        PREC.TRANS,
        seq(field("src", $._name), "->", field("dst", $._name)),
      ),
    _name: ($) =>
      choice(
        $.type_name,
        $.identifier,
        $.ident_path,
      ),
    ident_path: ($) => 
      choice(
        seq(".", $.identifier, rep_seq(".", $.identifier)),
        seq($.identifier, ".", $.identifier, rep_seq(".", $.identifier)),
      ),
    identifier: ($) => {
      const ident_start1 = /[\$_a-zA-Z]/;
      const ident_part1 = choice(ident_start1, /[0-9]/);
      return token(seq(ident_start1, repeat(ident_part1)));
    },
    array: ($) => seq("[", comma_sep($._asn_expr), "]"),
    node: ($) =>
      seq(
        "node",
        field("name", $._name),
        "(",
        comma_sep($.prop),
        ")",
        optional(alias($.node_body, $.body)),
      ),
    prop: ($) =>
      seq(
        field("prop", $._name),
        optional(seq(/[ \t]+/, field("type", $._name))),
      ),
    node_body: ($) => seq("{", comma_sep($._node_stmt), "}"),
    _node_stmt: ($) => choice($.pair, $.if),
    fstr: ($) => choice(
      seq(
        'f"', 
        rep_choice(
          $.spart,
          $.interpol,
        ),
        '"'),
      seq(
        'f"""', 
        rep_choice(
          $.spart,
          $.interpol,
        ),
        '"""'),
      seq(
        "f`",
        rep_choice(
          alias($.spart_tick, $.spart),
          $.interpol,
        ),
        "`"),
    ),
    spart: ($) => prec.right(repeat1(choice(
      seq("\\", choice('"', "\\", "b", "f", "n", "r", "t", "v")),
          /[^"]/,
          ' ',
    ))),
    spart_tick: ($) => prec.right(repeat1(choice(
          seq("\\", choice('`', "\\", "b", "f", "n", "r", "t", "v")),
          /[^`]/,
          ' ',
          '"',
          '\t',
          '\n',
    ))),
    str: (_) => token(choice(
      seq(
        '"',
        rep_choice(
          seq("\\", choice('"', "\\", "b", "f", "n", "r", "t", "v")),
          /[^"\\]/,
        ),
        '"',
      ),
      seq(
        "'",
        rep_choice(
          seq("\\", choice('"', "\\", "b", "f", "n", "r", "t", "v")),
          /[^"\\]/,
        ),
        "'",
      )
    )),
    mstr: ($) => seq("```", rep_choice(/[^`$]/, $.interpol), "```"), // TODO: allow ` and `` in the string
    interpol: ($) => seq("$", choice($._name, seq("{", $._asn_expr, "}"))),
    num: ($) => choice($.int, $.bin, $.hex, $.float),
    int: ($) => token(/[0-9_]+/),
    bin: ($) => token(seq("0b", /[01_]+/)),
    hex: ($) => token(seq("0x", /[0-9a-fA-F_]+/)),
    float: ($) => {
      const dec_digit = /[0-9]/;
      const exp_part = seq(/[eE]/, optional(/[+-]/), repeat1(dec_digit));
      const int_literal = choice("0", seq(/[1-9]/, repeat(dec_digit)));
      const dec_literal = choice(
        seq(int_literal, ".", repeat(dec_digit), optional(exp_part)),
        seq(".", seq(dec_digit, repeat(dec_digit)), optional(exp_part)),
        seq(int_literal, optional(exp_part)),
      );
      return token(dec_literal);
    },
    null: ($) => "null",
    nil: ($) => "nil",
    true: ($) => "true",
    false: ($) => "false",
    // Primitive type keywords
    type_name: ($) => choice(
      "int", "uint", "float", "double",
      "usize", "byte", "ubyte",
      "i8", "u8", "i16", "u16", "i32", "u32", "i64", "u64",
      "str", "cstr", "char",
      "void", "bool",
    ),
    // enum
    enum: ($) => seq("enum", field("name", $._name), "{", comma_sep($.enum_member), "}"),
    enum_member: ($) => seq(field("name", $._name), optional(seq("=", field("value", $.expr)))),
    // type
    type: ($) => seq("type", field("name", $._name), "{", semi_sep($.type_field), "}"),
    type_field: ($) => seq(field("name", $.identifier), field("type", $._name)),
    break: ($) => seq("break"),
    comments: ($) =>
      token(prec(-1,
        choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      )),
  },
});

function opt_choice(...args) {
  return optional(choice(...args));
}

function rep_choice(...args) {
  return repeat(choice(...args));
}

function rep_seq(...args) {
  return repeat(seq(...args));
}

function opt_seq(...args) {
  return optional(seq(...args));
}

// 三种可能：seq(a, b) | a | b，但不能完全没有
function either_seq(a, b) {
  return choice(seq(a, optional(b)), b);
}

// Seperator or newline
function sepn(s) {
  return choice(s, "\n");
}

// Repeat with seperator or newline
function rep_sepn(elem, s) {
  return opt_seq(elem, rep_seq(sepn(s), elem), optional(sepn(s)));
}

function semi_sep(elem) {
  return rep_sepn(elem, ";");
}

function comma_sep(elem) {
  return rep_sepn(elem, ",");
}


function comma_sep_plus(elem) {
  return seq(elem, optional(rep_seq(sepn(","), elem)), optional(sepn(",")));
}
