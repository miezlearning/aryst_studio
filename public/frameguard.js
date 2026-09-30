// Anti-clickjacking: load the app only when it is the top-level frame.
if (window.top !== window.self) {
  window.top.location.replace(window.self.location.href);
}
