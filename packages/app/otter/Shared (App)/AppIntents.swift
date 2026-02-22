//
//  AppIntents.swift
//  Shared (App)
//
//  Created by Zander Martineau on 21/02/2026.
//

import AppIntents
import Foundation

@available(iOS 16.0, macOS 13.0, *)
struct SaveBookmarkIntent: AppIntent {
    static var title: LocalizedStringResource = "Save Bookmark"
    static var description = IntentDescription("Save a bookmark in Otter")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "URL")
    var url: String?

    func perform() async throws -> some IntentResult {
        let userInfo: [String: String]? = if let url {
            ["url": url]
        } else {
            nil
        }
        await MainActor.run {
            NotificationCenter.default.post(
                name: .saveBookmark,
                object: nil,
                userInfo: userInfo
            )
        }
        return .result()
    }
}

@available(iOS 16.0, macOS 13.0, *)
struct OtterShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: SaveBookmarkIntent(),
            phrases: [
                "Save bookmark in \(.applicationName)",
                "Save page in \(.applicationName)",
            ],
            shortTitle: "Save Bookmark",
            systemImageName: "bookmark"
        )
    }
}

extension Notification.Name {
    static let saveBookmark = Notification.Name("saveBookmark")
}
