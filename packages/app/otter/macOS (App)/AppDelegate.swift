//
//  AppDelegate.swift
//  macOS (App)
//
//  Created by Zander Martineau on 08/10/2025.
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Override point for customization after application launch.
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let url = urls.first, url.scheme == "otter" else { return }

        switch url.host {
        case "save":
            let bookmarkURL = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "url" })?.value
            NotificationCenter.default.post(
                name: .saveBookmark,
                object: nil,
                userInfo: bookmarkURL.map { ["url": $0] }
            )
        default:
            break
        }
    }

}
