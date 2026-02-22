//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Zander Martineau on 08/10/2025.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let _ = (scene as? UIWindowScene) else { return }

        if let url = connectionOptions.urlContexts.first?.url {
            handleURL(url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        handleURL(url)
    }

    private func handleURL(_ url: URL) {
        guard url.scheme == "otter" else { return }

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
