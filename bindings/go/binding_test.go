package tree_sitter_auto_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_auto "gitee.com/auto-stack/auto-lang/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_auto.Language())
	if language == nil {
		t.Errorf("Error loading Auto Lang grammar")
	}
}
