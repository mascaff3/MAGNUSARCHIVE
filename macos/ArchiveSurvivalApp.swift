import AppKit
import UniformTypeIdentifiers
import WebKit

private let appScheme = "archive"

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
  private let rootURL: URL

  init(rootURL: URL) {
    self.rootURL = rootURL
    super.init()
  }

  func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
    guard let requestURL = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorBadURL))
      return
    }

    let requestedPath = requestURL.path.isEmpty || requestURL.path == "/" ? "/index.html" : requestURL.path
    let relativePath = requestedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    let fileURL = rootURL.appendingPathComponent(relativePath)

    guard fileURL.standardizedFileURL.path.hasPrefix(rootURL.standardizedFileURL.path) else {
      urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorNoPermissionsToReadFile))
      return
    }

    do {
      let data = try Data(contentsOf: fileURL)
      let mimeType = mimeTypeForFile(at: fileURL)
      let response = URLResponse(
        url: requestURL,
        mimeType: mimeType,
        expectedContentLength: data.count,
        textEncodingName: mimeType.hasPrefix("text/") || mimeType == "application/javascript" ? "utf-8" : nil
      )
      urlSchemeTask.didReceive(response)
      urlSchemeTask.didReceive(data)
      urlSchemeTask.didFinish()
    } catch {
      urlSchemeTask.didFailWithError(error)
    }
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

  private func mimeTypeForFile(at fileURL: URL) -> String {
    if let type = UTType(filenameExtension: fileURL.pathExtension),
       let mimeType = type.preferredMIMEType {
      return mimeType
    }

    switch fileURL.pathExtension.lowercased() {
    case "js":
      return "application/javascript"
    case "css":
      return "text/css"
    case "html":
      return "text/html"
    case "svg":
      return "image/svg+xml"
    case "json":
      return "application/json"
    case "png":
      return "image/png"
    case "jpg", "jpeg":
      return "image/jpeg"
    case "gif":
      return "image/gif"
    case "wav":
      return "audio/wav"
    case "mp3":
      return "audio/mpeg"
    default:
      return "application/octet-stream"
    }
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
  private var window: NSWindow?
  private let errorHandlerName = "appError"
  private var schemeHandler: BundleSchemeHandler?

  func applicationDidFinishLaunching(_ notification: Notification) {
    guard let wwwURL = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else {
      presentFatalError(message: "Missing bundled web assets.")
      return
    }

    self.schemeHandler = BundleSchemeHandler(rootURL: wwwURL)
    let webView = makeWebView()
    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1440, height: 960),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered,
      defer: false
    )
    window.center()
    window.title = "Archive Survival"
    window.minSize = NSSize(width: 960, height: 720)
    window.contentView = webView
    window.makeKeyAndOrderFront(nil)
    self.window = window

    loadGame(in: webView)
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  private func makeWebView() -> WKWebView {
    let configuration = WKWebViewConfiguration()
    let controller = WKUserContentController()
    controller.add(self, name: errorHandlerName)
    controller.addUserScript(
      WKUserScript(
        source: """
        window.addEventListener('error', function(event) {
          const message = event.message || 'Unknown JavaScript error';
          const file = event.filename || 'unknown file';
          const line = event.lineno || 0;
          const column = event.colno || 0;
          window.webkit.messageHandlers.\(errorHandlerName).postMessage(
            `JS error: ${message} @ ${file}:${line}:${column}`
          );
        });

        window.addEventListener('unhandledrejection', function(event) {
          const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
          window.webkit.messageHandlers.\(errorHandlerName).postMessage(
            `Unhandled promise rejection: ${reason}`
          );
        });
        """,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
      )
    )
    configuration.userContentController = controller
    if let schemeHandler {
      configuration.setURLSchemeHandler(schemeHandler, forURLScheme: appScheme)
    }
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    webView.setValue(false, forKey: "drawsBackground")
    return webView
  }

  private func loadGame(in webView: WKWebView) {
    guard let indexURL = URL(string: "\(appScheme)://app/index.html") else {
      presentFatalError(message: "Could not construct startup URL.")
      return
    }

    webView.load(URLRequest(url: indexURL))
  }

  private func presentFatalError(message: String) {
    let alert = NSAlert()
    alert.alertStyle = .critical
    alert.messageText = "Archive Survival could not start"
    alert.informativeText = message
    alert.runModal()
    NSApp.terminate(nil)
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    presentFatalError(message: error.localizedDescription)
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    presentFatalError(message: error.localizedDescription)
  }

  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == errorHandlerName else {
      return
    }

    presentFatalError(message: String(describing: message.body))
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.activate(ignoringOtherApps: true)
app.run()
