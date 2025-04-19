import XCTest
import SwiftTreeSitter
import TreeSitterAuto

final class TreeSitterAutoTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_auto())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Auto Lang grammar")
    }
}
